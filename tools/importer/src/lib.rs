// Copyright © 2026 Eric Bright
// This file is part of CiteWell, a fork of Zotero.
// Licensed under the GNU Affero General Public License, version 3 or later.
// See COPYING and NOTICE.

//! File side of the Zotero import.
//!
//! This crate deliberately has no SQLite dependency and never opens the
//! library database. The application owns the database; this code only stages
//! attachment files, verifies the snapshot, and swaps files while Gecko has the
//! database closed.

use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

/// Name of the marker written while files are being swapped.
pub const APPLY_MARKER: &str = ".import-apply-in-progress";

/// Files and directories owned by the database that an adopt-copy replaces.
const REPLACED: &[&str] = &[
    "zotero.sqlite",
    "zotero.sqlite-wal",
    "zotero.sqlite-shm",
    "zotero.sqlite-journal",
    "fulltext.sqlite",
    "fulltext.sqlite-wal",
    "fulltext.sqlite-shm",
    "fulltext.sqlite-journal",
    "storage",
];

const SQLITE_HEADER: &[u8; 16] = b"SQLite format 3\0";

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct Report {
    pub files: u64,
    pub bytes: u64,
}

impl Report {
    fn add(&mut self, other: Report) {
        self.files += other.files;
        self.bytes += other.bytes;
    }
}

fn path_string(path: &Path) -> String {
    path.display().to_string()
}

fn remove_if_exists(path: &Path) -> Result<(), String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => if metadata.is_dir() {
            fs::remove_dir_all(path)
        } else {
            fs::remove_file(path)
        }
        .map_err(|e| format!("removing {}: {e}", path_string(path))),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("inspecting {}: {e}", path_string(path))),
    }
}

/// Whether `path` begins with the SQLite file header.
pub fn is_sqlite_file(path: &Path) -> Result<bool, String> {
    let mut file = match fs::File::open(path) {
        Ok(file) => file,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(e) => return Err(format!("opening {}: {e}", path_string(path))),
    };
    let mut header = [0u8; 16];
    match file.read_exact(&mut header) {
        Ok(()) => Ok(&header == SQLITE_HEADER),
        Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => Ok(false),
        Err(e) => Err(format!("reading {}: {e}", path_string(path))),
    }
}

/// Fail unless the staged directory holds a database snapshot and a storage directory.
pub fn verify_staging(staging: &Path) -> Result<(), String> {
    if !staging.is_dir() {
        return Err(format!(
            "staging directory not found: {}",
            path_string(staging)
        ));
    }
    let db = staging.join("zotero.sqlite");
    if !db.is_file() {
        return Err(format!("database snapshot not found: {}", path_string(&db)));
    }
    if !is_sqlite_file(&db)? {
        return Err(format!(
            "database snapshot is not SQLite: {}",
            path_string(&db)
        ));
    }
    if !staging.join("storage").is_dir() {
        return Err(format!(
            "attachment staging directory not found: {}",
            path_string(&staging.join("storage"))
        ));
    }
    Ok(())
}

/// Count regular files and bytes below `path`.
pub fn count_tree(path: &Path) -> Result<Report, String> {
    let mut report = Report::default();
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(report),
        Err(e) => return Err(format!("inspecting {}: {e}", path_string(path))),
    };
    if metadata.is_dir() {
        for entry in
            fs::read_dir(path).map_err(|e| format!("reading {}: {e}", path_string(path)))?
        {
            let entry = entry.map_err(|e| format!("reading {}: {e}", path_string(path)))?;
            report.add(count_tree(&entry.path())?);
        }
    } else if metadata.is_file() {
        report.files = 1;
        report.bytes = metadata.len();
    }
    Ok(report)
}

fn copy_tree(
    source: &Path,
    target: &Path,
    report: &mut Report,
    progress: &mut dyn FnMut(u64, u64),
) -> Result<(), String> {
    fs::create_dir_all(target).map_err(|e| format!("creating {}: {e}", path_string(target)))?;

    let entries = match fs::read_dir(source) {
        Ok(entries) => entries,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => return Err(format!("reading {}: {e}", path_string(source))),
    };

    for entry in entries {
        let entry = entry.map_err(|e| format!("reading {}: {e}", path_string(source)))?;
        let from = entry.path();
        let to = target.join(entry.file_name());
        let metadata = fs::symlink_metadata(&from)
            .map_err(|e| format!("inspecting {}: {e}", path_string(&from)))?;

        if metadata.is_dir() {
            copy_tree(&from, &to, report, progress)?;
        } else if metadata.is_file() {
            fs::copy(&from, &to).map_err(|e| {
                format!(
                    "copying {} to {}: {e}",
                    path_string(&from),
                    path_string(&to)
                )
            })?;
            report.files += 1;
            report.bytes += metadata.len();
            if report.files % 200 == 0 {
                progress(report.files, report.bytes);
            }
        } else if metadata.is_symlink() {
            let link = fs::read_link(&from)
                .map_err(|e| format!("reading link {}: {e}", path_string(&from)))?;
            #[cfg(unix)]
            std::os::unix::fs::symlink(&link, &to)
                .map_err(|e| format!("linking {}: {e}", path_string(&to)))?;
            #[cfg(not(unix))]
            return Err("symbolic links in storage are only supported on Unix".to_string());
            report.files += 1;
        }
    }
    Ok(())
}

