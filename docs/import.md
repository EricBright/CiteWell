# Importing a Zotero library

CiteWell starts with its **own blank library**. It never opens, migrates or writes Zotero's data
directory or profile, and the two applications use different ports. Bringing a Zotero library in
is always an explicit action from a settings pane.

## What is separate

| Surface | Zotero | CiteWell |
|---|---|---|
| Data directory | `~/Zotero` | `~/CiteWell` |
| Profile | `~/.config/zotero/zotero` (or `~/.zotero`) | `~/.config/citewell/profile` |
| Local API / connector | `127.0.0.1:23119` | `127.0.0.1:23120`, plus the connector protocol on `23119` when that port is free (Zotero's connector needs it) |
| Plugins and prefs | Zotero's profile | CiteWell's profile |

`APP_ID` remains `zotero@zotero.org` for plugin compatibility (D3), but that identity never selects
Zotero's profile: the launcher passes an explicit `-profile`.

The import **copies**; it never points CiteWell at the live directory. SQLite has one writer, and
Zotero opens its database exclusively. CiteWell also upgrades the schema and, once R26 lands,
rewrites notes as Markdown, so a shared file would either corrupt Zotero's library or be
unreadable by it. The copy is also the restore point: a failed import leaves Zotero untouched and
CiteWell's previous library recoverable.

## How it is built

The import is split at the only boundary that can be clean: files are Rust, the library database
is JavaScript (D23).

| Piece | Language | Job |
|---|---|---|
| `tools/importer` (`citewell-import`) | Rust, std only | Stage `storage/`, verify the snapshot, back up the empty library, swap, roll back |
| Detector and inspector | JavaScript | Find candidates, read a copy of the source database, count, check health |
| Library pane | JavaScript | Preselection, dry run, progress, receipt |
| Startup hand-off | JavaScript | Apply the staged library before `Zotero.DB` exists |

The mover never opens SQLite. The JavaScript side never copies files. The source database is
opened read-only and hashed before and after; the CiteWell database is replaced only while Gecko
has it closed, at the start of the next launch, with the empty database kept as a backup.

Code: `chrome/content/zotero/xpcom/libraryImport.js` (detector, inspector, queue, apply hook),
`chrome/content/zotero/preferences/preferences_library.{xhtml,js}` (pane), and
`tools/importer` (the helper). A source build needs
`cargo build --manifest-path tools/Cargo.toml -p citewell-import`; the AppImage ships the helper
next to `zotero-bin`.

## Finding the source library

Nobody should have to hunt for a path. The pane opens with a ranked list, best candidate
preselected:

1. The path in Zotero's own `prefs.js` (`extensions.zotero.dataDir` when `useDataDir` is set).
   Only those three keys are read; the profile is never copied or written.
2. Zotero's default, `~/Zotero`.
3. Common locations: `~/Documents/Zotero`, `~/Documents/Zotero Library`, and the Zotero folders
   under Dropbox, Nextcloud and ownCloud.
4. Drive roots: the immediate volumes under `/run/media/$USER`, `/media/$USER` and `/mnt`.
5. Container paths: the Flatpak profile and data locations where they exist.

Every candidate is validated by a `zotero.sqlite` that opens read-only; the list shows item
count, size and last-modified date, and labels the source ("From Zotero's settings", "Zotero's
default location", "Found nearby"). A configured path on a disconnected drive is shown as
missing, with a Rescan button, rather than silently replaced by a different library. If nothing
is found, the pane shows how to use Zotero's Show Data Directory and offers a folder picker.
There is no full-home or network scan.

## State machine

| State | On disk | What happens |
|---|---|---|
| Requested | `library-import-request.json` in the profile plus `<data>/.import/<id>/` | Staged database and attachments, source hashed |
| Applying | `<data>/.import-apply-in-progress` in the data directory | Mover moves the old database, `fulltext.sqlite` and `storage/` to a backup, then the staged files in |
| Applied | Request removed, `library-import-result.json` written | Next open reports counts and the backup path |
| Failed | Apply marker and backup retained | Mover restores the backup; the request can be retried or cancelled |

If the process dies during Applying, the next start sees the marker, restores the backup, and
leaves the request for a retry. The source is never modified, so a failed import is never a
library loss.

## Two import modes

### Adopt a copy (empty CiteWell library)

The safe, fast path for a first import:

1. Detect and preselect the Zotero data directory, and verify it contains `zotero.sqlite`.
2. Snapshot the database and copy `storage/` into a staging directory next to the CiteWell data
   directory.
3. Verify the copy opens, then move it into place at the next start.
4. Restart with the imported library.

This preserves item keys, collections, notes, annotations and attachment links exactly. It is
only offered when the CiteWell library is empty, because it replaces rather than merges.

### Replace an existing library

For a non-empty CiteWell library, Replace is the explicit destructive option that swaps the whole
library:

1. Import & Export shows the current library's counts next to the selected source's counts.
2. A confirmation repeats both libraries' counts and explains that the current library becomes a
   restore point.
3. The mover moves the current database, `storage/` and full-text index into
   `<data>/.import-backup/<id>/`, then installs the staged library.
4. The old library remains as a restore point, with a `backup.json` manifest.

Replace is never silently chosen. The source Zotero library is still read-only.

### Restore points

Every replace, adopt and restore writes a restore point. A merge writes one before it starts, and
a database-only restore writes one for the state it replaces. The Library pane lists them with
date, origin, item/collection counts and size. A point marked **database only** (a merge backup, or
the state a database restore replaced) holds a database snapshot and nothing else: restoring it
swaps the database and leaves attachments and the search index in place. The absence of a
`storage/` directory is what makes a point database-only; a manifest is a convenience, not the
test, because a crash can land between the swap and the manifest write. Restoring a full point:

1. Inspects the selected point first; an empty or corrupt point is refused rather than swapped in.
2. Names the restore point's item/collection counts and the current library's counts in the
   confirmation.
3. Moves the current library into a new restore point and swaps the selected one into place at the
   next start.
4. Leaves both states recoverable: the previous current state is the new restore point.
5. A database swap that fails part way is recovered before the request is dropped, so a marker
   from a killed helper cannot roll the library back on the next operation.

Backups are kept until the person removes them. They live under `<data>/.import-backup/` and are
shown in the Locations list.

### Merge into the current library

For an existing CiteWell library, the importer copies objects through Zotero's data layer:

| Object | Handling |
|---|---|
| Regular items | Fields, creators, tags and relations copied; the source key is kept when free, otherwise a new key is generated and recorded in the alias chain |
| Collections | Tree recreated by name under an import root, then items assigned |
| Notes | Written as an HTML file attachment under `storage/`; parent mapped. Never rendered, edited, indexed or opened in-app — the OS default HTML handler opens it |
| Attachments | File copied from the source `storage/` into CiteWell storage as an imported-file attachment; parent mapped. Attachments of a skipped exact duplicate are not duplicated |
| Annotations | Copied to the mapped attachment; there is no in-app viewer, so they remain available to the one-time annotation export |
| Saved searches | Definitions and conditions copied; results are not copied |
| Duplicates | Reported to `identity/duplicates-<session>.json`. With the opt-in exact-identifier skip, DOI/ISBN/PMID matches are not inserted but are added to the imported collections and aliased; title/year matches are never skipped |

Group libraries are shared libraries, not collections. CiteWell has no group sync, so their items are
imported into the personal library and each group gets a collection under the import root, preserving
provenance without pretending the group still exists.

The source summary lists regular items, collections, notes, attachments and annotations separately.
The regular-item count is the merged item count; attachments, annotations and saved searches are
reported separately. A progress popup reports item and note counts while the merge runs, and the
pane keeps a green completion line and refreshes the destination counts and the main library when
it finishes.
Duplicate detection compares each source item only against items that existed before this merge,
by DOI/ISBN/PMID and then a unique title+year; the report names both keys and whether the match was
ambiguous. By default nothing is skipped. The merge dialog has an **off-by-default** option to skip
items that exactly match an existing DOI/ISBN/PMID; a skipped item is still placed in the recreated
source collections, its source key aliases to the kept item, its child notes are not duplicated, and
title/year candidates remain report-only. No existing metadata is changed.

The item and collection pass runs in a single transaction: a failure leaves the current library
unchanged, and the database backup remains as the restore point. Notes are written afterwards as
HTML attachments, then source attachment files are copied into CiteWell storage and attached to
their mapped parents; annotations follow their mapped attachment, and saved-search definitions are
copied as definitions. A failed note, attachment or annotation is reported as a warning without
aborting the rest. Attachments of skipped exact duplicates are not copied, so the kept item is not
silently modified. If the merge is interrupted, the item checkpoint lets the next run resume the
child passes; an attachment already copied before the interruption is remapped so its annotations
still follow. The source is opened **read-only**; a checksum before and after proves it was not
modified.

If the source library changed after an interruption, the checkpoint no longer describes the rows
it would skip, so the retry is **refused** instead of merging the whole library again on top of
the partial result. The refusal names the restore point that merge made, and the pane offers to
restore it. A merge restore point is database-only: restoring it swaps the database, keeps the
current database as a new database-only restore point, forgets the merge session, and leaves the
copied attachment files where they are. The changed library can be merged again afterwards.

Every merged item also gets an entry in the append-only identity log at
`<data>/identity/aliases.jsonl`: source library/group and key, destination key, session and time.
The log is copied into import/replace/restore backups, and a restore carries the selected point's
snapshot back into the active library (old points without one keep the current chain).
Keeping the source key means a Writer document created against the Zotero library usually resolves
without the log; when the key had to change (or the item came from a group library), the citation
reader follows the alias chain to the current item. The log is additive and is not part of
`zotero.sqlite`; restore-point integration is tracked separately.

## Settings pane

Import is the first section of **Import & Export**; Quick Copy follows below it:

- **Import from Zotero** — the current CiteWell library's counts, the detected candidates (best
  preselected), a Rescan button and a folder picker as the fallback.
- **Import into empty library…** — adopt-copy; only shown when the CiteWell library is empty.
- **Merge into current library…** — adds the selected library's items, collections and notes; only
  shown when the library is not empty.
- **Replace current library…** — swaps the whole library; only shown when the library is not empty,
  and followed by a confirmation that names both libraries' counts and the restore point.
- **Check** — item, collection, note, attachment counts, size, free space and the source
  fingerprint, before anything is written.
- **Duplicate review** — scans the current library with Zotero's duplicate detector, writes
  `identity/library-duplicates-<timestamp>.json`, and opens the built-in Duplicate Items view.
  Merging stays manual; this action never changes an item.
- **Restore points** — date, origin, counts, size and a Restore action; restoring is reversible. A
  database-only point says so and offers **Restore database…**, which swaps the database alone.
- **Last operation** — counts, source fingerprint, and the restore-point path.

The **Library & Files** pane shows the current library path and counts, the locations of each
piece of data, and Open / Move actions. Both panes use the same target description, so the
selected source and the destination are never on separate screens.

The pane states plainly that Zotero is not modified and that CiteWell's library is independent.

## Safety rules

- Never import while the source is being written: ask the person to quit Zotero, and copy the
  database rather than opening it in place.
- Never copy Zotero preferences, sync credentials, local API keys or plugins.
- Back up the CiteWell database before a replace or merge; keep the backup until the person
  accepts the result. Replace and restore write a manifest beside it.
- Do not delete duplicates automatically. Report them and let the person choose.
- If any batch fails, stop, leave the source untouched, and keep the import resumable.

## Phases

| Phase | Outcome |
|---|---|
| 1 | Detector, dry run, adopt-copy, replace, restore points and checksum verification |
| 2 | Merge regular items, collections, and notes as HTML attachments |
| 3 | Attachments, annotations and saved-search definitions imported |
| 4 | Duplicate report, skip, review and resumable merge checkpoint |

## Measured acceptance (2026-11-25)

A merge of the canonical library (`/run/media/eric/RedDragon/Zotero_Library`, 1,771 items) into a
non-empty library imported 946 regular items, 589 attachments, 83 notes, 53 collections (the import
root, the 51 source collections and one collection for the 3 standalone notes) and 1 saved search.
It skipped nothing, reported 153 rows without a file (148 with no path and 5 whose file is absent),
left the source checksum unchanged, and took 38.1 s.

That run found two data-loss defects, both fixed before R24 closed:

1. **A fresh merge dropped same-title children.** Resume de-duplication keyed on
   (parent, title, content type), so a second snapshot titled like the first, or a second note
   titled like its parent, looked already imported. On this library that silently discarded 34 of
   589 copyable attachments and one note. Notes and attachments now record their source IDs in the
   merge checkpoint and skip only those; the old title rule applies only to checkpoints written
   before those fields existed.
2. **The checkpoint cadence could duplicate children.** Recording every 25 imports meant an
   interruption could re-import up to 24 notes or attachments on resume. A checkpoint is now
   written, and awaited, after every child, which cost nothing measurable (38.1 s).

**Interrupted merges.** An interrupted merge is found again by source path and database hash. If
the Zotero library changes between the interruption and the retry, the retry is refused and the
pane points at that merge's restore point (see
[Merge into the current library](#merge-into-the-current-library)). Verified end to end on
2026-11-25: a staged database restore swapped the snapshot in before the database opened, kept the
replaced database as a `database only` restore point, left `storage/` and the search index
untouched, and removed the merge session.

**Kill points covered (2026-11-26).** The test suite now aborts a real merge at three points and
resumes it: inside the item transaction (the transaction rolls back and no checkpoint is written,
so the retry merges from the start), after the first note checkpoint (the recorded note is
skipped), and after the attachment checkpoint but before the annotations (the copied attachment
is remapped and its annotation follows). Each run asserts the item, note and attachment counts,
the source checksum and that the checkpoint is gone. They exposed a defect: every child checkpoint
replaced the session file, and the note and attachment writers carry only their own fields, so a
resumed child pass lost the item map and the note collection link and imported nothing.
Checkpoints are cumulative now: the writer reads the session file and extends it.

The source library itself carries 148 attachment rows with no path and two missing storage
directories; those are inherited, reported, and never invented.

*For the full documentation index, see [../README.md](../README.md).*
