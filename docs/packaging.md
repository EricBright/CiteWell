# Packaging: Linux AppImage only

CiteWell targets **Linux x86_64, AppImage**. Windows and macOS are not built and are not
supported; their upstream trees (`app/win`, `app/mac`) stay in the repository untouched, because
deleting them would turn every upstream change into a merge conflict for no benefit.

## Prerequisites

| Need | Why |
|---|---|
| A staged build (`app/scripts/dir_build -p l`) | `xtask` packages, it does not build the app |
| `appimagetool`, `mksquashfs` | AppImage format: squashfs plus a runtime stub |
| `appimagetool` (or `$APPIMAGETOOL`) | Called by `xtask`; a tool, not code we maintain |

## Build

```bash
cd /path/to/CiteWell
app/scripts/dir_build -p l
cargo run --manifest-path tools/Cargo.toml -p xtask -- appimage
```

Output: `dist/CiteWell-x86_64.AppImage` (about 130 MB).

Scratch space lives in `tmp/appimage/`, deliberately **not** under `build/`: Zotero's packaging
zips the contents of `build/` into `app/omni.ja`, so an AppDir or a previous AppImage left there
gets copied into the application itself (the bundle once grew to 532 MB this way).

## What goes inside

| Path | Content |
|---|---|
| `AppRun` | Rust launcher (`tools/launcher`); execs the bundled `zotero` script |
| `citewell.desktop`, `citewell.png`, `.DirIcon` | Desktop integration |
| `usr/share/icons/hicolor/256x256/apps/citewell.png` | Icon theme entry |
| `usr/lib/citewell/…` | The staged application, unchanged |

`AppRun` is a Rust binary rather than a shell script, so the bundle needs no extra interpreter.
It uses `exec`, not `spawn`, so signals and the process group behave as a direct launch would.

## A clean rebuild

Deleting `build/` alone is not enough: build signatures live in `.signatures.json` at the
repository root, so the JS/Sass tasks conclude that missing outputs are current. The symptom is
a bundle that starts but whose layout is broken (no platform CSS) and whose notes do not open (no
note editor). `xtask` now refuses to package a staged build missing either asset; the fix is:

```bash
rm -rf build .signatures.json
node js-build/build.js
app/scripts/dir_build -p l
```

## Running

Use an explicit data directory, with `$HOME` expanded by the shell:

```bash
./dist/CiteWell-x86_64.AppImage -datadir "$HOME/CiteWellData"
```

Without `-datadir`, the app opens `~/Zotero`, which is the same library the installed Zotero
uses. `-datadir` must be absolute; `"~/CiteWellData"` in quotes is not expanded and is rejected.


```bash
chmod +x CiteWell-x86_64.AppImage
./CiteWell-x86_64.AppImage
```

AppImages need FUSE. If FUSE is unavailable, `./CiteWell-x86_64.AppImage --appimage-extract-and-run`
works but is slow (it unpacks on every start). Gecko's content processes and user namespaces can
interact badly under some sandbox configurations; test on a clean profile before trusting a build.

## Not done yet

- **Flatpak**: a later option. The same `AppDir` content can feed `flatpak-builder`; nothing is
  implemented.
- **Updates**: no AppImage update channel. Replacing the file is the update mechanism.
- **Signing**: no signing key is configured.

*For the full documentation index, see [../README.md](../README.md).*
