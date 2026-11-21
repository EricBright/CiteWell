# Notes as Markdown file attachments

Status: **core built; disposable library migrated; editor bundle removed; read-only fallback.**
Companion to [decisions.md](decisions.md) D29 and D20.

## Goal

A CiteWell note is a `.md` file attachment under its parent item. There is no `itemNotes` storage
for new notes, no in-app note editor, and no bundled Markdown parser. The host's editor owns
editing; CiteWell owns the attachment record, the file, search and export.

This replaces the abandoned ProseMirror-over-Markdown design (D21).

## Data model

| Part | Value |
|---|---|
| Item type | Attachment (`imported_file`) |
| File | `storage/<attachmentKey>/<name>.md` |
| Content type | `text/markdown` |
| Parent | The item the note belongs to; a standalone note is a top-level attachment |
| Title | Attachment title, initially the note title or the first Markdown heading |
| Dates | Preserve the source note's `dateAdded` and `dateModified` where the data layer accepts them |
| Content | The file only; no `itemNotes` row and no HTML copy |

The attachment key is new. Existing note keys are not preserved, because a note becomes a different
item. References to old note keys are reported during migration; nothing silently rewrites unrelated
items.

File names are a slug of the title, with the attachment key as the collision breaker. Renaming the
attachment title does not have to rename the file; the file name is not an identifier.

## Creating and opening

- **New Note** creates `Untitled Note.md` (or `Note.md` from selected text), saves it under the
  parent and calls `xdg-open`. A title prompt is not built yet. If there is no Markdown handler,
  CiteWell explains how to choose a default editor; it does not install one.
- Double-clicking a note attachment opens the file externally. The item pane shows title, parent,
  date, size and a plain-text excerpt. No editor widget is embedded in a tab or the item pane.
- The note tab type and `note-editor`/`editorInstance`/`note.xhtml` surfaces are removed once
  migration is complete. A legacy note opened before migration gets a read-only notice pointing at
  the migration action, not a hidden conversion.

## Migration of existing notes

Migration is explicit, not a silent startup rewrite. The Library preferences pane gets a **Migrate
notes to Markdown files…** action that shows the count and asks for confirmation.

1. Back up `zotero.sqlite` with a timestamped backup and keep it visible (D25 style).
2. For each `itemNotes` row, convert HTML to Markdown with the existing Note Markdown translator.
   Embedded images, tables and math are converted; anything the translator cannot represent is
   listed in the report.
3. Create the attachment item and file, verify the file exists, is readable and non-empty, then
   copy the old note's parent, collection memberships and dates where possible.
4. Move the old note item to Trash; never delete it (D26). The Trash copy remains the rollback path
   in addition to the database backup.
5. A failed note is left in place and reported. A rerun skips notes already represented by a
   verified file, so an interrupted run resumes.

The current test library has 83 notes. A dry run on a copy is required before the migration is
offered in a normal build.

## Reading, excerpts and search

- Excerpts strip Markdown syntax crudely (headings, emphasis markers, link destinations) and take a
  bounded number of characters. No renderer is used.
- The note text is indexed in `fulltext.sqlite` as plain text. The index is refreshed when the file's
  modification time or size changes, on item selection and on a library scan; there is no file
  watcher in the first cut.
- PDF text is never indexed (D30). Annotation sidecars are indexed as ordinary text.
- Search results find words inside emphasis, headings and code because the Markdown markers are not
  part of the indexed tokens.

## Agent interface

- `add_note` creates a `.md` attachment under the parent, writes `text` as the file content, and
  returns the attachment key and parent key. `format` is always Markdown; HTML is rejected rather
  than converted.
- `export.note` returns the file content and a filename derived from the title. A missing or
  unreadable file is an error, not an empty note.
- Item lookup, search and attachment-open verbs work on the attachment item like any other file.
- The audit log records the path and action, never the note text.

## Removal

The `note-editor` submodule and its `js-build` build path are removed. `elements/noteEditor.js` is
now a read-only text view for legacy rows; note tabs still open through it. The editable
`editorInstance` helpers remain only for annotation-to-note creation and will go with D30. Note
editor tests that asserted ProseMirror behaviour are removed; migration, external-open and note-tab
coverage remains. The `note.markdownStorage` preference is gone.

## Exit criteria

- No new note is stored in `itemNotes`; no new HTML is written.
- The 82 legacy notes in the disposable library migrated with zero failures and zero lost bodies.
- Every migrated note opens in the configured host editor and is found by a word inside its text.
- Search never returns a PDF match.
- The app starts and builds with the note-editor submodule absent and its npm tree untouched.

## Open questions

1. Whether a title edit should rename the file, or only the attachment title (current proposal:
   title only).
2. Whether standalone notes should remain top-level attachments or be forced under a synthetic
   parent.
3. How the item pane displays a note excerpt without an editor: plain text block or read-only
   preformatted view.
4. Whether the migration is a preferences action or a first-run prompt when legacy notes exist
   (current proposal: preferences action, plus a one-time banner).
5. How to index files changed while CiteWell is closed without a full-library rescan on every start.

*For the full documentation index, see [../README.md](../README.md).*
