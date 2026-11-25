# CiteWell roadmap

Direction, not a ticket list. Items are outcomes with an exit criterion; granular tasks belong
in GitHub Issues. CiteWell is a citation catalogue (D28), not a Zotero feature-parity project;
upstream merges are not roadmap items.

## Now

| ID | Outcome | Why now | Exit criterion |
|---|---|---|---|
| R34 | In-app Browse tab; retire the Firefox connector and the AMO dance (D47 in [docs/decisions.md](docs/decisions.md)) | The Gecko engine, live-page translation and all nineteen connector endpoints already ship in-app; the add-on is a third leg held together by someone else's approval queue | A page browsed in-app saves an item via translator detection; Google Docs insertion works through Zotero's official connector in Firefox (the in-app tab gates Docs with an explainer, D47); `connectors/node_modules` and the XPI pipeline are in Trash (D26); no AMO listing exists or is wanted |
| R38 | Curated plugin path: uBlock Origin spike, then preload or settings suggestion (D51) | The Browse tab inherits web risk; a vetted blocker is the cheapest mitigation, and the runtime already ships XPIProvider + declarativeNetRequest | The spike answers injection/background/webRequest/license questions in writing; then exactly one shape ships (vendored preload, or the settings Plugins section's add-only suggestion); the loader stays closed for everything else |
| R24 | Import/merge a Zotero library without touching it (design in [docs/import.md](docs/import.md)) | A fork must not trap an existing library, but must never write Zotero's data | Adopt a copy for an empty library; merge 1k items with attachments into a non-empty one; source checksum unchanged |
| R8 | Update channel decision: keep `source` channel, or remove update checks | A fork must not point its updater at Zotero's servers | Explicit setting in the build config, documented |
| R6 | UI behaviour spec and implementation | Behaviour changes need written intent and a test per change, not a patch pile | Each change has a decision record and a passing test |

## Done

Completed outcomes, kept for context.

| ID | Outcome | Evidence |
|---|---|---|
| R36 | Browse exposure bounded: state disposed, permissions default-deny, ESR tripwire (D49) | Evidence: reserved context 20260 cleared at startup/shutdown (cookie + clearData tests); soft HTTPS with fallback; permission prefs at block; weekly CI issue-only ESR check; 39/39 browse tests |
| R30 | Dependency freeze guard | `tools/repo-guard` rejects package/lock changes; `.npmrc` is fail-closed (D32) |
| R22 | Agent interface | `tools/cli` provides the CLI and MCP server over `/agent/v1` |
| R17 | Connector rebrand | `connectors/brand.json` carries the CiteWell identity |
| R35 | Settings as a main-window tab (D48) | `openPreferences()` routes to the settings tab and opens no `zotero:pref` window (asserted in settingsTabTest); Ctrl+, opens it; the DNS pane deep-links inside the frame; visual verification 2026-11-25; 19/19 tests |
| R37 | DNS settings item: Cloudflare malware-blocking pair by default (D50) | Settings → DNS pane; `Zotero.DNS` applies `MODE_TRRONLY` to `https://1.1.1.2/dns-query` at startup with no first-run prompt; the system option round-trips; dnsPrefsTest 4/4 |

## Next

| ID | Outcome | Why now | Exit criterion |
|---|---|---|---|
| R32 | LibreOffice feature parity: six menu actions, field-based citations, bibliography ([plan](docs/libreoffice-parity.md)) | The scaffold only inserts APA text at the end of the document; users expect Zotero's citation workflow | M5 passed 2026-11-22: add/edit citation, refresh, unlink, bibliography, Add Note and table fields; AppImage rebuilt; add-only install available on request |
| R15 | Rust build toolchain: delete unnecessary Node steps first, then replace Babel/Sass as needed (D41) | Removes the frozen Node build dependency | No Node/npm tree needed; bundles built by Rust tools pass the same tests — app build done (D43–D46); the connector tree closes out under R34/D47 |
| R7 | Localisation strategy for user-visible strings | Naively editing `chrome/locale/*` creates maintenance work, even without upstream parity | Written strategy; first string renamed without touching upstream locale files |
| R10 | User-facing documentation rename | Cosmetic until the UI rename lands | No user-facing doc says Zotero except in attribution |
| R12 | Test coverage for the changed behaviour | Meaningful only once the removals and notes model exist | New behaviour has failing-before, passing-after tests |

## Later

| ID | Outcome | Why later | Exit criterion |
|---|---|---|---|
| R11 | Distribution decision: publish Linux builds or stay source-only | Requires a source-offer plan and a signing story | Either published artifacts, or an explicit "source only" note |
| R16 | Rust services: sidecars or WASM for a first real workload | Needs S3 groundwork in [docs/rust.md](docs/rust.md) | One service runs in production behind a versioned protocol |
| R19 | Remove the sync subsystem: `xpcom/sync`, `preferences_account`, WebDAV storage, connector online code | The switch hides it now; deletion should be deliberate | No sync code remains and the build has no dead paths |
| R20 | Obsidian/Markdown export: one-way first, design in [docs/export.md](docs/export.md) | Portability without giving up SQLite; becomes mostly a copy of the `.md` attachments | 10k-item export under a minute, vault opens with working links, second run changes nothing |
| R21 | Update metadata: SHA-256 checksums and `.zsync` files beside the AppImage | Gear Lever/AppImageUpdate need a checksum and a zsync file | A release publishes `.AppImage`, `.sha256` and `.zsync`; Gear Lever offers the update |
| R31 | Translator safeguards without freezing updates (D33) | **Parked 2026-11-22 by owner**: Zotero's translator integration risk is accepted for now; revisit only if the threat model changes | Updates install/roll back; Firefox and Google Docs insertion tested; permissions/sandbox documented |
| R33 | Numeric-style citation renumbering: measure and batch field updates | Correctness first; numbered styles are inherently O(k) per insertion and no numeric batching exists yet; benchmark before optimising | 200-citation insertion in the middle stays under 1 s and 500 under 3 s; only changed fields are rewritten |

## Not doing

| Item | Reason |
|---|---|
| Embedding a PDF viewer, PDF annotation tools, or PDF full-text search | D30: the host owns PDFs; the renderer is the largest inherited attack surface |
| An in-app note editor, Markdown renderer, or HTML note storage | D29: notes are `.md` files edited by the host; no second document model |
| Loading arbitrary third-party plugins in shipped builds | D31/D51: the loader stays closed by default; only a first-party-vetted security extension (uBlock Origin candidate) may be preloaded or offered, and only after its spike passes |
| Submitting a Firefox add-on to AMO, or shipping a connector XPI as the primary path | D47: the connector folds into an in-app browsing tab; no listing, signing or review cycle |
| Adding npm packages, vendoring the note editor, or updating the lockfile | D32: npm is retired; no new dependency tree |
| Adding Rust crates or a second toolchain without owner approval | D32: std-only by default; ask first |
| Tracking upstream merges or Zotero feature parity | D28: CiteWell is a new application; `zotero/zotero` is reference only |
| Porting removed reader/editor/plugin code to Rust | The features are gone; upstream has the source if ever needed again |
| Renaming `chrome://zotero/…`, the `Zotero.*` namespace, `APP_ID`, or the sync protocol | Breaks plugins, data directories, and sync for no user-visible gain; see [docs/naming.md](docs/naming.md) |
| Shipping a build under the Zotero name or logo | Trademark; the rename is not optional, see [NOTICE](NOTICE) |
| Sending CiteWell bugs to Zotero's forums | Misdirects upstream maintainers; CiteWell issues belong here |
| Replacing SQLite with a file-based store | A data-layer rewrite with real data-loss risk; [docs/export.md](docs/export.md) gets the portability without it |
| Upstreaming CiteWell branding to `zotero/zotero` | Not wanted upstream, and it would make every merge a negotiation |

*For the full documentation index, see [README.md](README.md).*
