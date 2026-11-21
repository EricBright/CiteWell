# Rust Markdown editors for CiteWell

Research note, 2026-11-20 · branch `citewell` · companion to [decisions.md](../decisions.md)
(D4, D12, D20), [rust.md](../rust.md) and [export.md](../export.md). Question: can notes be
Markdown-only, and is a Rust editor practical? No application code was changed.

Method: notecraft was cloned and read at `b4c385a` (2026-11-20, v0.0.16); versions and licences
come from the crates.io API; everything else is from the project's own repository, crate docs or
vendor documentation. ⚠ marks inference rather than documentation.

## 1. The starting position inside CiteWell

| Fact | Evidence |
|---|---|
| Notes are HTML: `itemNotes.note TEXT` | [userdata.sql:194](../../resource/schema/userdata.sql) |
| The editor is ProseMirror, vendored, 16 packages | [note-editor/package.json](../../note-editor/package.json) |
| A citation is `span.citation` + `data-citation` JSON | [nodes.js:369-393](../../note-editor/src/core/schema/nodes.js) |
| Markdown *paste* already exists (markdown-it + prosemirror-markdown) | [markdown-parser.js:1](../../note-editor/src/core/plugins/markdown-parser.js) |
| A Markdown *serializer* already exists for copy | [markdown-serializer.js](../../note-editor/src/core/plugins/markdown-serializer.js) |
| Both are registered plugins | [editor-core.js:157,229](../../note-editor/src/core/editor-core.js) |
| Citations serialize to plain text | [utils.js:185](../../note-editor/src/core/schema/utils.js) |
| Search indexes a note by parsing it as HTML | [fulltext.js:1695](../../chrome/content/zotero/xpcom/fulltext.js) |
| Note titles are extracted from HTML with regexes | [notesBox.js:166](../../chrome/content/zotero/elements/notesBox.js) |
| The Markdown exporter flattens citations to links | [Note Markdown.js:1567-1596](../../translators/Note%20Markdown.js) |
| Rust already runs as WASM and as a subprocess | [citeprocRsBridge.js:40](../../chrome/content/zotero/xpcom/citeprocRsBridge.js), [utilities_internal.js:709](../../chrome/content/zotero/xpcom/utilities_internal.js) |
| Sync is off, so there is no protocol interop to preserve | [decisions.md D14](../decisions.md) |

The JS half of a Markdown pipeline already exists. What is missing is a dialect, a save path and
an index path — not a parser.

## 2. notecraft, read from its source

