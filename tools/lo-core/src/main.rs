// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! Minimal loopback bridge for the CiteWell LibreOffice shim.
//!
//! The extension only needs a CiteWell-owned identity on 127.0.0.1:23121.
//! Citation protocol work grows here; the first endpoint is `/health`.

use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::thread;
use std::time::Duration;

const DEFAULT_PORT: u16 = 23121;
static DATA_DIR: OnceLock<PathBuf> = OnceLock::new();

fn main() -> std::io::Result<()> {
    let port = std::env::var("CITEWELL_LO_PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(DEFAULT_PORT);
    let parent_pid = std::env::args()
        .skip_while(|arg| arg != "--parent-pid")
        .nth(1)
        .and_then(|value| value.parse::<u32>().ok());
    let data_dir = std::env::args()
        .skip_while(|arg| arg != "--data-dir")
        .nth(1)
        .map(PathBuf::from);
    if let Some(data_dir) = data_dir {
        let _ = DATA_DIR.set(data_dir);
    }
    if let Some(parent) = parent_pid {
        // Exit if the CiteWell process that started us dies, including after a
        // crash or SIGTERM that never runs the app's shutdown listeners.
        thread::spawn(move || loop {
            thread::sleep(Duration::from_secs(2));
            if !Path::new(&format!("/proc/{parent}")).exists() {
                std::process::exit(0);
            }
        });
    }
    let listener = TcpListener::bind(("127.0.0.1", port))?;
    println!("citewell-lo-core listening on 127.0.0.1:{port}");
    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                thread::spawn(move || {
                    let _ = handle(stream);
                });
            }
            Err(error) => eprintln!("accept failed: {error}"),
        }
    }
    Ok(())
}

fn handle(mut stream: TcpStream) -> std::io::Result<()> {
    stream.set_read_timeout(Some(Duration::from_secs(2)))?;
    let mut buffer = [0u8; 4096];
    let read = stream.read(&mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..read]);
    let response = response_for(&request);
    stream.write_all(response.as_bytes())?;
    Ok(())
}

fn response_for(request: &str) -> String {
    let path = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .unwrap_or("/");
    if path == "/health" {
        http_response(
            "200 OK",
            "application/json",
            r#"{"app":"CiteWell","version":1,"health":"ok"}"#,
        )
    } else if path == "/citation" {
        match agent_citation() {
            Ok(text) => http_response("200 OK", "text/plain; charset=utf-8", &text),
            Err(error) => http_response(
                "503 Service Unavailable",
                "text/plain; charset=utf-8",
                &error,
            ),
        }
    } else {
        http_response("404 Not Found", "text/plain", "not found")
    }
}

fn http_response(status: &str, content_type: &str, body: &str) -> String {
    format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
}

fn agent_citation() -> Result<String, String> {
    let data_dir = DATA_DIR
        .get()
        .ok_or("bridge was started without --data-dir")?;
    let token = fs::read_to_string(data_dir.join("agent-token"))
        .map_err(|e| format!("reading agent token: {e}"))?;
    let token = token.trim();
    let body = r#"{"method":"citation.preview","params":{}}"#;
    let request = format!(
        "POST /agent/v1 HTTP/1.1\r\nHost: 127.0.0.1:23120\r\nX-CiteWell-Agent: 1\r\nAuthorization: Bearer {token}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let mut stream = TcpStream::connect(("127.0.0.1", 23120))
        .map_err(|e| format!("connecting to CiteWell: {e}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(15)))
        .map_err(|e| format!("setting timeout: {e}"))?;
    stream
        .write_all(request.as_bytes())
        .map_err(|e| format!("writing request: {e}"))?;
    let mut response = Vec::new();
    stream
        .read_to_end(&mut response)
        .map_err(|e| format!("reading response: {e}"))?;
    let response = String::from_utf8_lossy(&response);
    let (headers, body) = response
        .split_once("\r\n\r\n")
        .ok_or("malformed agent response")?;
    if !headers.starts_with("HTTP/1.1 200") && !headers.starts_with("HTTP/1.0 200") {
        if let Some(message) = json_string_field(body, "message") {
            return Err(message);
        }
        return Err(format!("agent returned {}", headers.lines().next().unwrap_or("an error")));
    }
    if !body.contains(r#""ok":true"#) {
        return Err(json_string_field(body, "message").unwrap_or_else(|| "unknown agent error".into()));
    }
    json_string_field(body, "text").ok_or_else(|| "agent returned no citation text".into())
}

fn json_string_field(body: &str, key: &str) -> Option<String> {
    let marker = format!("\"{key}\":\"");
    let start = body.find(&marker)? + marker.len();
    let mut output = String::new();
    let mut chars = body[start..].chars();
    while let Some(ch) = chars.next() {
        match ch {
            '"' => return Some(output),
            '\\' => match chars.next()? {
                '"' => output.push('"'),
                '\\' => output.push('\\'),
                '/' => output.push('/'),
                'b' => output.push('\u{0008}'),
                'f' => output.push('\u{000c}'),
                'n' => output.push('\n'),
                'r' => output.push('\r'),
                't' => output.push('\t'),
                'u' => {
                    let digits: String = chars.by_ref().take(4).collect();
                    let value = u32::from_str_radix(&digits, 16).ok()?;
                    output.push(char::from_u32(value)?);
                }
                other => output.push(other),
            },
            other => output.push(other),
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::response_for;

    #[test]
    fn health_has_citewell_identity() {
        let response = response_for("GET /health HTTP/1.1\r\nHost: localhost\r\n\r\n");
        assert!(response.starts_with("HTTP/1.1 200 OK"));
        assert!(response.contains(r#""app":"CiteWell""#));
        assert!(response.contains(r#""health":"ok""#));
    }

    #[test]
    fn citation_without_app_is_a_clear_error() {
        let response = response_for("GET /citation HTTP/1.1\r\n\r\n");
        assert!(response.starts_with("HTTP/1.1 503"));
        assert!(response.contains("bridge was started without --data-dir"));
    }

    #[test]
    fn unknown_path_is_404() {
        assert!(response_for("GET /nope HTTP/1.1\r\n\r\n").starts_with("HTTP/1.1 404"));
    }
}
