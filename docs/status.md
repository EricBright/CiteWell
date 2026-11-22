# Status and resumption

Last updated 2026-11-21 · branch `citewell` · companion to
[roadmap.md](../roadmap.md) and [decisions.md](decisions.md), which hold the plan and the *why*.
This page holds only what a fresh session needs to start without re-deriving it.

## Direction

CiteWell is a citation catalogue (D28), not a research workspace. There is no PDF viewer, PDF
annotation UI, PDF full-text search, in-app note editor, or plugin execution in the target product.
PDFs open in the host; notes are Markdown file attachments edited in the host; plugins are parked.

Upstream compatibility is not a goal. `zotero/zotero` is reference material only and is never a
push target. The product branch may diverge without limit.

## Where the project stands

| Area | State |
|---|---|
| App | Linux AppImage on Firefox **153.7.0esr**; CiteWell OXT packaged and the app hosts the LibreOffice bridge; Cite preferences has a Flatpak-aware install action (`10.0.9.SOURCE`, sha256 `ddb833c3…`, 133,339,640 bytes), installed at `~/AppImages/citewell.appimage` |
| Isolation | Own profile `~/.config/citewell/profile`, data `~/CiteWell`, port 23120; Zotero is never opened (D19) |
| Icons | One shape (book-section) in light/dark for app, connector, states and Google Docs |
| Connector | `connectors/`, Firefox XPI, branded, identity swapped, port 23120 |
| Agent access | `/agent/v1`: items, translators, attachments, notes, collections, UI, `export.note`; 17 MCP tools; `citewell` CLI; audit log. PDF annotation verbs are gone (D30) |
| Notes | New and agent notes are `.md` attachments. The 82 legacy notes in the disposable `~/CiteWell` library migrated with 0 failures; 82 are in Trash, 83 `.md` attachments exist and the database backup is kept. Attachment pane shows parent, date and a plain-text excerpt; Markdown attachments are re-indexed at startup and on selection, and `quicksearch-everything` finds their text. The ProseMirror editor is replaced by a read-only legacy view; the `editorInstance` module and its annotation serialization are gone, and the note window/tab remains only as a read-only legacy surface (D37) |
| PDF | **Removed:** no reader, document worker, pdf.js or PDF text index. Attachments open through the host; item-pane/notes-context annotation controls, Add Note from Annotations and the citation-dialog annotation mode are gone; the agent has 17 tools. Existing annotations export once to `storage/<key>/annotations.md` from Library preferences. The data layer remains only for that export (D30) |
| Plugins | **Parked:** `PLUGINS_ENABLED=false`; loader initialization returns early, plugin enumeration returns empty and Tools → Plugins is hidden. Code is retained (D31) |
| Dependencies | npm is retired (D32); no installs, updates, audits or lockfile changes; existing `node_modules` is frozen for the legacy build only |
| LibreOffice | **M5 core passed 2026-11-22.** Six menu actions; dialog insert/edit/cancel; multi-item citations, locators and style switching; 100-field Refresh; Unlink keeps text; bibliography as a text section spanning every entry, with paragraph styling; Add Note footnote; table-cell citation; in-text ↔ footnote/endnote conversion; all persist across save/reopen and repeated style changes keep one bibliography field. The `CITEWELL_M1_TEST` hooks are gone, `citewell-lo-core` is no longer packaged, the packaged OXT passes the selftest, and the AppImage is rebuilt. Not done: the add-only install in the real LibreOffice profile (on request), the citation explorer, and the undo/save-listener port. The real profile is untouched (D35). Plan: [libreoffice-parity.md](libreoffice-parity.md) |
| Import | R24 Phase 1: detector, Library pane, Rust `citewell-import`; adopt-copy, replace and restore points built, merge not |
| Docs | README index, Rust docs gate, D1–D37 |
| CI | `docs`, `CodeQL` and `Dependency guard`; the inherited upstream `ci.yml` with its npm jobs is removed |

Artifacts are local and gitignored:

- `dist/CiteWell-x86_64.AppImage` (133,339,640 bytes; sha256 `ddb833c3a859530460fb3e26332d96abddac627f9693de94b0624e39383ab0d1`)
- `build/dist/CiteWell-Connector.xpi` (≈1.6 MB)

The obsolete R26 editor work was preserved before reverting at
`~/.local/share/dsh-trash/2026-11-21/r26-markdown-editor-work.patch`
(sha256 `08516f3908ef5062e55d7a4f0184e9bf0e4491ab656a550591fc703eadcfac66`). It is history, not a
plan.

## Pick up here

1. **R32 — LibreOffice parity is complete; optional follow-ups.** M5 passed: the AppImage carries
   the current OXT, the test hooks are removed, `citewell-lo-core` is no longer packaged and the
   selftest runs. Remaining optional work: install the current OXT in the real profile on request
   (add-only, D35), exercise the citation explorer, and port the undo context/save listener.
2. **D29/D30 — done 2026-11-22.** The `editorInstance` module and annotation serialization are
   removed, the obsolete annotation-to-note tests are gone, the citation-dialog locator test is
   locale-aware and 44/44, and the note window/tab is a read-only legacy surface (D37). See
   [notes.md](notes.md).
3. **R31 — translator safeguards (next).** Keep updates and the Firefox/Google Docs paths working;
   add sandbox/permissions/integrity/rollback and test both integrations.
4. **R24 Phase 2 — import merge** ([import.md](import.md)). Secondary to the removals above; the
   note conversion step targets `.md` attachments.
5. **R15 — Rust build toolchain.** Replace babel/browserify/sass with Rust equivalents so the
   frozen Node build can be retired.

## Commands

Fetch the Gecko runtime once per version (gitignored):

```bash
app/scripts/fetch_xulrunner -p l -a x86_64
```

Build. Use the existing Node tree; **do not run npm** (D32). Clean rebuild after assets or runtime
changes, trashing `build/` and `.signatures.json` with `gio trash`, never `rm` (D26):

```bash
gio trash -f build .signatures.json
node js-build/build.js
app/scripts/dir_build -p l
cargo run --manifest-path tools/Cargo.toml -p xtask -- appimage
```

The note-editor is no longer part of the build: the submodule and bundle are gone, and
`elements/noteEditor.js` is a read-only legacy viewer. Do not restore the npm build to make a
build pass.

Run without touching the real library:

```bash
./dist/CiteWell-x86_64.AppImage -datadir "$HOME/CiteWellData"
```

Docs, Rust tests, agent tests, connector:

```bash
cargo run --manifest-path tools/docs-check/Cargo.toml
python3 -m unittest discover -s test/lo
cargo test --manifest-path tools/Cargo.toml -p citewell-cli -p citewell-launcher -p citewell-import
cargo build --manifest-path tools/Cargo.toml -p citewell-import   # source-build import helper
test/runtests.sh importTest.js agentTest.js searchTest.js advancedSearchTest.js
cargo run --manifest-path tools/Cargo.toml -p xtask -- connectors
```

Agent bridge quick check (app must be running; token appears in the data dir):

```bash
tools/target/debug/citewell agent ping --data-dir "$HOME/CiteWellData"
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | tools/target/debug/citewell mcp --data-dir "$HOME/CiteWellData"
```

## Pitfalls learned the hard way

