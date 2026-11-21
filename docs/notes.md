# Markdown-only notes

Status: **design approved, not implemented.** Companion to [research](research/rust-markdown-editors.md),
D20 and D21.

## Goal

A CiteWell note is Markdown. No HTML is written to `itemNotes.note`, exported as the note body,
or required to read a note. The note editor remains a rich surface, but it is a view over
Markdown, not a second format.

## Decisions

| Question | Decision |
|---|---|
| Parser | Reuse the note editor's bundled `markdown-it` + `prosemirror-markdown`; no new dependency |
| Editor | Keep ProseMirror for IME, selection, spellcheck and accessibility; load Markdown, save Markdown |
| Storage | Markdown in `itemNotes.note`; no new column in the first cut |
| Legacy notes | Detect HTML on open and convert once, with a database backup; blank libraries are unaffected |
| Citations | Deferred. The editor must not create citation nodes in Markdown mode; existing ones flatten to text on save |
| Search and titles | Markdown-aware plain-text extraction, not HTML parsing |
| Export | `export.note` returns the stored Markdown; R20 copies it |
| HTML | Allowed only as the editor's in-memory document and for print/copy; never persisted |

## Implementation slices

1. **Conversion boundary.** Add `markdownToHTML` and `htmlToMarkdown` at the note-editor boundary.
   `EditorInstance.saveSync()` converts the editor HTML to Markdown before `setNote()`; the note
   tab converts Markdown to HTML before initializing the editor. Round-trip tests cover headings,
   lists, tables, code, math, links, inline formatting and images.
2. **Reading surfaces.** The item-pane preview, note list, note titles, and any read-only note view
   render Markdown in memory. No stored HTML is assumed.
3. **Search.** `fulltext.js` and title extraction use a Markdown-to-text pass, so words inside
   emphasis, headings and code are indexed without the markers.
4. **Citations and rich-only constructs.** Remove citation insertion from Markdown notes; flatten
   existing `data-citation` spans to `(Author Year)` on conversion. Underline, colour, highlight
   and sup/sub round-trip through the existing serializer or degrade to their text.
5. **Import.** R24 converts HTML notes to Markdown while copying a Zotero library, with a report
   of lossy constructs.

## Safety

- Before the first conversion of an existing note, copy `zotero.sqlite` to a timestamped backup.
- A note whose Markdown→editor→Markdown round trip would change content opens read-only and says
  why, rather than silently rewriting it.
- Never mix formats in one note. A per-note HTML detection is a migration tool, not a permanent
  dual-format mode.
- Sync is off, so no protocol compatibility is at stake.

## Exit criteria

- Edit 200 notes, save, reopen; the second save produces byte-identical Markdown.
- `rg '<(p|div|span|h[1-6])'` finds no HTML in note bodies in a fresh library.
- Search finds a word inside `**bold**`, a heading and a code span.
- A note with a legacy citation opens, flattens as documented, and remains editable.

## Open questions

1. Does the first cut convert every legacy note at startup, or on first open? Startup is simpler
   but touches the whole library; first-open is safer but needs a marker.
2. Are tables and math required in the first cut, or can they degrade to fenced blocks?
3. Does the note list need rendered previews immediately, or is a Markdown-aware text excerpt
   enough for the first release?

*For the full documentation index, see [../README.md](../README.md).*
