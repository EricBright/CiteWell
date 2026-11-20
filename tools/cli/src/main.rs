// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! `citewell` — a small command-line client for CiteWell's local API.
//!
//! The app already exposes Zotero's local API on loopback (`http://127.0.0.1:23120/api/`).
//! This binary is a thin, dependency-light wrapper so that a person or an agent can query and
//! write the library without composing HTTP by hand. It deliberately contains no business
//! logic: the app remains the single source of truth.

use std::env;
use std::fs;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::ExitCode;
use std::time::Duration;

mod mcp;

const DEFAULT_URL: &str = "http://127.0.0.1:23120";
const USER_AGENT: &str = concat!("citewell-cli/", env!("CARGO_PKG_VERSION"));

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err((code, message)) => {
            eprintln!("{message}");
            ExitCode::from(code)
        }
    }
}

/// Exit codes are part of the interface: 1 = the app said no, 2 = usage, 3 = no connection.
type CliError = (u8, String);

fn usage() -> CliError {
    (
        2,
        format!(
            "citewell — talk to a running CiteWell through its local API\n\n\
             Usage: citewell [--url URL] [--data-dir DIR] [--pretty] COMMAND [ARGS]\n\n\
             Commands:\n  \
             status                              show app, API and library information\n  \
             search QUERY [--limit N]            search the library (default 25 results)\n  \
             item KEY                            fetch one item by key\n  \
             api METHOD PATH [--body JSON] [--key KEY] [--server-id ID]\n        \
             send a raw local-API request\n  \
             authorize [--app-name NAME]         ask the app for a write key\n  \
             agent METHOD [--params JSON]        call the agent bridge (/agent/v1)\n  \
             mcp                                 run an MCP server on stdio for local agents\n\n\
             Options:\n  \
             --url URL        local API origin (default http://127.0.0.1:23120 or $CITEWELL_URL)\n  \
             --data-dir DIR   library data dir for the agent token (default $CITEWELL_DATA_DIR)\n  \
             --pretty         pretty-print JSON responses\n\n\
             The local API must be enabled in CiteWell's Advanced preferences. Reads are open to\n\
             local processes; writes need a key from `citewell authorize`. The `agent` command\n\
             reads its token from the data directory; see Preferences → Agent access."
        ),
    )
}

fn connection_error(origin: &str, error: &std::io::Error) -> CliError {
    (
        3,
        format!(
            "citewell: cannot reach {origin}: {error}\n\
             Is CiteWell running, and is the local API enabled in Advanced preferences?"
        ),
    )
}

fn run() -> Result<(), CliError> {
    let mut raw: Vec<String> = env::args().skip(1).collect();
    let mut base = env::var("CITEWELL_URL").unwrap_or_else(|_| DEFAULT_URL.to_string());
    let mut data_dir: Option<PathBuf> = env::var_os("CITEWELL_DATA_DIR").map(PathBuf::from);
    let mut pretty = false;

    let mut filtered = Vec::new();
    let mut i = 0;
    while i < raw.len() {
        match raw[i].as_str() {
            "--url" => {
                i += 1;
                base = raw.get(i).ok_or_else(usage)?.clone();
            }
            "--data-dir" => {
                i += 1;
                data_dir = Some(PathBuf::from(raw.get(i).ok_or_else(usage)?));
            }
            "--pretty" => pretty = true,
            "-h" | "--help" => {
                println!("{}", usage().1);
                return Ok(());
            }
            _ => filtered.push(raw[i].clone()),
        }
        i += 1;
    }
    raw = filtered;

    let command = raw.first().ok_or_else(usage)?.clone();
    let rest = raw[1..].to_vec();
    let client = Client::new(&base)?;
    match command.as_str() {
        "status" => cmd_status(&client),
        "search" => cmd_search(&client, rest, pretty),
        "item" => cmd_item(&client, rest, pretty),
        "api" => cmd_api(&client, rest, pretty),
        "authorize" => cmd_authorize(&client, rest, pretty),
        "agent" => cmd_agent(&client, rest, pretty, data_dir),
        "mcp" => mcp::run(&client, data_dir),
        _ => Err(usage()),
    }
}

