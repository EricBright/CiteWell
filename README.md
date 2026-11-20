# CiteWell

CiteWell is a fork of [Zotero](https://github.com/zotero/zotero), the free research manager
for collecting, organizing, annotating, citing, and sharing sources. It keeps Zotero's engine,
data model, and workflow, and changes the interface — icons, layout, and interaction details —
for a cleaner working environment.

CiteWell is an independent project. It is not produced, endorsed, or supported by the Zotero
project or the Corporation for Digital Scholarship, and it is not the place to report Zotero
bugs.

## Status

| Field | Value |
|---|---|
| Branch | `citewell` |
| Base | Zotero 10.0, upstream `864b2d47e` |
| Version string | `10.0.9.SOURCE.864b2d47e` |
| Build verified | Linux dev build, 2026-11-20 |
| Platform | Linux x86_64, AppImage only |

What is being worked on, and what is deliberately out of scope: [roadmap.md](roadmap.md).

## Quick start

Requirements: Node 18 or later, [Git LFS](https://git-lfs.com/), and the platform tools listed
in [app/README.md](app/README.md).

```bash
git clone --recursive https://github.com/EricBright/CiteWell
cd CiteWell
npm i
app/scripts/build_and_run      # build, then launch with debug output and the error console
```

While developing, run `npm start` in a second terminal to rebuild JS and Sass on save, then
`app/scripts/build_and_run -n` to relaunch without rebuilding. Tests run inside a built app:
`test/runtests.sh`, optionally with a test name to run a single file. Build output lands in
`app/staging/`, and the staged app can be launched directly.

## Repository map

| Path | Contents |
|---|---|
| `chrome/` | Application UI: XUL/XHTML windows, custom elements, React components, XPCOM modules |
| `resource/` | Third-party JS and runtime resources bundled into the app |
| `scss/` | Styles, compiled to CSS during the build |
| `js-build/` | Babel, Sass, and browserify build pipeline |
| `app/` | Packaging, platform runtimes, icons, installers |
| `test/` | Mocha/Chai tests and support code |
| `docs/` | On-demand documentation, indexed below |
| `tools/` | CiteWell tooling, written in Rust |

## Documentation index

`README.md` is the only always-tier document for humans: it is read at the start of every
session and held to a word budget by `tools/docs-check`. Everything else is on-demand — read it
to answer one question, not to get oriented.

| File | Tier | Read it when | Purpose |
|---|---|---|---|
| `README.md` | always | starting any session | Identity, commands, repository map, this index |
| `AGENTS.md` | always | working as an AI agent | Agent contract: language rule, naming invariant, doc rules |
| `roadmap.md` | on-demand | choosing what to work on | Now / Next / Later, not-doing, exit criteria |
| `docs/status.md` | on-demand | resuming after a break or a context reset | Current state, pick-up list, commands, pitfalls |
| `NOTICE` | once | redistributing, or asking about attribution | Fork statement, copyright, trademark |
| `COPYING` | once | legal questions | Full AGPL-3.0 text |
| `docs/naming.md` | on-demand | touching a name, id, path, or URL | What is CiteWell, what must stay `zotero` |
| `docs/sync.md` | on-demand | before or after a merge from upstream | Branch model, merge and submodule procedure |
| `docs/branding.md` | on-demand | changing titles, icons, installer, or channel | Where each piece of branding lives |
| `docs/decisions.md` | on-demand | asking why something is the way it is | Decision records and dead ends |
| `docs/rust.md` | on-demand | before choosing a language or a dependency | Where Rust may land, crates, UI exemption |
| `docs/packaging.md` | on-demand | building or shipping a release | Linux AppImage pipeline, prerequisites, limits |
| `docs/connectors.md` | on-demand | changing the browser connector | Import, patch list, XPI build, rebranding gaps |
| `docs/export.md` | on-demand | planning or running a vault export | Obsidian/Markdown export design and safety rules |
| `CLAUDE.md` | on-demand | needing upstream architecture detail | Zotero's own guide, kept verbatim |

## License

CiteWell is distributed under the GNU Affero General Public License, version 3 or later. The
full text is in `COPYING`; attribution, modification notices, and the trademark disclaimer are
in `NOTICE`. "Zotero" and the Zotero logo are registered trademarks of the Corporation for
Digital Scholarship, and the name is used here only to describe the origin of this software.

## Reporting

Bugs, questions, and feature ideas for CiteWell: [open an issue](https://github.com/EricBright/CiteWell/issues).
Bugs in upstream Zotero belong in the [Zotero forums](https://forums.zotero.org/), not here.
