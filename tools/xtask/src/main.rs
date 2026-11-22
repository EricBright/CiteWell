// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! CiteWell build orchestration.
//!
//! Everything here is a thin Rust driver over tools that already exist. The
//! goal is not to reimplement `appimagetool` or `mksquashfs`, but to make the
//! packaging steps explicit, checkable and reproducible — and to keep the
//! CiteWell-specific logic out of upstream's shell scripts.

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};

const USAGE: &str = "\
usage: cargo run -p xtask -- <command>

commands:
  appimage    assemble and package the staged Linux build as an AppImage
  connectors  build the Firefox connector and package it as an XPI
  validate-settings  validate resource/settings/panes.json
  help        show this message
";

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    match args.first().map(String::as_str) {
        Some("appimage") => appimage(),
        Some("connectors") => connectors(),
        Some("validate-settings") => validate_settings(),
        Some("help") | Some("--help") | Some("-h") | None => {
            print!("{USAGE}");
            ExitCode::SUCCESS
        }
        Some(other) => {
            eprintln!("xtask: unknown command '{other}'\n\n{USAGE}");
            ExitCode::FAILURE
        }
    }
}

fn validate_settings() -> ExitCode {
    match validate_settings_inner() {
        Ok(count) => {
            println!("settings: {count} panes valid");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("xtask: {error}");
            ExitCode::FAILURE
        }
    }
}

fn validate_settings_inner() -> Result<usize, String> {
    let root = repo_root();
    let path = root.join("resource/settings/panes.json");
    let text = fs::read_to_string(&path)
        .map_err(|e| format!("reading {}: {e}", path.display()))?;
    let value: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("parsing {}: {e}", path.display()))?;
    if value.get("version").and_then(|v| v.as_u64()) != Some(1) {
        return Err("settings manifest version must be 1".to_string());
    }
    let panes = value
        .get("panes")
        .and_then(|v| v.as_array())
        .ok_or_else(|| "settings manifest is missing panes[]".to_string())?;
    if panes.is_empty() {
        return Err("settings manifest has no panes".to_string());
    }
    let mut ids = std::collections::BTreeSet::new();
    for pane in panes {
        let id = pane
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "settings pane is missing id".to_string())?;
        if !ids.insert(id.to_string()) {
            return Err(format!("duplicate settings pane id: {id}"));
        }
        if pane.get("label").and_then(|v| v.as_str()).is_none()
            && pane.get("rawLabel").and_then(|v| v.as_str()).is_none()
        {
            return Err(format!("settings pane {id} is missing label/rawLabel"));
        }
        if pane.get("order").and_then(|v| v.as_i64()).is_none() {
            return Err(format!("settings pane {id} is missing numeric order"));
        }
        let content = pane
            .get("content")
            .ok_or_else(|| format!("settings pane {id} is missing content"))?;
        if content.get("type").and_then(|v| v.as_str()) != Some("custom") {
            return Err(format!("settings pane {id} has unsupported content type"));
        }
        if content.get("src").and_then(|v| v.as_str()).is_none() {
            return Err(format!("settings pane {id} is missing content.src"));
        }
        let scripts = content
            .get("scripts")
            .and_then(|v| v.as_array())
            .ok_or_else(|| format!("settings pane {id} is missing content.scripts[]"))?;
        if scripts.iter().any(|script| script.as_str().is_none()) {
            return Err(format!("settings pane {id} has a non-string script"));
        }
    }
    for pane in panes {
        if let Some(parent) = pane.get("parent").and_then(|v| v.as_str()) {
            if !ids.contains(parent) {
                return Err(format!("settings pane has unknown parent: {parent}"));
            }
        }
    }
    if let Some(sections) = value.get("simpleSections") {
        let sections = sections
            .as_array()
            .ok_or_else(|| "settings simpleSections must be an array".to_string())?;
        for section in sections {
            let id = section
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "simple settings section is missing id".to_string())?;
            let pane_id = section
                .get("paneId")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("simple settings section {id} is missing paneId"))?;
            if !ids.contains(pane_id) {
                return Err(format!("simple settings section {id} has unknown paneId {pane_id}"));
            }
            if section.get("titleKey").and_then(|v| v.as_str()).is_none() {
                return Err(format!("simple settings section {id} is missing titleKey"));
            }
            let settings = section
                .get("settings")
                .and_then(|v| v.as_array())
                .ok_or_else(|| format!("simple settings section {id} is missing settings[]"))?;
            for setting in settings {
                let setting_id = setting
                    .get("id")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| format!("simple settings section {id} has a setting without id"))?;
                let setting_type = setting.get("type").and_then(|v| v.as_str());
                if !matches!(setting_type, Some("checkbox") | Some("radio") | Some("number")) {
                    return Err(format!("simple setting {setting_id} has unsupported type"));
                }
                if setting_type == Some("number") {
                    for key in ["beforeKey", "afterKey"] {
                        if setting.get(key).and_then(|v| v.as_str()).is_none() {
                            return Err(format!("simple setting {setting_id} is missing {key}"));
                        }
                    }
                }
                if setting_type == Some("radio") {
                    let options = setting
                        .get("options")
                        .and_then(|v| v.as_array())
                        .ok_or_else(|| format!("simple setting {setting_id} is missing options[]"))?;
                    if options.len() < 2 {
                        return Err(format!("simple setting {setting_id} has too few radio options"));
                    }
                }
                if setting.get("preference").and_then(|v| v.as_str()).is_none() {
                    return Err(format!("simple setting {setting_id} is missing preference"));
                }
                if setting_type != Some("number")
                    && setting.get("labelKey").and_then(|v| v.as_str()).is_none()
                {
                    return Err(format!("simple setting {setting_id} is missing labelKey"));
                }
            }
        }
    }
    if let Some(retired) = value.get("retired") {
        let retired = retired
            .as_array()
            .ok_or_else(|| "settings manifest retired must be an array".to_string())?;
        for item in retired {
            let id = item
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "retired settings entry is missing id".to_string())?;
            if let Some(pane_id) = item.get("paneId").and_then(|v| v.as_str()) {
                if !ids.contains(pane_id) {
                    return Err(format!("retired settings entry {id} has unknown paneId {pane_id}"));
                }
            }
        }
    }
    Ok(panes.len())
}

