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
  help        show this message
";

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    match args.first().map(String::as_str) {
        Some("appimage") => appimage(),
        Some("connectors") => connectors(),
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
        println!("installing connector dependencies");
        let status = run(
            Command::new("npm")
                .current_dir(&dir)
                .env("npm_config_cache", root.join(".npm-cache"))
                .args(["install", "--no-audit", "--no-fund"]),
            "npm install",
        )?;
        if !status {
            return Err("npm install failed".to_string());
        }
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

    let work = root.join("build/appimage");
    let appdir = work.join("AppDir");
    if appdir.exists() {
        fs::remove_dir_all(&appdir).map_err(|e| format!("clearing {}: {e}", appdir.display()))?;
    }

    // 1. The application itself.
    let app_dest = appdir.join("usr/lib/citewell");
    copy_dir(&staged, &app_dest)?;

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
    let output = root.join("build/dist/CiteWell-x86_64.AppImage");
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
