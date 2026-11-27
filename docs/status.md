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

## Handoff 2026-11-26 (late: release live, self-updater, settings UI)

Compaction anchor. Last code commit `21757e94a` (docs commits follow). Installed
`~/AppImages/citewell.appimage` is the published release `2026.11.26.000`, sha256
`6f290eee69fd02517f12bb4fda975e4726cb8e51b5109b1ce3ba2542b8fe7bb3`, 125,864,440 bytes.
`~/AppImages/release-2026.11.26.000/` holds a copy of the three release assets. During the session
a preview had been copied over the stable path; it was restored from that folder. Later on
2026-11-26 the stable path was found missing and was restored byte-for-byte from that folder; the
cause was not established, so check the path after any update test. Do not copy a preview over
`~/AppImages/citewell.appimage`.

Previews are separate files and dev versions, never published. Newest:
`~/AppImages/citewell-preview-add9cb8b6.appimage` (`2026.11.26.SOURCE.add9cb8b6`, sha256
`6aa9a12de973aeddc744024a035d1617dfb3a41c16a96894e10be8462fde9c96`). Older previews are stale.

**Release.** `v2026.11.26.000` is live (latest, not prerelease), tag on `2c521c9b6`, three assets,
published bytes identical to the installed file. Gear Lever parses the embedded update information,
resolves the repository and reports "No updates available".

**Shipped since the versioning handoff.**

- **D60 self-updater.** `tools/updater` (`citewell-update`, Rust + sha2): `verify` compares every
  published digest and checks ELF 64-bit, AppImage type 2 and x86-64; `install` waits for the app
  pid, re-hashes immediately before the atomic rename, refuses symlinks, sets 0755 and starts the
  new file with `-profile`, `-datadir`, `-no-remote` and the AppImage environment removed. Cite >
  Check for Updates resolves `releases/latest`, downloads beside `$APPIMAGE`, verifies, then quits
  into the sidecar. A dev build (no publish counter) refuses to update; a read-only directory fails
  before the 125 MB download. The restart's arguments are a fixed allowlist: `-profile`,
  `-no-remote`, `-datadir` only when the launch had one, and `--no-integration` when the
  launcher recorded that opt-out (D60 amendment).

  *Validated 2026-11-26.* A build labelled `2026.11.25.999.SOURCE.6f88c6c9c` updated to the
  published release: the dialog named both versions and 120 MB, the download reached 125,864,440
  bytes, the published digests verified, the file was swapped to `6f290eee…`, the restarted process
  ran `2026.11.26.000.SOURCE.2c521c9b6` against the same profile and library, and `/connector/ping`
  answered 200 with no temporary file left. The run also showed the restarted instance ignoring
  `--no-integration`; the launcher now records that opt-out and the restart passes it on. A third
  run, launched with neither `-datadir` nor `--no-integration`, restarted with only `-profile` and
  `-no-remote`, kept the profile's data directory and created no integration files. A Strata pass
  caught that last case: the first version of the allowlist repeated `-datadir` unconditionally.

- **Merge resume.** `importTest.js` kills a real merge during the item, note and attachment passes
  and resumes it. The kill found that every child checkpoint replaced the session file, dropping
  the item map and the note collection link, so a resumed note pass imported nothing; checkpoints
  are cumulative now. 24/24.

- **R6 boundary (D63).** Help sends problems to GitHub Issues and questions to GitHub Discussions;
  the Zotero troubleshooting and forum items, the Mendeley help link, the data-directory KB button
  and the post-upgrade blog banner are gone. The Style Manager catalog and dictionary downloads
  remain owner-approved exceptions. The browser connector moved from Tools to Settings > Advanced
  with the exception stated there (D65). `uiCopyTest` 15/15.

- **Settings UX.** Settings is a one-click menubar command between Tools and Help (ui rule 7), not
  an Edit item. DNS is a section of Advanced, not a pane (D50 amendment); the manifest `retired`
  list is now read, so a saved `lastSelectedPrefPane` or a deep link to the old DNS id lands on
  Advanced. The sidebar sizes to its longest label (200-280px). Installing a style from the style
  page refreshes an open Style Manager (Zotero refreshed only `zotero:pref` windows). The pane
  select handler settles before reading the value and logs exceptions.
- **Icons.** Integrations and Agent access now use outlined puzzle and robot glyphs at the owner's
  final geometry instead of a shared magic wand. Editing copies in `~/Desktop/citewell-*.svg` use
  black paint; shipped files use `context-fill`.
