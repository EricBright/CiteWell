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

fn call_tool(client: &Client, token: &str, params: &Value) -> Result<Value, (i64, String)> {
    let name = params
        .get("name")
        .and_then(|name| name.as_str())
        .ok_or((-32602, "tools/call requires a tool name".to_string()))?;
    let arguments = params
        .get("arguments")
        .cloned()
        .unwrap_or_else(|| json!({}));

    let (method, call_params) = match name {
        "citewell_status" => ("ping", json!({})),
        "search_library" => (
            "search",
            json!({
                "query": arguments.get("query").cloned().unwrap_or(Value::Null),
                "limit": arguments.get("limit").cloned().unwrap_or(json!(25))
            }),
        ),
        "get_item" => ("item.get", json!({ "key": required(&arguments, "key")? })),
        "create_item" => ("item.create", arguments),
        "update_item" => (
            "item.update",
            json!({
                "key": required(&arguments, "key")?,
                "fields": arguments.get("fields").cloned().unwrap_or(json!({})),
                "creators": arguments.get("creators").cloned(),
                "tags": arguments.get("tags").cloned()
            }),
        ),
        "add_note" => (
            "item.addNote",
            json!({
                "key": required(&arguments, "key")?,
                "text": required(&arguments, "text")?
            }),
        ),
        "attach_file" => (
            "item.attachFile",
            json!({
                "key": required(&arguments, "key")?,
                "path": required(&arguments, "path")?,
                "title": arguments.get("title").cloned()
            }),
        ),
        "attach_url" => (
            "item.attachURL",
            json!({
                "key": required(&arguments, "key")?,
                "url": required(&arguments, "url")?,
                "title": arguments.get("title").cloned()
            }),
        ),
        "save_identifier" => ("translate.save", arguments),
        "list_annotations" => (
            "annotation.list",
            json!({ "key": required(&arguments, "key")? }),
        ),
        "create_annotation" => ("annotation.create", arguments),
        "export_note" => (
            "export.note",
            json!({ "key": required(&arguments, "key")? }),
        ),
        "list_collections" => ("collection.list", json!({})),
        "create_collection" => (
            "collection.create",
            json!({
                "name": required(&arguments, "name")?,
                "parentKey": arguments.get("parentKey").cloned()
            }),
        ),
        "add_to_collection" => (
            "collection.addItems",
            json!({
                "collectionKey": required(&arguments, "collectionKey")?,
                "itemKeys": required(&arguments, "itemKeys")?
            }),
        ),
        "get_selection" => ("ui.status", json!({})),
        "select_items" => (
            "ui.select",
            json!({ "keys": required(&arguments, "keys")? }),
        ),
        "open_item" => ("ui.open", json!({ "key": required(&arguments, "key")? })),
        "notify" => (
            "ui.notify",
            json!({ "text": required(&arguments, "text")? }),
        ),
        _ => return Err((-32602, format!("Unknown tool: {name}"))),
    };

    match client.agent_call(token, method, call_params) {
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

fn required(arguments: &Value, name: &str) -> Result<Value, (i64, String)> {
    arguments
        .get(name)
        .cloned()
        .ok_or((-32602, format!("Missing required argument: {name}")))
}

fn tools() -> Value {
    json!([
        tool(
            "citewell_status",
            "Check that CiteWell is running and report its version.",
            json!({}),
            &[]
        ),
        tool(
            "search_library",
            "Search the CiteWell library by title, creator, tag or full text.",
            json!({
                "query": { "type": "string" },
                "limit": { "type": "integer", "minimum": 1, "maximum": 100 }
            }),
            &["query"]
        ),
        tool(
            "get_item",
            "Fetch one item by its CiteWell key, including notes and attachments.",
            json!({ "key": { "type": "string" } }),
            &["key"]
        ),
        tool(
            "create_item",
            "Create an item with fields, creators and tags, optionally in collections.",
            json!({
                "itemType": { "type": "string" },
                "fields": { "type": "object" },
                "creators": { "type": "array" },
                "tags": { "type": "array" },
                "collections": { "type": "array" }
            }),
            &["itemType"]
        ),
        tool(
            "update_item",
            "Update an existing item's fields, creators or tags.",
            json!({
                "key": { "type": "string" },
                "fields": { "type": "object" },
                "creators": { "type": "array" },
                "tags": { "type": "array" }
            }),
            &["key"]
        ),
        tool(
            "add_note",
            "Add a Markdown note file attachment to an item.",
            json!({
                "key": { "type": "string" },
                "text": { "type": "string" }
            }),
            &["key", "text"]
        ),
        tool(
            "attach_file",
            "Attach a file from an absolute path to an item.",
            json!({
                "key": { "type": "string" },
                "path": { "type": "string" },
                "title": { "type": "string" }
            }),
            &["key", "path"]
        ),
        tool(
            "attach_url",
            "Attach a URL to an item.",
            json!({
                "key": { "type": "string" },
                "url": { "type": "string" },
                "title": { "type": "string" }
            }),
            &["key", "url"]
        ),
        tool(
            "save_identifier",
            "Create an item from a DOI, ISBN, PMID or page URL using Zotero translators.",
            json!({
                "identifier": { "type": "string" },
                "collections": { "type": "array" },
                "saveAttachments": { "type": "boolean" }
            }),
            &["identifier"]
        ),
        tool(
            "list_annotations",
            "List annotations on a PDF or EPUB attachment.",
            json!({ "key": { "type": "string" } }),
            &["key"]
        ),
        tool(
            "create_annotation",
            "Create a highlight, underline, note or text annotation on an attachment.",
            json!({
                "key": { "type": "string" },
                "type": { "type": "string", "enum": ["highlight", "underline", "note", "text"] },
                "text": { "type": "string" },
                "comment": { "type": "string" },
                "color": { "type": "string" },
                "pageLabel": { "type": "string" },
                "position": { "type": "object" },
                "sortIndex": { "type": "string" }
            }),
            &["key", "position"]
        ),
        tool(
            "export_note",
            "Export a note as Markdown text.",
            json!({ "key": { "type": "string" } }),
            &["key"]
        ),
        tool("list_collections", "List collections.", json!({}), &[]),
        tool(
            "create_collection",
            "Create a collection, optionally inside another collection.",
            json!({ "name": { "type": "string" }, "parentKey": { "type": "string" } }),
            &["name"]
        ),
        tool(
            "add_to_collection",
            "Add existing items to a collection.",
            json!({
                "collectionKey": { "type": "string" },
                "itemKeys": { "type": "array", "items": { "type": "string" } }
            }),
            &["collectionKey", "itemKeys"]
        ),
        tool(
            "get_selection",
            "Show the current window selection.",
            json!({}),
            &[]
        ),
        tool(
            "select_items",
            "Select items in the main window.",
            json!({ "keys": { "type": "array", "items": { "type": "string" } } }),
            &["keys"]
        ),
        tool(
            "open_item",
            "Open an item, note or attachment in the main window.",
            json!({ "key": { "type": "string" } }),
            &["key"]
        ),
        tool(
            "notify",
            "Show a short message in the app so the person sees what happened.",
            json!({ "text": { "type": "string" } }),
            &["text"]
        )
    ])
}

fn tool(name: &str, description: &str, properties: Value, required: &[&str]) -> Value {
    json!({
        "name": name,
        "description": description,
        "inputSchema": {
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": false
        }
    })
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
        assert_eq!(names.len(), 19);
        for expected in [
            "search_library",
            "create_item",
            "save_identifier",
            "create_annotation",
            "export_note",
            "attach_file",
            "select_items",
            "open_item",
        ] {
            assert!(names.contains(&expected), "missing tool {expected}");
        }
    }

    #[test]
    fn requires_arguments() {
        assert!(required(&json!({}), "key").is_err());
        assert_eq!(required(&json!({ "key": "A" }), "key").unwrap(), "A");
    }
}
