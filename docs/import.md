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

## Two import modes

### Adopt a copy (empty CiteWell library)

The safe, fast path for a first import:

1. Ask for a Zotero data directory and verify it contains `zotero.sqlite`.
2. Copy the database (including `-wal`) and `storage/` to a staging directory.
3. Verify the copy opens, then move it into the CiteWell data directory.
4. Restart with the imported library.

This preserves item keys, collections, notes, annotations and attachment links exactly. It is
only offered when the CiteWell library is empty, because it replaces rather than merges.

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

- **Data directory** — shows `~/CiteWell` and offers "Open".
- **Zotero library detected** — if `~/Zotero/zotero.sqlite` exists, offers "Import".
- **Import from Zotero…** — directory picker, mode selection, dry-run summary, then import.
- **Last import** — counts and any skipped/duplicate items.

The pane states plainly that Zotero is not modified and that CiteWell's library is independent.

## Safety rules

- Never import while the source is being written: ask the person to quit Zotero, and copy the
  database rather than opening it in place.
- Never copy Zotero preferences, sync credentials, local API keys or plugins.
- Back up the CiteWell database before a merge; keep the backup until the report is accepted.
- Do not delete duplicates automatically. Report them and let the person choose.
- If any batch fails, stop, leave the source untouched, and keep the import resumable.

## Phases

| Phase | Outcome |
|---|---|
| 1 | Adopt-copy for an empty library, with checksum verification |
| 2 | Merge regular items, collections and notes |
| 3 | Attachments, annotations and saved searches |
| 4 | Dry-run report and resumable imports |

*For the full documentation index, see [../README.md](../README.md).*
