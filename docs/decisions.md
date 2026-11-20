# Decisions and dead ends

Why the project is shaped this way. Each record is written when the choice is made, not
reconstructed later; a decision without its rejected alternatives is just a description.

## D1 — Base CiteWell on upstream `10.0`, not `main`

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes, at rising cost

`main` is the 11.0 development line; `10.0` is the stable line that receives fixes without UI
churn, and it matches the Zotero version the author actually runs.

Rejected: `main` — newer features, but it rewrites the exact UI surfaces this fork changes, so
every merge becomes a negotiation. Rejected: plugin-only — no rebranding or deep UI edits.

## D2 — `main` stays a pristine mirror; work happens on `citewell`

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

GitHub's "Sync fork" and `git merge --ff-only` only work on a branch with no unique commits. A
clean `main` also gives every merge a known base. See [sync.md](sync.md).

Rejected: working directly on `main` — kills fast-forward sync and turns merges into rebases.

## D3 — Internal identifiers keep saying `zotero`

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** no

Renaming `chrome://zotero/…`, `Zotero.*`, `APP_ID`, `extensions.zotero.*`, or the sync identity
breaks plugins, user settings, data directories, and sync accounts. None of it is user-visible.
Full boundary in [naming.md](naming.md).

Rejected: full mechanical rename — high churn, silent breakage, no user-visible gain.

## D4 — New code in this repository is Rust

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** with effort

One compiled toolchain for tooling, no second runtime shipped or installed, memory safety by
default, and a single `cargo` invocation in CI. Applies to *new* code; the inherited Zotero
codebase is JavaScript and is not being rewritten. Markdown, YAML, JSON, CSS, and HTML are
configuration and documentation, not code.

Rejected: Node.js — would add a second runtime and dependency tree beside a codebase that
already ships one; shell — untestable and unportable for the checks we need; Python — same
runtime objection with weaker typing.

Consequence: CI and contributors need a Rust toolchain. First consumer is
[docs-check](../tools/docs-check).

## D5 — Documentation is split into always-tier and on-demand, and enforced

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

`README.md` is read at the start of every session and must stay small; everything else is opened
to answer one question. A budget with no failing check is decoration, so `tools/docs-check`
verifies the cap, the completeness of the index, and the back-reference line.

Rejected: conventions-only — observed to decay; the rule lives inside the file it governs.

## D6 — Rewrite `README.md`, leave `COPYING` untouched, add `NOTICE`

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

Upstream last changed `README.md` in April 2023 and `COPYING` in 2018, so a README rewrite costs
almost no merge risk. `COPYING` is the license text plus Zotero's notice; editing it creates a
diff against upstream for no legal gain. AGPLv3 §5(a) instead requires a modification notice,
which `NOTICE` supplies.

Rejected: editing `COPYING` to add CiteWell — diff noise, and no one benefits from a modified
license file.

## D7 — License CiteWell as AGPL-3.0-or-later

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** no (for released versions)

Zotero's per-file headers already grant "version 3 of the License, or (at your option) any later
version", so or-later is exactly the permission already granted; choosing `-only` would be more
restrictive than the upstream grant for no reason.

Rejected: AGPL-3.0-only — gratuitously narrower than what the code was given under.

## D8 — CiteWell issues live on the fork; upstream bugs go to Zotero's forums

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

Zotero does not use GitHub Issues, and their maintainers should not triage fork questions. A real
destination also means `README.md` can answer "where do I report this?" in one line.

Rejected: no tracker — leaves the README's reporting section empty.

## D9 — CiteWell is a personal tool, not a distribution

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

> CiteWell is my Zotero. Same library, same sync, same plugins; an interface I don't have to
> fight, and behaviour that matches how I actually work.

The author is the only user: no support obligation, no compatibility promise beyond the author's
own machines, and no release cadence. License obligations still apply because the repository is
public — modifications are stated in [NOTICE](../NOTICE) and the source *is* the distribution.

Rejected: a craft-focused product statement — it implies a quality bar and promises to users this
project does not intend to keep. Rejected: "conservative interface fork" — accurate, but it makes
promises to users who do not exist.

Consequence: roadmap R11 (distribution) stays Later, and plugin compatibility matters only as far
as the author's own plugins.

## D10 — Mark: owner's CW + quill, with a schematic quill for the toolbar

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

The mark is the owner's CW + quill artwork, converted to outlines so it carries no font
dependency, and kept at `#cc2936`. The About panel and launcher use the full mark. The
toolbar (16–32px) uses a schematic quill drawn for that size, because the fine plume
reduces to an unreadable leaf below ~48px; a two-tier mark is the only way to keep the
toolbar legible without abandoning the motif.