fn connectors() -> ExitCode {
    match connectors_inner() {
        Ok(path) => {
            println!("built {}", path.display());
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("xtask: {error}");
            ExitCode::FAILURE
        }
    }
}

fn connectors_inner() -> Result<PathBuf, String> {
    let root = repo_root();
    let dir = root.join("connectors");

    if !dir.join("build.sh").is_file() {
        return Err("connectors/ is missing; import it with git subtree first".to_string());
    }

    if !dir.join("node_modules").is_dir() {
        return Err(
            "connectors/node_modules is missing; npm is retired (D32) and xtask will not install it"
                .to_string(),
        );
    }

    // The connector's build calls rsvg-convert; use our Rust replacement.
    let status = run(
        Command::new(env::var("CARGO").unwrap_or_else(|_| "cargo".to_string()))
            .current_dir(root.join("tools"))
            .args(["build", "--quiet", "-p", "rsvg-shim"]),
        "building the rsvg shim",
    )?;
    if !status {
        return Err("building the rsvg shim failed".to_string());
    }

    let version = env::var("CITEWELL_CONNECTOR_VERSION").unwrap_or_else(|_| "0.1.0".to_string());
    let path = format!(
        "{}:{}",
        root.join("tools/target/debug").display(),
        env::var("PATH").unwrap_or_default()
    );
    let status = run(
        Command::new("./build.sh")
            .current_dir(&dir)
            .env("PATH", path)
            .args(["-p", "b", "-d", "-v", &version]),
        "building the connector",
    )?;
    if !status {
        return Err("connector build failed".to_string());
    }

    let firefox = dir.join("build/firefox");
    if !firefox.join("manifest.json").is_file() {
        return Err(format!(
            "no Firefox build at {} — did build.sh change its output layout?",
            firefox.display()
        ));
    }

    render_connector_dark_icons(&root, &firefox)?;
    apply_connector_icons(&root, &firefox)?;
    render_connector_state_icons(&root, &firefox)?;
    apply_brand(&root, &firefox)?;

    let output = root.join("build/dist/CiteWell-Connector.xpi");
    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("creating {}: {e}", parent.display()))?;
    }
    if output.exists() {
        fs::remove_file(&output).map_err(|e| format!("replacing {}: {e}", output.display()))?;
    }

    let status = run(
        Command::new("zip")
            .current_dir(&firefox)
            .arg("-q")
            .arg("-r")
            .arg("-X")
            .arg(&output)
            .arg("."),
        "packaging the XPI",
    )?;
    if !status {
        return Err("zip failed".to_string());
    }

    Ok(output)
}

