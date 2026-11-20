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

use std::env;
use std::os::unix::process::CommandExt;
use std::path::Path;
use std::process::Command;

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

fn main() {
    let exe = env::current_exe().expect("cannot resolve the AppRun path");
    let base = exe
        .parent()
        .expect("AppRun has no parent directory");
    let app = base.join("usr/lib/citewell/zotero");

    let args: Vec<String> = env::args().skip(1).collect();
    if missing_datadir_value(&args) {
        let name = env::args()
            .next()
            .unwrap_or_else(|| "CiteWell".to_string());
        eprintln!(
            "CiteWell: -datadir needs a directory.\n\n  \
             {name} -datadir \"$HOME/CiteWellData\"\n\n\
             Refusing to start, because without a value CiteWell would open the default \
             library instead."
        );
        std::process::exit(2);
    }

    if !app.is_file() {
        eprintln!(
            "CiteWell: bundled launcher missing at {}\n\
             This AppImage is incomplete; rebuild it with `cargo run -p xtask -- appimage`.",
            app.display()
        );
        std::process::exit(127);
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
    use super::missing_datadir_value;

    #[test]
    fn no_datadir_argument_is_fine() {
        assert!(!missing_datadir_value(&["-no-remote"]));
        assert!(!missing_datadir_value::<&str>(&[]));
    }

    #[test]
    fn separate_value_is_fine() {
        assert!(!missing_datadir_value(&["-datadir", "/tmp/cw"]));
        assert!(!missing_datadir_value(&["--datadir", "/tmp/cw"]));
        assert!(!missing_datadir_value(&[
            "-no-remote",
            "-datadir",
            "/tmp/cw",
            "-ZoteroDebugText"
        ]));
    }

    #[test]
    fn equals_form_is_fine() {
        assert!(!missing_datadir_value(&["-datadir=/tmp/cw"]));
        assert!(!missing_datadir_value(&["--datadir=/tmp/cw"]));
    }

    #[test]
    fn trailing_flag_is_rejected() {
        assert!(missing_datadir_value(&["-datadir"]));
        assert!(missing_datadir_value(&["-no-remote", "-datadir"]));
        assert!(missing_datadir_value(&["--datadir"]));
    }

    #[test]
    fn flag_is_case_insensitive() {
        assert!(missing_datadir_value(&["-DataDir"]));
        assert!(missing_datadir_value(&["-DATADIR"]));
    }

    #[test]
    fn empty_value_is_rejected() {
        assert!(missing_datadir_value(&["-datadir", ""]));
        assert!(missing_datadir_value(&["-datadir="]));
        assert!(missing_datadir_value(&["--datadir="]));
    }

    #[test]
    fn next_flag_instead_of_value_is_rejected() {
        assert!(missing_datadir_value(&["-datadir", "-no-remote"]));
    }
}
