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

mod build;

/// What Gear Lever and AppImageUpdate read out of the AppImage. `latest` is GitHub's
/// newest stable release, so a test build must be published as a prerelease to stay
/// out of it.
const UPDATE_INFORMATION: &str =
    "gh-releases-zsync|EricBright|CiteWell|latest|CiteWell-*x86_64.AppImage.zsync";

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};

const USAGE: &str = "\
usage: cargo run -p xtask -- <command>

commands:
  appimage    assemble and package the staged Linux build as an AppImage
  build       copy JS/test data, apply patches, symlink, and compile Sass
  sass        compile scss/ into build/ (replaces Node Sass)
  validate-settings  validate resource/settings/panes.json
  help        show this message
";

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    match args.first().map(String::as_str) {
        Some("appimage") => appimage(),
        Some("build") => build::build(),
        Some("sass") => sass(),
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

fn sass() -> ExitCode {
    match sass_inner() {
        Ok(count) => {
            println!("sass: {count} files");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("xtask: {error}");
            ExitCode::FAILURE
        }
    }
}

pub(crate) fn sass_inner() -> Result<usize, String> {
    let root = repo_root();
    let source_root = root.join("scss");
    let build_root = root.join("build");
    let mut entries = Vec::new();
    collect_scss_entries(&source_root, &mut entries)?;
    entries.sort();

    let count = entries.len();
    let options = grass::Options::default().style(grass::OutputStyle::Compressed);
    for source in entries {
        let relative = source
            .strip_prefix(&source_root)
            .map_err(|e| format!("mapping {}: {e}", source.display()))?;
        let stem = relative
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or_else(|| format!("non-UTF-8 Sass filename: {}", source.display()))?;

        let (platform, stem) = match stem.rsplit_once('-') {
            Some((name, platform @ ("win" | "mac" | "unix"))) => (Some(platform), name),
            _ => (None, stem),
        };
        let dest = if let Some(platform) = platform {
            build_root
                .join("chrome/content/zotero-platform")
                .join(platform)
                .join(relative.parent().unwrap_or(Path::new("")))
                .join(format!("{stem}.css"))
        } else {
            build_root
                .join("chrome/skin/default/zotero")
                .join(relative.parent().unwrap_or(Path::new("")))
                .join(format!("{stem}.css"))
        };
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("creating {}: {e}", parent.display()))?;
        }
        let css = grass::from_path(&source, &options)
            .map_err(|e| format!("compiling {}: {e}", source.display()))?;
        fs::write(&dest, css).map_err(|e| format!("writing {}: {e}", dest.display()))?;
        // Source maps were development-only and are not consumed by the app.
        let map = PathBuf::from(format!("{}.map", dest.display()));
        let _ = fs::remove_file(map);
    }
    Ok(count)
}

fn collect_scss_entries(dir: &Path, out: &mut Vec<PathBuf>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("reading {}: {e}", dir.display()))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("reading {}: {e}", dir.display()))?;
        let path = entry.path();
        if path.is_dir() {
            collect_scss_entries(&path, out)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("scss")
            && !path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .starts_with('_')
        {
            out.push(path);
        }
    }
    Ok(())
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
    let text = fs::read_to_string(&path).map_err(|e| format!("reading {}: {e}", path.display()))?;
    let value: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("parsing {}: {e}", path.display()))?;
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
    let docs_path = root.join("docs/settings.md");
    let docs = fs::read_to_string(&docs_path)
        .map_err(|e| format!("reading {}: {e}", docs_path.display()))?;
    for pane in panes {
        let id = pane.get("id").and_then(|v| v.as_str()).unwrap();
        if !docs.contains(id) {
            return Err(format!(
                "settings pane {id} is not documented in docs/settings.md"
            ));
        }
    }
    let mut setting_ids = std::collections::BTreeSet::new();
    let mut preferences = std::collections::BTreeSet::new();
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
                return Err(format!(
                    "simple settings section {id} has unknown paneId {pane_id}"
                ));
            }
            if section.get("titleKey").and_then(|v| v.as_str()).is_none() {
                return Err(format!("simple settings section {id} is missing titleKey"));
            }
            let settings = section
                .get("settings")
                .and_then(|v| v.as_array())
                .ok_or_else(|| format!("simple settings section {id} is missing settings[]"))?;
            if let Some(aliases) = section.get("searchAliases") {
                if aliases
                    .as_array()
                    .is_none_or(|items| items.iter().any(|item| item.as_str().is_none()))
                {
                    return Err(format!(
                        "simple settings section {id} has invalid searchAliases"
                    ));
                }
            }
            for setting in settings {
                let setting_id = setting.get("id").and_then(|v| v.as_str()).ok_or_else(|| {
                    format!("simple settings section {id} has a setting without id")
                })?;
                if !setting_ids.insert(setting_id.to_string()) {
                    return Err(format!("duplicate simple setting id: {setting_id}"));
                }
                if let Some(alias_list) = setting.get("searchAliases") {
                    if alias_list
                        .as_array()
                        .is_none_or(|items| items.iter().any(|item| item.as_str().is_none()))
                    {
                        return Err(format!(
                            "simple setting {setting_id} has invalid searchAliases"
                        ));
                    }
                }
                let setting_type = setting.get("type").and_then(|v| v.as_str());
                if !matches!(
                    setting_type,
                    Some("checkbox") | Some("radio") | Some("number") | Some("button")
                ) {
                    return Err(format!("simple setting {setting_id} has unsupported type"));
                }
                if setting_type == Some("button")
                    && setting.get("action").and_then(|v| v.as_str()).is_none()
                {
                    return Err(format!("simple setting {setting_id} is missing action"));
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
                        .ok_or_else(|| {
                            format!("simple setting {setting_id} is missing options[]")
                        })?;
                    if options.len() < 2 {
                        return Err(format!(
                            "simple setting {setting_id} has too few radio options"
                        ));
                    }
                }
                if setting_type != Some("button")
                    && setting.get("preference").and_then(|v| v.as_str()).is_none()
                {
                    return Err(format!("simple setting {setting_id} is missing preference"));
                }
                if let Some(pref) = setting.get("preference").and_then(|v| v.as_str()) {
                    if !preferences.insert(pref.to_string()) {
                        return Err(format!("duplicate simple preference key: {pref}"));
                    }
                }
                if !matches!(setting_type, Some("number") | Some("button"))
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
                    return Err(format!(
                        "retired settings entry {id} has unknown paneId {pane_id}"
                    ));
                }
            }
        }
    }
    Ok(panes.len())
}

