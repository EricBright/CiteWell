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
can talk to the running app. The server binds `127.0.0.1:23120` only. Reads are unauthenticated,
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

## D19 — CiteWell owns its profile, data directory and port

**Date:** 2026-11-20 · **Status:** accepted · **Reversible:** yes

CiteWell must be installable next to Zotero without touching anything Zotero created. Four things
are therefore separate:

| Surface | Value |
|---|---|
| Profile | `~/.config/citewell/profile`, passed explicitly with `-profile` |
| Data directory | `~/CiteWell` (`CLIENT_NAME`), never `~/Zotero` |
| Local API and connector server | port **23120**; Zotero keeps 23119 |
| Import | explicit, read-only, from the Library preferences pane ([import.md](import.md)) |

The application id stays `zotero@zotero.org` (D3) so plugins and the schema keep working; the
profile separation comes from the launcher, not from a new identity. The first run creates a blank
database. Sharing Zotero's profile would share prefs, plugins, local-API keys and the sync-account
state, and a shared port would let the CLI talk to whichever application started first.

Rejected: auto-detecting and adopting `~/Zotero` on first run — it looks convenient but turns
"try CiteWell" into a migration of the person's real library. Rejected: keeping port 23119 —
it collides with Zotero and can route an agent to the wrong library. Rejected: a shared profile
to reuse plugins — plugins can be installed separately; shared state is the larger risk.

**Amendment (2026-11-25, D47).** `23120` stays CiteWell's address: the CLI, the agent bridge and
the local API keep using it, so no tool can be routed to the wrong library by a port choice.
Zotero's official connector, however, asks only `127.0.0.1:23119`, so the app additionally serves
the same handlers there when that port is free (`Zotero.Server.connectorPort`); that listener is
what lets Google Docs citations reach this app. Whichever application starts first holds `23119`:
if it is CiteWell, a Zotero started later cannot bind it and its connector cannot connect. The
Docs explainer reports that state instead of promising a connection that does not exist.

## D20 — Markdown is the default authoring and interchange format

**Date:** 2026-11-20 · **Status:** accepted for APIs and docs; superseded by D29 for note storage · **Reversible:** yes

Everything that crosses a boundary as content is Markdown by default:

| Surface | Rule |
|---|---|
| Agent notes | Superseded by D29: `add_note` writes a `.md` attachment; HTML is rejected |
| Agent export | `export.note` returns Markdown through the Note Markdown translator |
| Documentation and skills | `SKILL.md`, `docs/**`, README and roadmap stay Markdown |
| APIs | Prefer a Markdown field/string over HTML or RTF; HTML appears only at Zotero's storage boundary |

Zotero's note editor stores HTML, so conversion is unavoidable at the last step. Keeping Markdown
as the source format makes notes portable, reviewable and safe for an agent to write, and avoids
locking content into markup the person did not choose.

Rejected: storing raw Markdown in notes — the editor and sync expect HTML. Rejected: HTML as the
default for agent input — harder to author, harder to diff, and carries sanitization risk.

## D21 — Notes are Markdown, with a rich editor as the view

**Date:** 2026-11-20 · **Status:** superseded by D29 · **Reversible:** yes (never built)

Zotero's note pipeline is HTML: `itemNotes.note`, ProseMirror, HTML search and the Note Markdown
exporter. CiteWell replaces the storage format, not the editor: Markdown is the only persisted
note format, while the existing ProseMirror surface is loaded from Markdown and serialized back to
Markdown. This keeps Gecko's IME, selection, spellcheck and accessibility, which no reusable Rust
editor currently offers (see [research](research/rust-markdown-editors.md)).

The parser and serializer already exist inside the note editor (`markdown-it`,
`prosemirror-markdown`), so the first cut adds no dependency. A Rust `citewell-md` crate compiled to
WASM can take over parse/serialize/index later without changing storage.

Citations are deferred: no citation insertion in Markdown notes yet; existing citation spans
flatten to `(Author Year)` on conversion. The design and slices are in [notes.md](notes.md).

Rejected: a custom Rust/egui editor now — notecraft is an app with no screen reader and no
cross-block selection; egui/iced give plain text only; XUL cannot host a native surface, so it
would be a second window. Rejected: dual HTML/Markdown storage — it is not "no HTML notes" and
doubles every read path. Rejected: raw Markdown in the note editor without conversion — the
ProseMirror UI would display syntax literally.

## D22 — Porting JavaScript is a seam-by-seam rewrite, not a translation

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** yes

Turing completeness proves that Rust can compute what JavaScript computes; it says nothing about
preserving XUL/Gecko APIs, Zotero's data layer, event-loop timing, the vendored libraries, or the
cost of a rewrite. In practice an agent asked to "port this" either calls it impossible or
translates line by line, and both fail the same way: the result looks converted and its behaviour
drifts where nobody is looking.

