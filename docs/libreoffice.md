# LibreOffice integration

Status: **planning. The inherited Zotero integration is not the target and must not be
installed by CiteWell.** Companion to [decisions.md](decisions.md) D34.

## Identity and transport

CiteWell owns this integration. The target contract is:

| Surface | CiteWell value |
|---|---|
| Extension id | `citewell-libreoffice-integration@sophy.ca` |
| Display name | CiteWell LibreOffice Integration |
| CiteWell socket | `127.0.0.1:23121` |
| Compatibility sentinel | `127.0.0.1:19877` |
| Update metadata | CiteWell-owned; never a Zotero URL |
| Installer | Flatpak-aware, with an isolated-profile test path |

The inherited values — id `zoteroLibreOfficeIntegration@zotero.org`, name “Zotero
LibreOffice Integration”, port `23116`, sentinel `19876` — are rejected. Sharing them can
send commands to Zotero or replace Zotero’s extension.

Until a CiteWell extension exists, the inherited OXT must not be offered for installation.
The current build still bundles it; removing or disabling that path is part of the migration.

## What the inherited integration does

- The OXT is a LibreOffice Java/UNO component (`Zotero.jar`), not a Basic macro.
- The CiteWell side starts a loopback socket (`zoteroLibreOfficeIntegration.mjs`) and
  translates document commands into Zotero’s integration protocol.
- The installer looks for native `unopkg` paths and an OXT inside the app.
- The OXT manifest declares `application/vnd.sun.star.uno-component;type=Java`.

The host has LibreOffice **26.8.3.1 Flatpak**. Its `unopkg` is
`/app/libreoffice/program/unopkg`, reachable with
`flatpak run --command=/app/libreoffice/program/unopkg org.libreoffice.LibreOffice`.
There is no native `unopkg` on `PATH`, no LibreOffice SDK in the Flatpak, and no
`soffice` binary on the host path. Java is present, but the extension’s Java build is
not a path this project wants to keep.

## Existing Python UNO prior art

`/run/media/eric/RedDragon/AI_related/Cherry_Backups/2nd_claw/zarnegar/libreoffice-extension`
is a working LibreOffice extension for a different application. It is not CiteWell code and
must not be copied into this repository, but it proves the relevant mechanics on this host:

- a self-contained OXT using `com.sun.star.loader.Python`;
- `components.xml`, `types`/`filters` registration and a tiny `unopkg` build;
- a Flatpak lab that creates disposable LibreOffice profiles and installs with
  `/app/libreoffice/program/unopkg add -env:UserInstallation=...`;
- a free-port UNO accept socket for tests, avoiding a collision with the user's open office;
- no third-party Python packages and no Java.

That is a viable pattern for a CiteWell **Python UNO shim**. It does not make the extension
Rust; the Rust core would sit behind the shim.

## Rust investigation

Rust is technically viable, with an important build caveat.

- LibreOffice ships an official **Rust UNO binding**, `rust_uno`, in the 26.x tree.
  It generates typed wrappers over a C++ UNO bridge and supports native components.
  The user guide says it is built **in-tree**: enable `--enable-rust-uno`, build
  `codemaker`, build `rust_uno`, then build LibreOffice. It is not a standalone
  `cargo add` dependency.
- The C++ bridge still needs LibreOffice headers/UNO libraries and a C++ compiler.
  The Flatpak runtime has `libuno_*` and `libpyuno`, but no SDK headers.
- A native Rust `.so` can be loaded as a `com.sun.star.loader.SharedLibrary`
  component, but only if its UNO ABI and generated interface wrappers match the
  installed LibreOffice version.
- Flatpak LibreOffice has shared network and home access, so a local socket to
  CiteWell is possible.

Consequences:

1. **Pure Rust native extension now** would require a LibreOffice SDK/build
   environment or a vendored, version-matched generated bridge. That is a new
   toolchain/dependency decision, not a small refactor.
2. **Rust core + thin Python UNO shim** is feasible today: the Flatpak includes
   `uno.py` and `pyuno.so`; `PYTHONPATH=/app/libreoffice/program python3 -c 'import uno'`
   works inside the sandbox. The Python shim would manipulate the Writer document;
   the Rust core would own the CiteWell protocol and logic. This removes Java but
   is not a pure-Rust extension.
3. **A Rust sidecar driving LibreOffice over a UNO remote connection** avoids an
   OXT but still needs UNO bindings and sacrifices the normal toolbar/menu
   integration. It is a fallback, not the first choice.

## Options

### A — Native Rust UNO component (target)

- Vendor or build the `rust_uno` generated bridge for the installed LibreOffice
  version; implement the CiteWell component in Rust.
- New OXT id/name, port 23121, sentinel 19877; no Java.
- Requires owner approval for the LibreOffice build/SDK dependency and a
  reproducible, version-pinned bridge.
- Highest long-term fit; highest setup cost and ABI risk.

### B — Rust core + Python UNO shim (feasible interim)

- The OXT contains Python UNO code and the Rust core sidecar or local service.
- Python only translates Writer document operations into the CiteWell protocol;
  citation formatting, state and storage stay in Rust/CiteWell.
- No Java and no LibreOffice SDK. Uses the Python/UNO runtime already inside the
  Flatpak, following the working Zarnegar OXT lab pattern.
- Still a non-Rust shim and a second runtime at the extension boundary.
- Best first implementation if the SDK is not approved; it can be replaced by A
  behind the same protocol.

### C — Shared Zotero extension

Rejected by D34. It is convenient, but it breaks identity, can replace Zotero’s
extension, and can route commands to the wrong library.

## Test plan

Use an isolated LibreOffice profile, never the owner’s real one:

- `-env:UserInstallation=file:///tmp/citewell-lo-profile` or the Flatpak equivalent.
- Install with
  `flatpak run --command=/app/libreoffice/program/unopkg org.libreoffice.LibreOffice add <oxt>`.
- List, insert a citation, refresh, and remove; verify the real profile is unchanged.
- Run CiteWell and Zotero together; verify port 23121 is CiteWell-only and the
  old 23116 path is not used.
- Remove test profiles and OXT copies through Trash.

## Decisions needed

1. Approve the LibreOffice SDK/build dependency for option A, or accept option B as
   the interim path?
2. Should the inherited OXT be removed from packaging now, so it cannot be
   installed by accident while the replacement is built?
3. Is a hard refusal when 23121 is already bound acceptable?

*For the full documentation index, see [../README.md](../README.md).*
