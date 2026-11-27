# CiteWell

**A citation catalogue for people who already have somewhere to read and write.**

CiteWell keeps the hard part of reference management — the catalogue, the metadata, the translators,
the citation styles — and leaves the rest to the tools you already use. PDFs open in your reader.
Notes are Markdown files. Writing happens in Word, LibreOffice, LaTeX or Markdown. CiteWell holds
the library and makes the citations work.

It is built on [Zotero](https://github.com/zotero/zotero)'s engine and data model, under the
AGPL-3.0. It is an independent fork, not produced or endorsed by the Zotero project or the
Corporation for Digital Scholarship, and it is not the place to report Zotero bugs.

## Why another citation manager?

Because the alternative is a research workspace that keeps growing: a PDF engine, an annotation
layer, a note editor, a plugin runtime, a sync service. Each one is a surface to maintain, secure
and explain. CiteWell makes the opposite bet: one catalogue, done well, with clean exits to
everything else.

That bet shows up in everyday use. Your library is SQLite and files on disk. A note is a `.md`
attachment you can read, diff and grep. Export is a documented path, not a hostage negotiation.
Automation is a supported interface with a CLI, a local API and an audit trail, not screen-scraping.
And when an operation needs your attention, the prompt comes to you instead of waiting behind
another window.

## What you get

- **A catalogue that is the product.** Items, collections, tags, attachments, translators, CSL
  styles and citation output, without the workspace around them.
- **Markdown notes.** Notes are `.md` files in the item's folder. Legacy notes migrate once; the
  in-app view is read-only because editing belongs to your editor.
- **Agent access as a first-class surface.** A token-authenticated local API, a `citewell` CLI and
  MCP tools expose items, collections, search, translators, notes, export and UI selection. Every
  call is audited and there are no destructive verbs.
- **LibreOffice integration without Java.** A small Python UNO shim uses the runtime LibreOffice
  already ships. No JDK, no SDK, no JVM component to patch.
- **One AppImage.** A self-contained Linux binary with its own profile and data directory, so it
  never reads or writes a Zotero installation and can sit beside it without sharing a port or
  profile.
- **Migration that asks.** Importing, merging and deduplicating are reviewable operations: the
  source is copied and hashed, counts are shown before the action, and ambiguous duplicates are
  reported rather than guessed.
- **A small supply chain.** No npm tree, no Node build, no Java runtime, no PDF.js. Sass is compiled
  by a Rust tool; React, Monaco and the rest are vendored. Fewer dependencies to track, and a build
  one person can reproduce.

## What it does not do

No PDF viewer, annotation tools, in-app note editor or plugin runtime. No online sync,
collaboration, mobile app, Windows or macOS build. CiteWell is deliberately smaller than Zotero;
[why-citewell.md](docs/why-citewell.md) explains each trade and what it costs.

## Install

Download the latest AppImage from
[Releases](https://github.com/EricBright/CiteWell/releases/latest), make it executable, and run it:

```bash
chmod +x CiteWell-x86_64.AppImage
./CiteWell-x86_64.AppImage
```

Linux x86-64 only, glibc 2.34 or newer. Replace the file to update, or use Gear Lever or the in-app
updater; all three use the same path. CiteWell keeps its own profile and data directory, so your
first launch starts a fresh library. Importing an existing Zotero library is built in.

## Status

CiteWell is usable and in active development. The current scope and the next work are in
[roadmap.md](roadmap.md); what is shipped today is in [status.md](docs/status.md); the latest
version is whatever [Releases](https://github.com/EricBright/CiteWell/releases/latest) says.

The short version: Linux, one user, a catalogue and citation pipeline that work, agent access and
LibreOffice integration in place, and no online services. No sync means no account and no cloud
dependency; it also means one machine.

## Documentation

- [Why CiteWell](docs/why-citewell.md) — the full case, the selling points and the trade-offs.
- [Documentation index](docs/index.md) — every document, grouped by task.
- [Decisions](docs/decisions.md) — why each choice was made, including the abandoned ones.
- [Status](docs/status.md) — current state and resumption notes.
- [Roadmap](roadmap.md) — what is next, and what is deliberately not planned.

## For developers and agents

Building from source needs Rust and Git LFS; Node is not required. Start with
[docs/agent-context.md](docs/agent-context.md) for commands, the repository map and current state,
and [AGENTS.md](AGENTS.md) for the rules a change must not break.

## License and reporting

CiteWell is distributed under the GNU Affero General Public License, version 3 or later. The full
text is in `COPYING`; attribution, modification notices and the trademark disclaimer are in
`NOTICE`. “Zotero” and the Zotero logo are trademarks of the Corporation for Digital Scholarship,
used here only to describe the origin of this software.

Bugs, questions and feature ideas for CiteWell:
[open an issue](https://github.com/EricBright/CiteWell/issues). Bugs in upstream Zotero belong in
the [Zotero forums](https://forums.zotero.org/), not here.
