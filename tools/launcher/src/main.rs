// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! `AppRun` for the CiteWell AppImage.
//!
//! The AppImage format requires an executable named `AppRun` at the root of the
//! bundle. Writing it in Rust rather than as a shell script keeps the packaging
//! path free of new interpreters, and `exec` (not spawn) means signals and the
//! process group behave exactly as if the user had launched the app directly.
//!
//! The launcher also owns the user-scoped attention integration: a systemd user
//! unit and a D-Bus activation file. They are installed only when the AppImage
//! is actually running, only with an explicit `-datadir`, and always with a
//! printed path list plus a removal command.

use std::env;
use std::fs;
use std::os::unix::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;

const UNIT_NAME: &str = "citewell-attention.service";
const DBUS_NAME: &str = "org.citewell.CiteWell.service";
const MANIFEST: &str = "integration.txt";

/// Gecko's `-datadir` flag takes its value from the next argument. When the
/// flag is the last argument, or is followed by another flag, Gecko silently
/// ignores it and opens the default library. Because the whole point of the
/// flag is to keep the real library out of reach, refuse to start instead.
///
/// The `-datadir=PATH` and `--datadir=PATH` forms are accepted by Gecko and
/// are passed through here.
fn missing_datadir_value<S: AsRef<str>>(args: &[S]) -> bool {
    let mut i = 0;
    while i < args.len() {
        let arg = args[i].as_ref();
        let lower = arg.to_ascii_lowercase();

        if lower == "-datadir" || lower == "--datadir" {
            match args.get(i + 1) {
                Some(value) => {
                    let value = value.as_ref();
                    if value.is_empty() || value.starts_with('-') {
                        return true;
                    }
                    i += 2;
                    continue;
                }
                None => return true,
            }
        }

        if let Some(value) = lower
            .strip_prefix("-datadir=")
            .or_else(|| lower.strip_prefix("--datadir="))
        {
            if value.is_empty() {
                return true;
            }
        }

        i += 1;
    }
    false
}

fn datadir(args: &[String]) -> Option<String> {
    let mut i = 0;
    while i < args.len() {
        let arg = &args[i];
        if arg == "-datadir" || arg == "--datadir" {
            return args.get(i + 1).cloned();
        }
        if let Some(value) = arg
            .strip_prefix("-datadir=")
            .or_else(|| arg.strip_prefix("--datadir="))
        {
            return Some(value.to_string());
        }
        i += 1;
    }
    None
}

fn config_home() -> Result<PathBuf, String> {
    if let Some(path) = env::var_os("XDG_CONFIG_HOME") {
        return Ok(PathBuf::from(path));
    }
    let home = env::var_os("HOME").ok_or("HOME is not set")?;
    Ok(PathBuf::from(home).join(".config"))
}

fn data_home() -> Result<PathBuf, String> {
    if let Some(path) = env::var_os("XDG_DATA_HOME") {
        return Ok(PathBuf::from(path));
    }
    let home = env::var_os("HOME").ok_or("HOME is not set")?;
    Ok(PathBuf::from(home).join(".local").join("share"))
}

fn integration_paths() -> Result<(PathBuf, PathBuf, PathBuf), String> {
    let config = config_home()?;
    let data = data_home()?;
    Ok((
        config.join("systemd/user").join(UNIT_NAME),
        data.join("dbus-1/services").join(DBUS_NAME),
        config.join("citewell").join(MANIFEST),
    ))
}

fn unit_contents(appimage: &str, datadir: &str) -> String {
    format!(
        "[Unit]\n\
         Description=Activate CiteWell attention window\n\
         After=graphical-session.target\n\
         \n\
         [Service]\n\
         Type=oneshot\n\
         ExecStart=\"{appimage}\" --attention-activate --datadir \"{datadir}\"\n"
    )
}

fn dbus_contents() -> String {
    "[D-BUS Service]\n\
     Name=org.citewell.CiteWell\n\
     Exec=/usr/bin/systemctl --user start citewell-attention.service\n"
        .to_string()
}

fn write_if_changed(path: &Path, contents: &str) -> Result<bool, String> {
    if let Ok(existing) = fs::read_to_string(path) {
        if existing == contents {
            return Ok(false);
        }
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("{}: {e}", parent.display()))?;
    }
    fs::write(path, contents).map_err(|e| format!("{}: {e}", path.display()))?;
    Ok(true)
}

fn install_integration(appimage: &str, datadir: &str) -> Result<Vec<PathBuf>, String> {
    let (unit, dbus, manifest) = integration_paths()?;
    let mut changed = Vec::new();
    if write_if_changed(&unit, &unit_contents(appimage, datadir))? {
        changed.push(unit.clone());
    }
    if write_if_changed(&dbus, &dbus_contents())? {
        changed.push(dbus.clone());
    }
    let manifest_text = format!(
        "CiteWell attention integration\n\
         appimage={appimage}\n\
         datadir={datadir}\n\
         unit={}\n\
         dbus={}\n",
        unit.display(),
        dbus.display()
    );
    if write_if_changed(&manifest, &manifest_text)? {
        changed.push(manifest);
    }
    Ok(changed)
}

fn remove_integration() -> Result<Vec<PathBuf>, String> {
    let (unit, dbus, manifest) = integration_paths()?;
    let mut removed = Vec::new();
    for path in [unit, dbus, manifest] {
        if path.exists() {
            fs::remove_file(&path).map_err(|e| format!("{}: {e}", path.display()))?;
            removed.push(path);
        }
    }
    Ok(removed)
}

