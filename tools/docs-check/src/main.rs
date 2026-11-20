// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! Documentation gate for CiteWell.
//!
//! Enforces the rules that nothing else can enforce, because a budget or an index
//! that no check reads decays silently:
//!
//!   * `README.md` and `AGENTS.md` stay within their always-tier word budgets;
//!   * every documentation file is registered in the README index;
//!   * every registered path exists, exactly once;
//!   * every on-demand document carries the back-reference line.
//!
//! Usage, from the repository root:
//!
//! ```text
//! cargo run --quiet --manifest-path tools/docs-check/Cargo.toml
//! ```

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

const README_CAP: usize = 800;
const AGENTS_CAP: usize = 350;
const BACKREF: &str = "For the full documentation index";
const README: &str = "README.md";
const AGENTS: &str = "AGENTS.md";
const REGISTRY_HEADING: &str = "## Documentation index";
const ON_DEMAND: [&str; 1] = ["roadmap.md"];

fn words(text: &str) -> usize {
    text.split_whitespace().count()
}

/// Paths registered in the README index, mapped to the line they appear on.
/// A row counts only if its first cell is wrapped in backticks and the row sits
/// under the "Documentation index" heading; header and separator rows have no
/// backticked first cell and are ignored.
fn registry_entries(readme: &str) -> BTreeMap<String, usize> {
    let mut entries = BTreeMap::new();
    let mut in_registry = false;

    for (idx, line) in readme.lines().enumerate() {
        let trimmed = line.trim_end();
        if trimmed.starts_with("## ") {
            in_registry = trimmed == REGISTRY_HEADING;
            continue;
        }
        if !in_registry || !trimmed.starts_with('|') {
            continue;
        }
        let first_cell = trimmed
            .trim_start_matches('|')
            .split('|')
            .next()
            .unwrap_or("")
            .trim();
        let path = match first_cell.strip_prefix('`').and_then(|s| s.split('`').next()) {
            Some(path) if !path.is_empty() => path,
            _ => continue,
        };
        entries.entry(path.to_string()).or_insert(idx + 1);
    }

    entries
}

/// Documentation files that must appear in the index: the agent contract, the
/// roadmap, and every top-level markdown file under `docs/`.
fn documentation_files(root: &Path) -> Vec<String> {
    let mut files: Vec<String> = vec![AGENTS.to_string()];
    files.extend(ON_DEMAND.iter().map(|name| name.to_string()));

    if let Ok(entries) = fs::read_dir(root.join("docs")) {
        let mut names: Vec<String> = entries
            .filter_map(Result::ok)
            .filter(|entry| entry.path().is_file())
            .filter(|entry| entry.path().extension().and_then(|ext| ext.to_str()) == Some("md"))
            .map(|entry| format!("docs/{}", entry.file_name().to_string_lossy()))
            .collect();
        names.sort();
        files.extend(names);
    }

    files
}

fn read(root: &Path, relative: &str) -> Option<String> {
    fs::read_to_string(root.join(relative)).ok()
}

fn main() -> ExitCode {
    let root = PathBuf::from(std::env::args().nth(1).unwrap_or_else(|| ".".to_string()));
    let mut errors: Vec<String> = Vec::new();

    let readme = match read(&root, README) {
        Some(text) => text,
        None => {
            eprintln!("error: cannot read {README} at {}", root.display());
            return ExitCode::FAILURE;
        }
    };
    let agents = read(&root, AGENTS).unwrap_or_default();

    let readme_words = words(&readme);
    if readme_words > README_CAP {
        errors.push(format!(
            "{README}: {readme_words} words exceeds the {README_CAP}-word always-tier budget; move detail into an on-demand document"
        ));
    }

    let agents_words = words(&agents);
    if agents.is_empty() {
        errors.push(format!("{AGENTS}: missing"));
    } else if agents_words > AGENTS_CAP {
        errors.push(format!(
            "{AGENTS}: {agents_words} words exceeds the {AGENTS_CAP}-word budget"
        ));
    }

    let registry = registry_entries(&readme);
    if registry.is_empty() {
        errors.push(format!("{README}: no entries found under \"{REGISTRY_HEADING}\""));
    }

    for (path, line) in &registry {
        if !root.join(path).is_file() {
            errors.push(format!("{README}:{line}: registered path does not exist: {path}"));
        }
    }

    let required = documentation_files(&root);
    for file in &required {
        if !registry.contains_key(file) {
            errors.push(format!("{file}: not registered in the {README} documentation index"));
        }
    }

    for file in &required {
        if file == AGENTS {
            continue;
        }
        match read(&root, file) {
            Some(text) if !text.contains(BACKREF) => errors.push(format!(
                "{file}: missing the back-reference line (expected text: \"{BACKREF}\")"
            )),
            Some(_) => {}
            None => errors.push(format!("{file}: registered but could not be read")),
        }
    }

    println!(
        "docs-check: {README} {readme_words}/{README_CAP} words, {AGENTS} {agents_words}/{AGENTS_CAP} words, {} registered paths, {} documents required",
        registry.len(),
        required.len() + 1
    );

    if errors.is_empty() {
        ExitCode::SUCCESS
    } else {
        for error in &errors {
            eprintln!("error: {error}");
        }
        eprintln!("docs-check: {} problem(s) found", errors.len());
        ExitCode::FAILURE
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = "# Sample\n\n| Path | Note |\n|---|---|\n| `not-in-registry.md` | before heading |\n\n## Documentation index\n\n| File | Tier |\n|---|---|\n| `roadmap.md` | on-demand |\n| `docs/naming.md` | on-demand |\n\n## License\n\n| `ignored.md` | x |\n";

    #[test]
    fn parses_only_the_registry_table() {
        let entries = registry_entries(SAMPLE);
        assert!(entries.contains_key("roadmap.md"));
        assert!(entries.contains_key("docs/naming.md"));
        assert!(!entries.contains_key("not-in-registry.md"));
        assert!(!entries.contains_key("ignored.md"));
        assert_eq!(entries.len(), 2);
    }

    #[test]
    fn counts_words_across_lines() {
        assert_eq!(words("one two\nthree\n\nfour"), 4);
        assert_eq!(words(""), 0);
    }
}
