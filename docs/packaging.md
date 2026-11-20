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

Output: `dist/CiteWell-x86_64.AppImage` (about 126 MB).

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

## Running

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
