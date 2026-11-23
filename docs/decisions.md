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

## Dead ends

Failed experiments and abandoned approaches go here, each with *why* it was abandoned, so it is
not repeated. None yet.

*For the full documentation index, see [../README.md](../README.md).*