/// Render the dark book-section variants the connector's build does not produce.
/// Item icons come from the app skin, which ships light, dark and white artwork;
/// only light reaches the build, so the dark set is rendered here.
fn render_connector_dark_icons(root: &Path, firefox: &Path) -> Result<(), String> {
    let skin = root.join("chrome/skin/default/zotero/item-type/16/dark");
    let svg_16 = skin.join("book-section.svg");
    let svg_32 = skin.join("book-section@2x.svg");
    let images = firefox.join("images");
    let toolbar = images.join("toolbar");
    fs::create_dir_all(&toolbar).map_err(|e| format!("creating {}: {e}", toolbar.display()))?;

    copy(&svg_16, &images.join("book-section-dark.svg"))?;
    copy(&svg_32, &images.join("book-section-dark@2x.svg"))?;

    let shim = root.join("tools/target/debug/rsvg-convert");
    for (source, width, height, name) in [
        (&svg_16, 16u32, 16u32, "book-section-dark@16.png"),
        (&svg_32, 32, 32, "book-section-dark.png"),
        (&svg_32, 48, 48, "book-section-dark@48.png"),
    ] {
        render(&shim, source, width, height, &toolbar.join(name))?;
    }
    Ok(())
}

/// Give the extension itself the same icon as every badge: book-section.
/// The upstream Icon-*.png files are the Zotero mark, which would mean the
/// toolbar button, the add-ons page and the badges show three different shapes.
fn apply_connector_icons(root: &Path, firefox: &Path) -> Result<(), String> {
    let skin = root.join("chrome/skin/default/zotero/item-type/16/light");
    let shim = root.join("tools/target/debug/rsvg-convert");

    for (source, size, name) in [
        ("book-section.svg", 16u32, "Icon-16.png"),
        ("book-section@2x.svg", 32, "Icon-32.png"),
        ("book-section@2x.svg", 64, "Icon-64.png"),
        ("book-section@2x.svg", 128, "Icon-128.png"),
    ] {
        render(&shim, &skin.join(source), size, size, &firefox.join(name))?;
    }

    // Point the default toolbar state at the same shape, with a dark variant,
    // so there is no moment where a different icon is shown.
    let manifest_path = firefox.join("manifest.json");
    let text = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("reading {}: {e}", manifest_path.display()))?;
    let mut manifest: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("parsing manifest: {e}"))?;

    let toolbar = |size: u32, dark: bool| {
        let suffix = if size == 32 { String::new() } else { format!("@{size}") };
        let theme = if dark { "-dark" } else { "" };
        format!("images/toolbar/book-section{theme}{suffix}.png")
    };

    let key = if manifest.get("browser_action").is_some() {
        "browser_action"
    } else {
        "action"
    };
    let action = manifest
        .get_mut(key)
        .and_then(|value| value.as_object_mut())
        .ok_or("manifest has no browser_action/action object")?;

    action.insert(
        "default_icon".to_string(),
        serde_json::json!({
            "16": toolbar(16, false),
            "32": toolbar(32, false),
            "48": toolbar(48, false),
        }),
    );
    action.insert(
        "theme_icons".to_string(),
        serde_json::json!([
            {"size": 16, "light": toolbar(16, false), "dark": toolbar(16, true)},
            {"size": 32, "light": toolbar(32, false), "dark": toolbar(32, true)},
            {"size": 48, "light": toolbar(48, false), "dark": toolbar(48, true)},
        ]),
    );

    let written = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("serialising manifest: {e}"))?;
    fs::write(&manifest_path, written)
        .map_err(|e| format!("writing {}: {e}", manifest_path.display()))?;

    Ok(())
}