fn reload_systemd() {
    let _ = Command::new("/usr/bin/systemctl")
        .args(["--user", "daemon-reload"])
        .status();
}

fn print_notice(appimage: &str, changed: &[PathBuf]) {
    if changed.is_empty() {
        return;
    }
    eprintln!("CiteWell: installed user attention integration:");
    for path in changed {
        eprintln!("  {}", path.display());
    }
    eprintln!("Remove it with: {appimage} --remove-integration");
    eprintln!("Disable installation with: {appimage} --no-integration");
}

fn main() {
    let exe = env::current_exe().expect("cannot resolve the AppRun path");
    let base = exe.parent().expect("AppRun has no parent directory");
    let app = base.join("usr/lib/citewell/zotero");

    let mut args: Vec<String> = env::args().skip(1).collect();
    let remove = args.iter().any(|arg| arg == "--remove-integration");
    let install = args.iter().any(|arg| arg == "--install-integration") && !remove;
    let no_integration = args.iter().any(|arg| arg == "--no-integration");
    let activate = args.iter().any(|arg| arg == "--attention-activate");
    args.retain(|arg| {
        arg != "--remove-integration"
            && arg != "--install-integration"
            && arg != "--no-integration"
            && arg != "--attention-activate"
    });

    if missing_datadir_value(&args) {
        let name = env::args().next().unwrap_or_else(|| "CiteWell".to_string());
        eprintln!(
            "CiteWell: -datadir needs a directory.\n\n  \
             {name} -datadir \"$HOME/CiteWellData\"\n\n\
             Refusing to start, because without a value CiteWell would open the default \
             library instead."
        );
        std::process::exit(2);
    }

    if remove {
        match remove_integration() {
            Ok(removed) => {
                if removed.is_empty() {
                    eprintln!("CiteWell: no attention integration files were present.");
                }
                else {
                    eprintln!("CiteWell: removed attention integration:");
                    for path in removed {
                        eprintln!("  {}", path.display());
                    }
                    reload_systemd();
                }
                return;
            }
            Err(error) => {
                eprintln!("CiteWell: could not remove attention integration: {error}");
                std::process::exit(1);
            }
        }
    }

    if activate && datadir(&args).is_none() {
        eprintln!("CiteWell: --attention-activate requires -datadir.");
        std::process::exit(2);
    }

    if install {
        let (Some(appimage), Some(data)) = (env::var_os("APPIMAGE"), datadir(&args)) else {
            eprintln!("CiteWell: --install-integration needs APPIMAGE and -datadir.");
            std::process::exit(2);
        };
        let Some(appimage) = appimage.to_str() else {
            eprintln!("CiteWell: APPIMAGE is not valid UTF-8.");
            std::process::exit(2);
        };
        match install_integration(appimage, &data) {
            Ok(changed) => {
                if !changed.is_empty() {
                    reload_systemd();
                }
                print_notice(appimage, &changed);
                // An explicit install is a short-lived command, not an app launch.
                return;
            }
            Err(error) => {
                eprintln!("CiteWell: attention integration not installed: {error}");
                std::process::exit(1);
            }
        }
    }

    if activate == false && !no_integration {
        if let (Some(appimage), Some(data)) = (env::var_os("APPIMAGE"), datadir(&args)) {
            if let Some(appimage) = appimage.to_str() {
                match install_integration(appimage, &data) {
                    Ok(changed) => {
                        if !changed.is_empty() {
                            reload_systemd();
                        }
                        print_notice(appimage, &changed)
                    }
                    Err(error) => eprintln!("CiteWell: attention integration not installed: {error}"),
                }
            }
        }
    }

    if !app.is_file() {
        eprintln!(
            "CiteWell: bundled launcher missing at {}\n\
             This AppImage is incomplete; rebuild it with `cargo run -p xtask -- appimage`.",
            app.display()
        );
        std::process::exit(127);
    }

    if activate {
        args.push("-url".to_string());
        args.push("zotero://select".to_string());
    }
    let mut command = Command::new(&app);
    command.args(&args);

    // exec() replaces this process; it only returns on failure.
    let error = command.exec();
    eprintln!(
        "CiteWell: failed to start {}: {error}",
        Path::new(&app).display()
    );
    std::process::exit(127);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_datadir_is_detected() {
        assert!(missing_datadir_value(&["-datadir"]));
        assert!(missing_datadir_value(&["-datadir", "-no-remote"]));
        assert!(missing_datadir_value(&["--datadir="]));
        assert!(!missing_datadir_value(&["-datadir", "/tmp/cw"]));
        assert!(!missing_datadir_value(&["-datadir=/tmp/cw"]));
    }

    #[test]
    fn datadir_is_found_in_both_forms() {
        assert_eq!(datadir(&["-datadir".into(), "/tmp/cw".into()]), Some("/tmp/cw".into()));
        assert_eq!(datadir(&["--datadir=/tmp/cw".into()]), Some("/tmp/cw".into()));
    }

    #[test]
    fn unit_and_dbus_keep_the_datadir() {
        let unit = unit_contents("/tmp/CiteWell.AppImage", "/tmp/library");
        assert!(unit.contains("--attention-activate"));
        assert!(unit.contains("--datadir \"/tmp/library\""));
        let dbus = dbus_contents();
        assert!(dbus.contains("Name=org.citewell.CiteWell"));
        assert!(dbus.contains("systemctl --user start citewell-attention.service"));
    }
}