Rejected: shrinking the full mark to 16px — it reads as a red smudge. Rejected: a bold "C"
for the toolbar — legible, but drops the quill exactly where users look most.

## D11 — CI lives on `citewell`; `main` stays a mirror

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

GitHub disables a forked repository's inherited workflows (`disabled_fork`), so Zotero's
`ci.yml` is inert here. The two workflows that matter — the Rust docs gate and CodeQL — are
kept on the product branch, because Actions reads workflow files from the pushed branch.
CodeQL analyses only languages that exist in this repository; the generated matrix included
c-cpp and java-kotlin, whose jobs failed with "no code found" and reddened every run.

Rejected: leaving CodeQL on `main` — it would only scan mirror pushes, never the branch where
work happens, and would keep `main` divergent from upstream.

## D12 — Rust boundary: tooling and services yes, UI rewrite later

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

The app is Gecko + XUL + JavaScript; Rust cannot be called synchronously from it. Rust is adopted
at three seams (build tooling, WASM, sidecars), with audited crates rather than std-only
reimplementation of complex formats. Editing existing JavaScript stays allowed so UI work is
possible; new JavaScript modules are not. Full policy: [rust.md](rust.md).

Rejected: std-only — hand-rolled PDF/SQLite/TLS parsers are a data-loss risk, not a safety gain.
Rejected: incremental UI replacement — XUL windows cannot be swapped piecemeal.

## D13 — Linux AppImage only

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

Only Linux x86_64 AppImage is built. Windows and macOS packaging is neither built nor deleted:
the upstream trees stay so that merges stay cheap. Flatpak is a possible later target from the
same AppDir.

Rejected: deleting `app/win` and `app/mac` — guaranteed conflicts on every upstream change.

## D14 — Zotero's online sync is disabled and hidden

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes (re-enable the switch)

Zotero's code is AGPLv3; its sync service is not part of that grant. The Terms of Service govern
zotero.org, and the sync protocol is internal rather than the documented Web API. Syncing a
modified client against it is therefore not something to ship, so it is off everywhere:

| Surface | Behaviour |
|---|---|
| `ZOTERO_CONFIG.ONLINE_SYNC` | `false` in [resource/config.mjs](../resource/config.mjs) |
| Sync runner | `enabled` is false, `sync()` returns immediately, event listeners are not started |
| Preferences | Account/Sync pane and Reset Sync subpane are filtered out |
| Toolbar and menus | sync button, error indicator and library-context sync item are hidden; the "back up" and auto-sync reminder banners are never registered |
| Connector | online-library saving and Google Docs integration are disabled and hidden |

Removal of the subsystem is R19.

The empty-library welcome pane follows the same rule: it takes the name from `CLIENT_NAME`
(now CiteWell), its links point at this project's documentation, and the "Set up syncing"
sentence is omitted while sync is off. The first-run start page no longer points at
`zotero.org/start`; a local page (`resource/citewellStart.html`) is kept for a future re-enable,
and the first-run load is skipped while sync is disabled. A folder-based replacement (Google Drive, rclone) is not
implemented: Zotero's sync protocol has no folder backend, WebDAV covers only attachment files,
and storing `zotero.sqlite` in a cloud folder corrupts it.

Rejected: leaving sync enabled for personal builds — the owner does not want the dependency.
Rejected: deleting the subsystem now — it should be removed deliberately, in one pass, once the
replacement story is clear.

## D15 — Firefox ESR 153.7.0esr, not the release channel

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

The Linux build moved from Firefox 140.17.0esr to **153.7.0esr**, the current ESR branch. The
release channel is at 160.0.1, but Zotero upstream builds against ESR and its compatibility work
lives in the `fx153` series on `main`. Taking that series is a supported path; taking 160.0.1
would put CiteWell ahead of every Zotero port with no upstream testing.

What changed:

| Area | Change |
|---|---|
| Build config | `GECKO_VERSION_LINUX` in `app/config.sh`; `MinVersion`/`MaxVersion` in `app/assets/application.ini` |
| Runtime preparation | `app/scripts/fetch_xulrunner` adapted to 153: anchored actor removal, about:addons module split, removed `<search-textbox>` patch, autocomplete sizing |
| App code | Upstream `fx153` commits ported: chrome CSP and DTD prefs, async `nsILoginManager`, `ownerGlobal` removal, XUL boolean attributes, `<search-textbox>` taken over by Zotero, toolbarbutton dropmarkers, menu icons, transparent panels/menulists, hidden-browser remoteness, multiple-file drops |