fn render(shim: &Path, source: &Path, width: u32, height: u32, target: &Path) -> Result<(), String> {
    let status = Command::new(shim)
        .arg(source)
        .args(["-w", &width.to_string(), "-h", &height.to_string()])
        .arg("-o")
        .arg(target)
        .status()
        .map_err(|e| format!("running {}: {e}", shim.display()))?;
    if !status.success() {
        return Err(format!("rendering {}", target.display()));
    }
    Ok(())
}

/// State is a corner dot on the same silhouette, never a different shape.
/// Colour carries the state; the toolbar title (Saving / Saved / Save failed)
/// is the accessible channel, since colour alone is not.
fn render_connector_state_icons(root: &Path, firefox: &Path) -> Result<(), String> {
    let light = root.join("chrome/skin/default/zotero/item-type/16/light/book-section.svg");
    let dark = root.join("chrome/skin/default/zotero/item-type/16/dark/book-section.svg");
    let toolbar = firefox.join("images/toolbar");
    let shim = root.join("tools/target/debug/rsvg-convert");
    fs::create_dir_all(&toolbar).map_err(|e| format!("creating {}: {e}", toolbar.display()))?;

    let light_svg = fs::read_to_string(&light)
        .map_err(|e| format!("reading {}: {e}", light.display()))?;
    // The light base icon used to be rendered from icons/badged/book-section.svg,
    // which is deleted; render it from the app skin like everything else.
    let light_16 = root.join("chrome/skin/default/zotero/item-type/16/light/book-section.svg");
    let light_32 = root.join("chrome/skin/default/zotero/item-type/16/light/book-section@2x.svg");
    render(&shim, &light_16, 16, 16, &toolbar.join("book-section@16.png"))?;
    render(&shim, &light_32, 32, 32, &toolbar.join("book-section.png"))?;
    render(&shim, &light_32, 48, 48, &toolbar.join("book-section@48.png"))?;

    let dark_svg = fs::read_to_string(&dark)
        .map_err(|e| format!("reading {}: {e}", dark.display()))?;

    let states = [
        ("saving", "#F0A020"),
        ("saved", "#39BF68"),
        ("error", "#DB2C3A"),
        ("offline", "#8A8F98"),
    ];

    for (state, colour) in states {
        for (theme, base, ring) in [
            ("", &light_svg, "#FFFFFF"),
            ("-dark", &dark_svg, "#1C1C1C"),
        ] {
            let composite = with_corner_dot(base, colour, ring);
            let temp = toolbar.join("_state.svg");
            fs::write(&temp, composite).map_err(|e| format!("writing {}: {e}", temp.display()))?;

            for (size, suffix) in [(16u32, "@16"), (32, ""), (48, "@48")] {
                let target = toolbar.join(format!("book-section-{state}{theme}{suffix}.png"));
                render(&shim, &temp, size, size, &target)?;
            }
        }
    }

    let temp = toolbar.join("_state.svg");
    fs::remove_file(&temp).ok();
    Ok(())
}

/// Wrap the book-section artwork and put a ringed dot in the bottom-right corner.
fn with_corner_dot(base: &str, colour: &str, ring: &str) -> String {
    let start = base.find('>').map(|i| i + 1).unwrap_or(0);
    let end = base.rfind("</svg>").unwrap_or(base.len());
    let inner = &base[start..end];
    let outer_r = 3.4;
    let inner_r = 2.5;
    let centre = 16.0 - outer_r - 0.3;
    format!(
        "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'>\
         {inner}<circle cx='{centre:.2}' cy='{centre:.2}' r='{outer_r}' fill='{ring}'/>\
         <circle cx='{centre:.2}' cy='{centre:.2}' r='{inner_r}' fill='{colour}'/></svg>"
    )
}

