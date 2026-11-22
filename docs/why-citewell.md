# Why CiteWell

CiteWell is a citation catalogue for people who already have somewhere to read and write. It keeps
Zotero's engine, data model, translators and citation styles, and drops the parts that make Zotero a
research workspace: the PDF reader, the annotation tools, the note editor and the plugin runtime.
What remains is the part that is hard to replace — the catalogue and the citation pipeline — with a
smaller surface to maintain, audit and trust.

This page records the product decisions behind that trade so a future reader can decide whether
CiteWell fits. It describes commitments, not a changelog; [status.md](status.md) says what is
shipped today.

**In one sentence:** CiteWell keeps Zotero's catalogue and citation engine, replaces the research
workspace with the tools you already use, and treats automation and repairability as design goals.

## Who it is for

- You read PDFs in a dedicated reader and write in Markdown, LaTeX, Word, LibreOffice or Google Docs.
- You want one catalogue, portable data, and citations that work in the tools you already use.
- You automate literature work with scripts or an agent and want a documented local API.
- You are on Linux and prefer one AppImage to a system-wide installation.

## Who it is not for

- You want PDF annotation, in-app note editing, or Zotero plugins.
- You need multi-device sync, collaboration, or a mobile app.
- You are on Windows or macOS.
- You want the largest possible extension ecosystem and community support.

## What stays from Zotero

- The engine and SQLite schema, so an existing library can be imported.
- Translators, with their update channel intact (D33).
- CSL styles and locales.
- The Firefox connector and the Google Docs integration; the sync-dependent parts of Google Docs
  remain gated.

## The selling points

### 1. The catalogue is the product

No PDF viewer, no annotation layer, no full-text PDF index, no note editor, no plugin runtime. PDFs
open in your reader; notes are files. The app does one job, and every removed surface is one less
thing to break, secure and maintain (D28, D30, D31).

### 2. Notes are Markdown files

Notes are `.md` attachments in the item's storage folder. They are readable, diffable, greppable
and portable — no export step, no database lock-in. Legacy notes migrate once; the
editor is a read-only view because editing belongs to your text editor ([notes.md](notes.md)).

### 3. Agent access is a first-class surface

`/agent/v1` exposes items, collections, translators, attachments, notes, search, export and UI
selection over a local, token-authenticated API. A `citewell` CLI and 17 MCP tools make it usable
from an agent; every call is audited and there are no destructive verbs. This is automation as a
supported feature, not screen-scraping ([agent.md](agent.md), [cli.md](cli.md)).

### 4. LibreOffice integration without Java

The CiteWell extension is a Python UNO shim that uses the runtime LibreOffice already ships. The
extension needs no JDK, no LibreOffice SDK, no Jackson and no JNA; the OXT is built with Python's
`zipfile` and ships inside the AppImage. The shim is a replaceable leaf behind a small, versioned
protocol, so a LibreOffice change is patched in one layer instead of inside a JVM component. The
parity release adds a private, authenticated local connection, a versioned handshake and a size
limit on messages ([libreoffice-parity.md](libreoffice-parity.md), D34–D36).

### 5. Safety rules that survive mistakes

The LibreOffice installer is add-only: it never removes, repairs or rewrites another extension or
the profile. Deletions go to Trash, never `rm`. External profiles are treated as append-only. Tests
use an isolated profile and data directory, and the test suite refuses to touch the real library.
These are rules in the repository, not intentions (D26, D35).

### 6. A deliberately small supply chain

npm is retired and the dependency tree is frozen; the LibreOffice extension has no third-party
Python packages; the Rust helpers are std-only where possible; there is no Java runtime and no
PDF.js. A smaller dependency and parser surface means fewer CVEs to track and a build one person can
still reproduce (D32, [rust.md](rust.md)).

### 7. Linux-native, one file

A single AppImage with its own profile, data directory and port, so CiteWell never reads or writes
a Zotero installation and can sit next to it without sharing a profile, port or extension id. No
system packages, no system-wide service, no online account (D19).

### 8. Your data stays inspectable

SQLite plus files on disk, a documented export path, and local reads that need no account. Online
sync is off in this build; the code remains but is not a supported path ([export.md](export.md)).

### 9. Built to be repaired

Two small contracts — the wire protocol and the UNO surface — carry the whole integration. A
versioned handshake names the app, shim and LibreOffice versions; a self-test reports the last
error; one log line per frame makes a user report replayable. A security fix touches one file, and
a LibreOffice quirk is isolated to the document layer. Citation semantics travel as data, so new
citation features do not touch the shim at all ([libreoffice-parity.md](libreoffice-parity.md)).

### 10. Waiting is never invisible

While teaching at CDI College, I watched the citation workflow fail in the worst possible way: the
prompt opened behind the browser or LibreOffice, while the visible window said “Please wait…”. A
student who did not know the prompt was behind the active window had no reason to press Alt-Tab and
no way to discover that the application was waiting for them. The lesson was not to add another
spinner. It was that an invisible prompt is a broken prompt.

CiteWell treats attention as part of the integration contract. A dialog that needs a person is
parented and brought forward; if the compositor refuses activation, the app escalates visibly
through taskbar urgency, a native notification with a click-to-focus action, or a LibreOffice
InfoBar, and changes its title and message to say what happened and what to do next. Background
progress never leaves a hidden modal window, and no operation ends in an indefinite “Please wait…”.
We cannot force every Wayland compositor to raise a window; we can guarantee that the user is never
left guessing where it is. The implementation is recorded in [attention.md](attention.md).

## What you give up

- Sync, collaboration and mobile: not supported; the code is present but disabled.
- PDF annotation and in-app note editing: intentionally removed.
- Plugins: parked, not removed; they do not run.
- Windows and macOS: not built.
- Zotero's community, support and release cadence: this is an independent fork.

## What we do not claim

- **Not faster.** Citation latency is dominated by citeproc and LibreOffice's RTF import, not by the
  implementation language.
- **Not more featureful.** Zotero has more features; CiteWell chooses fewer on purpose.
- **Not a drop-in replacement.** It is a different product for a narrower job, and the import path
  is explicit rather than automatic.

## Zotero or CiteWell?

| If you… | Choose |
|---|---|
| annotate PDFs inside your reference manager | Zotero |
| need sync across devices | Zotero |
| depend on plugins | Zotero |
| write in Word, LibreOffice, Google Docs or LaTeX | either; CiteWell adds file notes and agent access |
| want notes as Markdown files | CiteWell |
| automate with scripts or an LLM | CiteWell |
| want LibreOffice citing with no Java | CiteWell |
| run Linux and want one AppImage | CiteWell |

## Independence and license

CiteWell is an independent fork of Zotero's engine, not produced, endorsed or supported by the
Zotero project or the Corporation for Digital Scholarship. It is AGPL-3.0-or-later; attribution and
trademark notes are in `NOTICE`. Zotero bugs belong upstream; CiteWell bugs belong here.

*For the full documentation index, see [../README.md](../README.md).*
