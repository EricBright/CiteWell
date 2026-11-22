# LibreOffice parity plan

Status: **M5 core passed 2026-11-22; the parity rewrite is complete.** Companion to
[libreoffice.md](libreoffice.md), which holds the architecture history and the option analysis,
and to decisions D34–D36, which hold the *why*. This page is the execution contract: what feature
parity means, which layer owns what, and how each milestone is proved.

## What parity means

Parity is measured against Zotero's LibreOffice menu, minus the features CiteWell deliberately
removed. The app already contains the feature layer — sessions, citation dialog, citeproc, styles,
bibliography editor, document preferences, refresh, unlink, citation explorer, progress — in
`chrome/content/zotero/xpcom/integration.js`. That code is agent-agnostic: it drives Word, Google
Docs and LibreOffice through the same `Application` interface. The work is therefore an **adapter**,
not a reimplementation of the features.

| Menu action | App-side owner | Shim responsibility |
|---|---|---|
| Add/Edit Citation | `Interface.addEditCitation`, `citationDialog` | insert/read/update a field; detect the cursor field |
| Add/Edit Bibliography | `Interface.addEditBibliography`, bibliography editor | hidden field, RTF text, paragraph style |
| Refresh | `Interface.refresh` | enumerate fields, set code and text |
| Unlink Citations | `Interface.removeCodes` | remove the field wrapper, keep the text |
| Set Document Preferences | `integrationDocPrefs` | read/write chunked document data |
| Add Note | `Interface.addNote` | field inside a footnote or endnote |

**Not ported:** Add Annotation — CiteWell removed PDF annotations (D30). Export/Import Document is
deferred: the app supports it, the shim needs two more commands, and no menu exposes it today. A
toolbar is optional polish after M5.

## Layers and ownership

| Layer | Language | Owns | Must never |
|---|---|---|---|
| App | JS (Gecko) | protocol server, sessions, dialog, citeproc, styles, document data | touch Writer objects |
| Shim | Python (UNO) | document reads/writes, field identity, RTF insertion | format citations, resolve items, or store preferences |
| Menu | XCU | six URLs and labels | contain logic |
| Test double | Python | scripted shim for app-side tests | ship in the AppImage |

The invariant that keeps the boundary honest: **the shim has no business logic.** Anything that
needs an item, a style, or a decision belongs in the app.

## Transport

The app owns the listening socket, as the reference implementation does, because the protocol is
bidirectional: a menu click is a transaction-0 command from the shim, and the app sends numbered
document commands back while its dialog is open. D36 records why the Rust relay was retired.

- `127.0.0.1:23121`; compatibility sentinel `127.0.0.1:19877`.
- Frame: `uint32` transaction id, `uint32` length, then a UTF-8 JSON payload `[command, args]`.
- Limits: 8 MiB per frame, one connection, command allowlist, type checks. If 23121 is already
  bound, the listener fails with a message and never falls back to another port.
- Token: `<data-dir>/lo-token`, mode 0600, sent in the `hello` frame. A connection without the
  token is closed before any command runs.
- Handshake: `hello {protocol: 1, shim: "<version>", lo: "<version>"}`; the app replies with its
  protocol range and version. A mismatch says "reinstall the CiteWell LibreOffice extension from
  CiteWell → Settings → Cite" and performs no partial work.
- Logs: `<data-dir>/lo.log` (0600) on the app side, `CITEWELL_LO_LOG` on the shim side; one line
  per frame with the transaction id.

## Command surface

`Application_getActiveDocument` returns the protocol API version and a document id. Everything else
is prefixed `Document_` or `Field_`, matching the reference names so behaviour can be compared line
by line:

- Document: `displayAlert`, `activate`, `canInsertField`, `cursorInField`, `getDocumentData`,
  `setDocumentData`, `insertField`, `getFields`, `convertPlaceholdersToFields`,
  `setBibliographyStyle`, `insertText`, `exportDocument`, `importDocument`, `cleanup`, `complete`.
- Field: `getCode`, `setCode`, `getText`, `setText`, `delete`, `select`, `removeCode`, `convert`.

Positional arrays stay for these commands; a new command may use a named-argument object. The
command table is a dictionary with one validator per entry, not an if/else chain.

## The five UNO techniques to port

1. **Field identity is the bookmark name**: `CITEWELL_<code> RND<random>`, with `Bookmark` and
   `TextSection` variants. The formatted text is the text between the anchors.
2. **Codes live in the name.** Setting a code renames the mark; the app re-applies the formatted
   text afterwards, because renaming does not preserve character formatting.
3. **Rich text goes in through** `XDocumentInsertable.insertDocumentFromURL("private:stream",
   [FilterName="Rich Text Format", InputStream=…])`. Validate the RTF envelope first, and restore
   paragraph and character properties around the insertion.