struct Client {
    host: String,
    port: u16,
    origin: String,
}

impl Client {
    fn new(base: &str) -> Result<Self, CliError> {
        let (host, port) = parse_origin(base)?;
        let origin = if (host.contains(':') && !host.starts_with('[')) || port != 80 {
            format!("http://{host}:{port}")
        } else {
            format!("http://{host}")
        };
        Ok(Self { host, port, origin })
    }

    fn request(
        &self,
        method: &str,
        path: &str,
        body: Option<&str>,
        headers: &[(String, String)],
    ) -> Result<Response, CliError> {
        if !path.starts_with('/') {
            return Err((2, "citewell: path must start with /".into()));
        }

        let address = format!("{}:{}", self.host, self.port);
        let mut stream =
            TcpStream::connect(&address).map_err(|e| connection_error(&self.origin, &e))?;
        stream.set_read_timeout(Some(Duration::from_secs(30))).ok();
        stream.set_write_timeout(Some(Duration::from_secs(30))).ok();

        let body = body.unwrap_or("");
        let mut request = format!(
            "{method} {path} HTTP/1.1\r\n\
             Host: {}:{}\r\n\
             Connection: close\r\n\
             Accept: application/json\r\n\
             User-Agent: {USER_AGENT}\r\n",
            self.host, self.port
        );
        for (name, value) in headers {
            request.push_str(&format!("{name}: {value}\r\n"));
        }
        if !body.is_empty() || method == "POST" || method == "PUT" || method == "PATCH" {
            request.push_str("Content-Type: application/json\r\n");
            request.push_str(&format!("Content-Length: {}\r\n", body.len()));
        }
        request.push_str("\r\n");
        request.push_str(body);

        stream
            .write_all(request.as_bytes())
            .map_err(|e| (3, format!("citewell: write failed: {e}")))?;

        let mut raw = Vec::new();
        stream
            .read_to_end(&mut raw)
            .map_err(|e| (3, format!("citewell: read failed: {e}")))?;
        parse_response(&raw).map_err(|e| (1, format!("citewell: malformed response: {e}")))
    }

    fn agent_call(
        &self,
        token: &str,
        method: &str,
        params: serde_json::Value,
    ) -> Result<serde_json::Value, CliError> {
        let body = serde_json::json!({ "method": method, "params": params }).to_string();
        let headers = vec![
            ("Authorization".to_string(), format!("Bearer {token}")),
            ("X-CiteWell-Agent".to_string(), "1".to_string()),
        ];
        let response = self.request("POST", "/agent/v1", Some(&body), &headers)?;
        if !response.is_success() {
            return Err(http_error(&response, false));
        }
        let value: serde_json::Value = serde_json::from_slice(&response.body)
            .map_err(|e| (1, format!("citewell: malformed agent response: {e}")))?;
        if value.get("ok").and_then(|ok| ok.as_bool()) != Some(true) {
            let message = value
                .pointer("/error/message")
                .and_then(|message| message.as_str())
                .unwrap_or("agent request failed");
            return Err((1, format!("citewell: {message}")));
        }
        Ok(value
            .get("result")
            .cloned()
            .unwrap_or(serde_json::Value::Null))
    }

    fn get_json(&self, path: &str) -> Result<Response, CliError> {
        let response = self.request("GET", path, None, &[])?;
        if !response.is_success() {
            return Err(http_error(&response, false));
        }
        Ok(response)
    }
}

fn cmd_status(client: &Client) -> Result<(), CliError> {
    let response = client.get_json("/api/users/0/items?limit=1")?;
    println!("Connected to {}", client.origin);
    println!(
        "  Zotero version: {}",
        response.header("X-Zotero-Version").unwrap_or("unknown")
    );
    println!(
        "  API version:    {}",
        response.header("Zotero-API-Version").unwrap_or("unknown")
    );
    println!(
        "  Server ID:      {}",
        response.header("Zotero-Server-ID").unwrap_or("unknown")
    );
    println!(
        "  Items:          {}",
        response.header("Total-Results").unwrap_or("unknown")
    );
    Ok(())
}

