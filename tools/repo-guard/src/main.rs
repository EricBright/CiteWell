// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! Dependency-free guard for the CiteWell dependency freeze (D32).
//!
//! It rejects staged changes that would reintroduce a package manager or a
//! tracked dependency tree, and it checks that the repository's npm
//! configuration stays fail-closed.
//!
//! Usage, from the repository root:
//!
//! ```text
//! cargo run --quiet --manifest-path tools/Cargo.toml -p repo-guard -- --staged
//! cargo run --quiet --manifest-path tools/Cargo.toml -p repo-guard -- --range BASE..HEAD
//! ```

use std::process::{Command, ExitCode};

const LOCKFILES: [&str; 2] = ["package-lock.json", "npm-shrinkwrap.json"];
const NPM_CONFIG: &str = ".npmrc";
const NPM_BUILD_FILES: [&str; 3] = [
    "js-build/note-editor.js",
    "js-build/reader.js",
    "js-build/document-worker.js",
];

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut mode = Mode::Staged;
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--staged" => mode = Mode::Staged,
            "--range" => {
                i += 1;
                match args.get(i) {
                    Some(range) => mode = Mode::Range(range.clone()),
                    None => return fail("--range needs BASE..HEAD"),
                }
            }
            "--help" | "-h" => {
                println!("usage: repo-guard [--staged | --range BASE..HEAD]");
                return ExitCode::SUCCESS;
            }
            other => return fail(&format!("unknown argument: {other}")),
        }
        i += 1;
    }

    let mut problems = Vec::new();
    let changed = match mode {
        Mode::Staged => git_lines(&["diff", "--cached", "--name-only", "--diff-filter=ACMRD"]),
        Mode::Range(range) => git_lines(&["diff", "--name-only", "--diff-filter=ACMRD", &range]),
    };
    let changed = match changed {
        Ok(lines) => lines,
        Err(error) => return fail(&error),
    };

    for path in &changed {
        if let Some(reason) = forbidden_path(path) {
            problems.push(format!("{path}: {reason}"));
        }
    }

    if let Ok(tracked) = git_lines(&["ls-files", "--", "node_modules", "**/node_modules/**"]) {
        for path in tracked {
            problems.push(format!("{path}: tracked node_modules are forbidden (D32)"));
        }
    }

    match std::fs::read_to_string(NPM_CONFIG) {
        Ok(text) if npm_config_is_fail_closed(&text) => {}
        Ok(_) => problems.push(format!(
            "{NPM_CONFIG}: must set offline=true and an unreachable loopback registry (D32)"
        )),
        Err(_) => problems.push(format!("{NPM_CONFIG}: missing or unreadable; npm must fail closed (D32)")),
    }

    for file in NPM_BUILD_FILES {
        if let Ok(text) = std::fs::read_to_string(file) {
            if contains_npm_command(&text) {
                problems.push(format!(
                    "{file}: npm command found; npm is retired, remove the fallback (D32)"
                ));
            }
        }
    }

    if problems.is_empty() {
        println!("repo-guard: dependency freeze holds");
        ExitCode::SUCCESS
    } else {
        for problem in &problems {
            eprintln!("error: {problem}");
        }
        eprintln!("repo-guard: {} problem(s); see D32", problems.len());
        ExitCode::FAILURE
    }
}

#[derive(Clone)]
enum Mode {
    Staged,
    Range(String),
}

fn fail(message: &str) -> ExitCode {
    eprintln!("error: {message}");
    ExitCode::FAILURE
}

fn git_lines(args: &[&str]) -> Result<Vec<String>, String> {
    let output = Command::new("git")
        .args(args)
        .output()
        .map_err(|error| format!("could not run git: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "git {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(str::to_string)
        .collect())
}

fn forbidden_path(path: &str) -> Option<&'static str> {
    if path == "package.json" {
        return Some("package changes are frozen; consult the owner (D32)");
    }
    if LOCKFILES.contains(&path) {
        return Some("lockfile changes are frozen; npm is retired (D32)");
    }
    if path == "node_modules" || path.starts_with("node_modules/") || path.contains("/node_modules/") {
        return Some("tracked node_modules are forbidden; the dependency tree stays untracked (D32)");
    }
    None
}

fn npm_config_is_fail_closed(text: &str) -> bool {
    let mut offline = false;
    let mut loopback = false;
    let mut scripts = false;
    for line in text.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let value = value.trim();
        match key.trim() {
            "offline" => offline = value.eq_ignore_ascii_case("true"),
            "registry" => {
                loopback = value.starts_with("http://127.0.0.1:") || value.starts_with("http://[::1]:");
            }
            "ignore-scripts" => scripts = value.eq_ignore_ascii_case("true"),
            _ => {}
        }
    }
    offline && loopback && scripts
}

fn contains_npm_command(text: &str) -> bool {
    const NEEDLES: [&str; 4] = ["npm ci", "npm install", "npm run ", "Command::new(\"npm\")"];
    NEEDLES.iter().any(|needle| text.contains(needle))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn package_and_lockfiles_are_forbidden() {
        assert!(forbidden_path("package.json").is_some());
        assert!(forbidden_path("package-lock.json").is_some());
        assert!(forbidden_path("npm-shrinkwrap.json").is_some());
        assert!(forbidden_path("notes.md").is_none());
    }

    #[test]
    fn nested_node_modules_are_forbidden() {
        assert!(forbidden_path("node_modules/x/index.js").is_some());
        assert!(forbidden_path("connectors/node_modules/x").is_some());
        assert!(forbidden_path("docs/node_modules.md").is_none());
    }

    #[test]
    fn npmrc_must_fail_closed() {
        assert!(npm_config_is_fail_closed(
            "offline=true\nregistry=http://127.0.0.1:9/\nignore-scripts=true\n"
        ));
        assert!(!npm_config_is_fail_closed(
            "offline=false\nregistry=https://registry.npmjs.org/\nignore-scripts=true\n"
        ));
        assert!(!npm_config_is_fail_closed("offline=true\n"));
    }

    #[test]
    fn npm_commands_are_detected() {
        assert!(contains_npm_command("await exec('npm ci')"));
        assert!(contains_npm_command("Command::new(\"npm\")"));
        assert!(!contains_npm_command("npm is retired; do not install it"));
    }

}