/// Copy the source attachment directory into the staging directory.
///
/// The database snapshot must already be in `staging/zotero.sqlite`; the app
/// creates it with Zotero's own database code.
pub fn stage_with_progress(
    source: &Path,
    staging: &Path,
    progress: &mut dyn FnMut(u64, u64),
) -> Result<Report, String> {
    let db = staging.join("zotero.sqlite");
    if !db.is_file() {
        return Err(format!("database snapshot not found: {}", path_string(&db)));
    }
    if !is_sqlite_file(&db)? {
        return Err(format!(
            "database snapshot is not SQLite: {}",
            path_string(&db)
        ));
    }
    let target = staging.join("storage");
    if target.exists() {
        return Err(format!(
            "staging already contains attachments: {}",
            path_string(&target)
        ));
    }

    let source_storage = source.join("storage");
    if !source_storage.is_dir() {
        fs::create_dir_all(&target)
            .map_err(|e| format!("creating {}: {e}", path_string(&target)))?;
        return Ok(Report::default());
    }

    let mut report = Report::default();
    copy_tree(&source_storage, &target, &mut report, progress)?;
    Ok(report)
}

pub fn stage(source: &Path, staging: &Path) -> Result<Report, String> {
    stage_with_progress(source, staging, &mut |_, _| {})
}

fn move_if_exists(from: &Path, to: &Path) -> Result<(), String> {
    if !from.exists() {
        return Ok(());
    }
    fs::rename(from, to)
        .map_err(|e| format!("moving {} to {}: {e}", path_string(from), path_string(to)))
}

/// Put the backed-up database and attachments back, removing anything the
/// interrupted apply had put in place.
pub fn restore(backup: &Path, data_dir: &Path) -> Result<(), String> {
    if !backup.is_dir() {
        return Ok(());
    }
    // Move back exactly what was moved aside. Removing every replaced path
    // unconditionally would delete an old `storage/` that the interrupted
    // apply had not reached yet.
    for entry in
        fs::read_dir(backup).map_err(|e| format!("reading {}: {e}", path_string(backup)))?
    {
        let entry = entry.map_err(|e| format!("reading {}: {e}", path_string(backup)))?;
        let target = data_dir.join(entry.file_name());
        remove_if_exists(&target)?;
        fs::rename(entry.path(), &target).map_err(|e| {
            format!(
                "restoring {} to {}: {e}",
                path_string(&entry.path()),
                path_string(&target)
            )
        })?;
    }
    Ok(())
}

fn recover_interrupted_apply(data_dir: &Path) -> Result<(), String> {
    let marker = data_dir.join(APPLY_MARKER);
    if !marker.exists() {
        return Ok(());
    }
    let contents = fs::read_to_string(&marker)
        .map_err(|e| format!("reading {}: {e}", path_string(&marker)))?;
    let backup = PathBuf::from(contents.trim());
    if backup.as_os_str().is_empty() {
        remove_if_exists(&marker)?;
        return Err("apply marker has no backup path; refusing to guess".to_string());
    }
    restore(&backup, data_dir)?;
    remove_if_exists(&marker)?;
    Ok(())
}