- **Empty library (D61).** One line, "Welcome to CiteWell!", plus **Browse the web**, which opens
  the Browse tab. The block is centred against the item pane's message by the item toolbar height.
  The Quick Start/connector paragraph and its strings are gone. Help > Support and Documentation
  opens this repository, not Zotero's support site.
- **Problem reports (D62).** Help > Report a Problem… opens CiteWell's issue tracker and copies the
  error log to the clipboard; nothing is posted to Zotero's error service any more.

**Tests.** `versionTest` 3/3, `settingsTabTest` 8/8, `uiCopyTest` 15/15, `dnsPrefsTest` 4/4,
`selfUpdateTest` 4/4, `importTest` 24/24, the updater sidecar 7/7. Four failures still sit in
`server_connectorTest` and `translateTest` (chai API gaps) plus one live-prompt timeout in
`integrationTest`; none is caused by these changes.

**Next.** (1) R6 residue: legacy Zotero-era strings and translations. (2) R32 optional follow-ups.
The next release's notes get the same claims pass as the first release before the draft is
published. Help points at the repository until a documentation section exists.

## Handoff 2026-11-26 (D59 versioning, first release staged)

Compaction anchor. Last code commit `2c521c9b6` (docs commits follow). Installed AppImage
`2026.11.26.000.SOURCE.2c521c9b6`, sha256
`6f290eee69fd02517f12bb4fda975e4726cb8e51b5109b1ce3ba2542b8fe7bb3`, 125,864,440 bytes, installed at
`~/AppImages/citewell.appimage` and launched against a scratch profile with `--no-integration`:
`/connector/ping` returned 200 on **both** `23119` and `23120`.

**Shipped: D59, calendar versioning.** The app version is `YYYY.MM.DD.NNN` (UTC date of first
publication plus a three-digit publish counter); the tag is the ledger; dev builds carry
`YYYY.MM.DD.SOURCE.<sha>`. The value sent to Zotero-shaped consumers is
`Zotero.zoteroCompatVersion = "10.0.9"` — the repository update check, the `X-Zotero-Version`
header and LibreOffice document metadata — while About, Debug, the agent API and schema bookkeeping
keep the CiteWell number. The translation framework is a submodule that runs in its own sandbox
where `Zotero.version` is the framework's `5.0.78`; those call sites are deliberately untouched.
`versionTest.js` 3/3 and the `DocumentData` slice of `integrationTest.js` 7/7; the wider related
suite ran 165/169 with four failures that predate this change (two chai/API gaps in
`server_connectorTest.js` and `translateTest.js`, one live-prompt timeout in `integrationTest.js`).

**Published 2026-11-26.** GitHub release `v2026.11.26.000` (latest, not a prerelease) carries the
three assets; the tag points at `2c521c9b6`, the published AppImage is byte-identical to the
installed file (sha256 above), and `releases/latest/download/CiteWell-x86_64.AppImage.zsync`
resolves. The release body is the corrected draft (picker wording, glibc 2.34, no untested
browser-save claim). `version` is back to `2026.11.26.SOURCE` for dev builds. DNS is now a section of Advanced rather than a pane of its own (D50 amendment), which also removes the icon it shared with the Locate control.

## Handoff 2026-11-25 (R34, R24, its hazard and R8 closed)

Compaction anchor. Last code commit `cf3e2382a` (docs commits follow). Installed AppImage
`10.0.9.SOURCE.cf3e2382a`, sha256
`5eb91f3c5079116b9211e9f716c4fd6e2e1fb6438b5f99ca37578f05ca686742`, 125,860,344 bytes, installed
at `~/AppImages/citewell.appimage` and launched against a scratch profile with `--no-integration`:
`/connector/ping` returned 200 on **both** `23119` and `23120`. The integration manifest points at
the installed path and `~/CiteWell`.

**Shipped today, in order.**

1. **R34, connector retired.** `connectors/` (117 MB including `node_modules`, the gulp/XPI
   pipeline and three submodule working trees) and `tools/rsvg-shim` went to Trash; `xtask
   connectors`, its brand/icon pipeline and the `connectors/src/*` submodule entries are gone.
   [connectors.md](connectors.md) is a retirement record. The Docs explainer's promise that
   Zotero's Connector talks to this app was **false** (that connector asks only `23119`); the app
   now serves the same handlers there when the port is free (`Zotero.Server.connectorPort`), the
   gate states the truth in both states, and `server_connectorIntegrationTest.js` drives the Docs
   handshake through `23119`. Trade-off in D19's amendment: the first app started owns `23119`.