/// Substitute the brand tokens in the packaged extension from one file, then
/// fail if a hardcoded product name survived anywhere user-visible. Source
/// strings carry `{{brand}}` and friends; only `connectors/brand.json` holds
/// the actual values, so renaming happens in one place.
fn apply_brand(root: &Path, firefox: &Path) -> Result<(), String> {
    let brand_path = root.join("connectors/brand.json");
    let text = fs::read_to_string(&brand_path)
        .map_err(|e| format!("reading {}: {e}", brand_path.display()))?;
    let brand: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("parsing brand.json: {e}"))?;

    let value = |key: &str| -> Result<String, String> {
        brand
            .get(key)
            .and_then(|v| v.as_str())
            .map(str::to_string)
            .ok_or_else(|| format!("brand.json is missing '{key}'"))
    };
    let tokens = [
        ("{{brand}}", value("name")?),
        ("{{connector}}", value("connector")?),
        ("{{description}}", value("description")?),
        ("{{defaultTitle}}", value("defaultTitle")?),
        ("{{extensionId}}", value("extensionId")?),
        ("{{homepage}}", value("homepage")?),
        ("{{issues}}", value("issues")?),
    ];

    let mut files = Vec::new();
    collect_text_files(firefox, &mut files)?;
    for path in files {
        let body = fs::read_to_string(&path)
            .map_err(|e| format!("reading {}: {e}", path.display()))?;
        let mut updated = body.clone();
        for (token, replacement) in &tokens {
            updated = updated.replace(token, replacement);
        }
        if updated != body {
            fs::write(&path, &updated)
                .map_err(|e| format!("writing {}: {e}", path.display()))?;
        }
        for (token, _) in &tokens {
            if updated.contains(token) {
                return Err(format!("{} still contains {}", path.display(), token));
            }
        }
    }

    // Guard against drift: these phrases must not survive into the UI.
    for forbidden in ["Zotero Connector", "Save to Zotero"] {
        for path in text_files(firefox)? {
            let relative = path.strip_prefix(firefox).unwrap_or(&path);
            let name = relative.to_string_lossy();
            if name.contains("translate/") || name.contains("utilities/") || name == "COPYING"
                || name.starts_with("test/") || name.contains("/test/")
            {
                continue;
            }
            // Other locales are translated upstream and may still say Zotero;
            // only the English strings are ours to police here.
            if name.contains("_locales/") && !name.contains("_locales/en/") {
                continue;
            }
            if let Ok(body) = fs::read_to_string(&path) {
                // messages.json carries developer descriptions next to user text;
                // only the message values matter for drift.
                if name.ends_with("messages.json") {
                    if let Ok(serde_json::Value::Object(entries)) =
                        serde_json::from_str::<serde_json::Value>(&body)
                    {
                        let hit = entries.values().any(|entry| {
                            entry
                                .get("message")
                                .and_then(|m| m.as_str())
                                .map(|m| m.contains(forbidden))
                                .unwrap_or(false)
                        });
                        if hit {
                            return Err(format!(
                                "'{forbidden}' is hardcoded in {name}; use a brand token instead"
                            ));
                        }
                    }
                    continue;
                }
                let offending = body.lines().find(|line| {
                    let trimmed = line.trim_start();
                    let is_comment = trimmed.starts_with("//")
                        || trimmed.starts_with('*')
                        || trimmed.starts_with("/*");
                    !is_comment && line.contains(forbidden)
                });
                if offending.is_some() {
                    return Err(format!(
                        "'{forbidden}' is hardcoded in {name}; use a brand token instead"
                    ));
                }
            }
        }
    }
    Ok(())
}

fn text_files(dir: &Path) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();
    collect_text_files(dir, &mut files)?;
    Ok(files)
}

fn collect_text_files(dir: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("reading {}: {e}", dir.display()))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("reading {}: {e}", dir.display()))?;
        let path = entry.path();
        if path.is_dir() {
            collect_text_files(&path, files)?;
            continue;
        }
        let extension = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        if matches!(extension, "js" | "jsx" | "html" | "json" | "css" | "svg" | "ftl") {
            files.push(path);
        }
    }
    Ok(())
}

