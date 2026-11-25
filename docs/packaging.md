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

The build is `xtask build`; there are no Node signatures to become stale. Trash `build/` for a
clean rebuild (the removals go to Trash, never `rm` — D26):

```bash
gio trash -f build
cargo run --manifest-path tools/Cargo.toml -p xtask -- build
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

## Updates

**The AppImage can update itself; Gear Lever is one client among several, not a requirement.** The
AppImage specification names three routes: an external tool, an updater built into the AppImage, or
libappimageupdate linked into the payload
([docs.appimage.org](https://docs.appimage.org/packaging-guide/optional/updates.html)). Our own
AppGlider is the working reference for the second route. It ships update information and a `.zsync`
so third-party tools *can* delta-update it, while its **Update AppGlider** button uses neither: it
downloads the new AppImage into a hidden temporary file in the running image's folder, verifies the
published SHA-256 and size plus the ELF header, AppImage type 2 and CPU, makes it executable,
renames it to `AppGlider-<version>-x86_64.AppImage`, records the ready and replaced paths, and
offers **Restart now**. The restart starts the new file in a new session with the AppImage
environment variables removed and no inherited file descriptors, then quits through the normal
path; the new instance deletes the old file once no process uses it. The running file is never
written. That deletion is the only thing that has to be careful: same folder, regular file, an
image name, a valid AppImage header and no process using it.

CiteWell's shape, once R11 provides a release host:

1. **Self-update in the app** (primary channel): check the repository's `releases/latest` redirect,
   download the new AppImage beside the installed one, verify a published SHA-256, swap it in while
   the old process still runs, then restart. No zsync and no external tool. The installed path is
   the stable `~/AppImages/citewell.appimage`, so either rename over that one name (the old inode
   stays alive through the mount, and the desktop entry and the integration manifest keep pointing
   at one path) or adopt versioned names and repoint the manifest as AppGlider does.
2. **Update information for other tools** (R21): `appimagetool -u` with
   `zsync|<url>` or `gh-releases-zsync|EricBright|CiteWell|latest|CiteWell-*-x86_64.AppImage.zsync`,
   plus the `.zsync` and a SHA-256 file in the release. Gear Lever and AppImageUpdate can then verify
   and delta-update the same artifact. Useful, optional, and never the only channel.
3. **Mozilla's updater is not a route, and R8 has removed it.** `nsIApplicationUpdateService`
   patches with signed MAR files and cannot patch a squashfs image. Since 2026-11-25 the build
   carries no `[AppUpdate]` URL, `app.update.auto` is off, the manual/details links point at our
   releases page, and Check for Updates reports that there is no in-app channel yet. A check
   resolves locally as "Update URL not available" and contacts no server.

### Publishing a release

`xtask appimage` writes three assets and proves the update information landed:

| File | Purpose |
|---|---|
| `dist/CiteWell-x86_64.AppImage` | the build |
| `dist/CiteWell-x86_64.AppImage.zsync` | delta updates for Gear Lever and AppImageUpdate |
| `dist/CiteWell-x86_64.AppImage.sha256` | what the in-app updater verifies before installing |

1. Build from a clean tree and note the version in `app/staging/Zotero_linux-x86_64/app/application.ini`.
2. Tag the commit and publish a GitHub release at `EricBright/CiteWell` with those three files under
   exactly those names. The update information points at `releases/latest`, so the asset names and
   the `latest` release must agree.
3. Say in the notes that the repository at the tag is the corresponding source (AGPL), and that
   verification is SHA-256 over TLS rather than a signature (D58).
4. A test build is a **prerelease** and never reuses a real version number. GitHub's `latest`
   ignores prereleases, so Gear Lever and the update information will not offer it.

A release that renames the AppImage, publishes two matching AppImages, or omits the `.zsync` breaks
the update path even though the app itself still runs.

### Gear Lever and AppImageUpdate compatibility

An in-app update must not break the update channel the person chose when they installed. Gear
Lever's rules decide what that requires (read from its source, `mijorus/gearlever`):

- It integrates AppImages into `~/Applications`, writes a desktop entry whose `Exec` is that path,
  and **keys every per-app setting on `md5(file_path)`** (`ini_config.py`). Renaming the file orphans
  the person's settings and desktop entry, so the stable path and basename are mandatory, not
  cosmetic. Gear Lever's own replace-update keeps the old basename for the same reason.
- It decides whether an update is available by comparing the **local file's SHA-1 with the SHA-1 in
  the remote `.zsync`**, or its SHA-256 with the release asset's digest, falling back to file size
  (`GithubUpdater.is_update_available`). It does not parse versions. Therefore **the self-updater
  must install the published asset byte for byte**. A locally rebuilt or post-processed copy makes
  Gear Lever see a permanent mismatch and offer the same version forever.
- It reads the update information from the installed file with
  `readelf --string-dump=.upd_info` (`UpdateManagerChecker.check_app_embedded_url`). A build without
  `.upd_info` is not updateable by Gear Lever or AppImageUpdate at all, so every release we publish
  must embed it, and every file our self-updater installs must be such a release.
- It scans `~/Applications` for AppImages. Temporary or backup files must not use an `.appimage`
  name; a hidden temp without that suffix is invisible to it.
- It refuses to update while the app is running by comparing `ps -eo exe` with the path, which does
  match an AppImage's runtime process. Our own updater runs inside the app, so it replaces the file
  only after the old process has quit and never writes the running file.
- Never offer a channel Gear Lever does not follow. If an in-app update installs a test or preview
  build while `latest` still points at stable, Gear Lever will treat stable as an update and move
  the person back.

AppImageUpdate has no per-app state: it updates the file it is given and reads `.upd_info` from it,
so the same rules (stable path, published bytes, valid update information) cover it.

## Not done yet

- **Flatpak**: a later option. The same `AppDir` content can feed `flatpak-builder`; nothing is
  implemented.
- **Signing**: no signing key is configured (D58). A self-updater verifies the published SHA-256,
  which protects against a truncated or swapped download but not against a compromised release; a
  detached signature is the stronger form and is deferred with the updater.

*For the full documentation index, see [../README.md](../README.md).*