The procedure is now policy: plan the seam first, port one cohesive module behind a stable
interface, write characterization and differential tests before the rewrite, keep the JS as the
oracle until parity, design Rust types/ownership/errors before internals, use WASM or a sidecar
for interop, and delete the JS only after parity. It is written out in
[rust.md](rust.md#porting-existing-javascript), with a one-page port plan and the semantic traps
(numbers, strings, null/undefined, key order, async ordering, exceptions, GC assumptions).

[AGENTS.md](../AGENTS.md) rule 6 makes this binding for agents. The point is not to forbid ports;
it is to make each one a bounded, testable change with a known seam instead of a leap.

Rejected: "Turing-complete, therefore portable" — true only at the computability level, and it
justifies an unbounded rewrite. Rejected: function-by-function translation — interface churn with
no stable seam. Rejected: big-bang subsystem rewrite — no oracle, no parity, no rollback.

## D23 — Import is a Rust file engine over the existing JavaScript data layer

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** until the first import

Bringing a Zotero library in must copy it exactly and must never put a second writer on either
database. The engine that stages and swaps files can therefore be Rust, but the part that reads
or writes Zotero's data layer cannot: it is the application's own code, and reimplementing it in
Rust would create two catalogs.

Phase 1, adopt-copy for an empty library:

- A small std-only Rust helper, `tools/importer` / `citewell-import`, owns staging: copy
  `storage/`, verify the snapshot, back up the empty library, swap files, roll back on failure.
  It never opens SQLite.
- JavaScript owns the data layer and the UI: read-only source probe, empty check, database
  snapshot, SHA-256, the Library pane, the request file and the pre-start apply hook.
- The source is read-only. The apply runs before `Zotero.DB` is created, so no live connection
  ever sees a file swap. The empty CiteWell database is kept as a restore point.
- The detector reads only `dataDir`, `useDataDir` and `lastDataDir` from Zotero's `prefs.js` to
  find a custom library. It never copies or writes the profile. It also checks `~/Zotero`,
  common folders and drive roots, and preselects the best candidate with a confidence label.
- Notes, annotations, collections, saved searches and item keys come across because the database
  file is copied whole. Group libraries are copied as-is; hiding them is a later UI change.

Phase 2, merging into a non-empty library, writes through
`Zotero.Items`/collections/notes/attachments in JavaScript and reuses the same mover for
attachments and the same receipt. A Rust planner can be added later if it earns its keep; it
would read and plan, not write.

Rejected: a `rusqlite` sidecar owning the database — it duplicates the schema and the only
writer. Rejected: JavaScript file copying only — the engine would be rewritten later, and the
policy requires new code in Rust. Rejected: swapping the live database — shutdown handlers and
caches still touch it. Rejected: pointing CiteWell at Zotero's live data directory — SQLite has
one writer, Zotero opens it exclusively, and CiteWell's schema upgrades and Markdown notes would
change the file Zotero depends on; the promise that Zotero is never modified would be false.
Rejected: asking the person to find the library path — the detector does it.

## D24 — Keep the library visible; modernize the edges

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** yes

CiteWell keeps its library in a visible `~/CiteWell` folder and its Gecko profile in
`~/.config/citewell/profile`. The visible folder is the unit of backup, import and support;
hiding it under `~/.local/share` would make it harder to find, not more modern.

Modernization happens around the library: a Locations panel shows every path with Open actions;
`agent-token` and the audit log move out of the library into config/state; caches move to
`~/.cache/citewell` and logs to `~/.local/state/citewell`; `fulltext.sqlite` is marked
rebuildable and excluded from backups. "Move library…" reuses Zotero's tested data-directory
migration. XDG data paths are reconsidered only for a packaged Flatpak.

Rejected: moving the library to XDG data now — migration risk and hidden data for no gain.
Rejected: splitting the database from `storage/` — they are one unit.

## D25 — Replace is explicit, and restore points are first-class

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** yes

Adopt-copy remains the safe default for an empty library. An existing library gets two
operations, never one ambiguous button: **merge** is non-destructive and belongs to Phase 2;
**replace** is destructive, explicitly confirmed, and always leaves a restore point.

Replace requires a checkbox that names the consequence and a second confirmation showing both
libraries' counts. The old database, `storage/` and full-text index are moved to
`<data>/.import-backup/<id>/` with a manifest before the staged library is installed. The backup
is a visible restore point, not a hidden file.

Restore is available from the Library pane: it lists date, origin, counts and size, and is
itself reversible. Restoring moves the current library into a new restore point before swapping
the selected one in, so the person can go back again. Backups are never deleted automatically.

A failed apply rolls back; the source Zotero library is never touched. Merge stays a separate
Phase 2 feature and is not offered as a variant of Import.

Rejected: replacing without a backup. Rejected: one Import button that silently chooses merge or
replace. Rejected: auto-deleting old restore points.

## D26 — Nothing is deleted; removals go to Trash

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** yes

This is the owner's main machine, and a destructive command is not a recoverable action. Every
manual removal — build output, test directories, data the owner calls disposable — uses
`gio trash`, which keeps a restorable entry in the wastebasket. `rm`, `rm -rf`, `find -delete` and
`shred` are not used. `gio trash` refuses system internal mounts such as `/tmp`; for those, move
the file to `~/.local/share/dsh-trash/<date>/` and say where it went. If neither works, leave the
file and ask; never fall back to `rm`. Before overwriting an untracked file, copy it to Trash; tracked edits remain in Git. The
Trash is never emptied automatically.

Rejected: `rm -rf` on generated build directories — regenerable, but not recoverable as a
snapshot. Rejected: emptying Trash to save space.

## D27 — Zotero remains canonical until CiteWell stabilizes

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** when the pre-alpha ends

The owner's canonical library is Zotero. The CiteWell database and storage are disposable test
data until the import, notes and interface work has stabilized and been tested; they must not be
treated as the authoritative copy, and resetting them is allowed through Trash (D26). The import
is one-way: nothing in CiteWell is merged back into Zotero. Revisit this when CiteWell becomes the
primary application.

Rejected: treating the current CiteWell library as canonical — it is test data for a pre-alpha
build, and the owner would lose the distinction between experiments and the real library.

## D28 — CiteWell is a citation catalogue, not a workspace

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** no (product direction)

CiteWell collects, organizes and cites sources. Its job is metadata, collections, capture through
translators, and a local agent/CLI interface. PDF reading, annotation, note editing, and plugin
execution belong to other tools. The catalogue stays small enough to audit and maintain.

This ends the Zotero feature-parity and upstream-merge frame. `zotero/zotero` remains available as
source reference if a deleted mechanism is ever wanted again, but CiteWell is not expected to merge
with it, and no roadmap item exists to keep pace with it. The fork's own `main` mirror may remain,
but product decisions no longer consider upstream conflicts.

Consequences:

| Surface | New rule |
|---|---|
| PDFs | No renderer, no annotations UI, no PDF full-text index; the host opens the file (D30) |
| Notes | Markdown file attachments edited by the host, not an embedded editor (D29) |
| Plugins | Code retained, loading and UI off by default (D31) |
| Dependencies | npm retired, no new toolchain or Rust crate without owner approval (D32) |
| Translators | Updates stay intact; safeguards are additive (D33) |

Rejected: an all-in-one research workspace — every added viewer, editor and plugin runtime is
threat surface and maintenance for work the desktop already does better. Rejected: feature parity
with Zotero — it would make upstream architecture the roadmap. Rejected: merging with upstream
later — the note and PDF changes make the data and UI paths intentionally incompatible.

## D29 — Notes are file-backed Markdown attachments

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** with the database backup · **Supersedes:** D21

A note is a `.md` file attachment under its parent item, not a row in `itemNotes`. The file lives in
Zotero's attachment storage (`storage/<attachmentKey>/<name>.md`), so it is included in the same
backup unit as the rest of the library. The attachment item carries the title, parent and dates; the
file carries the content.

There is no in-app note editor and no bundled Markdown parser or renderer. Opening a note launches
the host's default Markdown editor through `xdg-open`; if none is configured, CiteWell explains how
to choose one and does not install anything. The item pane shows the attachment title, parent, date
and a plain-text excerpt. Search indexes the file text and refreshes when the file's modification
time changes; no HTML is parsed and no PDF text is involved.

Existing `itemNotes` migrate once, explicitly, not silently on startup:

1. Back up `zotero.sqlite` before the first conversion.
2. Convert each legacy note with the existing Note Markdown translator, including embedded images.
3. Write the `.md` file, verify it is readable and non-empty, then attach it to the original parent
   with the original dates. The old note item is moved to Trash, never deleted (D26).
4. A failed conversion leaves the old note untouched and reports it; a rerun resumes.
5. No dual-format state survives: once migrated, no reader assumes `itemNotes.note`.

Agent `add_note` creates a `.md` attachment; `export.note` reads the file. The old
`markdownStorage` preference and editor conversion boundary are removed with the editor.

Rejected: ProseMirror as a Markdown view (D21) — it keeps the largest npm subtree and a second
document model for a job an external editor does better. Rejected: Markdown in `itemNotes.note` —
it preserves the note-item type, search and editor dependencies that this decision removes.
Rejected: dual HTML/Markdown storage — every read path would have to handle both forever.

## D30 — PDFs are external files; annotations become Markdown sidecars

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** for the sidecar format, not for the viewer

CiteWell does not render, annotate, thumbnail or full-text-index PDFs. The `reader/`,
`document-worker/` and pdf.js code paths are removed from the build and UI. PDF attachment records
and files remain; opening one hands the path to `xdg-open` or the file manager.

Existing PDF annotations are exported once to a human-readable Markdown sidecar next to the
attachment, `storage/<attachmentKey>/annotations.md`, with the quote, comment, page, colour and
position in plain text. The sidecar is not parsed back into the app and is never overwritten if it
already exists. The current test library has no annotations, so this is mostly a compatibility path
for an imported Zotero library.

`fulltext.sqlite` remains for text search over Markdown notes and sidecars, but PDF text is no longer
indexed, and stale PDF rows are dropped on the next rebuild. PDF metadata extraction that does not
require a renderer may remain; thumbnails do not, because they are produced by pdf.js.

Rejected: an embedded viewer — it is the largest single piece of inherited threat surface for a job
the desktop performs. Rejected: in-app PDF annotation — it requires the viewer and a second
annotation model. Rejected: keeping pdf.js only for thumbnails/metadata — it keeps the dependency
and the attack surface for a cosmetic gain. Rejected: silently discarding annotations — they are
user-authored data and get a portable sidecar instead.

## D31 — The plugin API is parked

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** yes (one flag)

The plugin code remains in the tree for reference and possible later use, but released builds do
not initialize the plugin loader, expose plugin UI, or execute third-party plugin code. A build
constant/flag, off by default, controls it; no plugin state is loaded until the flag is deliberately
changed and tested.

Rejected: deleting the code now — it is entangled with the core and would make the cleanup diff
larger than the product needs. Rejected: leaving plugins enabled — it is arbitrary local code
execution and a compatibility obligation this project no longer carries.

## D32 — Dependency freeze: no new npm, crates, or toolchains without approval

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** only by explicit owner approval

npm is retired as a package manager. No install, upgrade, audit, `ci`, new package entry, lockfile
change, or vendored npm tree is allowed. `.npmrc` fails closed (offline, unreachable registry, empty
cache, `ignore-scripts`) so an accidental command cannot quietly succeed. The existing
`node_modules` tree is frozen and used only by the legacy build until R15 replaces it; it is not a
place to add or update anything.

No new Rust crate is added without consulting the owner first; standard-library Rust is the default.
No second toolchain is installed. AGPL-3.0-or-later dependencies are acceptable on license grounds,
but license compatibility is not a reason to add one.

The note-editor npm build path is retired rather than vendored. If a build needs a missing artifact,
the answer is to remove the dependency or ask, not to run npm.

Rejected: vendoring the note editor and its lockfile — it preserves a package ecosystem this
project has decided not to maintain. Rejected: routine dependency updates — they add change without
a product need. Rejected: trusting audit output — it reports known advisories, not supply-chain
risk.

## D33 — Translator updates stay intact; safeguards are additive

**Date:** 2026-11-21 · **Status:** accepted · **Reversible:** with care

Translators are core to capture. Their update channel, the vendored translator tree, and the Firefox
/ Google Docs integration paths stay working. Safeguards — sandboxing, explicit permissions,
verified downloads, rollback of a bad update, and a reviewable diff — must be added around them, not
by freezing or disabling updates.

Locales remain data, not code, and are not removed. The sync-dependent parts of the connector remain
gated by D14; the translator and citation-insertion paths themselves must not be broken by this work.
Any change to translator execution is tested against Firefox and Google Docs before shipping.

Rejected: freezing translator updates — capture rots as sites change. Rejected: removing the
integrations to simplify the app — they are the product's main input path. Rejected: accepting
updates without review — third-party translator code runs with app privileges.

## D34 — CiteWell owns its LibreOffice integration

**Date:** 2026-11-21 · **Status:** accepted; transport and implementation superseded by D36 ·
**Reversible:** until the first CiteWell OXT ships

CiteWell does not reuse Zotero's LibreOffice extension identity or transport. The target
contract is a CiteWell-owned OXT, display name and installer, with extension id
`citewell-libreoffice-integration@sophy.ca`, socket `127.0.0.1:23121`, and compatibility
sentinel `19877`. Zotero's `zoteroLibreOfficeIntegration@zotero.org`, port `23116` and
sentinel `19876` are not CiteWell's.

The inherited Java OXT must not be offered for installation by a CiteWell build. Until a
CiteWell replacement exists, the integration is disabled or hidden; sharing Zotero's
extension is rejected because it can replace Zotero's extension or send document commands
to the wrong application.

The implementation target is Rust, not Java. LibreOffice ships an official `rust_uno`
binding, but it is generated in-tree and needs a LibreOffice SDK/build environment; that
is a separate dependency decision. The official Rust example still uses a C++ UNO
component wrapper, so a Rust core with a minimal C++ shim is the closest native path. A
Rust core with a thin Python UNO bridge is the no-new-toolchain fallback: the Python layer
would only translate Writer document operations, while citation state and protocol stay in
CiteWell/Rust. A pure-Rust component would require a hand-written UNO C++ ABI and is not
the plan.

Rejected: shipping the inherited Java OXT — wrong identity and port. Rejected: compatibility
mode on 23116 — ambiguous with Zotero. Rejected: pure-Rust native component without the
LibreOffice SDK or a version-matched generated bridge — not buildable on this host today.

## D35 — The LibreOffice installer is add-only

The CiteWell extension installer may only add the CiteWell OXT. It must never remove,
reconstruct, reinstall, or edit LibreOffice's extension registry or user profile. It must
not attempt to repair a stale registration automatically. A stale or damaged registry is
reported to the user with instructions to use LibreOffice's Extension Manager; the
installer must leave every other extension and its settings untouched. A failed CiteWell
install must never mutate another extension.

This is a safety rule, not a limitation to optimise away. `unopkg remove` and registry
rewrites are prohibited in the installer. The installer must fail closed before any write,
and every failure message must state what failed, that nothing else was changed, what the
user can do next, and where technical details are logged. Recovery advice must never ask the
user to reset or delete their LibreOffice profile.

## D36 — The LibreOffice protocol lives in the app

**Date:** 2026-11-22 · **Status:** accepted · **Reversible:** until M2 ships

The LibreOffice adapter follows the shape of the reference implementation: the CiteWell app owns
the listening socket on 23121 and the Python UNO shim connects as a client. The protocol is
bidirectional — a menu click is a transaction-0 command from the shim, and the app sends numbered
document commands back while its citation dialog is open — so a relay process in the middle adds a
second protocol and a push channel without adding a feature.

This supersedes D34's transport and implementation clauses. Identity, ports, sentinel, installer
rules and the rejection of the Java OXT stand. `citewell-lo-core` leaves the runtime path; the
protocol test double is Python, because std-only JSON in Rust costs more than the simulation is
worth. The shim may be replaced — for example by C++ behind the same protocol — if Python in
LibreOffice becomes unavailable or UNO threading proves unworkable.

The socket is token-authenticated (`<data-dir>/lo-token`, mode 0600), versioned by a `hello`
handshake, capped at 8 MiB per frame, and restricted to an allowlisted command set. Frames are the
same `uint32` transaction id, `uint32` length, JSON payload shape as the reference protocol, so
behaviour can be compared directly.

Rejected: a Rust relay between the app and the shim — it duplicates the transport and needs a push
channel for transaction-0 events. Rejected: growing the HTTP endpoints — it re-derives the same
protocol piecemeal. Rejected: keeping the Rust core in the data path for continuity — no
user-facing behaviour depends on it.

## D37 — The legacy note window stays as a read-only view

**Date:** 2026-11-22 · **Status:** accepted · **Reversible:** until legacy `itemNotes` rows are gone

The note tab and window shell (`note.xhtml`, `note.js`, `elements/noteEditor.js`) stay, but only to
display legacy `itemNotes` rows, most of which are in Trash. The element forces view mode, the
`editorInstance` module and its annotation serialization are gone, and nothing in the shell saves
or serializes note content. Removing the shell would leave a restored legacy note with no view, so
it remains until the legacy rows are removed. New notes are `.md` attachments opened by the host.

Rejected: deleting the shell now — it would strand restored legacy notes. Rejected: restoring an
editing surface — D29 makes the host the editor.

## D38 — UI attention orchestration stays JavaScript

**Date:** 2026-11-22 · **Status:** accepted · **Reversible:** when a Rust/WASM UI boundary exists

The attention controller and presenter are Gecko UI orchestration: they create and parent windows,
observe focus and unload, request taskbar attention, and call notifications. D12 permits UI work in
JavaScript, but adding a new module required an explicit exception. This is that narrow exception.

It applies only to `chrome/content/zotero/xpcom/attention.js` and its Mocha test
`test/tests/attentionTest.js`. It does not cover catalogue logic, data, formatting, networking or
future native activation; the D-Bus/systemd helper and other services remain Rust. The exception is
machine-readable in `tools/policy-exceptions.txt` and enforced by `repo-guard`.

Rejected: a Rust/WASM timer core for the 1/3/10 s scheduler — the state is trivial, while every
observable effect is a Gecko window API; the extra build target and interop would add complexity
without removing JavaScript from the UI.

## D39 — Zotero owns the Writer document-format boundary

**Date:** 2026-11-23 · **Status:** accepted · **Reversible:** only with a document migration

CiteWell reads and writes Zotero’s document convention unchanged. Standard citation, bibliography
and preferences markers use Zotero’s names: `ZOTERO_ITEM CSL_CITATION …`, `ZOTERO_BIBL …`, and the
`ZOTERO_PREF` / `CSL_PREF` document properties. CiteWell keeps reading the `CITEWELL_` markers and
`CITEWELL_PREFS` property produced by earlier builds, but it stops producing new `CITEWELL_`
citation fields.

The boundary is deliberate: the backend may diverge, but a document must remain readable by Zotero.
Any future CiteWell-only document information gets a namespaced container that Zotero ignores, not
a new field prefix that Zotero would treat as text. A new marker type requires a decision record and
a round-trip test.

Rejected: keeping `CITEWELL_` as the write prefix — it turns every Zotero document CiteWell edits
into a one-way document. Rejected: writing two citation fields per cluster — duplicate text and two
sources of truth. Rejected: a CiteWell-specific document format — it defeats the compatibility goal
before there is a feature that requires it.

Consequences: the LibreOffice extension writes `ZOTERO_` markers and reads `CITEWELL_` markers for
migration; the Zotero document properties are the source of style, locale and field type; unresolved
citations are reported, never silently flattened.

## D40 — Merge preserves identity with an append-only alias chain

**Date:** 2026-11-23 · **Status:** accepted · **Reversible:** yes, aliases are additive

Merging a source item preserves its Zotero key when that key is free in the destination library. If
the key is taken, the item gets a new key and the merge records an alias from the source identity to
the destination identity. Aliases are append-only and may chain: source A → destination B in one
merge, B → C in a later merge; resolution follows the chain to the current item.

Aliases live in a sidecar log under the data directory (`identity/aliases.jsonl`), not in
`zotero.sqlite`; the log is copied into restore points and followed by restore. Each entry records
the source library/group and key, the destination library and key, the merge session and a timestamp.
Resolution for a Writer citation tries the exact URI, then the alias chain, then Zotero’s
replaced-item relation; a resolved alias appends the destination URI to the citation item so the
document also self-heals.

Ambiguity is surfaced, not guessed: two local libraries can use the same URI path shape, so a
collision that cannot be resolved by group/key is reported. Deduplication may add aliases but never
rewrites or deletes an existing one.

Rejected: a new Zotero schema table — it would make CiteWell data unreadable to Zotero tools.
Rejected: rewriting citations in every open document — destructive and unnecessary while aliases can
resolve at read time. Rejected: automatic metadata merging on a title match — false positives destroy
distinctions.

## D41 — Delete the need before replacing the tool

**Date:** 2026-11-23 · **Status:** accepted · **Reversible:** yes, per dependency

Every dependency question starts with elimination, in this order:

1. **Drop the feature.** If the product does not need it, remove it.
2. **Use the engine.** Firefox/Gecko already supplies URL parsing, CSS, DOM, storage and a modern
   JavaScript runtime. Prefer those over a runtime library.
3. **Write the source differently.** JSX can become `React.createElement`; SCSS can become CSS
   custom properties, nesting and utility classes; CommonJS can replace ESM. This can remove a
   build-time compiler without adding another.
4. **Vendor a prebuilt artifact.** If upstream already ships the file, checksum it and remove the
   build step.
5. **Borrow a maintained implementation.** Use this for languages, parsers and open formats where
   “only the features we use” is not a closed grammar.
6. **Build it ourselves.** Only for closed, well-understood formats whose inputs we control.

This is not a preference for reimplementation. Reimplementing a JavaScript or Sass parser is a
worse dependency than borrowing one: it silently owns every future syntax error. The hierarchy is
about deleting **needs**, not avoiding all code.

Applied to R15: Browserify, the `url` package and the Sinon browser bundle are deletion candidates;
Babel may disappear if JSX/ESM are written differently; Sass may disappear through a CSS migration;
React replacement is a separate product decision, not part of the build-toolchain work.

Rejected: replacing each dependency with a bespoke implementation — that concentrates maintenance
and failure risk. Rejected: treating “we use only a small part” as proof that the rest is
unnecessary — a language implementation is tested by the inputs it must accept, not by today’s
call sites.

## D42 — App UI source is CommonJS and h()

**Date:** 2026-11-23 · **Status:** accepted · **Reversible:** yes, via Git

The app source no longer uses JSX or ESM syntax. React UI is written with a local
`h = React.createElement` alias; imports are CommonJS. Babel is not part of the build. Native `.mjs`
modules loaded with `ChromeUtils.importESModule` are unchanged.

The measured surface was small: 30 files containing 126 JSX elements, and 28 Babel-compiled ESM
files with about 70 imports and 11 exports. The rewrite removed a compiler rather than replacing it
with SWC/OXC. The cost is a more verbose UI notation and divergence from Zotero's source style;
comments, JSDoc and small named components are the mitigation, not deeper nesting.

Conventions: keep `h` at the top; extract named components instead of one large nested call; comment
contracts and non-obvious decisions, not syntax. Imported bindings and `h` use `var` in files loaded
with `loadSubScript`, because those scripts share one window global and top-level `const` declarations
collide across files. Do not “modernise” those declarations to `const` without first wrapping the
script or giving each binding a unique scope.

Rejected: adopting SWC/OXC — adds a compiler and parity burden for 126 elements. Rejected: TypeScript
— adds another compiler. Rejected: wrapping every classic script in an IIFE — several windows call
top-level functions by name. The frozen Babel npm packages remain until phase 5, when the Node tree is
removed.

## D43 — Sass is compiled by grass

**Date:** 2026-11-23 · **Status:** accepted · **Reversible:** yes, via Git

The Node Sass build step is replaced by `grass` 0.13.4, compiled by the `xtask sass` command. Grass
is a build-only Rust dependency; it is not shipped in the app. It writes compressed CSS to the same
paths as before, including the `-win`/`-mac`/`-unix` variants under `chrome/content/zotero-platform/`.
The Node `js-build/sass.js` is now a thin wrapper around `cargo run -p xtask -- sass`.

The spike compiled all 21 entry sheets without errors. Output is equivalent for the selectors and
declarations used here; differences were formatting and equivalent color notation (`rgb(194,194,194)`
vs `#c2c2c2`, `transparent` vs `rgba(0,0,0,0)`). The Sass source is 13,722 lines across 165 files,
with 41 mixins, 9 functions and 57 control-flow blocks; a native-CSS rewrite is a large unrelated
project, not a build cleanup.

CSS source maps are dropped. The app does not consume them; they were development-only artifacts,
and grass has no source-map API. `xtask sass` removes stale `.css.map` files for the CSS it writes.
Rejected: native CSS migration — 13,722 lines and 41 mixins for no user-facing benefit. Rejected:
rsass — less complete and no advantage for these stylesheets. Rejected: keeping Node Sass — it would
keep the Node build tree required for no reason.

## D44 — CodeQL is a scheduled audit, not a per-push gate

**Date:** 2026-11-23 · **Status:** accepted · **Reversible:** yes

CodeQL runs weekly and by manual dispatch. It no longer runs on every push or pull request. The
JavaScript analysis took about three minutes per push, the branch is not protected, and the
workflow therefore never gated a merge; it only consumed runner time and pushed the developer to
wait for a check that was not blocking.

This is a scheduling decision, not a claim that the findings are unimportant. The repository has
60 open alerts (17 errors, 43 warnings) inherited mostly from Zotero, its connectors and vendored
code. They remain in the Security tab and should be triaged separately. A fresh scan is available
from “Run workflow” before a release. Restoring the `push`/`pull_request` triggers reverses this
decision.

## D45 — The build runner is xtask, not Node

**Date:** 2026-11-23 · **Status:** accepted · **Reversible:** yes

`xtask build` now performs the whole pre-staging build: copy application JavaScript and apply the
five vendored-resource patches, copy test data, create the source symlinks, and compile Sass. The
Node `js-build` build files, `.signatures.json` cache and file watcher are gone. `build_and_run` and
`test/runtests.sh` call `cargo run -p xtask -- build`; they no longer invoke Node.

The `resource/` symlinks into `node_modules` were replaced by vendored files (React, ReactDOM,
PropTypes, pako, classnames, jspath, react-virtualized, react-autosuggest, react-intl, Monaco,
Ace's eight used files, the CSL validator and the citeproc WASM). The build no longer reads
`node_modules`. A clean `xtask build` produced the same 442 JS files, 91 test-data files, 2561
symlinks and 21 Sass entries as the Node build; a recursive diff against the Node output was empty
after the patch indentation was matched.

At the time of D45, `js-build/` retained the FTL helpers and `node_modules` remained for those and
optional ESLint. D46 removed that root tree. Rejected: keeping the Node builder — it would keep a
runtime dependency for no capability. Rejected: porting the watcher now — rerunning the fast build
is sufficient until a Rust watcher is worth adding.

## D46 — The root npm tree is removed

**Date:** 2026-11-23 · **Status:** accepted · **Reversible:** yes, with owner approval

The root `node_modules` (about 398 MB), `.npm-cache`, `package.json`, `package-lock.json`,
`eslint.config.mjs`, `js-build/` and `scripts/locale/pull_ftl` are removed. The app build and the
test runner use only `cargo`, `xtask` and the vendored resources. `repo-guard` permits removing the
retired npm metadata while still rejecting a reintroduction or dependency change.

This retires the FTL-to-JSON/localize workflow and root ESLint. Locale files and the vendored test
libraries remain; there is no in-repo tool to update them until R7.

**Implementation note (2026-11-25):** the three test libraries were still git symlinks into the
removed root tree (`test/resource/{chai,mocha,co-mocha}.js -> ../../node_modules/...`), so a clean
build — `gio trash build` and rebuild — could not run the harness at all. They are now real files
at the versions the last `package.json` pinned (chai 3.5.0, mocha 3.4.2, co-mocha 1.2.0; all MIT),
with provenance recorded in `test/content/runtests.html`. The harness now survives a clean build. Reintroducing any npm tree
requires owner approval under D32. The `connectors/` tree kept its own `node_modules` under this decision;
D47 retired that tree on 2026-11-25, so no npm tree remains in the repository.

Rejected: keeping a root tree “just in case” — it was 398 MB and the build no longer reads it.
Rejected: deleting the connector tree in the same pass — it would remove the Firefox connector
build without a Rust replacement.

## D47 — The Firefox connector folds into the app as a browsing tab

**Date:** 2026-11-24 · **Status:** accepted · **Reversible:** yes, with owner approval

CiteWell gains an in-app **Browse** tab — address bar, a slim tab strip, navigation, and a
"Save to CiteWell" action driven by translator detection — and the standalone Firefox connector
retires: no Firefox add-on listing, no AMO submission or review cycle, no signed XPI, no
third-party distribution leg. The app remains the single downloadable artifact alongside the
LibreOffice extension it already carries. This supersedes the connector-handoff options in
`status.md` and ends the D46 exception for `connectors/node_modules` once the retirement phase
runs.

The plan is cheap because the app already contains the connector's machinery: web translation
runs in-process (`RemoteTranslate.mjs`, the `TranslationParent`/`TranslationChild` actors, and
`HiddenBrowser.mjs` drive live pages in isolated content processes today, as Scaffold and the
feeds do); `xpcom/translate` is the same engine the connector ships, alongside all 759
translators; all nineteen `/connector/*` protocol endpoints already live in `server_connector.js`;
snapshots (`SingleFileChild`) and printing (`ZoteroPrintChild`) already exist; and `<browser>`
embeddings are proven in `basicViewer.xhtml`. The add-on's only irreplaceable contribution was a
visible page context — the tab supplies that in-process.

Phases, in order: record the decision; build the browse tab; port the connector's page-side
scripts as frame scripts to drive the save button; port the remaining glue (Google Docs
integration, PDF capture, proxies, preferences); only then retire the connector tree — deleting
`connectors/node_modules` (~96 MB), the gulp build and `xtask connectors`, with removals going
to Trash under D26 — and finally set the browsing policy. Deletion is gated: the in-app path must
be proven against everything the add-on did before anything is removed. Zotero compatibility is
preserved by the unchanged connector protocol, so a sideloaded official Zotero Connector still
works against CiteWell. The LibreOffice extension is unaffected.

Because CiteWell now renders arbitrary web content, D28 gains a carve-out: Firefox ESR security
patches are pulled promptly rather than at leisure. R15's "npm tree gone entirely" completes
when the retirement phase deletes the connector tree.

**Implementation note (Phase 2a, 2026-11-25).** The phase list above said "port the connector's
page-side scripts as frame scripts"; that step proved unnecessary and is dropped. The app's own
`Translation` JSWindowActor already executes a web translator in any `<browser>` and
`RemoteTranslate.mjs` saves the result, so the Browse tab's Save button drives that pipeline
directly — none of `connectors/src/common/inject/` is ported. Two fixes were needed in
`RemoteTranslate.mjs` for a long-lived visible tab: the actor is resolved once in `setBrowser()`
and pinned for later calls (a navigation between detection and translation now fails instead of
running a stale translator against the new document), and `initTranslation` is a query rather
than a fire-and-forget message, so detection cannot race a sandbox that does not exist yet.
**Phase 2b note (2026-11-25).** Multi-item pages now open a modal picker
(`browseItemSelector.xhtml` + `.js`) that follows the connector's shape: the translator's
id -> value map, where a value may carry `{ title, checked }`, comes back filtered to the checked
rows. It answers on every exit path (Save, Cancel, Esc, window close), so the translation can
never be left suspended, and a cancelled picker reports "Nothing selected" instead of a failure.
Two long-lived-tab fixes came with it: a process switch can replace the page's window global, so
`RemoteTranslate.detect()` may re-resolve the actor (a fresh detection is safe) while
`translate()` refuses a stale actor rather than running the old translator against the new
document; and translation-failure reporting is forced off, with the engine's connector-only
`Connector_Browser` global stubbed, because the app has no extension context and must not POST to
zotero.org (D19).

**PDF capture (Phase 3, 2026-11-25).** A PDF response in a Browse tab is intercepted by content
type (`http-on-examine-response`) after a URL-suffix fast path, the channel is cancelled before
Gecko's removed viewer path (D30), and the file is saved as an imported-URL attachment through
the app's own cookie jar. Extensionless PDF URLs (`/pdf/1706.03762v7`) and in-page links work;
nothing parses or indexes the PDF, so DOI recognition and text search stay out. The tab shows
the Save state rather than a rendered document.

**Google Docs decision (2026-11-25, owner-approved).** Docs stays out of the app. Its page-side
half is the connector's React/Kix client, updated by Zotero at Google's pace; re-hosting it would
make CiteWell the maintainer of a shim and a rebuild path for someone else's moving target. The
Browse tab therefore refuses `docs.google.com/document/*` with an explainer: citations in Docs
come from Zotero's official connector in Firefox, which already talks to CiteWell through the
unchanged `/connector/*` protocol. "Open in Firefox" hands the URL over, and a quiet "continue
anyway" lets a reader open a document in-tab knowing citations will not work. Consequences: no
Google credentials or sessions touch CiteWell, the D49 Docs exception is withdrawn, and the
connector tree is no longer needed for Docs. R34's exit criterion is amended accordingly: Docs
insertion works through the official connector in Firefox, not in-tab.

**Retirement note (2026-11-25).** The tree is gone, not archived in place: `connectors/` (117 MB,
including `node_modules`, the gulp/XPI pipeline and three submodule working trees) and
`tools/rsvg-shim` went to Trash under D26; `xtask connectors`, the brand substitution and the
hardcoded-name guard left the build; the three `connectors/src/*` entries left `.gitmodules`; and
[connectors.md](connectors.md) is now a retirement record rather than a build guide. The
`/connector/*` endpoints stayed, because Zotero's official connector is the Docs client.

That client only asks `127.0.0.1:23119`, which this decision had not accounted for: CiteWell
serves on `23120` (D19), so the Docs explainer's promise that "Zotero's Connector talks to this
app" was false as shipped. The fix is a second `HttpServer` on `23119` when the port is free,
exposed as `Zotero.Server.connectorPort`. The Docs gate reads it: step 3 either says the connector
reaches CiteWell or says another app (usually a running Zotero) holds the port and what to do
about it. `server_connectorIntegrationTest.js` drives the Docs handshake through `23119`, so the
claim is tested rather than asserted. The coexistence cost is in D19's amendment: the first app to
start owns `23119`.

Rejected: submitting our own add-on to AMO — recurring review friction, signing and update
machinery, and user confusion over two connector identities, all for a leg the app can replace
with a tab. Rejected: keeping the gulp/XPI build indefinitely — it preserves the last npm tree
(96 MB) for a distribution no longer shipped. Rejected: embedding a second browser engine —
Gecko already ships with the platform; a second engine would double the artifact and blur the
D12 Rust boundary.

## D48 — Views live in main-window tabs; transient moments stay dialogs

**Date:** 2026-11-24 · **Status:** accepted · **Reversible:** yes

Settings (a separate popup window today) becomes a tab in the main-window deck, beside the
pinned Library tab and the D47 Browse tab. The owner's repopull app sets the pattern — one main
window, a fixed sidebar, stacked pages, Settings reachable as a nav item, nothing for a view
popping out — and CiteWell follows the same rule with its native tab deck, where the Library
view is already the first tab. Content views (catalogue, browse, settings) open as tabs and
persist across switching.

Transient moments stay dialogs on purpose: confirmations, pickers, small name entries, progress
windows, and the LibreOffice/Word citation dialogs — those must float over the user's document,

**Amendment 2026-11-26:** because the pane is not a `zotero:pref` window, Zotero's own post-install
refresh missed it. Installing a style from the style page closed the viewer but left the open Style
Manager on the old list until the pane reloaded. `Zotero_SettingsTab.getFrameWindows()` now exposes
the tab's document, and `style.js` refreshes it alongside the pref windows; a settings-tab test
installs a style and fails if the open list does not show it.
not inside CiteWell. Modality is a feature while a decision is being made; repopull's own Clone
dialog is the same carve-out.

`Zotero.Utilities.Internal.openPreferences(paneID, …)` is the single choke point every opener
already uses; it routes to the settings tab — selecting it if already open, then the requested
pane — instead of opening a window. The preferences shell (navigation list, search, panes loaded
by `_loadPane`) is reused inside the tab, and Ctrl+W closes the tab. Whether the existing
`preferences.xhtml` window document is hosted directly or its shell is mounted in the deck is
settled by a spike before the switch.

Rejected: forcing *every* remaining window into a tab — the import wizard, error report and
style preview are momentary flows; converting each needs its own reason, so they stay until one
exists. Rejected: leaving settings a separate window — it hides the catalogue behind a second
window for the most common visit, which is a check-a-setting glance.

## D49 — Browse exposure: dispose state, never mutate the engine

**Date:** 2026-11-24 · **Status:** accepted · **Reversible:** yes

The Browse tab inherits Gecko's content-process sandbox: every page runs in a separate,
seccomp-locked process that dies with the app and never sees the library, profile, or chrome.
What persists is *state*, so the tab disposes state too: browse-tab cookies and site storage are
cleared when the app closes, plain HTTP is upgraded when the site supports it and clearly marked
when it does not, and every powerful permission (camera, microphone, notifications, geolocation)
is default-deny — a citation tool has no business granting them. Popups stay blocked and downloads go through explicit UI only. An outer
container (bubblewrap and friends) is rejected: it would add input, clipboard, and IME plumbing
over Gecko's own sandbox for marginal gain, and complexity is itself a security cost.

The Firefox engine does not hot-update. The engine *is* the application binary; swapping
platform code under a running app invites version-mismatched failure. Instead a weekly scheduled
check — same cadence as the CodeQL audit (D44) — compares the pinned ESR (`153.7.0esr`, D15)
with Mozilla's published ESR release and flags the repository when a new one ships; platform
security patches then land promptly under the D47 carve-out to D28 and ship through the normal,
tested release path. Delivery of those releases rides R21's AppImage update channel.

Rejected: in-place engine self-update — Gecko cannot replace the binary it runs from, and an
untested platform swap is how an install bricks. Rejected: pointing Firefox's own updater
machinery at our servers — it assumes Firefox's packaging, not an AppImage.

**Implemented (R36, 2026-11-25).** Browse content runs in one reserved `userContextId` (20260), so
nothing a browsed site stores shares a jar with CiteWell's own requests. That context is cleared at
startup (the safety net for a crash or a killed process) and on shutdown: cookies through the cookie
manager, and DOM storage, IndexedDB, service workers, caches and quota through
`nsIClearDataService` with an origin-attributes pattern. The app's default context is untouched,
verified by a page-set cookie test. HTTPS is soft by owner decision: non-loopback `http` is tried
over `https` first and falls back to the original page with a "Not secure" marker if the upgrade
fails; loopback is exempt so http-only catalogues and the test server work. Powerful permissions
are default-deny through prefs. The ESR tripwire is maintainer-only (owner clarification): a weekly
CI workflow opens or comments a repository issue when Mozilla's ESR is newer than the pin. Nothing
is shown in the app, because a user could not act on it.

**Withdrawn: the Google Docs session exception (2026-11-25).** The owner first approved an opt-in
exception that would persist only `docs.google.com`/`accounts.google.com` session cookies. It was
withdrawn the same day when Docs moved out of the app entirely: the Browse tab gates Docs with an
explainer, and the working path is Firefox with Zotero's official connector, so CiteWell never
needs a Google session at all. No Google-specific persistence ships; Google sites are cleared on
close like every other site. This removes an exception, a preference and a class of login risk
rather than adding them.

## D50 — DNS defaults to Cloudflare's malware-blocking pair; DoT comes later via a sidecar

**Date:** 2026-11-24 · **Status:** accepted · **Reversible:** yes

Settings gains a DNS item whose default is Cloudflare's malware-blocking resolver pair
**1.1.1.2 / 1.0.0.2** (the "Families" malware-only pair), with an option to fall back to the
system resolver. In Gecko the pair is honored as the trust anchor: the app configures TRR
(`network.trr.*` — verified present in the shipped runtime's `greprefs.js`) so lookups go to
Cloudflare's encrypted endpoint for that pair, `https://security.cloudflare-dns.com/dns-query`,
bootstrapped directly through 1.1.1.2, with the built-in `localhost,local` exclusions kept. The
setting applies app-wide — the Browse tab and every request the app itself makes — because all
of it resolves through the same Gecko networking stack.

Gecko speaks DoH, not DoT: a native "DNS over TLS" field cannot be wired to it. DoT for NextDNS
and custom resolvers is therefore recorded as a future feature on the sidecar path (R16): a
small Rust stub on loopback speaks DoT/DoH upstream and Gecko is pointed at it. Not built now;
the settings item may describe it as a future capability, but ships no dead control.

Implementation notes: the exact TRR mode (preferred-with-fallback vs. required) is verified
against the platform when the pane is built, and the default is applied at startup so a fresh
profile is protected without a first-run prompt.

**Amendment 2026-11-26:** DNS is no longer a settings pane of its own. It is a section
(`zotero-prefpane-advanced-network`) inside Advanced, because it is one resolver choice and did not
justify a top-level entry; its `go-to` icon also collided with the Locate control elsewhere. The
pane id `zotero-prefpane-dns` is gone, deep links use `zotero-prefpane-advanced`, and
`preferences_dns.js` loads with the Advanced pane. The behaviour (defaults, startup re-apply, the
two choices) is unchanged. The manifest's `retired` list now maps the old id to Advanced, and both a saved
`lastSelectedPrefPane` and a deep link follow that mapping instead of failing.

Rejected: writing system resolver configuration (`/etc/resolv.conf`, NetworkManager) — that is
machine-wide state, outside what a citation app may touch (D19 scope). Rejected: presenting the
choice as anonymity — it changes who answers lookups and blocks malware domains; it is not a VPN.

## D51 — The plugin facility stays: a curated security-extension path opens

**Date:** 2026-11-24 · **Status:** accepted · **Reversible:** yes

D31's park stands — shipped builds still initialize no plugin loader and execute no arbitrary
third-party plugin code — but "parked" no longer means "closed forever." The owner's direction
is a **curated security path**: keep the facility so CiteWell can, deliberately, ship or offer
one vetted extension — uBlock Origin is the named candidate — because a browsing app gains real
protection from a blocker (malvertising and drive-by pages are the main way a research browser
gets hurt), and cleaner pages help translator detection in the Browse tab.

Two candidate shapes, chosen only after the spike below: **preload** (a vendored, AMO-signed
XPI ships inside the AppImage, enabled) or **suggestion** (a Plugins sub-section in the D48
settings tab offers it, add-only like the D35 installer, installing from the vendored copy —
never from a URL, never from disk picked by the user). Either way the settings section shows
status; the loader stays closed for everything else, and there is still no UI to install
arbitrary XPIs.

Spike gate before the shape decision — the shipped runtime already carries `XPIProvider` and
`declarativeNetRequest` (verified in the platform's `omni.ja`, and XPIProvider's lifecycle runs
in our test boots), but these must be proven end-to-end: content scripts inject into browse-tab
contents; the extension's background/event page runs in this app; `webRequest` blocking exists
if full uBO rather than uBO Lite is wanted; and the vendoring/license story holds (uBO is
GPL-3.0 — preserved alongside AGPL-3.0-or-later, source kept in-repo). If the spike fails, the
path stays recorded and the settings section ships without it — no dead control, per D50's
rule for future features.

Rejected: reopening general plugin installation — D31's original risk (arbitrary local code
execution, a compatibility obligation the project dropped) still stands for everything outside
the vetted path. Rejected: sending anything of ours to AMO for this — the XPI we vendor is
uBlock's own signed build; D47's no-submission rule is untouched.

**Spike result (R38, 2026-11-25).** See [ublock-spike.md](ublock-spike.md). WebExtensions do not
install in this application as built: uBlock Origin 1.77 (signed) and a minimal hand-built MV2
extension both fail with `ERROR_CORRUPT_FILE`, while `xpinstall.enabled` is true and signatures are
not required. The URL classifier also has no tracking-list data, so built-in content blocking is
inert. Recommendation: ship no in-app blocker; keep the sandbox, soft HTTPS and default-deny
permissions, and leave "use Firefox with uBlock Origin" as documentation rather than a control.
This changes the shape D51 expected; owner approval is pending.

## D52 — An interrupted merge refuses when its source changed

**Date:** 2026-11-25 · **Status:** accepted · **Reversible:** yes

A merge is resumable by source path and database hash. When Zotero's library changed between the
interruption and the retry, the checkpoint no longer matched, and the first implementation started
a fresh merge on top of the partial result: every already-imported item, note and attachment would
appear twice.

The retry now **refuses**, and the message names the restore point the interrupted merge made. The
pane offers a database restore: the merge backup holds the database as it was before the merge
began, so swapping it in removes the partial result without touching the copied attachment files or
the search index. The replaced database is kept as a database-only restore point, and the merge
session is forgotten, so the changed library can be merged again.

Rejected: resuming across a changed source. The checkpoint records source item IDs and destination
keys, but a changed source can have new, removed or re-keyed children whose relationship to the
partial result cannot be inferred safely, and guessing is what loses data. Rejected: discarding the
checkpoint and continuing, which is the duplication this decision exists to prevent. Rejected:
deleting the files the partial merge copied as part of the rollback; they are unreferenced
leftovers, and deleting attachment files to tidy up risks data that is still in use.

A database-only restore is not the full restore: it swaps `zotero.sqlite` and leaves `storage/` and
the search index in place. The full restore path refuses database-only points rather than emptying
the attachment tree, and the Restore points list labels them and offers **Restore database…**.

## D53 — There is no Mozilla update channel, and Check for Updates says so

**Date:** 2026-11-25 · **Status:** accepted · **Reversible:** yes

The inherited channel was worse than useless. The build pointed
`nsIApplicationUpdateService` at `zotero.org/download/client/update/...`, and a probe of the
shipped build showed a foreground check fetching that URL and failing with a 404 ("Update XML file
not found"). So the app contacted Zotero's servers, and the only UI for it (Mozilla's wizard) could
not have installed anything in any case: signed MAR files cannot patch a squashfs AppImage.

The build now carries **no** `[AppUpdate]` URL (`app/assets/application.ini`), `app.update.auto` is
false, and `app.update.url.manual`/`.details` point at CiteWell's releases page. The service still
permits a check, but with no URL it resolves locally as `update_url_not_available` ("Update URL not
available") with `request: null`, so no server is contacted; verified with the same probe before and
after the change. Check for Updates no longer opens the wizard: it states that this build has no
in-app channel yet, that updating an AppImage means replacing the file, and offers the releases
page. The startup-error dialog's "Check for Update" button opens that page too.

Rejected: leaving the wizard reachable, since it exists only to report a check that cannot succeed.
Rejected: pointing the URL at our host now, because there is nothing to serve until R11 and a URL
that 404s is worse than an honest absence. The self-updater (R11/R21) replaces this notice, and the
Gear Lever compatibility rules in [packaging.md](packaging.md#updates) apply to it.

The Mozilla wizard under `chrome/content/zotero/update/` is now unreferenced and left in the tree;
removing it is cleanup, not a behaviour change.

## D54 — UI behaviour gets one spec and a test per change

**Date:** 2026-11-25 · **Status:** accepted · **Reversible:** yes

R6 exists because UI changes had accumulated as patches rather than specified behaviour. The rules
the owner set out now live on their own page, [ui.md](ui.md), not in a handoff paragraph: copy
carries no em dashes, steps sit one per line, disabled controls are visibly distinct with the
measured pair recorded, browser habits decide placement and Ctrl/Cmd+L, wording is honest, and Docs
links to the Connector page. Every R6 change records a decision and ships a test that can fail; a
rule that cannot be tested says so instead of gaining a test that cannot fail.

The first change is the copy rule. `test/tests/uiCopyTest.js` scans the shipped locale files and
every preference pane XHTML, and checks that each Docs gate step is one numbered line. It
deliberately does not scan JavaScript literals or data formats (exported Markdown, CSL output, file
names): those are review territory, and a repository-wide string lint would flag comments and
translation data, force exceptions, and train people to ignore it. Contrast cannot be measured by
this harness, so the pair is recorded in ui.md and re-measured when a control changes.

Rejected: enforcing the copy rule by review alone. The scan is cheap and fails on exactly the thing
the owner asked for, while review had already missed seven instances.

## D55 — The item picker's keyboard contract

**Date:** 2026-11-25 · **Status:** accepted · **Reversible:** yes

The Browse tab's picker is a modal dialog that a web translator waits on. Its contract is now
written and tested (`test/tests/browsePickerTest.js`, five cases):

1. The filter has focus when the dialog opens, so typing narrows the list immediately.
2. Escape cancels and answers the caller with null. So does closing the window.
3. Save is disabled while nothing is checked, and the count says "N of M selected".
4. A filter hides unmatched rows but never hides a checked one, so a stray filter cannot hide the
   selection that is about to be saved.
5. **Enter in the filter does not save.** Save is reached by clicking, by Tab to the button, or by
   the platform's default-button routing.

The last point is the one that needed a decision. The translator may pre-check rows, so a filtered
list plus Enter could commit a selection the person never confirmed. A test now fails if Enter in
the filter starts answering the caller. Rejected: auto-checking every row that matches the filter;
the filter is a view, not a selection. Rejected: focusing the list instead of the filter; the
reason to open the picker is usually to narrow a long list.

The test opens the dialog non-modally, because a test that opens it modally blocks itself; it
focuses the window before asserting the filter's focus, since a non-modal test window is not
focused on creation.

## D56 — The Settings tab says when it is loading, and when it failed

**Date:** 2026-11-25 · **Status:** accepted · **Reversible:** yes

The Settings tab hosts the preferences document in an iframe. That document loads asynchronously and
can fail to initialize (a broken build, a frame that never reaches its navigation list). Until now
the tab showed an empty panel in both cases, which reads as "my settings are gone" rather than
"still loading" or "this failed". A status line now says **Loading settings** while the readiness
probe runs, is removed as soon as the navigation list exists, and after the probe's five second cap
says **Settings could not be loaded. Close this tab and try again.** The tab exposes `loading`,
`ready` and `failed` through `getState()` so a test can tell them apart.

Rejected: a spinner. The wait is usually a fraction of a second, and a moving control in a settings
surface draws attention to a non-event. Rejected: blocking the tab until ready; the tab is usable
for reading the failure and closing itself. Rejected: changing the tab title to the pane name; a
browser settings tab is still "Settings", and the pane is visibly selected inside it.

The five second cap cannot be forced in the test harness without breaking the frame, so the failure
rendering is exercised by calling the settle path directly; the probe's own timeout is review.

## D57 — A pane failure is local to the pane

**Date:** 2026-11-25 · **Status:** accepted · **Reversible:** yes

A settings pane can throw while the frame around it is perfectly ready: a broken build, a missing
resource. The old path logged the error and left the previous pane on screen while the navigation
list already marked the new pane as chosen, so the tab lied about what it was showing. Now:

- a pane-level notice says **That settings pane could not be opened. Choose another pane from the
  list.**, inside the tab but apart from the frame;
- the navigation selection returns to the pane whose content is actually visible;
- the notice clears on the next successful navigation;
- the tab's own state stays `ready`; this is not the whole-tab `failed` state, because the rest of
  Settings still works.

Rejected: reusing the whole-tab failure notice, which would say Settings is broken when one pane
is. Rejected: leaving the navigation selection on the failed pane, which is the misleading state
this decision removes. Rejected: retrying the pane automatically; a pane failure is deterministic
until the build changes.

## D58 — Publish AppImages on GitHub releases, with source and without a key

**Date:** 2026-11-25 · **Status:** accepted · **Reversible:** yes

R11 asks whether to publish Linux builds or stay source-only, and what happens about source and
signing. The decision is to publish: the AppImage is the product, and a download that a person can
verify and update is better than a build recipe.

- **Where:** the project's own GitHub releases. Each release carries exactly three assets:
  `CiteWell-x86_64.AppImage`, `CiteWell-x86_64.AppImage.zsync` and
  `CiteWell-x86_64.AppImage.sha256`. Those names are the contract; `xtask appimage` writes them and
  embeds the matching update information.
- **Source offer:** the repository at the release tag is the corresponding source, which satisfies
  the AGPL. The release notes say so and link the tag. No separate source archive is uploaded,
  because GitHub already serves one and a second copy can drift.
- **Signing:** no key yet. Verification is the published SHA-256 plus TLS, which catches a truncated
  or swapped download but not a compromised release account. A detached signature (minisign or
  AppImage signing) is the upgrade path and belongs with the self-updater work; until then the
  release notes state the limit rather than implying more.
- **Test builds:** published as prereleases so GitHub's `latest` (which the update information
  points at) never offers them, and they never reuse a real version number.
- **What is not published:** Windows and macOS builds do not exist, so the release does not imply
  them.

Rejected: source-only. It would make every user build a Firefox-based app with a Rust toolchain,
and the update channel would have nothing to update. Rejected: signing with a self-issued key
without a published key file and a documented verification command; a signature nobody can check is
worse than an honest SHA-256.

## D59 — CiteWell versions by calendar date, with a per-day publish counter

**Date:** 2026-11-26 · **Status:** accepted · **Reversible:** yes for future releases, no for tags already pushed

Semantic versioning was considered and rejected. It asks a number to communicate the nature of a
change, which needs agreement on what "breaking" means; CiteWell has no API consumers and its
releases are driven by readiness, not by a compatibility contract. Its version also inherited
Zotero's `10.0.9`, which reads as a Zotero claim it does not make. A date is a fact, and the
project's first public artifact should carry its own number.

- **Shape:** `YYYY.MM.DD.NNN` — UTC date of first publication, plus a three-digit publish counter
  starting at `000`. Month, day and counter are zero-padded because the string is read as text in
  tags and release lists.
- **Allocated once:** the date and counter are captured at the start of the publish procedure and
  used for the tag, the release and its assets. The clock is not read again.
- **The tag is the ledger:** a number is spent when its `v<date>.<nnn>` tag exists on the remote.
  Allocation is the highest existing tag for that date plus one, after `git fetch --tags`. Published
  tags are never moved or deleted, and allocation is serial (one publish at a time).
- **Publication is defined:** a tag exists on the remote. The procedure creates a **draft** release,
  uploads the three assets, verifies after upload that every asset digest equals the local SHA-256
  and that the `.zsync` File-Hash matches, then publishes the draft, which creates the tag and moves
  `latest` for a stable release. A failed upload is retried against the same release; published
  assets are immutable and a fix takes the next number.
- **Test builds are prereleases** and still consume a number. GitHub's `latest` ignores prereleases,
  so the update channel does not move, and a stable release later the same day always has a higher
  number.
- **The cap is 999 per UTC day.** Reaching it stops publication until the next UTC day; it does not
  overflow into a fourth digit.
- **Dev builds** carry `YYYY.MM.DD.SOURCE.<sha>` with no counter and never reserve a number. Between
  releases the `version` file sits at the last release date without the counter.
- **The number is CiteWell's only.** It is never sent to a consumer that expects a Zotero version:
  the translator and style repository update check, the `X-Zotero-Version` header and LibreOffice
  document metadata receive `Zotero.zoteroCompatVersion`, which names the upstream base (`10.0.9`)
  and must be updated when the data layer or field encoding diverges from it. There is deliberately
  no second copy of that value to drift. The translation framework is a submodule that runs in its
  own sandbox, where `Zotero.version` is the framework's version (5.0.78); those call sites are left
  alone, because that value is the one the repository expects from the framework.

Rejected: `10.0.9-citewell.N`. It keeps the lineage visible but still presents 10.0.9 as the product
version, which is exactly the confusion the change removes. Rejected: an unqualified `YYYY.MM.DD`
without a counter, because two artifacts can ship on one day and the number must stay unique and
ordered. Rejected: a bare version for the published build via a release-channel build; the source
channel is the path every test and every prior artifact went through, so the shipped bytes keep the
`.SOURCE.<sha>` that names their commit.

## D60 — The app updates itself by replacing the file it is running from

**Date:** 2026-11-26 · **Status:** accepted for the current release line · **Reversible:** yes until it ships in a release

A release needs an update path that does not depend on Gear Lever, and that does not break Gear
Lever for someone who chose it. The app therefore replaces the exact file it is running from, with
the published bytes, after it has exited.

- **Split:** the app does the network work (resolve `releases/latest`, download with
  `Zotero.HTTP.download` so proxies and TLS keep working) and the UI. A Rust sidecar,
  `citewell-update`, does the parts that must not race: hashing, header checks, waiting for this
  process to exit, the rename, and starting the new file.
- **Verification:** the download must equal every digest the release publishes — the `.sha256`
  asset, GitHub's asset digest, the `.zsync` File-Hash — and must be a 64-bit x86-64 ELF AppImage
  type 2. A missing digest is absent, not a pass; no digest at all refuses.
- **The path:** `$APPIMAGE`, the file this process is running from. Never a hardcoded location:
  Gear Lever keys its settings on `md5(file_path)` and its desktop entry points at that path, and a
  second copy elsewhere would give it a permanent digest mismatch.
- **The swap:** the download lives beside the target with a hidden name that does not end in
  `.appimage`; the running mount keeps the old inode alive; the rename is atomic and leaves the old
  file untouched on failure; a symlinked target is refused. The sidecar re-hashes the file and
  re-checks the header immediately before the rename, so a corrupt or swapped file cannot reach the
  target; this is a cheap integrity check, not a privilege boundary, since both files belong to the
  same user.
- **The restart:** the sidecar waits for the app's pid to exit, then starts the new file with
  `-profile` and `-no-remote`, plus `-datadir` when the launch had one and `--no-integration` when
  the launcher recorded that opt-out (see the amendment), with the AppImage environment variables
  removed, so the profile lock is free and the new instance uses the same library.
- **Trigger:** `Cite > Check for Updates`, manual only. There is no background polling and no
  update is installed without a confirmation dialog.
- **Not running from an AppImage:** refuse and point at the releases page, because there is no
  single file to replace.

The restart's arguments are a fixed allowlist, not a copy of the original command line; the
amendment below records what it carries and why.

**Amendment 2026-11-26 (validated end to end):** the restart carries exactly `-profile <ProfD>` and
`-no-remote`, plus `-datadir <library>` only when the original launch had an explicit data directory,
plus `--no-integration` when the launcher recorded that the user declined integration
(`CITEWELL_NO_INTEGRATION=1`). Repeating `-datadir` unconditionally would be wrong because the
launcher treats an explicit data directory as the request to install attention integration; without
the flag the same profile's prefs or the default resolve the same library, so the launch mode is
preserved. Development flags such as `-ZoteroDebugText` or `-jsconsole` are deliberately not carried
over: the update is a fresh launch against the same library, not a resume of a debug session, and
forwarding unknown flags could change the new instance's behaviour. The launcher strips
`--no-integration` before starting the app, so it records the decision in the environment; restarting
without it would install the systemd and D-Bus files the user explicitly declined. The marker exists
only in builds from this amendment onward, so updating into such a build from an earlier release
still drops the flag once.

Validation: a build labelled `2026.11.25.999.SOURCE.6f88c6c9c` (an earlier UTC date, with a
three-digit counter so it is not treated as a development build) checked for updates against the
published `v2026.11.26.000`. The dialog named both versions and the 120 MB size; the download reached
exactly 125,864,440 bytes; `.sha256` and `.zsync` were fetched and every published digest that could
be read (one value from three sources) was verified by the sidecar; the file was swapped in place to
`6f290eee…`; the restarted process ran `2026.11.26.000.SOURCE.2c521c9b6` against the same profile and
library and answered `/connector/ping` with 200; no temporary download remained. A first run without
the marker change showed the restarted instance installing integration into its sandbox despite
`--no-integration`; a second run after the change restarted with the flag and created none. A third
run launched with neither `-datadir` nor `--no-integration`: the restart carried only `-profile` and
`-no-remote`, kept using the profile's data directory, created no integration files, and left the
default `~/Zotero` untouched. The current handoff in [status.md](status.md) records the runs.

## D61 — An empty view says what it is, and help lives under Help

**Date:** 2026-11-26 · **Status:** accepted · **Reversible:** yes

The empty library used to explain how to start and to install a connector. The connector no longer
exists since R34, and the guide it linked to was Zotero's. The owner's rule is that the middle of
the app is for the work, not for tutorials.

- **One line, one action.** An empty library shows "Welcome to CiteWell!" and a single **Browse the
  web** link that opens the Browse tab. No paragraph of instructions, no links to another product's
  documentation.
- **Help has one home.** Instructions and documentation live under Help. The product help entry
  points at `https://github.com/EricBright/CiteWell` for now; a documentation section of its own is
  a later decision, deliberately deferred until the app stabilises.
- **Vertical alignment.** The message is shifted up by the item toolbar's height so that the
  heading-plus-action block is centred on the same line as the item pane's "No items in this view",
  which lives in a taller column. The offset is read at render time, not hard-coded.
- **Enforcement:** `uiCopyTest.js` fails if the welcome strings or their references return, and if
  the Browse action or its handler disappears.

Rejected: keeping a short tutorial in the empty view. It would duplicate Help, and the only specific
instruction worth giving (browse something) is now a button.

## D62 — Problem reports go to CiteWell's tracker, not Zotero's error service

**Date:** 2026-11-26 · **Status:** accepted · **Reversible:** yes

Help > Report Errors opened Zotero's error wizard, which POSTs the log to
`https://repo.zotero.org/repo/report`. That service belongs to another project. A CiteWell user's
diagnostic log would arrive at a server they have no relationship with, for a product it does not
support, and the Help menu offered no way to reach CiteWell's own tracker.

- **What replaces it.** Help > Report a Problem… opens
  `https://github.com/EricBright/CiteWell/issues/new`. The app copies the error log to the
  clipboard first and says so in a progress window, so the person can paste what is relevant and
  remove what is not. Nothing is submitted automatically.
- **No inherited path.** `ZoteroPane.reportErrors()` no longer opens the wizard. Import and sync
  failures that offered "Report Error…" reach the same tracker instead of Zotero's service.
- **Trade-off:** without an error service, CiteWell cannot collect reports automatically. That is
  the honest price of not owning one; the tracker is public and the log stays with the user.
- **Enforcement:** `uiCopyTest.js` checks the URL, the menu label, and that `reportErrors()` no
  longer opens `errorReport.xhtml`.

The wizard file and its locale strings remain in the tree but are unreachable; removing them is a
later cleanup, not a behaviour change.

## D63 — No Zotero service is offered or promoted

**Date:** 2026-11-26 · **Status:** accepted · **Reversible:** yes

CiteWell is a fork. It has no Zotero account, sync, storage, cloud, forum, support site, or release
blog, and user-facing copy must not imply that it does. The rule is absolute except for three
catalog/data dependencies and the identifiers the data already carries.

- **The three exceptions.** The official Zotero browser connector (the only browser-save client; the
  app listens on 127.0.0.1:23119 and the extension follows Zotero's own policy), the Zotero style
  catalog opened in the app's viewer (click-to-install would break with any other page), and Hunspell
  dictionary downloads from download.zotero.org (no account, no telemetry). They are recorded here
  so a later audit does not remove them by accident. Opening the catalog or fetching a dictionary
  does contact zotero.org; the copy must not claim otherwise.
- **Inherited identifiers stay.** `~/Zotero`, `zotero.sqlite`, `extensions.zotero.*`, `zotero://`,
  item URIs and document field codes name existing data or documents. Renaming them is a migration,
  not a copy edit.
- **Legal attribution stays.** NOTICE, the trademark line, licensing and credits links.
- **Removed under this decision.** Help > Troubleshooting Information and Discussion Forums (the
  latter is now GitHub Discussions), the Mendeley error's Zotero help link and "into Zotero"
  wording, the data-directory dialog's Zotero KB button, and the post-upgrade banner that linked to
  the Zotero blog. The banner was already dead because the version contains SOURCE, but it would
  wake up if release builds stop carrying that suffix.
- **Enforcement.** `uiCopyTest.js` checks the Discussions URL, the absence of the two Zotero Help
  items, the post-upgrade banner, the data-directory KB link and the Mendeley Zotero link; the
  locale tests keep the app's own name CiteWell in the supported languages.

Rejected: keeping the Zotero forums as a community channel. CiteWell has its own tracker and
Discussions; sending people to another project's forum implies support that does not exist.
Rejected: keeping the banner and pointing it at the CiteWell changelog. It is release-marketing UI
for a version scheme the fork does not use.

## D65 — The browser connector lives in Settings > Advanced, with its exception stated

**Date:** 2026-11-26 · **Status:** accepted · **Reversible:** yes

The Tools menu had an **Install Browser Connector…** item that opened Zotero's download page with no
explanation. It was the only Zotero product in a menu, in an app that otherwise avoids Zotero, and
it hid the reason the link exists.

- **One place.** Settings > Advanced has a Browser Connector section. It says CiteWell ships no
  connector; browser saving and Google Docs citations use Zotero's official extension, a separate
  project; the app listens only on `127.0.0.1:23119`; there is no Zotero account, sync or cloud
  storage; the extension follows Zotero's own policy; and there is no CiteWell connector yet, so one
  link remains. The section holds the download button.
- **The menu item is gone.** The Docs gate keeps its contextual install link because it already
  explains the requirement at the point of use.
- **The outdated-connector prompt** opens the Advanced section instead of the download page, so the
  explanation is visible before the link.
- **Enforcement:** `uiCopyTest.js` checks that the section exists, that the Tools item is gone, that
  the prompt opens the pane, and that the four strings exist in every supported locale.
- **Rejected:** deleting the link. Without a CiteWell connector, browser saving and Docs citations
  would stop working; the exception is stated where users meet it.

## D64 — The maintained locale set is eight, and the build ships only those

**Date:** 2026-11-26 · **Status:** accepted · **Reversible:** yes

The owner's set is `en-US`, `en-GB`, `de`, `fr-FR`, `es-ES`, `ja-JP`, `zh-CN` and `zh-TW`. Other
translations are not shipped; adding one requires a GitHub issue that names a native reviewer.

- **The other forty directories moved to `locale-archive/`.** They stay in history and can be
  restored if a reviewer appears, but they are not copied into the build.
- **Every list is reduced to the same eight:** `chrome.manifest`, `app/assets/multilocale.txt`,
  `Zotero.Locale.availableLocales`, and the language picker that reads it. The requested locale is
  resolved against the maintained set, so an unsupported preference falls back instead of loading a
  half-present translation.
- **The runtime is rebuilt with eight locale packs.** A spike proved the list in
  `Services.locale.availableLocales` comes from `res/multilocale.txt` inside the runtime
  `omni.ja`, not from `chrome.manifest`; rebuilding the runtime changed the reported list from 46
  to the eight.
- **Enforcement:** `uiCopyTest.js` asserts that both `Services.locale.availableLocales` and
  `Object.keys(Zotero.Locale.availableLocales)` equal the supported set, and that the running locale
  is one of them.
- **Trade-off:** speakers of the removed languages get English instead of a Zotero-era translation.
  That is the honest state until a native reviewer is available; a partial old translation would
  still carry the other product's name.

## Dead ends

Failed experiments and abandoned approaches go here, each with *why* it was abandoned, so it is
not repeated. None yet.

*For the full documentation index, see [../README.md](../README.md).*
