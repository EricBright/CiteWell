# CiteWell roadmap

Direction, not a ticket list. Items are outcomes with an exit criterion; granular tasks belong
in GitHub Issues. CiteWell is a citation catalogue (D28), not a Zotero feature-parity project;
upstream merges are not roadmap items.

## Now

| ID | Outcome | Why now | Exit criterion |
|---|---|---|---|
| R30 | Dependency freeze guard: fail-closed `.npmrc`, no npm fallbacks, staged-change checks (D32) | The editor and reader are the largest supply-chain liabilities; a freeze without a guard is decoration | An accidental npm command fails; a staged `package.json`/lock change or tracked `node_modules` is rejected; build still works from the frozen tree |
| R27 | Notes as Markdown file attachments opened by the host (D29, design in [docs/notes.md](docs/notes.md)) | Replaces the abandoned in-app editor and removes its npm/ProseMirror tree | No new note writes `itemNotes`; 83 legacy notes migrate on a copy with a readable report; each opens externally and is searchable; editor submodule/build removed |
| R28 | Remove PDF handling: reader, document worker, pdf.js, annotation UI, PDF full-text; export annotations to Markdown sidecars (D30) | The largest inherited attack surface for a job the desktop does better | Build and UI contain no PDF renderer or PDF text index; opening a PDF uses `xdg-open`; existing annotations produce `annotations.md` without overwriting; reader tests and verbs gone |
| R29 | Park the plugin API: loader and UI off by default, code retained (D31) | Stops arbitrary local code execution and the compatibility obligation | Shipped build loads no plugins; no plugin UI appears; source still builds with the flag off |
| R24 | Import/merge a Zotero library without touching it (design in [docs/import.md](docs/import.md)) | A fork must not trap an existing library, but must never write Zotero's data | Adopt a copy for an empty library; merge 1k items with attachments into a non-empty one; source checksum unchanged |
| R22 | Agent interface: the `citewell` CLI over the loopback local API | A local or generic agent needs a stable way in without hand-composed HTTP | `status`, `search`, `item` and one authorized write are documented and tested; [docs/cli.md](docs/cli.md) stays registered |
| R17 | Connector rebrand: name, extension id, `update_url`, and the book-section icon in light and dark | The XPI still identifies as Zotero and would auto-update to Zotero's connector | Branded XPI loads in `about:debugging` and saves a page against CiteWell |
| R8 | Update channel decision: keep `source` channel, or remove update checks | A fork must not point its updater at Zotero's servers | Explicit setting in the build config, documented |
| R6 | UI behaviour spec and implementation | Behaviour changes need written intent and a test per change, not a patch pile | Each change has a decision record and a passing test |

## Next

| ID | Outcome | Why now | Exit criterion |
|---|---|---|---|
| R31 | Translator safeguards without freezing updates (D33) | Capture is the product's main input; updates must keep working while third-party code is contained | Updates still install and roll back; Firefox and Google Docs insertion tested; permissions/sandbox documented |
| R15 | Rust build toolchain: replace babel/browserify/sass with Rust equivalents | Removes the frozen Node build dependency | Bundles built by Rust tools pass the same tests |
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

## Not doing

| Item | Reason |
|---|---|
| Embedding a PDF viewer, PDF annotation tools, or PDF full-text search | D30: the host owns PDFs; the renderer is the largest inherited attack surface |
| An in-app note editor, Markdown renderer, or HTML note storage | D29: notes are `.md` files edited by the host; no second document model |
| Loading third-party plugins in shipped builds | D31: arbitrary local code execution with no product need |
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
