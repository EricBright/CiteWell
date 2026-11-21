# Status and resumption

Last updated 2026-11-20 · branch `citewell` @ `6b3c5d2b5` · companion to
[roadmap.md](../roadmap.md) and [decisions.md](decisions.md), which hold the plan and the *why*.
This page holds only what a fresh session needs to start without re-deriving it.

## Where the project stands

| Area | State |
|---|---|
| App | Linux AppImage on Firefox **153.7.0esr**; CiteWell naming; sync disabled and hidden |
| Isolation | Own profile `~/.config/citewell/profile`, data `~/CiteWell`, port 23120; Zotero is never opened (D19) |
| Icons | One shape (book-section) in light/dark for app, connector, states and Google Docs |
| Connector | `connectors/`, Firefox XPI, branded, identity swapped, port 23120 |
| Agent access | `/agent/v1` Phases 1–4: items, translators, attachments, notes, collections, UI, annotations, `export.note`; 19 MCP tools; `citewell` CLI; audit log |
| Agent skill | [SKILL.md](../SKILL.md); Help → Agents and SKILL.md; Agent access pane |
| Notes | **Agent notes accept Markdown but Zotero still stores HTML**; Markdown-only design approved (D21), not built |
| Docs | README index, Rust docs gate, D1–D22, research note, note design |
| CI | `docs` and `CodeQL`; check the run for the pushed tip |

Artifacts are local and gitignored:

- `dist/CiteWell-x86_64.AppImage` (≈141 MB)
- `build/dist/CiteWell-Connector.xpi` (≈1.6 MB)

## Pick up here

1. **R26 — Markdown-only notes** ([notes.md](notes.md), D21). This is the next phase. Slice 1 is
   the conversion boundary only: `markdownToHTML` / `htmlToMarkdown` at the note-editor edge,
   load/save conversion, round-trip tests. Parser: bundled `markdown-it` + `prosemirror-markdown`
   (no new dependency). Editor: ProseMirror as a view over Markdown. Citations deferred and
   flattened; tables and math kept; legacy HTML converts on first open with a backup. Do not
   switch storage before the round trip is proven.
2. **R24 — import/merge a Zotero library** ([import.md](import.md)): adopt-copy for an empty
   library, then a batched merge. Source read-only throughout; R26 changes the note conversion
   step here.
3. **R21 — checksums and `.zsync`** beside the AppImage, for Gear Lever/AppImageUpdate. Needs a
   release host and stable filenames.
4. **Connector on AMO** — id `citewell-connector@sophy.ca`; `update_url` is inert until a listing
   exists.
5. **R6 — UI behaviour changes** — needs the owner's list; one decision and one test per change.
6. **R19 — remove the sync subsystem**; R18 hides it now.
7. **R7 — non-English locales** still contain upstream Zotero translations.
8. **R20 — Obsidian/Markdown export** ([export.md](export.md)); it becomes mostly a copy once
   R26 lands.

## Commands

Fetch the Gecko runtime once per version (gitignored):

```bash
app/scripts/fetch_xulrunner -p l -a x86_64
```

Clean rebuild after assets, deleting `build/`, or changing the runtime:

```bash
rm -rf build .signatures.json
node js-build/build.js
app/scripts/dir_build -p l
cargo run --manifest-path tools/Cargo.toml -p xtask -- appimage
```

Run without touching the real library:

```bash
./dist/CiteWell-x86_64.AppImage -datadir "$HOME/CiteWellData"
```

Docs, Rust tests, agent tests, connector:

```bash
cargo run --manifest-path tools/docs-check/Cargo.toml
cargo test --manifest-path tools/Cargo.toml -p citewell-cli -p citewell-launcher
test/runtests.sh agentTest.js searchTest.js advancedSearchTest.js pluginAPITest.js
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
| Deleting `build/` without `.signatures.json` | Sass skips everything; the bundle loses platform CSS and the note editor. `xtask` refuses to package that now; clear both |
| Putting working files under `build/` | Zotero zips `build/` into `omni.ja`; one bundle reached 532 MB. Scratch lives in `tmp/` |
| Rebuilding while the AppImage runs | The output is mounted and cannot be replaced; quit it first |
| `pkill -f "<pattern>"` | Matches the invoking shell and kills it; use `-x` or explicit PIDs |
| `-datadir "~/…"` | Quoted `~` is not expanded; use `"$HOME/…"` |
| `-datadir` with no value | Gecko ignored it and opened `~/Zotero`; the Rust `AppRun` now exits 2 |
| XHTML changes not copied by a test build | `node js-build/build.js` then `app/scripts/dir_build -p l` before trusting the staged app |
| `agent-token` missing just after launch | The port can listen a moment before the token is written; retry after a second |
| Upgrading Firefox | Not a config bump: adapt the upstream `fxN` port series; procedure in [sync.md](sync.md) |
| Constrained environments | `MOZ_FORCE_DISABLE_E10S=1`; `--appimage-extract-and-run` if FUSE is absent |
| `gh` in this repo | Defaults to the fork; `gh` once resolved to `zotero/zotero` |
| Upstream remote | Fetch-only (`pushurl = DISABLED`); never push or open upstream issues/PRs |

## Facts worth not re-litigating

- Linux uses Firefox **153.7.0esr** (D15); Mac/Windows pins stay at 140.17 because they are not
  built (D13).
- `ONLINE_SYNC: false` in [resource/config.mjs](../resource/config.mjs); `ONLINE_LIBRARY: false`
  in the connector. Code still exists (R19).
- SQLite stays: `zotero.sqlite` plus `fulltext.sqlite`, 59 tables, 853 query call sites. A
  file-based store is *not doing*; export is the portability answer.
- Local API and agent bridge listen on `127.0.0.1:23120` (D16/D17). The CLI never opens SQLite.
  Reads on `/api/` are local-unauthenticated; `/agent/v1` needs the 0600 token and
  `X-CiteWell-Agent: 1`, audits every call, and has no destructive verbs.
- KDE/KWin draws the frame and its buttons (D18); external links go through `xdg-open` with the
  Mozilla launcher environment cleared, so they open in the default browser.
- CiteWell has its own profile, data directory and port (D19). Zotero's paths are never opened;
  import is explicit only.
- **Current note behavior:** `add_note` accepts Markdown and converts it to HTML for Zotero
  storage (D20); `export.note` returns Markdown. R26 will remove HTML storage entirely, so do not
  claim Markdown-only notes are done.
- `citewell mcp` exposes 19 tools; verified with initialize, tools/list and tools/call.
- `SKILL.md` is the downloadable agent skill (Help → Agents and SKILL.md, or Agent access).
- The connector identity lives in `connectors/brand.json`; `xtask` substitutes tokens and fails on
  hardcoded English product names.
- The Google Docs integration is vendored, not a submodule, because it had to be patched.

*For the full documentation index, see [../README.md](../README.md).*
