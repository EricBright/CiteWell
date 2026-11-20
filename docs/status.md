# Status and resumption

Last updated 2026-11-20 · branch `citewell` @ `b545945cf` · companion to
[roadmap.md](../roadmap.md) and [decisions.md](decisions.md), which hold the plan and the *why*.
This page holds only what a fresh session needs to start working without re-deriving it.

## Where the project stands

| Area | State |
|---|---|
| App | Builds and runs as a Linux AppImage; CiteWell naming; sync disabled and hidden |
| Icons | One shape (book-section) in light/dark for app, connector, states and Google Docs |
| Connector | Imported at `connectors/`, Firefox XPI builds, branded, identity swapped |
| Docs | README index, Rust docs gate, decisions, roadmap, export design |
| CI | `docs` and `CodeQL` workflows, both green on `b545945cf` |

Artifacts are local and gitignored:

- `dist/CiteWell-x86_64.AppImage` (≈131 MB)
- `build/dist/CiteWell-Connector.xpi` (≈1.7 MB)

## Pick up here

1. **R20 — Obsidian/Markdown export** (design in [export.md](export.md)). Start with items,
   notes and collections; read-only SQLite; the exit criterion is in the design.
2. **R6 — UI behaviour changes.** Needs the owner's list; each change gets a decision record and
   a test.
3. **Connector on AMO** — the id is settled (`citewell-connector@sophy.ca`); `update_url` is
   inert and should be set from AMO when a listing exists.
4. **R19 — remove the sync subsystem** now that R18 hides it.
5. **R7 — non-English locales** still contain upstream Zotero translations.

## Commands

Clean rebuild after touching assets or deleting `build/`:

```bash
rm -rf build .signatures.json
node js-build/build.js
app/scripts/dir_build -p l
cargo run --manifest-path tools/Cargo.toml -p xtask -- appimage
```

Run it without touching the real library:

```bash
./dist/CiteWell-x86_64.AppImage -datadir "$HOME/CiteWellData"
```

Connector, docs gate, tests:

```bash
cargo run --manifest-path tools/Cargo.toml -p xtask -- connectors
cargo run --manifest-path tools/docs-check/Cargo.toml
test/runtests.sh
```

## Pitfalls learned the hard way

| Pitfall | Handling |
|---|---|
| Deleting `build/` without `.signatures.json` | Sass skips everything and ships a bundle with no platform CSS and no note editor. `xtask` now refuses to package that; always clear both |
| Putting working files under `build/` | Zotero zips everything there into `omni.ja`; one bundle reached 532 MB. Scratch lives in `tmp/` |
| Rebuilding while the AppImage runs | The output file is mounted and cannot be replaced; quit it first |
| `pkill -f "<pattern>"` | Matches the invoking shell and kills it; use `-x` or explicit PIDs |
| `-datadir "~/…"` | Quoted `~` is not expanded and is rejected; use `"$HOME/…"` |
| Constrained environments | `MOZ_FORCE_DISABLE_E10S=1` before launch; `--appimage-extract-and-run` if FUSE is absent |
| `gh` in this repo | Defaults to the fork now; `gh` once resolved to `zotero/zotero` |
| Upstream remote | Fetch-only (`pushurl = DISABLED`); never push or open upstream issues/PRs |

## Facts worth not re-litigating

- `ONLINE_SYNC: false` in [resource/config.mjs](../resource/config.mjs); `ONLINE_LIBRARY: false`
  in the connector. Both hide UI and block network paths; the code still exists (R19).
- SQLite stays: `zotero.sqlite` plus `fulltext.sqlite`, 59 tables, 853 query call sites. A
  file-based store is recorded as *not doing*; export is the portability answer.
- The connector's identity lives in `connectors/brand.json`; source strings use tokens that
  `xtask` substitutes, and the build fails on hardcoded English product names.
- The Google Docs integration is vendored, not a submodule, because it had to be patched.

*For the full documentation index, see [../README.md](../README.md).*
