# LibreOffice integration

Status: **M5 passed 2026-11-22; the parity rewrite is complete.** The inherited Zotero integration is
disabled and removed from packaging. The CiteWell OXT installs, its menu dispatches, and it inserts
a selected item's APA citation in an isolated Writer profile — a placeholder, not the target. The
target is feature parity with Zotero's LibreOffice menu through CiteWell's own adapter:
[libreoffice-parity.md](libreoffice-parity.md). Companion to [decisions.md](decisions.md) D34–D36.

## Identity and transport

CiteWell owns this integration. The target contract is:

| Surface | CiteWell value |
|---|---|
| Extension id | `citewell-libreoffice-integration@sophy.ca` |
| Display name | CiteWell LibreOffice Integration |
| CiteWell socket | `127.0.0.1:23121` |
| Compatibility sentinel | `127.0.0.1:19877` |
| Update metadata | CiteWell-owned; never a Zotero URL |
| Installer | Flatpak-aware and add-only (D35); test in an isolated profile |

The inherited values — id `zoteroLibreOfficeIntegration@zotero.org`, name “Zotero
LibreOffice Integration”, port `23116`, sentinel `19876` — are rejected. Sharing them can
send commands to Zotero or replace Zotero’s extension.

Until a CiteWell extension exists, the inherited OXT is not offered for installation and is no
longer packaged by the Linux build. LibreOffice integration is disabled until the CiteWell OXT
ships.

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

Rust can own the integration logic, but **pure Rust is not currently a supported
LibreOffice extension model**.

- LibreOffice ships an official **Rust UNO binding**, `rust_uno`, in the 26.x tree.
  It generates typed wrappers over a C++ UNO bridge. The guide says it is built
  **in-tree**: enable `--enable-rust-uno`, build `codemaker`, build `rust_uno`, then
  build LibreOffice. It is not a standalone `cargo add` dependency.
- The official **Rust UNO example extension is not pure Rust**. Its component factory
  and UNO interfaces are C++ (`example.cxx`, `cppu::WeakImplHelper2`), the Rust
  library is called through a C++ hook, and the OXT still uses
  `com.sun.star.loader.SharedLibrary`. The Rust binding is excellent for logic and
  automation; it is not yet a component framework.
- A native `.so` must match LibreOffice's UNO ABI and the installed version. The Flatpak
  runtime has `libuno_*`, but no SDK headers or IDL-generated headers.
- Writing the UNO C++ ABI by hand in Rust would be unsafe, version-specific and far more
  work than a tiny C++ shim. It is not recommended.
- Flatpak LibreOffice has shared network and home access, so a local socket to CiteWell
  is possible. Python UNO also works inside the sandbox
  (`PYTHONPATH=/app/libreoffice/program python3 -c 'import uno'`).

The practical choices are therefore:

| Path | Rust role | Extra boundary | Toolchain |
|---|---|---|---|
| A | Core + document protocol | Minimal C++ UNO shim | LibreOffice SDK + g++ |
| B | Core + document protocol | Python UNO shim | None (Python is in LO) |
| C | Entire component | Hand-written UNO ABI | None, but unsafe and large |

## Options

### A — Rust core + minimal C++ UNO shim (closest to Rust)

- Rust implements the CiteWell protocol, citation state and formatting.
- A small C++ component wrapper implements only the UNO factory, service info and the
  Writer dispatch/document calls, then calls into Rust through a C ABI.
- No Java, no Python. Uses the official `rust_uno` binding where it helps, or plain C
  ABI functions for the narrow shim boundary.
- Requires the LibreOffice SDK/UNO headers and g++ (g++ is present; the SDK is not).
- New OXT id/name, port 23121, sentinel 19877.
- The C++ shim is the price of admission; it must be reviewed and kept tiny.

### B — Rust core + Python UNO shim (selected)

- The OXT contains Python UNO code and the Rust core sidecar or local service.
- Python only translates Writer document operations into the CiteWell protocol;
  citation formatting, state and storage stay in Rust/CiteWell.
- No Java and no LibreOffice SDK. Uses the Python/UNO runtime already inside the
  Flatpak, following the working Zarnegar OXT lab pattern.
- Still a non-Rust shim and a second runtime at the extension boundary.
- Best first implementation if the SDK is not approved; it can be replaced by A
  behind the same protocol.

### C — Pure Rust component through a hand-written UNO ABI

- Rejected for now: implementing the C++ vtable/UNO factory ABI by hand in Rust is
  unsafe, version-fragile and a large research project. It does not remove the ABI
  boundary; it only moves it into Rust.

### D — Shared Zotero extension

Rejected by D34. It is convenient, but it breaks identity, can replace Zotero's
extension, and can route commands to the wrong library.

## Current implementation

`extensions/citewell-libreoffice/` contains the CiteWell-owned OXT:

- id `citewell-libreoffice-integration@sophy.ca`, version `0.1.0`;
- `components.xml` with a Python UNO provider and a six-item Addons menu;
- `ProtocolHandler.xcu` mapping `vnd.citewell.*` to that provider;
- Python shim modules (`citewell_lo`, `citewell_comm`, `citewell_doc`,
  `citewell_protocol`) with no third-party packages;
- `build.py`, which builds the OXT with Python's `zipfile`.

The app hosts the protocol on `127.0.0.1:23121` and checks `<data-dir>/lo-token`;
the shim connects, authenticates, serves document commands and posts menu
events. The OXT is packaged in the AppImage under `integration/libreoffice/`;
Cite preferences offers the add-only Flatpak install (D35).

Verified in isolated Writer profiles: insert, edit and cancel through the
citation dialog; two-item citations with locators; APA → Chicago author-date
switching; a 100-field refresh; Unlink that keeps the text; an APA bibliography
with paragraph styling; Add Note footnotes; a citation inside a table cell; conversion
between in-text and footnote/endnote fields when preferences change; and save/reopen for all of
them. `vnd.citewell.health:` runs the transport and field
selftest. The real profile has not been touched.

Known gaps: the citation explorer was not exercised, the undo context and save
listener are not ported, and the interactive Unlink confirmation still needs a
manual check (the selftest harness auto-confirms it).

## Test plan

Use an isolated LibreOffice profile, never the owner’s real one:

- `-env:UserInstallation=file:///tmp/citewell-lo-profile` or the Flatpak equivalent.
- Install with
  `flatpak run --command=/app/libreoffice/program/unopkg org.libreoffice.LibreOffice add <oxt>`.
- List, insert a citation, refresh, and remove; verify the real profile is unchanged.
- Run CiteWell and Zotero together; verify port 23121 is CiteWell-only and the
  old 23116 path is not used.
- Remove test profiles and OXT copies through Trash.

## Decisions

1. **Option B, then superseded by D36.** No LibreOffice SDK and no new dependencies; the Python
   UNO shim is the adapter, but the protocol now lives in the app rather than in a Rust relay.
   Option A (C++ shim) remains a drop-in replacement behind the same protocol; option C is
   rejected.
2. The inherited OXT is not offered for installation and is no longer packaged.
3. A bound 23121 fails closed with a message; there is no fallback port and no silent mode switch.
4. Every install is add-only (D35); repair is a reinstall, never profile surgery.

The execution plan, command surface, security contract and milestones are in
[libreoffice-parity.md](libreoffice-parity.md).

*For the full documentation index, see [../README.md](../README.md).*
