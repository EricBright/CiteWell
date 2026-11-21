# LibreOffice integration

Status: **planning; not changed in the current branch.**

CiteWell inherits Zotero's LibreOffice integration wholesale: a LibreOffice Java
extension (OXT), a Zotero-side socket server, an installer, and the Cite pane UI.
It is a separate contract from translators and must be planned separately.

## Current state

| Part | Current behaviour |
|---|---|
| Extension | Prebuilt `Zotero_LibreOffice_Integration.oxt`, version `9.0.2.SOURCE` |
| Extension identity | `zoteroLibreOfficeIntegration@zotero.org`, display name "Zotero LibreOffice Integration" |
| CiteWell side | `zoteroLibreOfficeIntegration.mjs` starts a loopback socket on `127.0.0.1:23116`; `19876` is the old-version sentinel |
| Installer | `resource/installer.mjs` looks for native `unopkg` paths; bundled in the AppImage under `integration/libreoffice` |
| UI | Cite pane loads the installer; install wizard strings still say Zotero |
| Tests | None for install or end-to-end citation insertion |

The host has LibreOffice **26.8.3.1 Flatpak** and Java, but no native `unopkg`,
no LibreOffice SDK, and no `soffice` on `PATH`. The Flatpak exposes
`/app/libreoffice/program/unopkg`; it currently has no Zotero extension installed.

## Problems to solve

1. **Port collision.** Zotero also uses 23116. If both applications run, the
   extension talks to whichever process bound the port first, which could be
   the wrong library. 19876 is equally ambiguous.
2. **Identity collision.** The OXT has Zotero's extension id and display name.
   Installing CiteWell's copy can replace or confuse a Zotero installation.
3. **Flatpak installation.** The installer only knows native `unopkg` paths.
   The host's LibreOffice is Flatpak-only, so the current wizard cannot install.
4. **No rebuild path without a toolchain.** Changing the Java extension's port
   requires rebuilding `Zotero.jar`, which needs the LibreOffice SDK/UNO
   libraries. The SDK is not installed, and the project rule is not to install
   a new toolchain without explicit approval.
5. **No end-to-end test.** Nothing verifies that a CiteWell install can insert
   and refresh a citation in LibreOffice, or that an old Zotero extension is
   handled safely.

## Options

### A — Compatibility mode, no new toolchain (recommended first)

- Keep the prebuilt OXT and port 23116.
- Make the installer Flatpak-aware: use
  `flatpak run --command=/app/libreoffice/program/unopkg org.libreoffice.LibreOffice`
  with a path staged inside the Flatpak sandbox, and detect the Flatpak user
  profile.
- Add a preflight check: if 23116 is already bound, show which app owns it and
  refuse with a clear message rather than sending commands to the wrong app.
- Brand the installer/wizard text; keep the Java UI strings that cannot be
  changed without a rebuild.
- Document that CiteWell and Zotero must not both use LibreOffice integration
  at the same time.

This works on this host and gives a usable path, but it is not independent and
still shares the OXT id.

### B — CiteWell-specific OXT (long-term)

- Rebuild the Java OXT with a CiteWell extension id, display name and a
  different port (for example 23121), plus a CiteWell compatibility sentinel.
- Install it under a distinct id so CiteWell and Zotero can coexist.
- Requires the LibreOffice SDK/UNO build dependency and a reproducible OXT
  build. **Do not start this without owner approval for the toolchain.**

### C — Drop LibreOffice integration

Not recommended: inserting citations into LibreOffice is a core use of a
citation catalogue. This would be a product decision, not a cleanup.

## Test plan (before any host installation)

- Use an isolated LibreOffice user profile (`-env:UserInstallation=file:///tmp/...`)
  so the owner's real LibreOffice profile is never touched.
- Install the OXT through the Flatpak command, list it, then remove it.
- Start CiteWell on the test profile, insert a citation into a new Writer
  document, refresh it, and verify the bibliography updates.
- Run CiteWell and Zotero together and verify the port-conflict preflight fires.
- Confirm an existing Zotero OXT is not overwritten in compatibility mode; if
  it would be, stop and ask.
- Remove all test profiles and OXT copies through Trash.

## How this folds into the next task

Treat the next task as **external integration hardening**, with two tracks:

1. **Translators (first):** keep updates and Firefox/Google Docs working; add
   sandbox, permissions, integrity and rollback.
2. **LibreOffice (second):** implement option A without a new toolchain; keep
   option B as a separate decision once the SDK question is answered.

Do not mix the two in one code change. They share a threat model and a test
strategy, not an implementation.

## Decisions needed

1. May the LibreOffice SDK/UNO dependencies be installed to build a
   CiteWell-specific OXT? Until approved, only option A is allowed.
2. Should the extension identity be changed in compatibility mode (possible by
   repacking `description.xml`), or left as Zotero's until option B?
3. Is a hard refusal when 23116 is already owned acceptable, or should CiteWell
   offer to stop/wait?

*For the full documentation index, see [../README.md](../README.md).*