fn run(command: &mut Command, what: &str) -> Result<bool, String> {
    let status = command
        .status()
        .map_err(|e| format!("{what}: {e}"))?;
    Ok(status.success())
}

fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("workspace layout changed")
        .to_path_buf()
}

fn appimage() -> ExitCode {
    match appimage_inner() {
        Ok(path) => {
            println!("built {}", path.display());
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("xtask: {error}");
            ExitCode::FAILURE
        }
    }
}

fn appimage_inner() -> Result<PathBuf, String> {
    let root = repo_root();
    let staged = root.join("app/staging/Zotero_linux-x86_64");

    if !staged.join("zotero").is_file() {
        return Err(format!(
            "no staged build at {}\nrun `app/scripts/dir_build -p l` first",
            staged.display()
        ));
    }

    // Never under build/: Zotero's packaging zips everything there into omni.ja,
    // which would sweep previous AppImages into the application.
    // A staged build can be missing assets if `build/` was deleted without
    // clearing `.signatures.json`: the JS/Sass tasks then think everything is
    // current and produce an incomplete bundle. Refuse to package that.
    let omni = staged.join("app/omni.ja");
    let listing = Command::new("unzip")
        .arg("-l")
        .arg(&omni)
        .output()
        .map_err(|e| format!("running unzip: {e}"))?;
    let listing = String::from_utf8_lossy(&listing.stdout);
    for required in [
        "chrome/content/zotero-platform/unix/zotero.css",
    ] {
        if !listing.contains(required) {
            return Err(format!(
                "staged build is incomplete (missing {required}).\n\
                 Rebuild from scratch:\n  gio trash -f build .signatures.json\n  \
                 node js-build/build.js\n  app/scripts/dir_build -p l"
            ));
        }
    }

    let work = root.join("tmp/appimage");
    let appdir = work.join("AppDir");
    if appdir.exists() {
        fs::remove_dir_all(&appdir).map_err(|e| format!("clearing {}: {e}", appdir.display()))?;
    }

    // 1. The application itself.
    let app_dest = appdir.join("usr/lib/citewell");
    copy_dir(&staged, &app_dest)?;

    // The import helper lives next to the app binary. It is built here, not
    // by the upstream staging script, so a source build keeps its own copy.
    let importer = build_importer(&root)?;
    let importer_dest = app_dest.join("citewell-import");
    copy(&importer, &importer_dest)?;
    make_executable(&importer_dest)?;

    // The CiteWell-owned OXT is built from extension source, never copied from
    // Zotero. A Python builder is used because the OXT format is a ZIP plus
    // Python UNO sources; no Python package dependencies are involved.
    let lo_oxt = build_lo_extension(&root)?;
    let lo_oxt_dest = app_dest.join("integration/libreoffice/CiteWell_LibreOffice_Integration.oxt");
    copy(&lo_oxt, &lo_oxt_dest)?;

    // 2. Desktop entry and icons.
    fs::create_dir_all(appdir.join("usr/share/icons/hicolor/256x256/apps"))
        .map_err(|e| format!("creating icon directory: {e}"))?;
    let desktop = root.join("packaging/citewell.desktop");
    let icon = root.join("packaging/citewell.png");
    copy(&desktop, &appdir.join("citewell.desktop"))?;
    copy(&icon, &appdir.join("citewell.png"))?;
    copy(&icon, &appdir.join(".DirIcon"))?;
    copy(
        &icon,
        &appdir.join("usr/share/icons/hicolor/256x256/apps/citewell.png"),
    )?;

    // 3. AppRun: a Rust launcher, so the bundle needs no shell interpreter.
    let launcher = build_launcher(&root)?;
    let app_run = appdir.join("AppRun");
    copy(&launcher, &app_run)?;
    make_executable(&app_run)?;

    // 4. Package. appimagetool and mksquashfs are build tools, not code of ours.
    let tool = env::var("APPIMAGETOOL").unwrap_or_else(|_| "appimagetool".to_string());
    let output = root.join("dist/CiteWell-x86_64.AppImage");
    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("creating {}: {e}", parent.display()))?;
    }

    println!("packaging {} -> {}", appdir.display(), output.display());
    let status = Command::new(&tool)
        .env("ARCH", "x86_64")
        .arg("--no-appstream")
        .arg(&appdir)
        .arg(&output)
        .status()
        .map_err(|e| format!("running {tool}: {e} (set APPIMAGETOOL to override)"))?;

    if !status.success() {
        return Err(format!("{tool} exited with {status}"));
    }

    Ok(output)
}