fn cmd_search(client: &Client, args: Vec<String>, pretty: bool) -> Result<(), CliError> {
    let mut query: Option<String> = None;
    let mut limit = 25u32;
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--limit" => {
                i += 1;
                limit = args
                    .get(i)
                    .and_then(|v| v.parse().ok())
                    .ok_or_else(|| (2, "citewell: --limit needs a number".into()))?;
            }
            value if value.starts_with('-') => return Err(usage()),
            value => {
                if query.is_some() {
                    return Err(usage());
                }
                query = Some(value.to_string());
            }
        }
        i += 1;
    }
    let query = query.ok_or_else(usage)?;
    let path = format!(
        "/api/users/0/items?q={}&limit={limit}&format=json",
        percent_encode(&query)
    );
    print_body(client.get_json(&path)?.body, pretty)
}

fn cmd_item(client: &Client, args: Vec<String>, pretty: bool) -> Result<(), CliError> {
    if args.len() != 1 || args[0].starts_with('-') || args[0].contains('/') {
        return Err(usage());
    }
    let path = format!("/api/users/0/items/{}", args[0]);
    print_body(client.get_json(&path)?.body, pretty)
}

fn cmd_api(client: &Client, args: Vec<String>, pretty: bool) -> Result<(), CliError> {
    let mut method = String::new();
    let mut path = String::new();
    let mut body: Option<String> = None;
    let mut key: Option<String> = None;
    let mut server_id: Option<String> = None;

    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--body" => {
                i += 1;
                body = Some(args.get(i).ok_or_else(usage)?.clone());
            }
            "--key" => {
                i += 1;
                key = Some(args.get(i).ok_or_else(usage)?.clone());
            }
            "--server-id" => {
                i += 1;
                server_id = Some(args.get(i).ok_or_else(usage)?.clone());
            }
            value if value.starts_with('-') => return Err(usage()),
            value if method.is_empty() => method = value.to_ascii_uppercase(),
            value if path.is_empty() => path = value.to_string(),
            _ => return Err(usage()),
        }
        i += 1;
    }
    if method.is_empty() || path.is_empty() {
        return Err(usage());
    }
    if !path.starts_with('/') {
        path = format!("/api/{path}");
    }

    let mut headers = Vec::new();
    if method != "GET" {
        if let Some(key) = key {
            headers.push(("Zotero-API-Key".to_string(), key));
        }
        let id = match server_id {
            Some(id) => id,
            None => client
                .get_json("/api/users/0/items?limit=1")?
                .header("Zotero-Server-ID")
                .unwrap_or_default()
                .to_string(),
        };
        if !id.is_empty() {
            headers.push(("Zotero-Server-ID".to_string(), id));
        }
    }

    let response = client.request(&method, &path, body.as_deref(), &headers)?;
    if !response.is_success() {
        return Err(http_error(&response, key_is_missing(&response)));
    }
    print_body(response.body, pretty)
}

fn cmd_authorize(client: &Client, args: Vec<String>, pretty: bool) -> Result<(), CliError> {
    let mut app_name = "CiteWell CLI".to_string();
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--app-name" => {
                i += 1;
                app_name = args.get(i).ok_or_else(usage)?.clone();
            }
            _ => return Err(usage()),
        }
        i += 1;
    }
    if app_name.trim().is_empty() {
        return Err((2, "citewell: --app-name cannot be empty".into()));
    }
    let body = serde_json::json!({ "appName": app_name }).to_string();
    let response = client.request("POST", "/api/local/authorize", Some(&body), &[])?;
    if !response.is_success() {
        return Err(http_error(&response, false));
    }
    print_body(response.body, pretty)
}

fn cmd_agent(
    client: &Client,
    args: Vec<String>,
    pretty: bool,
    data_dir: Option<PathBuf>,
) -> Result<(), CliError> {
    let method = args.first().cloned().ok_or_else(usage)?;
    let mut params = "{}".to_string();
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--params" => {
                i += 1;
                let value = args.get(i).ok_or_else(usage)?;
                params = if let Some(path) = value.strip_prefix('@') {
                    fs::read_to_string(path)
                        .map_err(|e| (2, format!("citewell: cannot read {path}: {e}")))?
                } else {
                    value.clone()
                };
            }
            _ => return Err(usage()),
        }
        i += 1;
    }
    let params = serde_json::from_str::<serde_json::Value>(&params)
        .map_err(|e| (2, format!("citewell: --params is not valid JSON: {e}")))?;
    let token = read_agent_token(data_dir)?;
    let result = client.agent_call(&token, &method, params)?;
    print_json_value(&result, pretty)
}

