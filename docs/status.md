# Status and resumption

Last updated 2026-11-25 · branch `citewell` · companion to
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
| App | Linux AppImage on Firefox **153.7.0esr**; CiteWell OXT packaged and the app hosts the LibreOffice bridge; Cite preferences has a Flatpak-aware install action (`10.0.9.SOURCE.77c83f182`, sha256 `443eb4c2…`, 125,848,056 bytes), installed at `~/AppImages/citewell.appimage` |
| Isolation | Own profile `~/.config/citewell/profile`, data `~/CiteWell`, port 23120; Zotero is never opened (D19) |
| Icons | App/connector use the book-section mark; the LibreOffice toolbar uses the original `citewell` set (six actions, 16/26 px, dark variants) from `src/icons/citewell/`, selected by `build.py --icon-set` |
| Connector | **Retiring under D47 (R34):** the standalone Firefox add-on folds into an in-app Browse tab; there is never an AMO submission. **Save bridge shipped 2026-11-25:** the Browse tab detects a web translator and saves the page to the connector's own target (focused collection, else the library) via the app's `Translation` actor and `RemoteTranslate` — no connector inject script was ported. Multi-item pages open a picker (2b, shipped 2026-11-25). Remaining: Google Docs glue, PDF capture. Until the retirement phase, the imported upstream source still builds as **CiteWell Connector**, ID `citewell-connector@sophy.ca`, port 23120, via `connectors/node_modules` |
| Agent access | `/agent/v1`: items, translators, attachments, notes, collections, UI, `export.note`; 17 MCP tools; `citewell` CLI; audit log. PDF annotation verbs are gone (D30) |
| Notes | New and agent notes are `.md` attachments. The 82 legacy notes in the disposable `~/CiteWell` library migrated with 0 failures; 82 are in Trash, 83 `.md` attachments exist and the database backup is kept. Attachment pane shows parent, date and a plain-text excerpt; Markdown attachments are re-indexed at startup and on selection, and `quicksearch-everything` finds their text. The ProseMirror editor is replaced by a read-only legacy view; the `editorInstance` module and its annotation serialization are gone, and the note window/tab remains only as a read-only legacy surface (D37) |
| PDF | **Removed:** no reader, document worker, pdf.js or PDF text index; the Browse tab
captures a PDF response as an imported-URL attachment instead of rendering it (D47 Phase 3). Attachments open through the host; item-pane/notes-context annotation controls, Add Note from Annotations and the citation-dialog annotation mode are gone; the agent has 17 tools. Existing annotations export once to `storage/<key>/annotations.md` from Library preferences. The data layer remains only for that export (D30) |
| Plugins | **Parked, with a curated path (D31/D51):** `PLUGINS_ENABLED=false`; loader initialization returns early, plugin enumeration returns empty and Tools → Plugins is hidden; code is retained (D31). D51 opens a first-party-vetted security-extension path (uBlock Origin candidate — spike pending on content-script injection into browse tabs, background pages, and `webRequest`); arbitrary plugins stay closed |
| Dependencies | npm is retired (D32); the root npm tree and package metadata are removed (D46). The connector tree keeps its own Node build tree until D47's retirement phase removes it |
| LibreOffice | **M5 core passed 2026-11-22.** Six menu actions and a matching toolbar generated from `actions.json`; the current Addons schema renders the six icons in a clean Writer profile. Dialog insert/edit/cancel, multi-item citations, locators, style switching, 100-field Refresh, Unlink, multi-entry bibliography TextSection with CSL paragraph formatting, Add Note footnotes, table-cell citations, in-text ↔ footnote/endnote conversion all work and persist. Attention handling now has a platform-free 1/3/10 s controller, independent integration dialogs with focus/notification handling, modern system notifications, a test-only focus-denial hook, and a persistent timestamped shim log. The OXT installer now repairs stale deployment cache by moving only CiteWell `lu*.tmp_` directories to `~/.cache/citewell/lo-repair/…` and retrying; it never deletes the profile or another extension. **Open:** the KDE/GNOME/XWayland matrix is deferred. Owner confirmed the post-preferences Writer flow on 2026-11-23 and the user-scoped systemd/D-Bus repair/remove paths on the same day. Not done: add-only install in the real profile on request, citation explorer, undo/save listener. The real profile is untouched by tests (D35). |
| Import | R24 Phase 3a merged into `citewell`: detector, Library pane, Rust `citewell-import`; adopt-copy, replace, restore points, merge of regular items, collections, notes, attachments, annotations and saved searches; dedup report/skip/review; resumable child passes |
| Docs | README index, Rust docs gate, D1–D51 |
| CI | `docs` and `Dependency guard` on every push; `CodeQL` weekly/manual as an audit, not a per-push gate (D44). The inherited upstream `ci.yml` with its npm jobs is removed |

