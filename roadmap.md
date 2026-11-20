# CiteWell roadmap

Direction, not a ticket list. Items are outcomes with an exit criterion; granular tasks belong
in GitHub Issues. Recurring procedures — upstream merges, builds, releases — are not items here;
they live in [docs/sync.md](docs/sync.md). Anything deliberately out of scope is listed under
*Not doing* with its reason, so it does not get re-litigated.

## Now

| ID | Outcome | Why now | Exit criterion |
|---|---|---|---|
| R1 | Documentation foundation: README, AGENTS.md, NOTICE, `docs/`, Rust docs check | A fork without a naming rule and a merge procedure produces breakage that looks like progress | `tools/docs-check` green; every doc registered |
| R2 | One-paragraph product statement: what CiteWell is for, beyond a different look | Determines which UI work is worth doing and which is churn | Paragraph recorded in [docs/decisions.md](docs/decisions.md) |
| R3 | CI baseline: docs workflow green; decide the fate of upstream `ci.yml` (Zotero's full matrix is expensive and partly broken on a fork) | Every push currently triggers work nobody reads | Only workflows that can fail meaningfully remain |

## Next

| ID | Outcome | Why now | Exit criterion |
|---|---|---|---|
| R4 | Visible rename of product surfaces: window title, About panel, installer, desktop entry, launcher icons | The app still calls itself Zotero in the places a user sees first | Staged build shows CiteWell in all five surfaces |
| R5 | Icon system refresh: inventory, replacement, high-DPI and dark-mode check | The main reason for the fork; depends on R4's asset paths | Full icon set renders correctly on Linux at 1x and 2x |
| R6 | UI behaviour spec and implementation | Behaviour changes need written intent and a test per change, not a patch pile | Each change has a decision record and a passing test |
| R7 | Localisation strategy for user-visible strings | Naively editing `chrome/locale/en-US` guarantees conflicts on every merge | Written strategy; first string renamed without touching upstream files |
| R8 | Update channel decision: keep `source` channel, or remove update checks | A fork must not point its updater at Zotero's servers | Explicit setting in the build config, documented |
| R9 | Plugin compatibility check after branding | Plugins target `Zotero.*`; accidental identifier changes surface here | One plugin installs and works against a branded build |

## Later

| ID | Outcome | Why later | Exit criterion |
|---|---|---|---|
| R10 | User-facing documentation rename | Cosmetic until the UI rename lands | No user-facing doc says Zotero except in attribution |
| R11 | Distribution decision: publish Linux builds or stay source-only | Requires a source-offer plan and a signing story | Either published artifacts, or an explicit "source only" note |
| R12 | Test coverage for the changed behaviour | Meaningful only once R6 exists | New behaviour has failing-before, passing-after tests |

## Not doing

| Item | Reason |
|---|---|
| Renaming `chrome://zotero/…`, the `Zotero.*` namespace, `APP_ID`, or the sync protocol | Breaks plugins, data directories, and sync for no user-visible gain; see [docs/naming.md](docs/naming.md) |
| Shipping a build under the Zotero name or logo | Trademark; the rename is not optional, see [NOTICE](NOTICE) |
| Tracking upstream merges as roadmap items | They are a procedure, not a goal; see [docs/sync.md](docs/sync.md) |
| Sending CiteWell bugs to Zotero's forums | Misdirects upstream maintainers; CiteWell issues belong here |
| Upstreaming CiteWell branding to `zotero/zotero` | Not wanted upstream, and it would make every merge a negotiation |

*For the full documentation index, see [README.md](README.md).*
