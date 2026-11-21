// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! Minimal loopback bridge for the CiteWell LibreOffice shim.
//!
//! The extension only needs a CiteWell-owned identity on 127.0.0.1:23121.
//! Citation protocol work grows here; the first endpoint is `/health`.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
use std::time::Duration;

const DEFAULT_PORT: u16 = 23121;

fn main() -> std::io::Result<()> {
    let port = std::env::var("CITEWELL_LO_PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(DEFAULT_PORT);
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
        let body = r#"{"app":"CiteWell","version":1,"health":"ok"}"#;
        format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        )
    } else {
        let body = "not found";
        format!(
            "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        )
    }
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
    fn unknown_path_is_404() {
        assert!(response_for("GET /nope HTTP/1.1\r\n\r\n").starts_with("HTTP/1.1 404"));
    }
}