fn read_agent_token(data_dir: Option<PathBuf>) -> Result<String, CliError> {
    let data_dir = data_dir.ok_or_else(|| {
        (
            2,
            "citewell: set CITEWELL_DATA_DIR or pass --data-dir (the directory passed to -datadir)"
                .to_string(),
        )
    })?;
    let token_path = data_dir.join("agent-token");
    let token = fs::read_to_string(&token_path)
        .map_err(|e| {
            (
                2,
                format!(
                    "citewell: cannot read the agent token at {}: {e}\nStart CiteWell once with this data directory, then check the token in Preferences → Agent access.",
                    token_path.display()
                ),
            )
        })?
        .trim()
        .to_string();
    if token.is_empty() {
        return Err((
            2,
            format!("citewell: agent token at {} is empty", token_path.display()),
        ));
    }
    Ok(token)
}

fn print_json_value(value: &serde_json::Value, pretty: bool) -> Result<(), CliError> {
    if pretty {
        println!(
            "{}",
            serde_json::to_string_pretty(value).unwrap_or_default()
        );
    } else {
        println!("{}", serde_json::to_string(value).unwrap_or_default());
    }
    Ok(())
}

fn key_is_missing(response: &Response) -> bool {
    response.status == 401
}

fn http_error(response: &Response, needs_key: bool) -> CliError {
    let body = String::from_utf8_lossy(&response.body);
    let reason = if response.reason.is_empty() || response.reason == "undefined" {
        String::new()
    } else {
        format!(" {}", response.reason)
    };
    let mut message = format!(
        "citewell: HTTP {}{reason}\n{}",
        response.status,
        body.trim_end()
    );
    if needs_key || response.status == 401 {
        message.push_str(
            "\nThis write needs a local API key. Run `citewell authorize --app-name \"…\"` \
             and pass the returned key with `--key`.",
        );
    }
    (1, message)
}

fn print_body(body: Vec<u8>, pretty: bool) -> Result<(), CliError> {
    let text = String::from_utf8_lossy(&body).to_string();
    if pretty {
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) {
            println!("{}", serde_json::to_string_pretty(&value).unwrap_or(text));
            return Ok(());
        }
    }
    print!("{text}");
    if !text.ends_with('\n') {
        println!();
    }
    Ok(())
}

fn parse_origin(base: &str) -> Result<(String, u16), CliError> {
    let rest = match base.strip_prefix("http://") {
        Some(rest) => rest,
        None if base.starts_with("https://") => {
            return Err((
                2,
                "citewell: only http:// is supported for the local API".into(),
            ))
        }
        None => return Err((2, format!("citewell: invalid URL: {base}"))),
    };
    let authority = rest.split('/').next().unwrap_or(rest);
    if authority.is_empty() || authority.contains('@') {
        return Err((2, format!("citewell: invalid URL: {base}")));
    }

    if let Some(rest) = authority.strip_prefix('[') {
        let end = rest
            .find(']')
            .ok_or_else(|| (2, format!("citewell: invalid URL: {base}")))?;
        let host = rest[..end].to_string();
        let port = match rest[end + 1..].strip_prefix(':') {
            Some(port) if !port.is_empty() => port
                .parse()
                .map_err(|_| (2, format!("citewell: invalid port in URL: {base}")))?,
            _ => 23120,
        };
        return Ok((host, port));
    }

    match authority.rsplit_once(':') {
        Some((host, port)) if !port.is_empty() => Ok((
            host.to_string(),
            port.parse()
                .map_err(|_| (2, format!("citewell: invalid port in URL: {base}")))?,
        )),
        _ => Ok((authority.to_string(), 23120)),
    }
}

