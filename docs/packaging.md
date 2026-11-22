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

Output: `dist/CiteWell-x86_64.AppImage` (about 141 MB).

The Gecko runtime is Firefox **153.7.0esr**, fetched by `app/scripts/fetch_xulrunner -p l -a
x86_64` and ignored by git. It is prepared in place, so a later rebuild needs no re-download while
the tarball stays in `app/xulrunner/`.

Scratch space lives in `tmp/appimage/`, deliberately **not** under `build/`: Zotero's packaging
zips the contents of `build/` into `app/omni.ja`, so an AppDir or a previous AppImage left there
gets copied into the application itself (the bundle once grew to 532 MB this way).

## What goes inside

| Path | Content |
|---|---|
| `AppRun` | Rust launcher (`tools/launcher`); execs the bundled `zotero` script |
| `citewell.desktop`, `citewell.png`, `.DirIcon` | Desktop integration |
| `usr/share/icons/hicolor/256x256/apps/citewell.png` | Icon theme entry |
| `usr/lib/citewell/citewell-import` | Rust import/backup helper, built by `xtask` |
| `usr/lib/citewell/…` | The staged application, unchanged |

`AppRun` is a Rust binary rather than a shell script, so the bundle needs no extra interpreter.
It uses `exec`, not `spawn`, so signals and the process group behave as a direct launch would.
`citewell-import` is a separate std-only Rust binary, built in release mode by `xtask` and placed
next to `zotero-bin`; a source build finds the debug or release copy under `tools/target/`.

## A clean rebuild

Trashing `build/` alone is not enough: build signatures live in `.signatures.json` at the
repository root, so the JS/Sass tasks conclude that missing outputs are current. The symptom is
a bundle that starts but whose layout is broken (no platform CSS) and whose notes do not open (no
note editor). `xtask` now refuses to package a staged build missing either asset; the fix is
(the removals go to Trash, never `rm` — D26):

```bash
gio trash -f build .signatures.json
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
A `-datadir` with no value is refused by the Rust `AppRun` (exit 2) instead of being silently
ignored, because Gecko would otherwise fall back to `~/Zotero`.


```bash
chmod +x CiteWell-x86_64.AppImage
./CiteWell-x86_64.AppImage
```

AppImages need FUSE. If FUSE is unavailable, `./CiteWell-x86_64.AppImage --appimage-extract-and-run`
works but is slow (it unpacks on every start). Gecko's content processes and user namespaces can
interact badly under some sandbox configurations; test on a clean profile before trusting a build.

## Attention system integration

`AppRun` installs a user-scoped systemd unit and D-Bus activation file on a normal launch when
`APPIMAGE` is set and an explicit `-datadir` is present. The files are:

| Path | Purpose |
|---|---|
| `~/.config/systemd/user/citewell-attention.service` | Runs the AppImage with `--attention-activate --datadir <dir>` |
| `~/.local/share/dbus-1/services/ca.sophy.CiteWell.service` | Starts that unit through `systemctl --user` |
| `~/.config/citewell/integration.txt` | Records the exact paths, executable and data directory |

The launcher prints every path it writes, the removal command and the opt-out flag. The interface
is:

- `--no-integration` — do not install the files;
- `--install-integration` — install them explicitly;
- `--remove-integration` — remove exactly the files recorded in the manifest.

CiteWell also exposes the same safe removal in **Cite preferences → System integration → Remove
system integration…**. The dialog lists the manifest path, removes only the recorded files, and
does not touch the library, preferences or LibreOffice profile. The section is hidden in source
builds where no AppImage is present.


The integration is user-scoped; there are no system-wide files. Gear Lever and AppImageUpdate
replace or remove the AppImage but do not run uninstall hooks, so deleting the AppImage leaves the
unit and D-Bus file until `--remove-integration` is run. This is documented here and in the
launcher notice; the next launch rewrites a stale executable path when possible.

## Not done yet

- **Flatpak**: a later option. The same `AppDir` content can feed `flatpak-builder`; nothing is
  implemented.
- **Updates**: no AppImage update channel. Replacing the file is the update mechanism. R21 adds
  SHA-256 checksums and `.zsync` files so Gear Lever and AppImageUpdate can verify and fetch
  incrementally; that needs a release host and stable filenames first.
- **Signing**: no signing key is configured.

*For the full documentation index, see [../README.md](../README.md).*
