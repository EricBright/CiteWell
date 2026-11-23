// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! Assemble `build/` without Node.
//!
//! This is the Rust replacement for `js-build/build.js`: copy JavaScript and
//! test data, apply the vendored-resource patches, create the source symlinks,
//! then compile Sass through `xtask sass`.

use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::ExitCode;

use regex::Regex;

const DIRS: &[&str] = &["chrome", "components", "defaults", "test"];
const COPY_DIRS: &[&str] = &["test/tests/data"];
const SYMLINK_DIRS: &[&str] = &[
    "chrome/content/zotero/xpcom/rdf",
    "chrome/content/zotero/xpcom/translate/src",
    "styles",
    "translators",
];
const SPECIAL_JS: &[&str] = &[
    "resource/react-virtualized.js",
    "resource/SingleFile/lib/single-file.js",
    "resource/citeproc_rs_wasm.js",
    "resource/vs/language/typescript/tsWorker.js",
    "resource/monacopilot.mjs",
    "resource/monacopilot-core.mjs",
];
const ACE_FILES: &[&str] = &[
    "resource/ace/ace.js",
    "resource/ace/ext-searchbox.js",
    "resource/ace/keybinding-emacs.js",
    "resource/ace/keybinding-vim.js",
    "resource/ace/mode-javascript.js",
    "resource/ace/theme-chrome.js",
    "resource/ace/theme-monokai.js",
    "resource/ace/worker-javascript.js",
];

pub fn build() -> ExitCode {
    match build_inner() {
        Ok(()) => {
            println!("build: complete");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("xtask: {error}");
            ExitCode::FAILURE
        }
    }
}

fn build_inner() -> Result<(), String> {
    let root = crate::repo_root();
    let build = root.join("build");
    fs::create_dir_all(&build).map_err(|e| format!("creating {}: {e}", build.display()))?;

    let js = build_js(&root, &build)?;
    let copied = copy_test_data(&root, &build)?;
    let links = link_sources(&root, &build)?;
    let sass = crate::sass_inner()?;

    println!("build: {js} JS files, {copied} data files, {links} symlinks, {sass} Sass entries");
    Ok(())
}

fn build_js(root: &Path, build: &Path) -> Result<usize, String> {
    let mut files = Vec::new();
    for dir in DIRS {
        walk_files(&root.join(dir), &mut files)?;
    }
    let mut count = 0;
    for source in files {
        let rel = relative(&root, &source);
        let rel_str = slash(&rel);
        if !rel_str.ends_with(".js") {
            continue;
        }
        if is_ignored(&rel_str)
            || under_any(&rel_str, COPY_DIRS)
            || under_any(&rel_str, SYMLINK_DIRS)
        {
            continue;
        }
        copy_patched(&source, &build.join(&rel))?;
        count += 1;
    }
    for rel in SPECIAL_JS {
        let source = root.join(rel);
        if source.is_file() {
            copy_patched(&source, &build.join(rel))?;
            count += 1;
        }
    }
    Ok(count)
}

fn copy_test_data(root: &Path, build: &Path) -> Result<usize, String> {
    let mut files = Vec::new();
    for dir in COPY_DIRS {
        walk_files_with_hidden(&root.join(dir), &mut files, true)?;
    }
    let mut count = 0;
    for source in files {
        let rel = relative(root, &source);
        if is_ignored(&slash(&rel)) {
            continue;
        }
        let dest = build.join(&rel);
        make_parent(&dest)?;
        fs::copy(&source, &dest)
            .map_err(|e| format!("copying {} to {}: {e}", source.display(), dest.display()))?;
        count += 1;
    }
    Ok(count)
}

fn link_sources(root: &Path, build: &Path) -> Result<usize, String> {
    let mut count = 0;

    let mut files = Vec::new();
    for dir in DIRS {
        walk_files(&root.join(dir), &mut files)?;
    }
    for source in files {
        let rel = relative(root, &source);
        let rel_str = slash(&rel);
        if rel_str.ends_with(".js")
            || rel_str.ends_with(".scss")
            || is_ignored(&rel_str)
            || under_any(&rel_str, COPY_DIRS)
            || under_any(&rel_str, SYMLINK_DIRS)
        {
            continue;
        }
        ensure_symlink(&source, &build.join(&rel))?;
        count += 1;
    }

    for dir in SYMLINK_DIRS {
        let source = root.join(dir);
        if !source.exists() {
            continue;
        }
        ensure_symlink(&source, &build.join(dir))?;
        count += 1;
    }

    for rel in ["chrome.manifest", "version"] {
        let source = root.join(rel);
        if source.is_file() {
            ensure_symlink(&source, &build.join(rel))?;
            count += 1;
        }
    }

    let mut resources = Vec::new();
    walk_files(&root.join("resource"), &mut resources)?;
    for source in resources {
        let rel = relative(root, &source);
        let rel_str = slash(&rel);
        if is_ignored(&rel_str) || !is_resource_symlink(&rel_str) {
            continue;
        }
        ensure_symlink(&source, &build.join(&rel))?;
        count += 1;
    }
    Ok(count)
}