2. **R24, import merge done.** Acceptance run: the canonical 1,771-item library merged into a
   non-empty library as 946 items, 589 attachments, 83 notes, 53 collections, 1 saved search,
   0 skipped, 153 fileless rows reported, source checksum unchanged, 38.1 s. Two data-loss defects
   found and fixed: same-title children were dropped by title-based resume de-duplication (34
   attachments + 1 note), and the 25-item checkpoint cadence could duplicate children after an
   interruption. Details in [import.md](import.md#measured-acceptance-2026-11-25).
3. **Strata workflow repaired.** The invocation details now live in the gitignored
   `reviews/strata/README.md` with `python3 reviews/strata/ask.py` (installed as
   `~/.local/bin/strata-ask`), and the global skill `~/.dsh/skills/delegate-strata-second-opinion`
   was corrected: inline tool-free is the default, 2500+ tokens (600–800 returns empty `content`
   because reasoning eats the budget), and findings must be verified against the code, not just
   located. Pass outcomes: `reviews/strata/passes.md`.

4. **R24 hazard closed.** A merge retry whose source changed after an interruption is now
   **refused**, with the interrupted merge's restore point named in the dialog. The pane offers a
   database restore: the importer's new `--database-only` swaps `zotero.sqlite` and leaves
   `storage/` and the search index in place, keeps the replaced database as a database-only
   restore point, forgets the merge session, and lets the changed library be merged again. The
   full restore path refuses database-only points rather than emptying the attachment tree.
   Verified end to end against a scratch library on 2026-11-25. Decision: [D52](decisions.md#d52--an-interrupted-merge-refuses-when-its-source-changed).

5. **R8, Mozilla update channel removed.** A probe of the shipped build showed the inherited
   updater fetching `zotero.org/.../update.xml` and failing with a 404, which both contacted
   Zotero and could never have installed anything (signed MARs cannot patch squashfs). The build
   now has no `[AppUpdate]` URL, `app.update.auto` is off, the manual/detail links point at
   CiteWell's releases page, and Check for Updates states that there is no in-app channel yet and
   offers the releases page instead of opening the wizard; the startup-error dialog's Check for
   Update button does the same. A check now resolves locally as "Update URL not available" with no
   network request. Decision: [D53](decisions.md#d53--there-is-no-mozilla-update-channel-and-check-for-updates-says-so).

6. **Restore hardening from a second-opinion pass** (`bf0341193`). Two holes in the new
   database-only restore: a backup is database-only by the absence of `storage/`, not only by a
   manifest the sidecar cannot write, so a crash between the swap and the manifest used to leave a
   point the full restore path would accept and restore with an empty attachment tree
   (`queueRestore` now refuses it, `listBackups` marks it, the pane routes it to Restore database);
   and a sidecar killed between moving the database aside and removing its marker left the marker,
   so a later apply would have rolled a completed restore back. The importer gained a `recover`
   command, and the failure path runs it before dropping the request. Tests: importer 12/12,
   import 20/20.

7. **Checkpoint lifecycle closed** (`ef612c3c6`). A completed merge forgot only the checkpoint it
   used, so an older one for the same source could later refuse a merge with nothing partial left;
   it now forgets them all for that source. A checkpoint whose backup is gone (or which never
   recorded one) used to refuse forever with no action that could work; the dialog now says so,
   points at the restore-point list, and offers to discard the record after a second confirmation
   naming the duplication it allows. Tests: import 21/21.

8. **A leftover swap is finished at startup** (`bbcc182ee`). Recovery only ran inside an apply, so
   a helper killed after its request was gone left a marker and a missing or half-moved database
   that nothing would fix. `applyPending` now runs `recover` when the marker exists, before it looks
   at requests. Verified end to end with a scratch data directory whose database had been moved
   aside: the app restored it, removed the marker and answered on 23120.

9. **R6 started: the UI behaviour spec and the copy rule** (`4bf82bc30`). [ui.md](ui.md) makes the
   owner's rules binding and says where each is enforced; [D54](decisions.md#d54--ui-behaviour-gets-one-spec-and-a-test-per-change)
   records the protocol. The first change removed every em dash from the copy the project owns
   (save tooltip, picker intro, status lines, attention title, import collection name, locale
   strings, agent and DNS pane text) and added `uiCopyTest.js`: it scans the en-US locale files,
   every preference pane as shipped, the Docs gate's launch URL, and the one-numbered-line rule for
   its steps. Locale is read from the source tree because the test runtime can resolve to a
   translation (en-GB here); the copy rule covers en-US. Tests: uiCopy 4/4.
   The disabled-state audit added `uiContrastTest.js`: it reads the Browse toolbar's two colour
   pairs from the stylesheet and requires at least 3:1 between enabled and disabled in both themes
   (measured 4.05:1 light, 3.45:1 dark). Every other disabled style belongs to an upstream
   component drawn by the platform theme, so it stays review, not a test that cannot fail.
   The keyboard rule gained a declaration test: `browseTabTest` asserts the `key_focusBrowseURL`
   declaration (key `l`, modifier `accel`) still points at the command that calls
   `Zotero_BrowseTab.focusOrOpen`; the behaviour itself was already tested.
   The item picker's keyboard contract is now specified and tested (D55): filter focused on open,
   Escape cancels with null, Save disabled until something is checked, a filter never hides a
   checked row, and Enter in the filter does not save. Tests: picker 5/5.
   The Settings tab now says **Loading settings** while its frame initializes and **Settings could
   not be loaded** when the probe gives up, instead of showing a blank panel either way; `getState`
   exposes loading, ready and failed (D56). A pane that throws inside a ready frame is now local:
   its own notice, the selection put back on the pane that is actually shown, cleared on the next
   successful navigation (D57). Tests: settings 4/4, and uiCopy pins the Docs handoff shape
   (button says browser, reason names Firefox).

10. **R21 and R11: release metadata and the publishing decision** (`cf3e2382a`). `xtask appimage`
    now embeds `gh-releases-zsync|EricBright|CiteWell|latest|CiteWell-*x86_64.AppImage.zsync`,
    proves the string with `--appimage-updateinformation`, writes the `.zsync` with `zsyncmake`, and
    writes a `.sha256` file, so Gear Lever would find update information where the build carried
    none. [D58](decisions.md#d58--publish-appimages-on-github-releases-with-source-and-without-a-key)
    decides to publish on GitHub releases with exactly those three asset names, the repository at
    the tag as the AGPL source offer, and SHA-256 over TLS rather than a signature. Test builds are
    prereleases, so `latest` never offers them. No release is published yet.

**Tests at this commit:** Browse 41/41, RemoteTranslate 12/12, connector integration 3/3, import
21/21 (same-title regression, the refusal, database-only classification, checkpoint lifecycle),
uiCopy 5/5, uiContrast 1/1, picker 5/5, settings 4/4, update channel 4/4, importer 12/12; docs 795/800; repo-guard green; docs gate green.

**The self-updater itself is R11/R21, not R8.** The shape is decided and written in
[packaging.md](packaging.md#updates): the specification allows an updater built into the AppImage,
AppGlider is the reference (download beside the running image, verify, run the candidate from a
temporary name, let it commit itself over the stable path after it holds the profile lock, never
write the running file). Gear Lever compatibility is recorded there too: keep the path and basename,
install the published bytes exactly, keep `.upd_info` in every build, offer no channel Gear Lever
does not follow. Test releases on `EricBright/CiteWell` are authorized; a test build must say so
and never reuse a real version number.

**What a fresh session should do:** read this section and [#pick-up-here](#pick-up-here), then
start R6. R34, R24, its hazard and R8 are closed; do not redo them; do not re-import a connector
tree; do not delete the canonical Zotero sources.

**Housekeeping.** Scratch from today's runs is under `~/.local/share/dsh-trash/2026-11-25/`
(the acceptance copy of the canonical library, twice); the one-off acceptance harness is
`reviews/acceptance/importAcceptanceTest.js`, deliberately untracked. The canonical USB library
was only read: `zotero.sqlite` still hashes to its pre-run baseline and its mtime is
`2026-11-23 14:05`.

**Pitfalls added today:** `Zotero.File.createDirectoryIfMissingAsync` did not create a nested
directory whose parent had just been created in the test runtime (it returned without the directory
appearing). Use `IOUtils.makeDirectory(path, { createAncestors: true, ignoreExisting: true })` for a
new nested path; `_applyDatabaseRestore` does. A scratch smoke launch of the installed AppImage must pass
`--no-integration`; otherwise the launch auto-installs the attention integration and rewrites the
real `~/.config/citewell/integration.txt` and `citewell-attention.service` to the scratch
`-datadir` (done twice on 2026-11-25, repaired both times with
`--install-integration -datadir "$HOME/CiteWell"`). Use an existing `-profile` directory too. The
test suite is packaged inside `omni.ja`, so a test-file edit needs `xtask build` **and**
`dir_build` before `test/runtests.sh` sees it; editing only the source file runs the previous
suite and the stack lines point at the old file. `IOUtils.writeAtomic` does not
exist in this runtime; use
`Zotero.File.putContentsAsync`, which already writes atomically via `OS.File.writeAtomic`. A
`-profile` path must exist before launch or Gecko shows "Profile Missing". `/tmp` cannot be
`gio trash`ed ("system internal mounts"), so move scratch to `~/.local/share/dsh-trash/<date>/`
instead of deleting. Test-file edits need both `xtask build` and a test-enabled
`app/scripts/dir_build -f` to reach the staged suite. chai 3.5's `isFunction` rejects
Xray-wrapped functions; use `typeof`.

## Where the project stands

| Area | State |
|---|---|
| App | Linux AppImage on Firefox **153.7.0esr**; CiteWell OXT packaged and the app hosts the LibreOffice bridge; Cite preferences has a Flatpak-aware install action (`2026.11.26.000.SOURCE.2c521c9b6`, sha256 `6f290eee…`, 125,864,440 bytes), installed at `~/AppImages/citewell.appimage`; R8 removed the Mozilla update URL, so the app contacts no update server, and R21 embedded the Gear Lever update information; the first release is published (`v2026.11.26.000`); the self-updater is implemented and waits for an end-to-end run |
| Isolation | Own profile `~/.config/citewell/profile`, data `~/CiteWell`, port 23120; Zotero is never opened (D19) |
| Icons | The app uses the book-section mark; the LibreOffice toolbar uses the original `citewell` set (six actions, 16/26 px, dark variants) from `src/icons/citewell/`, selected by `build.py --icon-set` |
| Connector | **Retired 2026-11-25 (D47/R34).** No add-on is built or shipped; `connectors/` and `tools/rsvg-shim` are in Trash and `xtask connectors` no longer exists. Capture is the Browse tab's job: save bridge (2a), picker (2b), PDF capture; Google Docs citations come from Zotero's official connector in Firefox. Because that connector only asks `127.0.0.1:23119`, the app also serves the same handlers there when the port is free (`Zotero.Server.connectorPort`), and the Docs gate tells the truth when it is not |
| Agent access | `/agent/v1`: items, translators, attachments, notes, collections, UI, `export.note`; 17 MCP tools; `citewell` CLI; audit log. PDF annotation verbs are gone (D30) |
| Notes | New and agent notes are `.md` attachments. The 82 legacy notes in the disposable `~/CiteWell` library migrated with 0 failures; 82 are in Trash, 83 `.md` attachments exist and the database backup is kept. Attachment pane shows parent, date and a plain-text excerpt; Markdown attachments are re-indexed at startup and on selection, and `quicksearch-everything` finds their text. The ProseMirror editor is replaced by a read-only legacy view; the `editorInstance` module and its annotation serialization are gone, and the note window/tab remains only as a read-only legacy surface (D37) |
| PDF | **Removed:** no reader, document worker, pdf.js or PDF text index; the Browse tab
captures a PDF response as an imported-URL attachment instead of rendering it (D47 Phase 3). Attachments open through the host; item-pane/notes-context annotation controls, Add Note from Annotations and the citation-dialog annotation mode are gone; the agent has 17 tools. Existing annotations export once to `storage/<key>/annotations.md` from Library preferences. The data layer remains only for that export (D30) |
| Plugins | **Parked, with a curated path (D31/D51):** `PLUGINS_ENABLED=false`; loader initialization returns early, plugin enumeration returns empty and Tools → Plugins is hidden; code is retained (D31). D51 opens a first-party-vetted security-extension path (uBlock Origin candidate — spike pending on content-script injection into browse tabs, background pages, and `webRequest`); arbitrary plugins stay closed |
| Dependencies | npm is retired (D32); the root npm tree and package metadata are gone (D46), and the connector tree's own Node build went with it (D47/R34). **No npm tree remains in the repository** |
| LibreOffice | **M5 core passed 2026-11-22.** Six menu actions and a matching toolbar generated from `actions.json`; the current Addons schema renders the six icons in a clean Writer profile. Dialog insert/edit/cancel, multi-item citations, locators, style switching, 100-field Refresh, Unlink, multi-entry bibliography TextSection with CSL paragraph formatting, Add Note footnotes, table-cell citations, in-text ↔ footnote/endnote conversion all work and persist. Attention handling now has a platform-free 1/3/10 s controller, independent integration dialogs with focus/notification handling, modern system notifications, a test-only focus-denial hook, and a persistent timestamped shim log. The OXT installer now repairs stale deployment cache by moving only CiteWell `lu*.tmp_` directories to `~/.cache/citewell/lo-repair/…` and retrying; it never deletes the profile or another extension. **Open:** the KDE/GNOME/XWayland matrix is deferred. Owner confirmed the post-preferences Writer flow on 2026-11-23 and the user-scoped systemd/D-Bus repair/remove paths on the same day. Not done: add-only install in the real profile on request, citation explorer, undo/save listener. The real profile is untouched by tests (D35). |
| Import | **R24 done 2026-11-25, hazard closed the same day.** Phases 1-4 shipped; the acceptance merge of the canonical 1,771-item library into a non-empty one imported 946 items, 589 attachments, 83 notes, 53 collections and 1 saved search, skipped nothing, reported 153 fileless rows, left the source checksum unchanged and took 38.1 s. Fixed: same-title children dropped by title-keyed resume, the 25-item checkpoint duplicating children, and a changed source after an interruption now refusing with a database restore (D52); `importTest.js` 19/19, importer 10/10 |
| Docs | README index, Rust docs gate, D1–D58 |
| CI | `docs` and `Dependency guard` on every push; `CodeQL` weekly/manual as an audit, not a per-push gate (D44). The inherited upstream `ci.yml` with its npm jobs is removed |

**Next: R6** ([roadmap.md](../roadmap.md)). R34 closed 2026-11-25: the Browse tab, save
bridge, picker, proxies, PDF capture, Docs gate and R36 hardening shipped, R38 closed with no
in-app blocker ([ublock-spike.md](ublock-spike.md)), and the connector tree itself is gone
([connectors.md](connectors.md)). R24 closed the same day, including the interrupted-merge hazard
([import.md](import.md)), and R8 removed the inherited Mozilla update channel (D53), so the app
contacts no update server. Google Docs stays out of the app: the Browse tab gates
`docs.google.com/document/*` with an explainer and hands the URL to Firefox, where Zotero's official
connector talks to CiteWell on port 23119. CiteWell holds no Google session. Browse and settings
tabs are shipped (D47/D48), the DNS pane rides the settings tab (D50), and the app build and tests
are Node-free. The [connector handoff](#handoff-2026-11-23-connector-build) below is superseded.

Build note: the current AppImage is built from `2c521c9b6` and carries the Browse tab (D47)
with its save bridge (2a), multi-item picker (2b), PDF capture, proxies, the Docs gate with the
23119 compatibility listener, and the reworked toolbar (Go beside the bar, Save behind a divider,
measured contrast), the settings tab with Ctrl+, (D48), and the DNS defaults (D50). Earlier
`77c83f182` predates the dialog polish; `ff8e83940` predates the Docs gate; `ce441a1c0` predates
the save bridge.

Artifacts are local and gitignored:

- `dist/CiteWell-x86_64.AppImage` (125,864,440 bytes; sha256
  `6f290eee69fd02517f12bb4fda975e4726cb8e51b5109b1ce3ba2542b8fe7bb3`; also `.zsync` and
  `.sha256`; Browse tab with the
  save bridge, picker, PDF capture, proxies, Docs gate with the 23119 listener, reworked toolbar,
  settings tab, DNS defaults, no connector tree, the merge-refusal and database-restore change,
  its restore hardening, the checkpoint-lifecycle fixes, startup recovery of a leftover swap, the
  R6 copy pass, settings loading and failure states, local pane failures, Gear Lever update
  information, no Mozilla update channel, D59 calendar version `2026.11.26.000.SOURCE.2c521c9b6`)

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

**Superseded:** the connector tree was retired on 2026-11-25 (see the handoff at the top and
[connectors.md](connectors.md)). This section is history.

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

1. **R6 — UI behaviour spec and implementation:** one written intent and one test per behaviour
   change; the owner's UI rules are in [#owners-ui-rules](#owners-ui-rules-carry-these-into-r6).
2. **R11/R21 — the self-updater needs its end-to-end run.** `v2026.11.26.000` is live and the
   installed file is the published one. Build with a deliberately earlier version, point `APPIMAGE`
   at a copy, run Check for Updates, and confirm download, swap and restart; then decide the
   restart-argument allowlist (profile and datadir are preserved, other flags are not). The helper
   itself is tested against the published bytes. Test builds on the remote are authorized.
3. **Kill-mid-merge test** for the resume path (still missing; the refusal has a test, the resume
   across an unchanged source only an acceptance run).
4. **R32 optional follow-ups** — citation explorer and undo/save listener.
5. **R31 — translator safeguards: parked by the owner (2026-11-22).** Revisit only if the threat
   model changes.
6. **Deferred manual checks** — KDE/GNOME/XWayland matrix; end-to-end settings review.
7. **Strata cadence (owner, 2026-11-25):** one lean plan/code pass at each milestone and security
   seam, never on grind/docs/test-only edits; the wait ritual is in the gitignored
   `reviews/strata-during-waits.md`.

## Owner's UI rules (carry these into R6)

- No em-dashes in user-facing copy.
- Numbered steps sit on their own lines, one description per step.
- Enabled and disabled controls must be plainly distinguishable; measure the contrast rather than
  trusting the eye. The Browse toolbar uses `#ffffff`/`#1a1a1a` for enabled and
  `#8a8a8a`/`#7a7a7a` for disabled (roughly 3.4x apart, above the 3:1 non-text floor).
- Browser habits win: Go belongs immediately after the address bar, Save lives behind a divider at
  the far right, and Ctrl/Cmd+L focuses and selects the URL (opening the Browse tab from Library).
- Wording stays honest: the default browser may not be Firefox, so a handoff says "your browser"
  unless the situation is specific.
- Docs points at Zotero's connectors page, not the main download page.

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

Docs, Rust tests, agent tests:

```bash
cargo run --manifest-path tools/docs-check/Cargo.toml
cargo run --manifest-path tools/Cargo.toml -p repo-guard -- --staged
python3 -m unittest discover -s test/lo
cargo test --manifest-path tools/Cargo.toml -p citewell-cli -p citewell-launcher -p citewell-import
cargo build --manifest-path tools/Cargo.toml -p citewell-import   # source-build import helper
test/runtests.sh importTest.js agentTest.js searchTest.js advancedSearchTest.js
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
- **Browse state is isolated:** tabs run in `userContextId` 20260, cleared at startup and shutdown;
  the ESR tripwire is a CI issue for maintainers, never an in-app notice.
- **PDF behavior is external-only:** no reader or pdf.js ships; PDFs open in the host; PDF text is
  not indexed; annotation creation/listing, annotation-to-note actions and the citation-dialog
  annotation mode are gone. Existing annotations export to sidecars. Do not add PDF features back.
- **Plugins are parked:** `PLUGINS_ENABLED` is false and the loader returns early. Keep the code, but do
  not re-enable it without a decision and a tested flag.
- Translators keep their update channel; safeguards must not freeze updates or break the Firefox /
  Google Docs paths (D33).
- `citewell mcp` exposes 17 tools; verified with initialize, tools/list and tools/call.
- `SKILL.md` is the downloadable agent skill (Help → Agents and SKILL.md, or Agent access).
- **The connector tree is retired (D47):** `connectors/`, `tools/rsvg-shim` and `xtask connectors`
  are gone; do not re-import a connector. Google Docs citations use Zotero's official connector,
  which reaches the app on `127.0.0.1:23119` when that port is free (`Zotero.Server.connectorPort`);
  `23120` stays the app's own address (D19 amendment).
- The styles page opens in CiteWell's internal viewer; a clicked `.csl` installs through the style
  MIME handler. The external browser still downloads, so Add from file remains the fallback.
- Google Docs stays outside the app (D47): the Browse tab gates `docs.google.com/document/*` and
  hands the URL to Firefox, where Zotero's connector inserts citations against this app's
  `/connector/document/*` endpoints. The sync-dependent parts of Docs remain gated by D14.

*For the full documentation index, see [../README.md](../README.md).*