4. **Document data lives in user-defined document properties**, chunked at 255 characters:
   `CITEWELL_PREFS_1`, `_2`, …; read until a key is missing.
5. **Fields can live inside footnotes and tables.** Ordering must use `XTextRangeCompare` so field
   indices match document order.

Write `CITEWELL_` marks. Recognise `ZOTERO_` or ` CSL_` only if a one-way document import is added
later; never write those prefixes, because a Zotero extension in the same profile would then fight
over the same fields.

## Extensibility

- Citation content — items, locators, prefixes, styles — travels as JSON in the field code, so a new
  citation option is an app change only.
- A new document operation is one command-table entry and one shim method; a new menu action is one
  XCU entry plus a command string.
- `fieldType` already selects the storage strategy (`ReferenceMark` or `Bookmark`).
- The shim can be replaced, in another language, without changing the app or the protocol.
- The limit is the inherited `integration.js` monolith: extending the LibreOffice boundary is
  cheap; extending citation semantics means working inside that file. Do not refactor it
  wholesale — it also serves Word and Google Docs.

## Security contract

- Loopback only, token-authenticated, one connection at a time.
- The RTF stream is untrusted input: require `{\rtf`, cap the size, reject unbalanced braces and
  `\pict`/`\object` groups. This defends against a crafted citation from imported metadata; it is
  not a general RTF filter.
- No `eval`, no subprocess, no file writes from the shim; logs are 0600.
- No separate extension update channel. The OXT ships inside the AppImage and is installed add-only
  (D35); a stale OXT is fixed by reinstalling, never by registry surgery.

## Change and repair

| Change | Blast radius | Response |
|---|---|---|
| LibreOffice UNO behaviour | `document.py`, `field.py` | golden-document regression; patch the guard |
| LibreOffice drops bundled Python | the whole shim | clear error; C++ shim behind the same protocol |
| Gecko XPCOM removal | one app transport module | web-standard encoders; the socket API is stable |
| Protocol change | `comm.py` plus one app module | bump `protocol`, keep one-version compatibility |

Repair rules: the handshake names versions; the `selftest` round-trip reports protocol, shim,
LibreOffice and app versions plus the last error; the wire log is replayable against the test
double. No automatic repair of LibreOffice state (D35).

## Milestones

| Milestone | Deliverable | Acceptance |
|---|---|---|
| M0 | transport, hello/token, field create/read/update, RTF insert | **passed:** field survives save and reopen; wrong token rejected; isolated profile only |
| M1 | document and field commands; Add/Edit Citation | **passed:** insert, edit with a locator, and cancel through the real dialog; adjacent fields stay separate |
| M2 | session, style, multiple items, locators, edit existing | **passed:** two-item citation with a locator; APA → Chicago author-date through document preferences; the dialog stays responsive while commands run |
| M3 | refresh, unlink, document preferences | **passed:** 100 fields refresh in ~20 s; Unlink removes every field and keeps the text |
| M4 | bibliography, Add Note, citation explorer | **passed:** APA bibliography entry, footnote citation and table-cell citation, all persisting across save/reopen |
| M5 | polish, self-test, compatibility message | **passed:** AppImage rebuilt, hooks removed, `citewell-lo-core` out, packaged OXT passes the selftest; stale-token message verified earlier |

## Test layers

- `unittest` (stdlib) for code parsing, mark naming, chunking, ordering and RTF validation.
- The planned `test/lo/fake_shim.py`: a scriptable shim that speaks the frame protocol, so
  app-side sessions, refresh and bibliography are tested without LibreOffice.
- Golden `.odt` documents: empty, tables, footnotes, 100 citations, bibliography. Run refresh and
  unlink, extract text, diff.
- An isolated Writer profile per milestone; the real profile only through the add-only install
  action, on request.

## Known gaps

- The add-only install in the real profile is an explicit user action and was not performed.
- Documents created before the text-section bibliography fix can retain stray bibliography
  paragraphs outside the field; deleting those paragraphs or re-adding the bibliography repairs them.
- Editing an existing bibliography and the citation explorer were not exercised.
- The reference implementation's undo context and save listener are not ported yet.
- The production message box for Unlink confirmation is implemented but the self-test harness
  auto-confirms it, so the interactive path still needs a manual check.

## Retirement list

- `citewell-lo-core` left the runtime path at M0 and is no longer packaged (M5).
- The old `/citation` and `/health` endpoints were replaced by the protocol; `vnd.citewell.health:`
  now runs the hidden `selftest`.
- The end-of-document, APA-only insertion path was deleted with M1.

*For the full documentation index, see [../README.md](../README.md).*