| Pitfall | Handling |
|---|---|
| Trashing `build/` without `.signatures.json` | Sass skips everything and the bundle loses platform CSS. `xtask` refuses to package that now; trash both |
| Putting working files under `build/` | Zotero zips `build/` into `omni.ja`; one bundle reached 532 MB. Scratch lives in `tmp/` |
| Rebuilding while the AppImage runs | The output is mounted and cannot be replaced; quit it first |
| `pkill -f "<pattern>"` | Matches the invoking shell and kills it; use `-x` or explicit PIDs |
| `-datadir "~/…"` | Quoted `~` is not expanded; use `"$HOME/…"` |
| `-datadir` with no value | Gecko ignored it and opened `~/Zotero`; the Rust `AppRun` now exits 2 |
| XHTML changes not copied by a test build | `node js-build/build.js` then `app/scripts/dir_build -p l` before trusting the staged app |
| `agent-token` missing just after launch | The port can listen a moment before the token is written; retry after a second |
| Upgrading Firefox | Not a config bump: adapt the upstream `fxN` port series; procedure in [sync.md](sync.md) |
| Constrained environments | `MOZ_FORCE_DISABLE_E10S=1`; `--appimage-extract-and-run` if FUSE is absent |
| Import helper missing in a source build | Build it with `cargo build -p citewell-import`; the AppImage carries its own copy |
| Tests using the real library | `test/runtests.sh` passes `-datadir "$TEMPDIR/Zotero"` and a temporary `XDG_CONFIG_HOME`; `resetDB()`/`resetData()` refuse `~/CiteWell` |
| `gh` in this repo | Defaults to the fork; `gh` once resolved to `zotero/zotero` |
| Upstream remote | Fetch-only (`pushurl = DISABLED`); never push or open upstream issues/PRs |
| npm | Retired. Do not install, update, audit or add packages; `repo-guard` rejects package/lock changes and restored npm fallbacks (D32) |

## Facts worth not re-litigating

- Linux uses Firefox **153.7.0esr** (D15); Mac/Windows pins stay at 140.17 because they are not
  built (D13).
- `ONLINE_SYNC: false` in [resource/config.mjs](../resource/config.mjs); `ONLINE_LIBRARY: false`
  in the connector. Code still exists (R19).
- SQLite stays: `zotero.sqlite` plus `fulltext.sqlite`, 59 tables, 853 query call sites. A
  file-based store is *not doing*; export is the portability answer. PDF text leaves the index
  under D30; Markdown notes and annotation sidecars stay in it.
- Local API and agent bridge listen on `127.0.0.1:23120` (D16/D17). The CLI never opens SQLite.
  Reads on `/api/` are local-unauthenticated; `/agent/v1` needs the 0600 token and
  `X-CiteWell-Agent: 1`, audits every call, and has no destructive verbs.
- KDE/KWin draws the frame and its buttons (D18); external links and files go through `xdg-open`.
- CiteWell has its own profile, data directory and port (D19). Zotero's paths are never opened;
  import is explicit only.
- **Zotero is canonical.** The current `~/CiteWell` database and storage are disposable test data
  until CiteWell stabilizes (D27); they are not the authoritative library.
- **Nothing is deleted.** Manual removals go to Trash with `gio trash` (or the session trash under
  `~/.local/share/dsh-trash/` when `/tmp` is refused); `rm` is not used (D26).
- **The disposable library is migrated:** 82 legacy notes became `.md` attachments, no failures, and
  the old rows are in Trash. The database backup is `~/CiteWell/zotero.sqlite.pre-markdown-notes.bak`
  (10,321,920 bytes). The ProseMirror editor bundle is gone; trashed/restored legacy notes open in a
  read-only text view. `editorInstance` remains only for annotation-to-note helpers, which go with
  D30. Do not rerun the migration on this library.
- **PDF behavior is external-only:** no reader or pdf.js ships; PDFs open in the host; PDF text is
  not indexed; annotation creation/listing, annotation-to-note actions and the citation-dialog
  annotation mode are gone. Existing annotations export to sidecars. Do not add PDF features back.
- **Plugins are parked:** `PLUGINS_ENABLED` is false and the loader returns early. Keep the code, but do
  not re-enable it without a decision and a tested flag.
- Translators keep their update channel; safeguards must not freeze updates or break the Firefox /
  Google Docs paths (D33).
- `citewell mcp` exposes 17 tools; verified with initialize, tools/list and tools/call.
- `SKILL.md` is the downloadable agent skill (Help → Agents and SKILL.md, or Agent access).
- The connector identity lives in `connectors/brand.json`; `xtask` substitutes tokens and fails on
  hardcoded English product names.
- The Google Docs integration is vendored, not a submodule, because it had to be patched. Its
  sync-dependent parts remain gated by D14.

*For the full documentation index, see [../README.md](../README.md).*
