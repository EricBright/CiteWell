# The Firefox connector

CiteWell's browser connector is the upstream `zotero/zotero-connectors` project, imported at
`connectors/` and built for **Firefox only**. Chrome and Safari code stays in the tree but is
never built: pruning it would be a fork re-applied on every upstream update.

## What was imported, and how

| Item | Value |
|---|---|
| Source | `https://github.com/zotero/zotero-connectors`, branch `main` |
| Imported at | `02271dc76` (5.0.x line, 2026-11-05) |
| Method | `git subtree add --prefix connectors --squash` |
| Build output | `connectors/build/firefox` → `build/dist/CiteWell-Connector.xpi` |

`git-subtree` is not installed by default on this machine; the official contrib script lives in
`~/.local/bin/git-subtree` and is invoked with that directory on `PATH`.

## Our patches to upstream files

Keep this list complete. Every entry is a future merge conflict, and the list is what makes an
upstream pull mechanical.

| File | Change | Why |
|---|---|---|
| `connectors/src/zotero` (gitlink) | removed | it is a 1.2 GB copy of the app; CiteWell **is** that repo |
| `connectors/build.sh` | `APP_DIR` + three path constants | skin icons, locales and `singlefile.js` come from the app root |
| `connectors/.gitmodules` | `src/zotero` entry removed | no nested app |
| root `.gitmodules` | four entries for `connectors/src/*` | git only reads submodules from the root |
| `connectors/images/toolbar` | regenerated at build time | produced by our Rust rasteriser, not committed |

## Build

```bash
# first time only: installs connector dependencies
cargo run --manifest-path tools/Cargo.toml -p xtask -- connectors
```

Output: `build/dist/CiteWell-Connector.xpi`. The build uses `tools/rsvg-shim`, a Rust
`rsvg-convert` replacement, so no librsvg binary is needed.

## Load it

1. Start CiteWell (`./build/dist/CiteWell-x86_64.AppImage` or the staged build).
2. Firefox → `about:debugging` → This Firefox → Load Temporary Add-on → pick
   `connectors/build/firefox/manifest.json`.
3. Save a page and a PDF; check the toolbar badge states.

A temporary add-on disappears when Firefox restarts. An unsigned XPI cannot be installed
permanently; signing needs an AMO account and is out of scope.

## Before this can be called CiteWell's connector

The imported manifest still identifies as Zotero, and one field is dangerous:

| Field | Current value | Required |
|---|---|---|
| `name` | `Zotero Connector` | `CiteWell Connector` |
| `applications.gecko.id` | `zotero@chnm.gmu.edu` | a CiteWell id (also avoids colliding with the real Zotero Connector) |
| `applications.gecko.update_url` | `https://zotero.org/AUTOFILLED` | **remove or point at CiteWell** — otherwise Firefox updates your connector back to Zotero's |
| `icons` | Zotero `Icon-*.png` | generated from the CiteWell mark |
| `strict_min_version` | `58.0` | leave unless the app requires more |

## Updating from upstream

```bash
git fetch connectors main
git subtree pull --prefix connectors connectors/main --squash
```

Conflicts should be confined to the files in the patch table. Verify with
`cargo run --manifest-path tools/Cargo.toml -p xtask -- connectors`, then load the XPI again.

*For the full documentation index, see [../README.md](../README.md).*