fn is_resource_symlink(rel: &str) -> bool {
    if rel == "resource/react-virtualized.js"
        || rel == "resource/citeproc_rs_wasm.js"
        || rel == "resource/vs/language/typescript/tsWorker.js"
        || rel == "resource/monacopilot.mjs"
        || rel == "resource/monacopilot-core.mjs"
    {
        return false;
    }
    if let Some(rest) = rel.strip_prefix("resource/SingleFile/") {
        return rest.starts_with("lib/") && rest != "lib/single-file.js";
    }
    if rel.starts_with("resource/ace/") {
        return ACE_FILES.contains(&rel);
    }
    if rel.starts_with("resource/feeds/") && rel.ends_with(".idl") {
        return false;
    }
    rel.starts_with("resource/")
}

fn is_ignored(rel: &str) -> bool {
    if rel.split('/').any(|part| part.starts_with('#')) {
        return true;
    }
    rel.starts_with("chrome/content/zotero/xpcom/translate/example/")
        || rel == "chrome/content/zotero/xpcom/translate/README.md"
        || rel.starts_with("chrome/content/zotero/xpcom/utilities/node_modules/")
        || rel.starts_with("chrome/content/zotero/xpcom/utilities/test/")
        || rel == "resource/schema/global/README.md"
        || rel == "resource/schema/global/schema.json.gz"
        || rel.starts_with("resource/schema/global/scripts/")
}

fn under_any(rel: &str, dirs: &[&str]) -> bool {
    dirs.iter()
        .any(|dir| rel == *dir || rel.starts_with(&format!("{dir}/")))
}

fn walk_files(dir: &Path, out: &mut Vec<PathBuf>) -> Result<(), String> {
    walk_files_with_hidden(dir, out, false)
}

fn walk_files_with_hidden(
    dir: &Path,
    out: &mut Vec<PathBuf>,
    include_hidden: bool,
) -> Result<(), String> {
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(format!("reading {}: {error}", dir.display())),
    };
    for entry in entries {
        let entry = entry.map_err(|e| format!("reading {}: {e}", dir.display()))?;
        let path = entry.path();
        if !include_hidden
            && path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .starts_with('.')
        {
            continue;
        }
        let meta = match fs::metadata(&path) {
            Ok(meta) => meta,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(error) => return Err(format!("reading metadata for {}: {error}", path.display())),
        };
        if meta.is_dir() {
            walk_files_with_hidden(&path, out, include_hidden)?;
        } else {
            out.push(path);
        }
    }
    Ok(())
}

fn copy_patched(source: &Path, dest: &Path) -> Result<(), String> {
    let bytes = fs::read(source).map_err(|e| format!("reading {}: {e}", source.display()))?;
    let rel = slash(&relative(&crate::repo_root(), source));
    let bytes = patch_js(&rel, bytes)?;
    make_parent(dest)?;
    fs::write(dest, bytes).map_err(|e| format!("writing {}: {e}", dest.display()))
}

