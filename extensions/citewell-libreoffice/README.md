# CiteWell LibreOffice integration

Status: **scaffold; OXT builds and installs, dispatch activation still under test.**

This is the CiteWell-owned extension boundary. It uses LibreOffice's Python UNO
loader, has CiteWell's extension id and talks only to `127.0.0.1:23121`.

## Identity

- id: `citewell-libreoffice-integration@sophy.ca`
- display name: CiteWell LibreOffice Integration
- health URL: `http://127.0.0.1:23121/health`
- no Zotero id, port 23116 or 19876

## Build and install

```bash
python3 extensions/citewell-libreoffice/tools/build.py
```

The OXT is written to `extensions/citewell-libreoffice/build/CiteWell_LibreOffice_Integration.oxt`.
Use an isolated LibreOffice profile, never the owner's real profile:

```bash
flatpak run --command=/app/libreoffice/program/unopkg org.libreoffice.LibreOffice \
  add -f -env:UserInstallation=file:///tmp/citewell-lo-profile \
  extensions/citewell-libreoffice/build/CiteWell_LibreOffice_Integration.oxt
```

The Flatpak's `unopkg` is only reachable through `flatpak run`; a native
`unopkg` is not installed on this host.

## Attribution

The build and lab patterns are adapted, with the owner's permission, from the
owner's **Zarnegar** LibreOffice extension, which is licensed
AGPL-3.0-or-later. The CiteWell code here is also AGPL-3.0-or-later.

## Current blocker

On the current LibreOffice 26.8.3.1 Flatpak, the Python UNO loader accepts the
OXT and lists it as installed. A remote UNO client that asks for the component
service causes the URP bridge to be disposed, so menu dispatch has not been
verified yet. This is the next debugging step before citation insertion.

The inherited Zotero integration is disabled and no longer packaged; see
[docs/libreoffice.md](../../docs/libreoffice.md).