pub(crate) fn repo_root() -> PathBuf {
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
    for required in ["chrome/content/zotero-platform/unix/zotero.css"] {
        if !listing.contains(required) {
            return Err(format!(
                "staged build is incomplete (missing {required}).\n\
                 Rebuild from scratch:\n  gio trash -f build .signatures.json\n  \
                 cargo run --manifest-path tools/Cargo.toml -p xtask -- build\n  app/scripts/dir_build -p l"
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
        .arg("-u")
        .arg(UPDATE_INFORMATION)
        .arg(&appdir)
        .arg(&output)
        .status()
        .map_err(|e| format!("running {tool}: {e} (set APPIMAGETOOL to override)"))?;

    if !status.success() {
        return Err(format!("{tool} exited with {status}"));
    }

    // The update information is the contract Gear Lever reads out of the file with
    // readelf; prove it landed instead of trusting the packaging tool.
    let printed = Command::new(&output)
        .arg("--appimage-updateinformation")
        .output()
        .map_err(|e| format!("reading the embedded update information: {e}"))?;
    let embedded = String::from_utf8_lossy(&printed.stdout).trim().to_string();
    if embedded != UPDATE_INFORMATION {
        return Err(format!(
            "embedded update information is {embedded:?}, expected {UPDATE_INFORMATION:?}"
        ));
    }

    // The zsync file and the checksum are release assets, not build afterthoughts:
    // without them Gear Lever can describe the update but not fetch it.
    let file = output
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "the AppImage has no file name".to_string())?
        .to_string();
    let zsync = output.with_file_name(format!("{file}.zsync"));
    let zsync_status = Command::new("zsyncmake")
        .arg("-u")
        .arg(format!(
            "https://github.com/EricBright/CiteWell/releases/latest/download/{file}"
        ))
        .arg("-o")
        .arg(&zsync)
        .arg(&output)
        .status()
        .map_err(|e| format!("running zsyncmake: {e}"))?;
    if !zsync_status.success() || !zsync.is_file() {
        return Err(format!("zsyncmake did not write {}", zsync.display()));
    }

    let sum = Command::new("sha256sum")
        .arg(&output)
        .output()
        .map_err(|e| format!("running sha256sum: {e}"))?;
    if !sum.status.success() {
        return Err("sha256sum failed".to_string());
    }
    let text = String::from_utf8_lossy(&sum.stdout);
    let hash = text
        .split_whitespace()
        .next()
        .ok_or_else(|| "sha256sum printed no hash".to_string())?;
    let checksum = output.with_file_name(format!("{file}.sha256"));
    fs::write(&checksum, format!("{hash}  {file}\n"))
        .map_err(|e| format!("writing {}: {e}", checksum.display()))?;

    Ok(output)
}

fn build_importer(root: &Path) -> Result<PathBuf, String> {
    let status = Command::new(env::var("CARGO").unwrap_or_else(|_| "cargo".to_string()))
        .current_dir(root.join("tools"))
        .args(["build", "--release", "--quiet", "-p", "citewell-import"])
        .status()
        .map_err(|e| format!("building the import helper: {e}"))?;
    if !status.success() {
        return Err(format!(
            "cargo build for the import helper failed ({status})"
        ));
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

    let oxt =
        root.join("extensions/citewell-libreoffice/build/CiteWell_LibreOffice_Integration.oxt");
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