fn patch_js(rel: &str, bytes: Vec<u8>) -> Result<Vec<u8>, String> {
    let text = String::from_utf8(bytes).map_err(|e| format!("{rel} is not valid UTF-8: {e}"))?;
    let patched = if rel == "resource/react-virtualized.js" {
        let replaced = text
            .replace(
                "scrollDiv = document.createElement(\"div\")",
                "scrollDiv = document.createElementNS(\"http://www.w3.org/1999/xhtml\", \"div\")",
            )
            .replace(
                "document.body.appendChild(scrollDiv)",
                "document.documentElement.appendChild(scrollDiv)",
            )
            .replace(
                "document.body.removeChild(scrollDiv)",
                "document.documentElement.removeChild(scrollDiv)",
            );
        let re = Regex::new(r"(_this\.state\.isScrolling\s*\|\|\s*isScrollingChange\(!0\),\s*)(_this\.setState\s*\(\s*\{[^}]*\}\s*\))")
            .map_err(|e| format!("building react-virtualized regex: {e}"))?;
        let replaced = re
            .replace(&replaced, "${1}ReactDOM.flushSync(() => ${2})")
            .to_string();
        if replaced == text {
            return Err("react-virtualized patch did not apply".to_string());
        }
        replaced
    } else if rel == "resource/SingleFile/lib/single-file.js" {
        text.replace("globalThis.Set", "Set")
            .replace("globalThis.Map", "Map")
    } else if rel == "resource/vs/language/typescript/tsWorker.js" {
        let replaced = text.replace("function getTypeOfSymbol(symbol) {", "function getTypeOfSymbol(symbol) {\n\t\t\t\t  switch (symbol.escapedName) {\n\t\t\t\t\t  case \"doc\":\n\t\t\t\t\t\t  return getGlobalType(\"Document\", 0, true);\n\t\t\t\t\t  case \"url\":\n\t\t\t\t\t\t  return stringType;\n\t\t\t\t\t  case \"checkOnly\":\n\t\t\t\t\t\t  return booleanType;\n\t\t\t\t  }\n\t\t\t");
        if replaced == text {
            return Err("tsWorker.js patch did not apply".to_string());
        }
        replaced
    } else if rel == "resource/monacopilot.mjs" {
        let replaced = text.replace("from'@monacopilot/core'", "from'./monacopilot-core.mjs'");
        if replaced == text {
            return Err("monacopilot.mjs patch did not apply".to_string());
        }
        format!("\n\t\t\timport {{ setTimeout, clearTimeout }} from \"resource://gre/modules/Timer.sys.mjs\";\n\t\t{replaced}")
    } else if rel == "resource/monacopilot-core.mjs" {
        let replaced = text.replace("api.mistral.ai", "codestral.mistral.ai");
        if replaced == text {
            return Err("monacopilot-core.mjs patch did not apply".to_string());
        }
        format!("\n\t\t\timport {{ setTimeout, clearTimeout }} from \"resource://gre/modules/Timer.sys.mjs\";\n\t\t{replaced}")
    } else {
        text
    };
    Ok(patched.into_bytes())
}

fn make_parent(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("creating {}: {e}", parent.display()))?;
    }
    Ok(())
}

fn ensure_symlink(source: &Path, dest: &Path) -> Result<(), String> {
    make_parent(dest)?;
    if dest.is_symlink() || dest.is_file() {
        fs::remove_file(dest).map_err(|e| format!("replacing {}: {e}", dest.display()))?;
    } else if dest.is_dir() {
        fs::remove_dir_all(dest).map_err(|e| format!("replacing {}: {e}", dest.display()))?;
    }
    #[cfg(unix)]
    {
        let parent = dest.parent().unwrap_or_else(|| Path::new("."));
        let target = diff_paths(source, parent).ok_or_else(|| {
            format!(
                "cannot make relative link from {} to {}",
                dest.display(),
                source.display()
            )
        })?;
        std::os::unix::fs::symlink(target, dest)
            .map_err(|e| format!("symlinking {} to {}: {e}", dest.display(), source.display()))
    }
    #[cfg(not(unix))]
    {
        fs::copy(source, dest)
            .map(|_| ())
            .map_err(|e| format!("copying {} to {}: {e}", source.display(), dest.display()))
    }
}

fn relative(root: &Path, path: &Path) -> PathBuf {
    path.strip_prefix(root).unwrap_or(path).to_path_buf()
}

fn slash(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn diff_paths(path: &Path, base: &Path) -> Option<PathBuf> {
    let mut ita = path.components();
    let mut itb = base.components();
    let mut comps: Vec<Component> = Vec::new();
    loop {
        match (ita.next(), itb.next()) {
            (None, None) => break,
            (Some(a), None) => {
                comps.push(a);
                comps.extend(ita);
                break;
            }
            (None, _) => comps.push(Component::ParentDir),
            (Some(a), Some(b)) if a == b => {}
            (Some(a), Some(b)) => {
                comps.push(Component::ParentDir);
                for _ in itb {
                    comps.push(Component::ParentDir);
                }
                let _ = b;
                comps.push(a);
                comps.extend(ita);
                break;
            }
        }
    }
    Some(comps.into_iter().collect())
}
