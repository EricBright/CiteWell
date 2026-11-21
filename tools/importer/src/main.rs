// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! Command-line face of the import file engine.
//!
//! The app calls this before Gecko opens the library database. It is
//! intentionally small and line-oriented; the application owns the state
//! machine and the database.

use std::env;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use citewell_import::{apply, count_tree, stage_with_progress, verify_staging};

fn usage() -> String {
    "usage:\n  \
     citewell-import stage --source DIR --staging DIR\n  \
     citewell-import verify --staging DIR\n  \
     citewell-import apply --staging DIR --data-dir DIR --backup DIR\n"
        .to_string()
}

struct Arguments {
    command: String,
    source: Option<PathBuf>,
    staging: Option<PathBuf>,
    data_dir: Option<PathBuf>,
    backup: Option<PathBuf>,
}

fn parse() -> Result<Arguments, String> {
    let mut args = env::args().skip(1);
    let command = args.next().ok_or_else(usage)?;
    if command == "--help" || command == "-h" {
        print!("{}", usage());
        std::process::exit(0);
    }
    if command == "--version" {
        println!("citewell-import {}", env!("CARGO_PKG_VERSION"));
        std::process::exit(0);
    }

    let mut parsed = Arguments {
        command,
        source: None,
        staging: None,
        data_dir: None,
        backup: None,
    };

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--source" => parsed.source = Some(take(&mut args, &arg)?),
            "--staging" => parsed.staging = Some(take(&mut args, &arg)?),
            "--data-dir" => parsed.data_dir = Some(take(&mut args, &arg)?),
            "--backup" => parsed.backup = Some(take(&mut args, &arg)?),
            other => return Err(format!("unknown argument: {other}\n{}", usage())),
        }
    }

    Ok(parsed)
}

fn take(args: &mut impl Iterator<Item = String>, name: &str) -> Result<PathBuf, String> {
    args.next()
        .map(PathBuf::from)
        .ok_or_else(|| format!("missing value for {name}\n{}", usage()))
}

fn require(path: Option<PathBuf>, name: &str) -> Result<PathBuf, String> {
    path.ok_or_else(|| format!("missing {name}\n{}", usage()))
}

fn run() -> Result<(), String> {
    let args = parse()?;
    match args.command.as_str() {
        "stage" => {
            let source = require(args.source, "--source")?;
            let staging = require(args.staging, "--staging")?;
            let report = stage_with_progress(&source, &staging, &mut |files, bytes| {
                // Called every 200 files; the app shows this as progress.
                println!("progress files={files} bytes={bytes}");
            })?;
            println!("ok staged files={} bytes={}", report.files, report.bytes);
        }
        "verify" => {
            let staging = require(args.staging, "--staging")?;
            verify_staging(&staging)?;
            let report = count_tree(&staging.join("storage"))?;
            println!("ok verified files={} bytes={}", report.files, report.bytes);
        }
        "apply" => {
            let staging = require(args.staging, "--staging")?;
            let data_dir = require(args.data_dir, "--data-dir")?;
            let backup = require(args.backup, "--backup")?;
            apply(&staging, &data_dir, &backup)?;
            println!("ok applied backup={}", display(&backup));
        }
        other => return Err(format!("unknown command: {other}\n{}", usage())),
    }
    Ok(())
}

fn display(path: &Path) -> String {
    path.display().to_string()
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error {error}");
            ExitCode::FAILURE
        }
    }
}
