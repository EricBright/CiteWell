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

fn main() {
    let exe = env::current_exe().expect("cannot resolve the AppRun path");
    let base = exe
        .parent()
        .expect("AppRun has no parent directory");
    let app = base.join("usr/lib/citewell/zotero");

    if !app.is_file() {
        eprintln!(
            "CiteWell: bundled launcher missing at {}\n\
             This AppImage is incomplete; rebuild it with `cargo run -p xtask -- appimage`.",
            app.display()
        );
        std::process::exit(127);
    }

    let mut command = Command::new(&app);
    command.args(env::args().skip(1));

    // exec() replaces this process; it only returns on failure.
    let error = command.exec();
    eprintln!(
        "CiteWell: failed to start {}: {error}",
        Path::new(&app).display()
    );
    std::process::exit(127);
}
