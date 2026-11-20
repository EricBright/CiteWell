# CiteWell roadmap

Direction, not a ticket list. Items are outcomes with an exit criterion; granular tasks belong
in GitHub Issues. Recurring procedures — upstream merges, builds, releases — are not items here;
they live in [docs/sync.md](docs/sync.md). Anything deliberately out of scope is listed under
*Not doing* with its reason, so it does not get re-litigated.

## Now

| ID | Outcome | Why now | Exit criterion |
|---|---|---|---|
| R6 | UI behaviour spec and implementation | Behaviour changes need written intent and a test per change, not a patch pile | Each change has a decision record and a passing test |
| R17 | Contract connector rebrand: name, extension id, `update_url`, icons and behaviour | The XPI still identifies as Zotero and would auto-update to Zotero's connector | Branded XPI loads in `about:debugging` and saves a page against CiteWell |
| R8 | Update channel decision: keep `source` channel, or remove update checks | A fork must not point its updater at Zotero's servers | Explicit setting in the build config, documented |
| R9 | Plugin compatibility check after branding | Plugins target `Zotero.*`; accidental identifier changes surface here | One plugin installs and works against a branded build |

## Next

| ID | Outcome | Why now | Exit criterion |
|---|---|---|---|
| R15 | Rust build toolchain: replace babel/browserify/sass with Rust equivalents | Removes the Node build dependency; needs output parity first | Bundles built by Rust tools pass the same tests |
| R7 | Localisation strategy for user-visible strings | Naively editing `chrome/locale/*` guarantees conflicts on every merge | Written strategy; first string renamed without touching upstream files |
| R10 | User-facing documentation rename | Cosmetic until the UI rename lands | No user-facing doc says Zotero except in attribution |
| R12 | Test coverage for the changed behaviour | Meaningful only once R6 exists | New behaviour has failing-before, passing-after tests |

## Later

| ID | Outcome | Why later | Exit criterion |
|---|---|---|---|
| R11 | Distribution decision: publish Linux builds or stay source-only | Requires a source-offer plan and a signing story | Either published artifacts, or an explicit "source only" note |
| R16 | Rust services: sidecars or WASM for a first real workload | Needs S3 groundwork in [docs/rust.md](docs/rust.md) | One service runs in production behind a versioned protocol |
| R13 | Build CI: npm + `js-build` on pull requests | Needs recursive submodules, which makes the runner slow and network-heavy | A build workflow that fails on a broken bundle |

## Not doing

| Item | Reason |
|---|---|
| Renaming `chrome://zotero/…`, the `Zotero.*` namespace, `APP_ID`, or the sync protocol | Breaks plugins, data directories, and sync for no user-visible gain; see [docs/naming.md](docs/naming.md) |
| Shipping a build under the Zotero name or logo | Trademark; the rename is not optional, see [NOTICE](NOTICE) |
| Tracking upstream merges as roadmap items | They are a procedure, not a goal; see [docs/sync.md](docs/sync.md) |
| Sending CiteWell bugs to Zotero's forums | Misdirects upstream maintainers; CiteWell issues belong here |
| Upstreaming CiteWell branding to `zotero/zotero` | Not wanted upstream, and it would make every merge a negotiation |

*For the full documentation index, see [README.md](README.md).*
