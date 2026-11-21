# Importing a Zotero library

CiteWell starts with its **own blank library**. It never opens, migrates or writes Zotero's data
directory or profile, and the two applications use different ports. Bringing a Zotero library in
is always an explicit action from a settings pane.

## What is separate

| Surface | Zotero | CiteWell |
|---|---|---|
| Data directory | `~/Zotero` | `~/CiteWell` |
| Profile | `~/.config/zotero/zotero` (or `~/.zotero`) | `~/.config/citewell/profile` |
| Local API / connector | `127.0.0.1:23119` | `127.0.0.1:23120` |
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

For a non-empty CiteWell library, replace is the explicit destructive option while merge is not
built:

1. The Library pane shows the current counts and requires a checkbox that names the consequence.
2. A second confirmation repeats both libraries' counts and the restore-point path.
3. The mover moves the current database, `storage/` and full-text index into
   `<data>/.import-backup/<id>/`, then installs the staged library.
4. The old library remains as a restore point, with a `backup.json` manifest.

Replace is never silently chosen. The source Zotero library is still read-only.

### Restore points

Every replace, adopt and restore writes a restore point. The Library pane lists them with date,
origin, item/collection counts and size. Restoring:

1. Moves the current library into a new restore point.
2. Swaps the selected restore point into place at the next start.
3. Leaves both states recoverable: the previous current state is the new restore point.

Backups are kept until the person removes them. They live under `<data>/.import-backup/` and are
shown in the Locations list.

### Merge into the current library

For an existing CiteWell library, the importer copies objects through Zotero's data layer:

| Object | Handling |
|---|---|
| Regular items | Fields, creators, tags and relations copied; a new key is generated and the old key mapped |
| Collections | Tree recreated by name under an import root, then items assigned |
| Notes | Copied with the mapped parent; HTML preserved |
| Attachments | File copied from source `storage/` into CiteWell storage; imported-file mode; full-text reindexed |
| Annotations | Copied with mapped parent attachment; positions preserved |
| Saved searches | Copied as definitions, not results |
| Duplicates | Matched by DOI/ISBN first, then title + date; reported, not deleted |

The import runs in batches inside one transaction per batch, reports progress, and is resumable by
recording the source item key in an import table. The source is opened **read-only**; a checksum
before and after proves it was not modified.

## Settings pane

A **Library** section (in Preferences) contains:

- **Current library** — the data directory, whether it is empty, and Open / Move actions.
- **Locations** — the database, `storage/`, the profile, the search index, logs and the agent
  token, each with an Open action, so no path has to be reconstructed from memory.
- **Import from Zotero** — the detected candidates, best preselected, with counts and confidence
  labels, a Rescan button and a folder picker as the fallback.
- **Import** — adopt-copy when the library is empty.
- **Replace** — explicit checkbox and a second confirmation when the library is not empty; a
  restore point is always kept.
- **Dry run** — item, collection, note, annotation and attachment counts, size, free space and
  the source fingerprint, before anything is written.
- **Restore points** — date, origin, counts, size and a Restore action; restoring is reversible.
- **Last operation** — counts, source fingerprint, and the restore-point path.

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
| 2 | Merge regular items, collections and notes |
| 3 | Attachments, annotations and saved searches |
| 4 | Duplicate report and resumable merges |

*For the full documentation index, see [../README.md](../README.md).*