- **Stack.** egui + eframe 0.37, Rust edition 2024, MSRV 1.95, workspace version 0.0.16,
  `license = "MIT OR Apache-2.0"`, `publish = false`
  ([Cargo.toml](https://github.com/AlienTechSoftware/notecraft/blob/b4c385a/Cargo.toml)).
  About 122k lines of Rust in 16 library crates and 3 apps (measured with `wc`); `Cargo.lock`
  carries 698 package entries. Every release is an alpha; Windows and Linux are tested, macOS is
  not
  ([README](https://github.com/AlienTechSoftware/notecraft/blob/b4c385a/README.md)).
- **Not a Markdown app.** A page is a folder holding `index.html` *or* `index.md`; the format is
  chosen per page, section or notebook
  ([folder-format.md §3](https://github.com/AlienTechSoftware/notecraft/blob/b4c385a/docs/folder-format.md)).
- **The design worth copying.** One content model, `notecraft_formats::markdown::{Block, Span}`,
  shared by the HTML reader, the CMGFM reader and the editor: "HTML is one persisted
  serialization, and the UI reads it into the shared model before drawing or editing it"
  ([page-model.md §1.1](https://github.com/AlienTechSoftware/notecraft/blob/b4c385a/docs/page-model.md)).
- **Its Markdown reader is hand-written**, 966 lines, a CommonMark+GFM subset with no reference
  links, footnotes or raw HTML
  ([markdown.rs](https://github.com/AlienTechSoftware/notecraft/blob/b4c385a/crates/formats/src/markdown.rs));
  `notecraft-formats` depends only on `notecraft-model`
  ([Cargo.toml](https://github.com/AlienTechSoftware/notecraft/blob/b4c385a/crates/formats/Cargo.toml)).
- **Editing is a live block view, not a source editor**, and its own gaps are the ones that
  matter here: "The caret belongs to egui, so there is no selection across blocks" (README,
  Status) and "No screen reader"
  ([gaps.md:39](https://github.com/AlienTechSoftware/notecraft/blob/b4c385a/docs/gaps.md)).
  Line runs, direction and click-hit come from parley
  ([architecture.md](https://github.com/AlienTechSoftware/notecraft/blob/b4c385a/docs/architecture.md)).
- **Packaging.** AppImage, deb (nfpm) and tar + setup helper, plus an Android APK
  ([packaging/linux](https://github.com/AlienTechSoftware/notecraft/tree/b4c385a/packaging/linux)).
- **Reusable?** Nothing is on crates.io (`publish = false`). The source is MIT/Apache-2.0, so
  vendoring is legal: `formats` (4.5k lines, one internal dependency) is a credible starting
  point for a `citewell-md` crate; `ui-egui` (54k lines) is an egui front end for notecraft's own
  command registry, not a widget.

## 3. The credible options

| Option | What it is | Markdown | Rich editing | Text / IME / a11y | Licence | In XUL? |
|---|---|---|---|---|---|---|
| [notecraft](https://github.com/AlienTechSoftware/notecraft) | eframe app | CMGFM subset + HTML per page | live block view | egui IME events; no screen reader (own gap) | MIT/Apache | no — process |
| [GPUI](https://crates.io/crates/gpui) 0.2.2 | Zed's framework | none built in | only via Zed's `editor` crate | `InputHandler` IME, AccessKit | Apache-2.0 (crate) / GPL-3.0-or-later (`editor`) | no |
| [egui/eframe](https://crates.io/crates/eframe) 0.37 | framework | none | `TextEdit` is plain text; rich needs a custom widget | `Event::Ime`; `accesskit` on by default | MIT/Apache | no |
| [iced](https://crates.io/crates/iced) 0.14 | framework | display-only `markdown` widget | `text_editor` is plain text | no AccessKit dependency ⚠ | MIT | no |
| [Slint](https://crates.io/crates/slint) 1.19 | declarative toolkit | none | no rich text | — | GPL-3.0-only / royalty-free / commercial | no |
| GTK4 + [GtkSourceView](https://gitlab.gnome.org/GNOME/gtksourceview) | system widgets | highlighting (`markdown.lang`) | source editor; preview needs a renderer | GtkTextView: IME, AT-SPI, selection | LGPL-2.1-or-later | no |
| [Floem](https://github.com/lapce/floem) / Lapce | framework / code editor | — | code editor, not rich text | — | MIT / Apache-2.0 | no |
| [Tauri](https://crates.io/crates/tauri) 2.12 / wry | Rust host + webview | whatever JS editor | yes, in JS | webview a11y | MIT/Apache | no — needs system WebKitGTK |
| [pulldown-cmark](https://github.com/pulldown-cmark/pulldown-cmark) 0.13, [comrak](https://github.com/kivikakk/comrak) 1.1, [markdown-rs](https://crates.io/crates/markdown) 1.0 | libraries | CommonMark; comrak adds GFM | n/a | n/a | MIT / BSD-2 / MIT | yes (WASM) |
| [cosmic-text](https://crates.io/crates/cosmic-text) 0.19, [parley](https://crates.io/crates/parley) 0.13, [glyphon](https://crates.io/crates/glyphon) 0.12 | layout only | n/a | you build the editor | shaping, bidi, no IME | MIT/Apache | yes |

A crates.io search for "markdown editor" turns up no WYSIWYG editing widget ⚠, and notecraft
publishes nothing. The most mature Rust rich-text editing machinery is Zed's `editor` crate,
which is GPL-3.0-or-later and unpublished (`publish = false`). GPUI itself is Apache-2.0 and
published, but it is a framework: the editor has to be written.

## 4. The integration constraint

- D12: "The app is Gecko + XUL + JavaScript; Rust cannot be called synchronously from it"
  ([decisions.md](../decisions.md)). Rust enters through build tooling, WASM, or a sidecar with
  an explicit lifecycle and a versioned protocol ([rust.md](../rust.md)).
- **WASM** is the right door for parsing, serializing and indexing: Gecko exposes the ordinary JS
  `WebAssembly` API ([MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)), Rust arrives
  behind wasm-bindgen glue, and CiteWell already does exactly this with citeproc
  ([citeprocRsBridge.js](../../chrome/content/zotero/xpcom/citeprocRsBridge.js)). It is the wrong
  door for a UI: a canvas-drawn editor takes IME, selection, spell-checking and screen-reader support
  away from Gecko and makes them the canvas's problem ⚠.
- **A native window** cannot be a child of a XUL document: no XUL element hosts a foreign native
  surface ⚠, GTK4 removed foreign subwindows outright — "Native and foreign subwindows are no
  longer supported"
  ([GTK 4 migration guide](https://docs.gtk.org/gtk4/migrating-3to4.html)) — and Wayland has no
  XEmbed. So a Rust editor is a second top-level window in a second process, or a second app.
- **IPC already exists twice**: the loopback local API on `127.0.0.1:23120` with key-gated writes
  (D16) and the token-authenticated `/agent/v1` bridge (D17). For text, a cheaper third path fits
  better: the app writes one `.md` file plus a versioned JSON header, spawns the editor, and reads
  the result back with the same temp-file+rename rule as [export.md](../export.md).
- **Cost.** WASM: one more build target, no window, no lifecycle, but no filesystem access and no
  threads without shared-memory support.
  Sidecar: a process to package and supervise, focus/raise behaviour on KDE, two in-memory copies
  of the document. Both keep the app as the only SQLite writer, which D12 and [rust.md](../rust.md)
  require.

## 5. Three architectures

**A. Markdown in the database, editor unchanged — recommended first.**
`itemNotes.note` holds Markdown. Loading would run the existing markdown-it/prosemirror-markdown
pipeline; saving extends the existing serializer to the full schema (tables, math, citation,
images). The conversion authority lives once, in Rust: a `citewell-md` crate compiled to WASM for
the editor and to native for export, import and indexing. That satisfies D4 (new logic in Rust,
JS reduced to call sites) and is notecraft's page-model pattern without notecraft's UI. Keeps the
XUL window, IME, spellcheck, accessibility and citation nodes while editing. Costs: a lossy round
trip for Zotero-only constructs (underline, colour, highlight, sup/sub), so every save needs an
idempotence test. Exit criterion: open, edit, save and reopen 200 existing notes with identical
Markdown on the second save, and search finds words inside emphasis and headings.

**B. Same storage, plus a Rust writing window — recommended next.**
GTK4 + GtkSourceView in source mode with a preview rendered by comrak or pulldown-cmark. Chosen
over egui and GPUI first because GtkTextView already provides IME, AT-SPI, selection and
clipboard, which a custom-drawn editor does not (notecraft's own gaps say so). The window edits a
file and never the database; the app converts and saves. It can also open the vault R20 exports,
which makes Obsidian a peer editor instead of a rival. Costs: a second window and toolkit
(mismatched theme on KDE), packaging size, lifecycle. Exit criterion: edit, close, see it in the
library; killing the app mid-edit loses nothing.

**C. A Rust rich-text editor — deferred.**
Vendor `notecraft-formats` for `Block`/`Span` and write our own front end. Not now: this is where
the accessibility and cross-block-selection cost lives, and "Markdown-only, like Obsidian" is met
by A and B. If it is ever built, front it with GTK4 rather than a custom-drawn surface, or Orca
support ends there.

## 6. Storage, indexing, export and citations

- **Storage.** Markdown in `itemNotes.note`, with the dialect pinned by a version marker: YAML
  front matter (Obsidian-compatible) or a new `itemNotes` column, which is a schema change.
- **Indexing.** [fulltext.js:1695](../../chrome/content/zotero/xpcom/fulltext.js) parses the note
  as HTML; with Markdown it would index `#` and `**` literally and lose block boundaries. It needs
  a Markdown→text path, and so do titles
  ([notesBox.js:166](../../chrome/content/zotero/elements/notesBox.js)).
- **Export.** R20 becomes a copy rather than a conversion, and the Note Markdown translator
  ([Note Markdown.js](../../translators/Note%20Markdown.js)) is the reference dialect.
- **Citations.** The structured data exists only in `data-citation`
  ([nodes.js:385](../../note-editor/src/core/schema/nodes.js)), and today's Markdown export
  flattens it to `(Author Year)` links. Three choices: (a) flatten and accept loss; (b) emit
  `zotero://select/...` links, which the exporter already produces; (c) define a citation syntax
  (`[@itemKey]`) plus a front-matter `citationItems` map, the only option that survives a round
  trip. This choice gates the rest of the work.
- **What stays HTML.** The editor's in-memory document, HTML copy/print and "Export Notes",
  notes not yet converted, and the HTML that Zotero's own translators still ask a note for.

## 7. Open questions

1. Dialect: the current serializer emits CommonMark + GFM + math + `==highlight==`
   ([markdown-serializer.js](../../note-editor/src/core/plugins/markdown-serializer.js)); does
   Obsidian compatibility also require `[[wikilinks]]` and callouts?
2. Citations: (a), (b) or (c), and if (c), keyed by item key, citekey or citation hash?
3. Migration: convert in place with a `zotero.sqlite` backup, or leave old notes as HTML and
   convert on first edit? The second needs a per-note marker anyway.
4. Does adding a column to `itemNotes` survive Zotero's schema-version upgrade path, or must the
   marker live in the note text?
5. Who else reads `itemNotes.note` as HTML — print, "Export Notes", note templates, plugin APIs?
   Not audited here.
6. Is a second window acceptable on KDE/Wayland, and does it need single-instance and
   always-on-top behaviour?
7. AppImage size and licence review for GTK4 and GtkSourceView (LGPL-2.1-or-later) inside the
   existing Gecko bundle.
8. Is screen-reader support a requirement? If yes, option C is only viable on GTK4.

*For the full documentation index, see [../../README.md](../../README.md).*
