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
        (&svg_16, 16, 16, "book-section-dark@16.png"),
        (&svg_32, 32, 32, "book-section-dark.png"),
        (&svg_32, 48, 48, "book-section-dark@48.png"),
    ] {
        let target = toolbar.join(name);
        let status = Command::new(&shim)
            .arg(source)
            .args(["-w", &width.to_string(), "-h", &height.to_string()])
            .arg("-o")
            .arg(&target)
            .status()
            .map_err(|e| format!("running {}: {e}", shim.display()))?;
        if !status.success() {
            return Err(format!("rendering {}", target.display()));
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
