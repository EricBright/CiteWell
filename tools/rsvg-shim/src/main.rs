// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! Minimal `rsvg-convert` replacement, so the connector build needs no C tool.
//!
//! Supported, because the connector's build uses only these:
//!   rsvg-convert INPUT -w WIDTH -h HEIGHT [-s STYLESHEET] -o OUTPUT
//!
//! The stylesheet option is honoured for the one thing it is used for: giving
//! `context-fill` icons a concrete colour. `context-fill` has no meaning outside
//! Gecko, so it is resolved before rendering.

use std::env;
use std::fs;
use std::process::ExitCode;

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("rsvg-convert: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<(), String> {
    let mut input: Option<String> = None;
    let mut output: Option<String> = None;
    let mut width: Option<u32> = None;
    let mut height: Option<u32> = None;
    let mut stylesheet: Option<String> = None;

    let mut args = env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "-w" | "--width" => width = args.next().and_then(|v| v.parse().ok()),
            "-h" | "--height" => height = args.next().and_then(|v| v.parse().ok()),
            "-o" | "--output" => output = args.next(),
            "-s" | "--stylesheet" => stylesheet = args.next(),
            other if other.starts_with('-') => {
                // Unknown flags are ignored rather than fatal: the goal is to
                // keep the connector build working, not to replace librsvg.
                eprintln!("rsvg-convert: ignoring unsupported option {other}");
            }
            other => input = Some(other.to_string()),
        }
    }

    let input = input.ok_or("no input file")?;
    let output = output.ok_or("no output file (-o)")?;
    let mut data = fs::read(&input).map_err(|e| format!("reading {input}: {e}"))?;

    if let Some(path) = stylesheet {
        if let Ok(css) = fs::read_to_string(&path) {
            if let Some(color) = css_colour(&css) {
                let svg = String::from_utf8_lossy(&data).replace("context-fill", &color);
                data = svg.into_bytes();
            }
        }
    }

    let tree = resvg::usvg::Tree::from_data(&data, &resvg::usvg::Options::default())
        .map_err(|e| format!("parsing {input}: {e}"))?;
    let size = tree.size();
    let target_width = width.unwrap_or(size.width() as u32).max(1);
    let target_height = height.unwrap_or(size.height() as u32).max(1);

    let mut pixmap = resvg::tiny_skia::Pixmap::new(target_width, target_height)
        .ok_or("cannot allocate the output bitmap")?;
    let scale = resvg::tiny_skia::Transform::from_scale(
        target_width as f32 / size.width(),
        target_height as f32 / size.height(),
    );
    resvg::render(&tree, scale, &mut pixmap.as_mut());
    pixmap
        .save_png(&output)
        .map_err(|e| format!("writing {output}: {e}"))
}

/// Pull the first `#rrggbb` out of a stylesheet such as `path { fill: #39bf68; }`.
fn css_colour(css: &str) -> Option<String> {
    let bytes = css.as_bytes();
    for (i, _) in css.match_indices('#') {
        let rest = &bytes[i..];
        if rest.len() >= 7 && rest[1..7].iter().all(|b| b.is_ascii_hexdigit()) {
            return Some(String::from_utf8_lossy(&rest[..7]).to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::css_colour;

    #[test]
    fn extracts_colour() {
        assert_eq!(css_colour("path { fill: #39bf68; }").as_deref(), Some("#39bf68"));
        assert_eq!(css_colour("path { fill: #db2c3a; }").as_deref(), Some("#db2c3a"));
        assert_eq!(css_colour("path { fill: red; }"), None);
    }
}
