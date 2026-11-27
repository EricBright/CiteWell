# Obsidian / Markdown export

Planned as R20. SQLite stays the store; this is a one-way export first, with a guarded import
path later. The goal is portability and editing notes in Obsidian, not replacing the database.

## Why not a file-based database

Replacing `zotero.sqlite` would mean rewriting 853 query call sites, 25 data-layer files and 59
tables, plus triggers, transactions, saved searches and sync metadata. The export gives the
useful half of that — files you own and can edit — without putting the library's integrity at
risk. See [decisions.md](decisions.md) D14 context and [rust.md](rust.md) for the Rust rule.

## Shape

A Rust command, because the policy says new code is Rust and because it must never write to the
database:

```bash
cargo run --manifest-path tools/Cargo.toml -p xtask -- export-obsidian \
    --data-dir ~/Zotero --vault ~/Documents/Vault [--attachments symlink|copy|none] [--prune]
```

The connection is opened **read-only**. The app remains the only writer, so no locking or
corruption risk is introduced.

## Layout

```
<Vault>/CiteWell/
  Items/        <FirstAuthor> <Year> - <ShortTitle> [<itemKey>].md
  Notes/        <itemKey>/<noteKey>.md
  Collections/  <CollectionName>.md          (maps of content)
  Attachments/  <itemKey>/<filename>        (symlinked, copied, or omitted)
```

## Front matter

```yaml
---
title: "Attention Is All You Need"
authors: ["Vaswani, Ashish", "Shazeer, Noam"]
year: 2017
itemType: journalArticle
doi: 10.48550/arXiv.1706.03762
url: https://arxiv.org/abs/1706.03762
tags: [transformers, attention]
collections: ["[[Machine Learning]]"]
citekey: vaswani2017attention
zoteroItemKey: ABC123XY
dateAdded: 2026-01-04
dateModified: 2026-11-20
attachments: ["Attachments/ABC123XY/1706.03762.pdf"]
---
```

The body carries abstract, child notes and annotations as blockquotes with page numbers, and
links between items as `[[...]]`. Collections become MOC notes, so nesting is expressed by links
rather than folder depth.

## Rules that keep it safe

| Rule | Reason |
|---|---|
| Read-only DB connection | the app is the only writer |
| Render, then compare with the existing file | re-running changes nothing; no churn in git |
| Write via temp file + rename | a crash never leaves a half-written note |
| Never delete without `--prune` | a mistaken data directory would otherwise wipe the vault |
| Manifest of exported item keys | lets `--prune` distinguish deleted from unexported |
| Lossy by design, and documented | export is a view, not a second source of truth |

## Filenames

Sort key first, then title, then the Zotero item key: `vaswani2017attention` style citekeys are
phase 2. Sanitize `/ : * ? " < > |`, collapse whitespace, cap at 120 characters, and always
suffix the item key so collisions are impossible.

## Import (phase 2, separate command)

Matched by `zoteroItemKey`; note bodies may round-trip, metadata does not. The import:

1. requires an explicit confirmation and writes a database backup first;
2. compares the file hash with the last exported hash to detect real edits;
3. treats the database as authoritative for metadata and the file as authoritative for note
   bodies only;
4. reports every conflict instead of guessing.

## Non-goals

- Live two-way sync or a filesystem watcher.
- Replacing SQLite.
- Exporting every field; the mapping is deliberately partial.
- BibTeX/CSL JSON export — Zotero already does those well.

## Exit criteria (R20)

Exporting a 10,000-item library completes in under a minute, the vault opens in Obsidian with
working links, and a second run produces no changed files.

*For the full documentation index, see [index.md](index.md).*
