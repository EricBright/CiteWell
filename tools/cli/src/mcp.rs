// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! Minimal MCP server over stdio.
//!
//! MCP clients start this process and exchange newline-delimited JSON-RPC. Every tool maps to one
//! method on the app's `/agent/v1` bridge, so the CLI remains a thin client and the app remains the
//! only place that touches the library.

use std::io::{self, BufRead, Write};
use std::path::PathBuf;

use serde_json::{json, Value};

use crate::{read_agent_token, CliError, Client};

pub fn run(client: &Client, data_dir: Option<PathBuf>) -> Result<(), CliError> {
    let token = read_agent_token(data_dir)?;
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = line.map_err(|e| (3, format!("citewell: cannot read stdin: {e}")))?;
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let message: Value = match serde_json::from_str(line) {
            Ok(message) => message,
            Err(_) => {
                writeln!(
                    stdout,
                    "{}",
                    json!({
                        "jsonrpc": "2.0",
                        "id": null,
                        "error": { "code": -32700, "message": "Parse error" }
                    })
                )
                .ok();
                stdout.flush().ok();
                continue;
            }
        };
        let response = handle(client, &token, &message);
        if let Some(response) = response {
            writeln!(stdout, "{response}")
                .map_err(|e| (3, format!("citewell: write failed: {e}")))?;
            stdout.flush().ok();
        }
    }
    Ok(())
}

fn handle(client: &Client, token: &str, message: &Value) -> Option<Value> {
    let id = message.get("id").cloned();
    let method = message.get("method").and_then(|method| method.as_str());
    let params = message.get("params").cloned().unwrap_or_else(|| json!({}));

    // Notifications have no id and must not receive a response.
    let method = method?;
    if id.is_none() || id == Some(Value::Null) {
        return None;
    }
    let id = id.unwrap();

    let result = match method {
        "initialize" => Ok(json!({
            "protocolVersion": params
                .get("protocolVersion")
                .and_then(|version| version.as_str())
                .unwrap_or("2024-11-05"),
            "capabilities": { "tools": {} },
            "serverInfo": { "name": "citewell", "version": env!("CARGO_PKG_VERSION") }
        })),
        "ping" => Ok(json!({})),
        "tools/list" => Ok(json!({ "tools": tools() })),
        "tools/call" => call_tool(client, token, &params),
        "shutdown" => Ok(json!({})),
        _ => Err((-32601, format!("Method not found: {method}"))),
    };

    Some(match result {
        Ok(value) => json!({ "jsonrpc": "2.0", "id": id, "result": value }),
        Err((code, message)) => json!({
            "jsonrpc": "2.0",
            "id": id,
            "error": { "code": code, "message": message }
        }),
    })
}

/// The single description of every agent verb, shared with the app and the docs.
const VERBS_JSON: &str = include_str!("../../../resource/agent/verbs.json");

fn manifest() -> Value {
    serde_json::from_str(VERBS_JSON).expect("agent verb manifest is not valid JSON")
}

fn find_tool<'a>(manifest: &'a Value, name: &str) -> Option<&'a Value> {
    manifest["verbs"]
        .as_array()?
        .iter()
        .find(|verb| verb["mcp"].as_str() == Some(name))
}

fn call_tool(client: &Client, token: &str, params: &Value) -> Result<Value, (i64, String)> {
    let name = params
        .get("name")
        .and_then(|name| name.as_str())
        .ok_or((-32602, "tools/call requires a tool name".to_string()))?;
    let arguments = params
        .get("arguments")
        .cloned()
        .unwrap_or_else(|| json!({}));

    let manifest = manifest();
    let entry = find_tool(&manifest, name).ok_or((-32602, format!("Unknown tool: {name}")))?;
    if let Some(required) = entry["required"].as_array() {
        for field in required {
            let field = field.as_str().unwrap_or_default();
            if arguments.get(field).is_none() {
                return Err((-32602, format!("Missing required argument: {field}")));
            }
        }
    }
    let method = entry["verb"]
        .as_str()
        .ok_or((-32602, format!("Tool {name} has no verb")))?;

    match client.agent_call(token, method, arguments) {
        Ok(result) => Ok(json!({
            "content": [{ "type": "text", "text": serde_json::to_string_pretty(&result).unwrap_or_default() }],
            "isError": false
        })),
        Err((_, message)) => Ok(json!({
            "content": [{ "type": "text", "text": message }],
            "isError": true
        })),
    }
}

fn tools() -> Value {
    let manifest = manifest();
    let tools: Vec<Value> = manifest["verbs"]
        .as_array()
        .map(|verbs| {
            verbs
                .iter()
                .filter_map(|verb| {
                    let name = verb["mcp"].as_str()?;
                    Some(json!({
                        "name": name,
                        "description": verb["description"],
                        "inputSchema": {
                            "type": "object",
                            "properties": verb["params"].clone(),
                            "required": verb["required"].clone(),
                            "additionalProperties": false
                        }
                    }))
                })
                .collect()
        })
        .unwrap_or_default();
    json!(tools)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_the_bridge_verbs_as_tools() {
        let tools = tools();
        let names: Vec<&str> = tools
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|tool| tool.get("name").and_then(|name| name.as_str()))
            .collect();
        assert_eq!(names.len(), 17);
        for expected in [
            "search_library",
            "create_item",
            "save_identifier",
            "export_note",
            "attach_file",
            "select_items",
            "open_item",
        ] {
            assert!(names.contains(&expected), "missing tool {expected}");
        }
    }

    #[test]
    fn every_manifest_verb_is_unique_and_has_an_mcp_name_or_null() {
        let manifest = manifest();
        let verbs = manifest["verbs"].as_array().unwrap();
        let mut seen = std::collections::BTreeSet::new();
        let mut tool_names = std::collections::BTreeSet::new();
        for verb in verbs {
            let name = verb["verb"].as_str().expect("verb is required");
            assert!(seen.insert(name.to_string()), "duplicate verb {name}");
            if let Some(tool) = verb["mcp"].as_str() {
                assert!(tool_names.insert(tool.to_string()), "duplicate MCP name {tool}");
            }
        }
        assert_eq!(seen.len(), 18);
    }

    #[test]
    fn finds_a_tool_by_name() {
        let manifest = manifest();
        assert!(find_tool(&manifest, "get_item").is_some());
        assert_eq!(
            find_tool(&manifest, "get_item").unwrap()["verb"],
            "item.get"
        );
        assert!(find_tool(&manifest, "not_a_tool").is_none());
    }
}