fn build_importer(root: &Path) -> Result<PathBuf, String> {
    let status = Command::new(env::var("CARGO").unwrap_or_else(|_| "cargo".to_string()))
        .current_dir(root.join("tools"))
        .args(["build", "--release", "--quiet", "-p", "citewell-import"])
        .status()
        .map_err(|e| format!("building the import helper: {e}"))?;
    if !status.success() {
        return Err(format!("cargo build for the import helper failed ({status})"));
    }

    let binary = root.join("tools/target/release/citewell-import");
    if !binary.is_file() {
        return Err(format!(
            "import helper binary missing at {}",
            binary.display()
        ));
    }
    Ok(binary)
}

fn build_lo_extension(root: &Path) -> Result<PathBuf, String> {
    let script = root.join("extensions/citewell-libreoffice/tools/build.py");
    let status = Command::new("python3")
        .arg(&script)
        .current_dir(root)
        .status()
        .map_err(|e| format!("building the LibreOffice OXT: {e}"))?;
    if !status.success() {
        return Err(format!("LibreOffice OXT build failed ({status})"));
    }

    let oxt = root.join(
        "extensions/citewell-libreoffice/build/CiteWell_LibreOffice_Integration.oxt",
    );
    if !oxt.is_file() {
        return Err(format!("LibreOffice OXT missing at {}", oxt.display()));
    }
    Ok(oxt)
}

fn build_launcher(root: &Path) -> Result<PathBuf, String> {
    let status = Command::new(env::var("CARGO").unwrap_or_else(|_| "cargo".to_string()))
        .current_dir(root.join("tools"))
        .args(["build", "--release", "--quiet", "-p", "citewell-launcher"])
        .status()
        .map_err(|e| format!("building the AppRun launcher: {e}"))?;
    if !status.success() {
        return Err(format!("cargo build for the launcher failed ({status})"));
    }

    let binary = root.join("tools/target/release/citewell-launcher");
    if !binary.is_file() {
        return Err(format!("launcher binary missing at {}", binary.display()));
    }
    Ok(binary)
}

fn copy(from: &Path, to: &Path) -> Result<(), String> {
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("creating {}: {e}", parent.display()))?;
    }
    fs::copy(from, to)
        .map(|_| ())
        .map_err(|e| format!("copying {} -> {}: {e}", from.display(), to.display()))
}

fn copy_dir(from: &Path, to: &Path) -> Result<(), String> {
    fs::create_dir_all(to).map_err(|e| format!("creating {}: {e}", to.display()))?;
    let entries = fs::read_dir(from).map_err(|e| format!("reading {}: {e}", from.display()))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("reading {}: {e}", from.display()))?;
        let source = entry.path();
        let target = to.join(entry.file_name());
        let file_type = entry
            .file_type()
            .map_err(|e| format!("stat {}: {e}", source.display()))?;

        if file_type.is_dir() {
            copy_dir(&source, &target)?;
        } else if file_type.is_file() {
            copy(&source, &target)?;
        } else if file_type.is_symlink() {
            let link = fs::read_link(&source)
                .map_err(|e| format!("reading symlink {}: {e}", source.display()))?;
            std::os::unix::fs::symlink(&link, &target)
                .map_err(|e| format!("linking {}: {e}", target.display()))?;
        }
    }
    Ok(())
}

fn make_executable(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    let mut permissions = fs::metadata(path)
        .map_err(|e| format!("stat {}: {e}", path.display()))?
        .permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions).map_err(|e| format!("chmod {}: {e}", path.display()))
}