Windows and macOS pins stay at 140.17.0esr: those platforms are not built (D13), and moving them
would require their own launcher and installer work.

Verified on the new runtime: clean build and AppImage run; `searchTest.js` 125/125;
`advancedSearchTest.js` + `pluginAPITest.js` 107/107.

Rejected: 160.0.1 — newest release, but no Zotero port exists past 153 and it is replaced every
four weeks. Rejected: staying on 140 — still maintained, but an engine two ESR branches behind.

## D16 — The loopback local API is on, and the CLI is a thin client

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes (one pref)

CiteWell enables Zotero's local API by default (`httpServer.localAPI.enabled`) so a local agent
can talk to the running app. The server binds `127.0.0.1:23119` only. Reads are unauthenticated,
following Zotero's design; writes require a key granted through the app's Allow / Always Allow
dialog, and every write must echo the instance's server ID.

The `citewell` CLI is a separate Rust binary that speaks HTTP to that API. It deliberately holds
no library logic and never opens `zotero.sqlite`: a second writer to the database would bypass the
app's transaction and notification layers. Being a plain CLI, it also gives generic agents a
stable interface that does not need this repository's source or an MCP client.

Rejected: a custom socket protocol — it would duplicate the local API and drift from it. Rejected:
leaving the API off by default — the owner's stated use is agent access, and the loopback binding
keeps reads on the same trust boundary as the database file. Rejected: having the CLI read SQLite
directly — stale reads and no live state.

## D17 — The agent bridge is token-authenticated, audited and trash-only

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes (disable the pref)

The `/agent/v1` bridge exists so an agent can act in the app, not just read the database. Because
it can select and open items, it has a stricter gate than the local API:

| Control | Value |
|---|---|
| Network | `HttpServer` on `127.0.0.1`; the existing Host check rejects non-loopback names |
| Token | 64 hex chars in `<data-dir>/agent-token`, mode 0600, created at startup |
| Headers | `Authorization: Bearer <token>` and `X-CiteWell-Agent: 1`; the custom header forces a CORS preflight |
| Destructive actions | None: item deletes go to the trash, emptying the trash is not exposed |
| Audit | One JSON line per call in `<data-dir>/agent-actions.log`, without note text or field values |
| UI | Preferences → Agent access shows the toggle, token, setup snippet and log path |

The token is a better fit than the local API's per-app key dialog: an agent's process cannot click
"Allow", and the dialog is meant for a person granting one app access. The trade-off is documented
in the pane: any local process that can read the token file can drive the app.

Rejected: an unauthenticated bridge — a web page or a DNS-rebinding attack could otherwise act on
the library. Rejected: exposing `eval` to agents — verbs are reviewable; arbitrary JavaScript is
not. Rejected: reusing the local API key — it gates writes but has no UI verbs, and its one-time
keys are consumed by design.

## D18 — System integration on Linux: KWin draws the frame, xdg-open opens links

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

Two rules for Linux, both about behaving like a desktop application rather than a browser:

1. **KDE Plasma owns the window frame.** Under KDE, the launcher sets
   `MOZ_GTK_TITLEBAR_DECORATION=system` and `titlebar.js` marks the window
   `systemtitlebar`; KWin/Breeze draws the titlebar and its buttons, and CiteWell's menu row is
   the only in-app chrome. This replaces drawing a Firefox-style titlebar whose buttons KDE's GTK
   bridge reports incorrectly.
2. **External links go to the system browser.** `Zotero.launchURL()` spawns
   `fallbackLauncher.unix` (`/usr/bin/xdg-open`) for HTTP(S) after clearing the Mozilla launcher
   environment. This makes links open in the person's default browser and avoids the
   `launchWithURI()` race that started a fresh Firefox profile instead of a tab.

The environment cleanup is the important half: `MOZ_LEGACY_PROFILES` must be gone before the
child process is spawned, or Firefox chooses a different profile.

No new dependencies: `xdg-open` is already the configured fallback, and the frame change is a
CSS/JS branch plus one environment variable.

Rejected: an internal browser for web links — it hides the person's real browser, history and
extensions. Rejected: keeping the Firefox-style titlebar on KDE — its button detection reports
only Close, so it either loses Minimize/Maximize or draws controls that ignore Plasma's theme.

## Dead ends

Failed experiments and abandoned approaches go here, each with *why* it was abandoned, so it is
not repeated. None yet.

*For the full documentation index, see [../README.md](../README.md).*