**Next:** R34 — the remaining connector work (D47). The save bridge shipped 2026-11-25: the
connector's page-side scripts did **not** need porting, because the app's own `Translation` actor
runs a web translator in the visible tab and `RemoteTranslate` saves the result. `RemoteTranslate`
was hardened for a long-lived tab (the actor is pinned in `setBrowser()`; `initTranslation` is
awaited); multi-item pages open a picker (2b). Proxies (the detected translator's proxy now reaches `ItemSaver`) and PDF capture are shipped:
a PDF response is intercepted by content type before Gecko's removed viewer (D30) and saved as an
imported-URL attachment through the app's own cookie jar. Remaining: D49 hardening (R36), the
uBlock spike (R38), and only then trash `connectors/node_modules` and the XPI pipeline.
**Google Docs is out of the app by owner decision (2026-11-25):** its page-side half is the
connector's React/Kix client, so the Browse tab gates `docs.google.com/document/*` with an
explainer and hands the URL to Firefox, where Zotero's official connector talks to CiteWell.
CiteWell holds no Google session, and the D49 Docs cookie exception was withdrawn.
Browse and settings tabs are shipped (D47/D48); the DNS pane rides the settings tab (D50). The
[connector handoff](#handoff-2026-11-23-connector-build) below is superseded. The app build and
tests are already Node-free.

Build note: the current AppImage is built from `77c83f182` and carries the Browse tab (D47) with
its save bridge (2a), multi-item picker (2b), PDF capture, proxies, the Docs gate and the reworked
toolbar (Go beside the bar, Save behind a divider, measured contrast), the settings tab with
Ctrl+, (D48), and the DNS defaults (D50). Earlier `ff8e83940` predates the Docs gate;
`ce441a1c0` predates the save bridge.

Artifacts are local and gitignored:

- `dist/CiteWell-x86_64.AppImage` (125,848,056 bytes; sha256
  `443eb4c2cebc9bf47b4e61e031e1d0432ab11d0ad08b8f781b4fa14b35791f50`; Browse tab with the
  save bridge, picker, PDF capture, proxies, Docs gate and reworked toolbar, settings tab, DNS defaults,
  node-free build, version `10.0.9.SOURCE.77c83f182`)
- `build/dist/CiteWell-Connector.xpi` is regenerated by `xtask connectors`; it is absent after a
  clean `build/` trash until the connector is rebuilt.

The obsolete R26 editor work was preserved before reverting at
`~/.local/share/dsh-trash/2026-11-21/r26-markdown-editor-work.patch`
(sha256 `08516f3908ef5062e55d7a4f0184e9bf0e4491ab656a550591fc703eadcfac66`). It is history, not a
plan.

## Handoff 2026-11-23 (R15 plan)

- D41 is accepted: delete the need before replacing the tool. The full inventory and phased R15 plan
  are in [rust.md](rust.md#r15--the-build-toolchain); the roadmap entry is updated.
- Key finding: Browserify produces only three files and is a deletion candidate, not a Rust-bundler
  project. `url` has two call sites; Sinon is test-only. Babel’s real job is JSX and ESM→CJS; Sass
  is the largest compiler surface.
- R15 phases 2–3 are done: Browserify/`url`/Sinon are removed or vendored, Babel is gone, and 45
  files were rewritten to CommonJS and `h()` under D42. Phase 4 is done: grass 0.13.4 compiles all
  21 Sass entries through `xtask sass`; Node Sass and CSS source maps are gone (D43)
  ([rust.md](rust.md#phase-4-sass-replacement-2026-11-23)).
- The build runner is ported: `xtask build` now does JS copy/patch, test-data copy, symlinks and
  Sass; `build_and_run` and the test runner no longer invoke Node, and `resource/` no longer points
  into `node_modules`. The root npm tree, package metadata, FTL tooling and ESLint config are gone
  (D45/D46). React replacement is outside R15.
- Branches: `citewell` contains the attachments/resume work and phases 2–5; the stable AppImage
  reports `10.0.9.SOURCE.f3daaea37`. The previous stable is `a9e354775`; the older test build is
  `74c10b0fb` (sha256 `4856a432…`).
- Working tree: only the pre-existing `.gitignore` quill-icon edit is uncommitted.

## Handoff 2026-11-23 (Connector build)

> **Superseded 2026-11-24 by D47** ([decisions.md](decisions.md)): the connector folds into an
> in-app Browse tab and retires; the three options below are no longer live. Kept for context.

- **Identity:** CiteWell's connector is built from the upstream
  `zotero/zotero-connectors` source imported in `connectors/`, not the AMO-published Zotero
  Connector. It has the CiteWell name, extension ID `citewell-connector@sophy.ca`, port 23120,
  `ONLINE_LIBRARY: false`, the book-section icon set and the Google Docs branding. Details and the
  complete patch list are in [connectors.md](connectors.md).
- **Build state:** `xtask connectors` still runs upstream's `connectors/build.sh` + gulp pipeline,
  then adds CiteWell icons/branding and zips the XPI. It requires the isolated
  `connectors/node_modules` tree (about 96 MB). The root app build and tests are already Node-free;
  this connector tree is the last npm dependency in the repository.
- **Decision deferred to next session.** Do not delete `connectors/node_modules` before choosing:
  - **Vendor the current Firefox output** and keep only xtask packaging/branding. Fast (hours),
    removes the tree, but connector source changes need an external Node rebuild.
  - **Port the Firefox-only build to Rust.** Preserves rebuild capability. Scope: 186 source files,
    108 plain JS, 7 JSX files (5,038 lines, 226 elements), five browser libs to vendor, and the gulp
    string/manifest transformations. A Rust JSX transform (OXC/SWC) or a source rewrite is needed;
    no Rust replacement exists for the Mocha/Puppeteer connector tests. Estimate 3–5 focused days.
  - **Keep the tree.** No work, but the npm dependency remains.
- `connectors/` is part of this repository, not a pushed submodule; its nested `src/translate`,
  `src/utilities` and `src/zotero-schema` are submodules. The build can be changed here.

## Handoff 2026-11-23 (Attachments)

- Merged into `citewell` at `f662058a1`.
- Merge now copies source attachment files into CiteWell storage as imported-file attachments,
  maps them to their parents, copies annotations onto the mapped attachments, and copies saved-
  search definitions. Attachments belonging to a skipped exact duplicate are not copied; missing
  files and failed copies increment warnings; the completion line and Last import now also state
  how many source attachments could not be copied. Annotations have no in-app viewer; they are
  retained for the one-time export.
- The identity log is now part of import/replace/restore backups, and a restore writes the selected
  point's identity snapshot back into the active library. Old points without a snapshot keep the
  current chain rather than deleting it.
- Tests: `importTest.js` 17/17, including attachment file content, parent mapping, skipped-duplicate
  attachment policy, annotation fields, saved-search definitions, report scanning, checkpoint
  persistence and a resumed merge that remaps an already-copied attachment. The earlier test
  AppImage remains `~/AppImages/citewell-import-test.appimage`, version
  `10.0.9.SOURCE.74c10b0fb`, sha256
  `4856a432bf9fc4726948ba3bcc038b3612e121223a08bd52ecad5a2133838e37`, 125,929,976 bytes; it
  predates the resume remap fix. The stable `~/AppImages/citewell.appimage` now carries the fix:
  `10.0.9.SOURCE.00cdbf437`, sha256 `f8f65e7e…`; the current stable is newer. Repair or reinstall
  the LibreOffice extension from the updated app before testing a new Writer document.
- Resumable merge batching is implemented: the item pass writes a checkpoint, and a rerun with the
  same source hash resumes the child passes without repeating items. Child creation is idempotent
  by title/annotation/search detection, and an attachment already present is remapped so its
  annotations still follow. The checkpoint is removed on success.
- Next: R15. Imported annotations have no in-app viewer; the one-time export remains their only
  consumer.

## Handoff 2026-11-23 (Dedup report)

- The dedup work is merged into `citewell`: Phase 3a (report), 3b (opt-in exact-identifier skip,
  off by default), 3c (library duplicate-review scan) and the merged-alias replaced-relation
  fallback.
- After a merge, every source item is matched against items that existed before that merge, by
  DOI/ISBN/PMID and then a unique title+year. Ambiguous matches are recorded as ambiguous.
- The report is `identity/duplicates-<session>.json`; `library-import-result.json` carries
  `duplicateReport` and `counts.duplicates`, and the merge completion line / Last import show the
  count and path.
- With the off-by-default “Skip items that exactly match an existing DOI/ISBN/PMID” checkbox, an
  exact duplicate is not inserted; it is still placed in the recreated source collections, its
  source key aliases to the kept item, and its child notes are not duplicated. Title/year matches
  remain report-only, and existing metadata is never changed.
- Tests: `importTest.js` 15/15, including DOI duplicate detection, report contents, exact-identifier
  skip, collection placement, alias resolution and the library duplicate-review report.
- Test AppImage: `~/AppImages/citewell-dedup-test.appimage`, version
  `10.0.9.SOURCE.2ba397c92`, sha256
  `cdc1d34c0322f51c2758760e11dee7d8def50133a4be3451c702b689c5976d8c`, 125,917,688 bytes.
- Phase 3c adds **Duplicate review**: a scan of the current library using Zotero's duplicate
  detector, a JSON group report under `identity/`, and a button that opens the built-in Duplicate
  Items view. It never merges anything; the mature Zotero merge UI remains the only merge path.
- Next: use the review view on the test library's four `Group-level cooperation` records, then
  decide whether a guided per-group review is worth building.

## Handoff 2026-11-23 (Writer compatibility)

- The `writer-compat` work is merged into `citewell` (D39: Zotero owns the Writer document format;
  D40: append-only identity aliases; phases 1–2 of the compatibility plan).
- Phase 1: the LibreOffice extension writes `ZOTERO_` citation/bibliography markers, reads legacy
  `CITEWELL_` markers, reads `ZOTERO_PREF` / `CSL_PREF` / `CITEWELL_PREFS` and writes the Zotero
  property (mirroring the legacy one), and scans bookmarks as well as reference marks.
- Phase 2: merge keeps a free source key; every item also gets an entry in
  `<data>/identity/aliases.jsonl`. Citation resolution falls back to that chain after an exact URI
  and a replaced-item lookup. Group aliases use the source group ID.
- Tests: `importTest.js` 13/13 (key preservation, a forced key collision, alias lookup and
  chain/cycle) and `test/lo/test_protocol.py` 9/9. The OXT rebuilds cleanly.
- Test AppImage: `~/AppImages/citewell-writer-test.appimage`, version
  `10.0.9.SOURCE.9754fb1ab`, sha256
  `5fc70eb1e9f9d5728d4172f5e15babc596296ca4b4a68d5836407ca9719fae5c`, 125,917,688 bytes.
  The stable `~/AppImages/citewell.appimage` now contains the merged Writer + dedup work:
  `d15ef6ed3`, sha256 `4a6d31a0…`. Install or repair the LibreOffice extension from the stable build
  before testing a document.
- Real-document check: a Zotero-created ODT touched by CiteWell keeps the `ZOTERO_` citation and
  bibliography markers, the four original citation payloads (except session-local `id`), their
  `users/17770/items/…` URIs and the bibliography. A fifth citation was added and is library-linked.
  The style change seen in the sample was a deliberate user toggle; `zotero-version` was being
  stamped with the CiteWell version and is now preserved from the source document.
- Detached citations are now audited after an explicit Refresh. A Zotero document whose item keys
  are absent from the library renders from embedded `itemData`; CiteWell now counts those, offers to
  relink exact DOI/ISBN/PMID matches (unique title+year as fallback), imports items that are missing
  (keeping the old key when free), records the alias, and refreshes once. Ambiguous matches are left
  alone and reported. The real sample's four detached citations are the test case.
- Tests: `importTest.js` 14/14, including DOI matching, embedded-item import and alias resolution.
  Import, merge, restore and result messages now use singular/plural wording.
- Not yet done: a real Zotero-created ODT round-trip (open → refresh → save → reopen in Zotero);
  alias inclusion in restore points; Phase 3 dedup aliases; Phase 4 unresolved-citation repair.
- Next: dedup Phase 3 (report first, then an opt-in exact-identifier skip) on top of the identity log.

## Handoff 2026-11-23 (R24 Phase 2)

- R24 Phase 2 is merged into `citewell`: regular items (fields, creators, tags, `dc:relation`),
  collection hierarchy under an import root, group roots, and Zotero notes as inert `.html`
  attachments. Attachments, annotations and saved searches are skipped; there is no duplicate
  detection yet (Phase 4). The source is copied and hashed before/after.
- Merge feedback is fixed: a progress popup reports item/note counts, the pane shows a green
  completion line, and destination counts plus the main library refresh without restarting.
- Restore safety is fixed: a point is inspected before use, empty or corrupt points are refused,
  and the confirmation names both the restore point and current-library counts. Points without a
  manifest are labelled “contents not recorded”.
- Test AppImage: `~/AppImages/citewell-r24-test.appimage`, version `10.0.9.SOURCE.8098d25dc`,
  sha256 `dca1ce0eed4fe507622d5e5077f6a7afc7d012d12521e15505497f543e610812`. The stable
  `~/AppImages/citewell.appimage` is now the merged build `d6e648d81` (`0b9b9aa9…`).
- Live test data: `~/CiteWell` holds the merged library (2,882 items, 104 collections, root
  `Imported from Zotero — 2026-11-23 17:55`). It was recovered from the restore point
  `restore-1795457315203` after an empty Nov 21 snapshot was restored by mistake; the empty state
  is kept at `~/CiteWell/.import-backup/restore-1795458288312-u0wg1g`. The canonical sources
  (`/run/media/eric/RedDragon/Zotero_Library`, `~/Zotero`) were only read and copied.
- `importTest.js` passes 12/12 after the feedback and restore changes.
- CI: CodeQL default setup is disabled; the custom workflow runs. `guard.yml` and `docs.yml`
  declare `contents: read`, resolving the Actions permission alerts. Remaining open alerts are
  inherited: 58 JavaScript and 1 C/C++, not the R24 code.
- Environment caveat: new **Wayland** launches currently segfault the renderer, even the installed
  AppImage; X11 works. Tests run through `/tmp/citewell-x11-test`, which execs `zotero-bin` with
  `GDK_BACKEND=x11` and `MOZ_ENABLE_WAYLAND=0`.
- Next: push `citewell` and confirm CI; then R15. The KDE/GNOME/XWayland matrix remains deferred.

## Handoff 2026-11-22

The AppImage is at `~/AppImages/citewell.appimage` (sha256
`6455ce08bf9f87b3db6543222c1768b0a3060fedad06d65d1c54d17774c76405`, 127,474,168 bytes). The
current branch is `citewell`; push only to `origin`.

**Post-preferences freeze — owner-confirmed 2026-11-23.** The citation flow in Writer, including
accepting document preferences, behaved as expected; no freeze was observed. The
KDE/GNOME/XWayland matrix is deferred by the owner. If the freeze recurs, keep Writer open and
read the persistent shim log at
`~/.var/app/org.libreoffice.LibreOffice/cache/citewell-lo/shim.log`. Do not reset the LibreOffice
profile; the installer repairs stale deployment cache by moving only CiteWell temp directories to a
backup.

**Settings information architecture:** Phases 0–3 are implemented. The manifest supports ten panes;
Integrations, Notes & Annotations and Import & Export are in place; the old Export pane is retired.
Cite follows General. File handling, file renaming, attachment titles, Language & Region, base/data
directories and OpenURL/Locate have moved. The descriptor renderer supports checkbox, radio, numeric
and fixed-action button controls. Search aliases, documentation coverage, duplicate checks and
cleanup are in place. Remaining conversion of complex custom sections is optional. See
[settings.md](settings.md).

**Next actions:**

1. **R24 Phase 2 — import merge** ([import.md](import.md)). Phase 1 (detector, adopt-copy, replace,
   restore points) is done; Phase 2 adds regular-item, collection and note merging.
2. **R15 — Rust build toolchain** after R24.
3. **R32 optional follow-ups** — citation explorer and undo/save listener.
4. **R31 — translator safeguards: parked by the owner (2026-11-22).** Revisit only if the threat
   model changes.
5. Deferred: KDE/GNOME/XWayland matrix; end-to-end settings review (Phases 0–3 are complete).

## Pick up here

1. **R34/R36/R38 — connector retirement, browse hardening, plugin spike (D47, D49, D51).**
   Shipped: browse tab with address bar and "+" (13/13), settings tab with Ctrl+, (D48),
   DNS pane defaulting to 1.1.1.2/1.0.0.2 (D50/R37), and the **Save bridge** — detection on
   load, Save button states, save to the connector's own target, verified live with a
   Wikipedia article and snapshot attachments — 18/18 browse tests. Remaining: the
   multi-item picker (verified live on a PubMed search page: 10 items chosen and saved),
   proxies, PDF capture (content-type interception; verified live with an extensionless arXiv
   PDF), the Docs gate, D49 hardening + the ESR tripwire, the uBlock spike, then the connector
   tree to Trash — Docs no longer blocks it, because it runs through Zotero's official connector
   in Firefox. **Strata cadence (owner, 2026-11-25):
   one lean plan/code pass at each milestone and each security seam — the save bridge got
   both on 2026-11-25; the next pass belongs to the picker or D49 — never on grind, docs, or
   test-only edits; 2 passes/8 hops per task.**
2. **R24 Phase 2 — import merge** ([import.md](import.md)). The next substantial feature.
3. **R15 — Rust build toolchain.** Phases 1–5 are done (D43–D46); the last npm tree
   (`connectors/`) retires under D47.
4. **R32 optional follow-ups** — citation explorer and undo/save listener.
5. **R31 — translator safeguards: parked by the owner (2026-11-22).** Revisit only if the threat
   model changes.
6. **Deferred manual checks** — KDE/GNOME/XWayland matrix; end-to-end settings review.

## Commands

Fetch the Gecko runtime once per version (gitignored):

```bash
app/scripts/fetch_xulrunner -p l -a x86_64
```

Build. Node is no longer needed; **do not run npm** (D32). Clean rebuild after assets or runtime
changes, trashing `build/` with `gio trash`, never `rm` (D26):

```bash
gio trash -f build
cargo run --manifest-path tools/Cargo.toml -p xtask -- build
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
cargo run --manifest-path tools/Cargo.toml -p repo-guard -- --staged
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
| Stale build outputs | `xtask build` overwrites expected files; trash `build/` when a source file is removed |
| Putting working files under `build/` | Zotero zips `build/` into `omni.ja`; one bundle reached 532 MB. Scratch lives in `tmp/` |
| Rebuilding while the AppImage runs | The output is mounted and cannot be replaced; quit it first |
| `pkill -f "<pattern>"` | Matches the invoking shell and kills it; use `-x` or explicit PIDs |
| `-datadir "~/…"` | Quoted `~` is not expanded; use `"$HOME/…"` |
| Major document edits | Snapshot first: commit the current state (a disposable checkpoint) *before* big docs/roadmap edits — a collapsed table is then one `git restore` away, not a hand rebuild (learned 2026-11-25) |
| `-datadir` with no value | Gecko ignored it and opened `~/Zotero`; the Rust `AppRun` now exits 2 |
| XHTML changes not copied by a test build | `cargo run ... -p xtask -- build` then `app/scripts/dir_build -p l` before trusting the staged app |
| `agent-token` missing just after launch | The port can listen a moment before the token is written; retry after a second |
| Clean build cannot run tests | `test/resource/{chai,mocha,co-mocha}.js` used to be symlinks into the npm tree D46 deleted; they are now vendored real files (chai 3.5.0, mocha 3.4.2, co-mocha 1.2.0, MIT). Do not restore the symlinks |
| Upgrading Firefox | Not a config bump: adapt the upstream `fxN` port series; procedure in [sync.md](sync.md) |
| Constrained environments | `MOZ_FORCE_DISABLE_E10S=1`; `--appimage-extract-and-run` if FUSE is absent |
| Import helper missing in a source build | Build it with `cargo build -p citewell-import`; the AppImage carries its own copy |
| Tests using the real library | `test/runtests.sh` passes `-datadir "$TEMPDIR/Zotero"` and a temporary `XDG_CONFIG_HOME`; `resetDB()`/`resetData()` refuse `~/CiteWell` |
| `gh` in this repo | Defaults to the fork; `gh` once resolved to `zotero/zotero` |
| Upstream remote | Fetch-only (`pushurl = DISABLED`); never push or open upstream issues/PRs |
| npm | Retired. Do not install, update, audit or add packages; `repo-guard` rejects package/lock changes and restored npm fallbacks (D32) |
| New JavaScript/Python/shell file | `repo-guard` rejects added code unless its exact path is in `tools/policy-exceptions.txt` under a decision record (D4/D12/D38) |
| Stale LibreOffice deployment | Not an Extension Manager entry. The installer moves only CiteWell `lu*.tmp_` cache dirs to `~/.cache/citewell/lo-repair/` and retries; never reset the profile |
| Wayland pointer grants | Synthetic clicks can require a system permission popup that appears late, and the pointer may then move erratically. Treat a click that appears not to register as environment noise: confirm with logs, DB or tests before touching the app; never re-click in a loop or re-diagnose the non-issue. Prefer keyboard or the test harness; batch visual checks |

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
- The styles page opens in CiteWell's internal viewer; a clicked `.csl` installs through the style
  MIME handler. The external browser still downloads, so Add from file remains the fallback.
- The Google Docs integration is vendored, not a submodule, because it had to be patched. Its
  sync-dependent parts remain gated by D14.

*For the full documentation index, see [../README.md](../README.md).*