/// Replace the data directory's database, search index and attachments with
/// the staged ones, keeping the old files in `backup`.
///
/// The caller must have the database closed. On any error the old files are
/// restored and the staging directory is left intact for a retry.
pub fn apply(staging: &Path, data_dir: &Path, backup: &Path) -> Result<(), String> {
    verify_staging(staging)?;
    if !data_dir.is_dir() {
        return Err(format!(
            "data directory not found: {}",
            path_string(data_dir)
        ));
    }

    recover_interrupted_apply(data_dir)?;

    if backup.exists() {
        let mut entries =
            fs::read_dir(backup).map_err(|e| format!("reading {}: {e}", path_string(backup)))?;
        if entries.next().is_some() {
            return Err(format!("backup already exists: {}", path_string(backup)));
        }
    }
    fs::create_dir_all(backup).map_err(|e| format!("creating {}: {e}", path_string(backup)))?;

    let marker = data_dir.join(APPLY_MARKER);
    fs::write(&marker, backup.to_string_lossy().as_bytes())
        .map_err(|e| format!("writing {}: {e}", path_string(&marker)))?;

    let swap = (|| -> Result<(), String> {
        for name in REPLACED {
            move_if_exists(&data_dir.join(name), &backup.join(name))?;
        }
        fs::rename(
            staging.join("zotero.sqlite"),
            data_dir.join("zotero.sqlite"),
        )
        .map_err(|e| format!("installing database: {e}"))?;
        fs::rename(staging.join("storage"), data_dir.join("storage"))
            .map_err(|e| format!("installing attachments: {e}"))?;
        Ok(())
    })();

    match swap {
        Ok(()) => {
            remove_if_exists(&marker)?;
            Ok(())
        }
        Err(error) => {
            let restored = restore(backup, data_dir);
            let _ = remove_if_exists(&marker);
            match restored {
                Ok(()) => Err(error),
                Err(restore_error) => Err(format!(
                    "{error}; restoring the backup also failed: {restore_error}"
                )),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "citewell-import-{name}-{}-{nanos}",
            std::process::id()
        ));
        fs::create_dir_all(&path).unwrap();
        path
    }

    fn write_db(path: &Path, tag: &str) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        let mut bytes = SQLITE_HEADER.to_vec();
        bytes.extend_from_slice(tag.as_bytes());
        fs::write(path, bytes).unwrap();
    }

    fn write_file(path: &Path, contents: &str) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, contents).unwrap();
    }

    #[test]
    fn stage_copies_storage_and_leaves_source() {
        let root = temp("stage");
        let source = root.join("source");
        let staging = root.join("staging");
        write_db(&source.join("zotero.sqlite"), "source");
        write_file(&source.join("storage/ABCD/a.pdf"), "pdf");
        write_file(&source.join("storage/ABCD/notes.txt"), "txt");
        write_db(&staging.join("zotero.sqlite"), "snapshot");

        let report = stage(&source, &staging).unwrap();
        assert_eq!(report.files, 2);
        assert_eq!(report.bytes, 6);
        assert!(staging.join("storage/ABCD/a.pdf").is_file());
        assert!(source.join("storage/ABCD/a.pdf").is_file());
        verify_staging(&staging).unwrap();

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn stage_without_source_storage_makes_empty_target() {
        let root = temp("empty");
        let source = root.join("source");
        let staging = root.join("staging");
        fs::create_dir_all(&source).unwrap();
        write_db(&staging.join("zotero.sqlite"), "snapshot");

        let report = stage(&source, &staging).unwrap();
        assert_eq!(report, Report::default());
        assert!(staging.join("storage").is_dir());
        verify_staging(&staging).unwrap();

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn verify_rejects_non_sqlite() {
        let root = temp("bad");
        let staging = root.join("staging");
        write_file(&staging.join("zotero.sqlite"), "not a database");
        fs::create_dir_all(staging.join("storage")).unwrap();
        assert!(verify_staging(&staging).is_err());
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn apply_swaps_and_keeps_backup() {
        let root = temp("apply");
        let data = root.join("data");
        let staging = root.join("staging");
        let backup = root.join("backup");

        write_db(&data.join("zotero.sqlite"), "old");
        write_file(&data.join("storage/OLD/old.pdf"), "old-pdf");
        write_db(&data.join("fulltext.sqlite"), "old-index");

        write_db(&staging.join("zotero.sqlite"), "new");
        write_file(&staging.join("storage/NEW/new.pdf"), "new-pdf");

        apply(&staging, &data, &backup).unwrap();

        assert!(is_sqlite_file(&data.join("zotero.sqlite")).unwrap());
        let installed = fs::read(data.join("zotero.sqlite")).unwrap();
        assert!(installed.ends_with(b"new"));
        assert!(data.join("storage/NEW/new.pdf").is_file());
        assert!(!data.join("fulltext.sqlite").exists());
        assert!(backup.join("zotero.sqlite").is_file());
        assert!(backup.join("storage/OLD/old.pdf").is_file());
        assert!(!data.join(APPLY_MARKER).exists());

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn interrupted_apply_is_restored_before_retry() {
        let root = temp("recover");
        let data = root.join("data");
        let backup = root.join("backup");
        let staging = root.join("staging");

        // Simulate a crash after the old files were moved and a partial new
        // database was installed.
        write_db(&backup.join("zotero.sqlite"), "old");
        write_db(&data.join("zotero.sqlite"), "partial");
        fs::write(data.join(APPLY_MARKER), backup.to_string_lossy().as_bytes()).unwrap();

        write_db(&staging.join("zotero.sqlite"), "new");
        write_file(&staging.join("storage/NEW/new.pdf"), "new-pdf");

        apply(&staging, &data, &backup).unwrap();

        let installed = fs::read(data.join("zotero.sqlite")).unwrap();
        assert!(installed.ends_with(b"new"));
        assert!(!data.join(APPLY_MARKER).exists());

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn restore_puts_old_files_back() {
        let root = temp("restore");
        let data = root.join("data");
        let backup = root.join("backup");
        write_db(&data.join("zotero.sqlite"), "new");
        write_db(&backup.join("zotero.sqlite"), "old");

        restore(&backup, &data).unwrap();
        let restored = fs::read(data.join("zotero.sqlite")).unwrap();
        assert!(restored.ends_with(b"old"));

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn restore_does_not_delete_storage_the_backup_never_moved() {
        let root = temp("restore-storage");
        let data = root.join("data");
        let backup = root.join("backup");
        write_db(&data.join("zotero.sqlite"), "new");
        write_db(&backup.join("zotero.sqlite"), "old");
        write_file(&data.join("storage/OLD/old.pdf"), "old-pdf");

        restore(&backup, &data).unwrap();
        assert!(data.join("storage/OLD/old.pdf").is_file());

        fs::remove_dir_all(&root).unwrap();
    }
}