fn percent_encode(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(*byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

struct Response {
    status: u16,
    reason: String,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

impl Response {
    fn header(&self, name: &str) -> Option<&str> {
        let name = name.to_ascii_lowercase();
        self.headers
            .iter()
            .find(|(key, _)| *key == name)
            .map(|(_, value)| value.as_str())
    }

    fn is_success(&self) -> bool {
        (200..300).contains(&self.status)
    }
}

fn parse_response(raw: &[u8]) -> Result<Response, String> {
    let split = raw
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .ok_or("no header terminator")?;
    let head = std::str::from_utf8(&raw[..split]).map_err(|_| "headers are not UTF-8")?;
    let mut lines = head.split("\r\n");
    let status_line = lines.next().ok_or("empty response")?;
    let mut status_parts = status_line.splitn(3, ' ');
    let version = status_parts.next().unwrap_or_default();
    if !version.starts_with("HTTP/") {
        return Err("not an HTTP response".into());
    }
    let status = status_parts
        .next()
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or("missing status code")?;
    let reason = status_parts.next().unwrap_or_default().to_string();

    let mut headers = Vec::new();
    for line in lines {
        if let Some((name, value)) = line.split_once(':') {
            headers.push((name.trim().to_ascii_lowercase(), value.trim().to_string()));
        }
    }

    let mut body = raw[split + 4..].to_vec();
    let get = |name: &str| {
        headers
            .iter()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.as_str())
    };
    if get("transfer-encoding")
        .map(|value| value.to_ascii_lowercase().contains("chunked"))
        .unwrap_or(false)
    {
        body = decode_chunked(&body)?;
    } else if let Some(length) = get("content-length").and_then(|v| v.parse::<usize>().ok()) {
        body.truncate(length.min(body.len()));
    }

    Ok(Response {
        status,
        reason,
        headers,
        body,
    })
}

fn decode_chunked(mut data: &[u8]) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    loop {
        let line_end = data
            .windows(2)
            .position(|window| window == b"\r\n")
            .ok_or("truncated chunk header")?;
        let line = std::str::from_utf8(&data[..line_end]).map_err(|_| "bad chunk header")?;
        let size = usize::from_str_radix(line.split(';').next().unwrap_or("").trim(), 16)
            .map_err(|_| "bad chunk size")?;
        data = &data[line_end + 2..];
        if size == 0 {
            break;
        }
        if data.len() < size + 2 {
            return Err("truncated chunk".into());
        }
        out.extend_from_slice(&data[..size]);
        data = &data[size + 2..];
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_query_values() {
        assert_eq!(percent_encode("attention deficit"), "attention%20deficit");
        assert_eq!(percent_encode("a+b&c"), "a%2Bb%26c");
        assert_eq!(percent_encode("héllo"), "h%C3%A9llo");
    }

    #[test]
    fn parses_origins() {
        assert_eq!(
            parse_origin(DEFAULT_URL).unwrap(),
            ("127.0.0.1".into(), 23120)
        );
        assert_eq!(
            parse_origin("http://localhost:23120").unwrap(),
            ("localhost".into(), 23120)
        );
        assert_eq!(
            parse_origin("http://[::1]:23120").unwrap(),
            ("::1".into(), 23120)
        );
        assert!(parse_origin("https://127.0.0.1").is_err());
        assert!(parse_origin("127.0.0.1").is_err());
    }

    #[test]
    fn parses_a_response() {
        let raw =
            b"HTTP/1.0 200 OK\r\nContent-Type: application/json\r\nTotal-Results: 7\r\n\r\n[]";
        let response = parse_response(raw).unwrap();
        assert_eq!(response.status, 200);
        assert_eq!(response.header("total-results"), Some("7"));
        assert_eq!(response.body, b"[]");
    }

    #[test]
    fn decodes_chunked_bodies() {
        let raw = b"HTTP/1.0 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n4\r\n{\"a\"\r\n3\r\n:1}\r\n0\r\n\r\n";
        let response = parse_response(raw).unwrap();
        assert_eq!(response.body, b"{\"a\":1}");
    }

    #[test]
    fn rejects_garbage() {
        assert!(parse_response(b"not http\r\n\r\n").is_err());
    }
}
