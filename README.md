# CiteWell

CiteWell is a citation catalogue built on [Zotero](https://github.com/zotero/zotero)'s engine
and data model for citation work. PDF reading, annotation, and note editing are left to desktop
tools; CiteWell owns the catalogue.

CiteWell is independent, not produced or endorsed by Zotero project or Corporation for Digital
Scholarship, and is not the place to report Zotero bugs.

## Status

| Field | Value |
|---|---|
| Branch | `citewell` |
| Base | Zotero 10.0, upstream `864b2d47e` |
| Version string | `10.0.9.SOURCE.cf3e2382a` |
| Build verified | Linux dev build, 2026-11-25 |
| Platform | Linux x86_64, AppImage only |

Work in progress and scope: [roadmap.md](roadmap.md).

## Quick start

Requirements: Rust, [Git LFS](https://git-lfs.com/), and the tools in
[app/README.md](app/README.md). Node is not needed to build; npm is retired (D32).

```bash
git clone --recursive https://github.com/EricBright/CiteWell
cd CiteWell
app/scripts/build_and_run      # build and launch with debug output
```

No JS watcher; rerun `cargo run --manifest-path tools/Cargo.toml -p xtask -- build`
after source changes. Tests run in a built app: `test/runtests.sh`. Output lands in
`app/staging/`.

## Repository map

| Path | Contents |
|---|---|
| `chrome/` | Application UI and XPCOM |
| `resource/` | Bundled runtime resources |
| `scss/` | Styles, compiled to CSS during the build |
| `app/` | Packaging and platform runtimes |
| `test/` | Tests and support code |
| `docs/` | On-demand documentation (`research/` is archival) |
| `tools/` | Rust tooling |

## Documentation index

`README.md` and `AGENTS.md` are always-tier, read every session, with word budgets checked by
`tools/docs-check`. Everything else is on-demand.

| File | Tier | Read it when | Purpose |
|---|---|---|---|
| `README.md` | always | starting any session | Identity, commands, repository map, this index |
| `AGENTS.md` | always | working as an AI agent | Agent contract: language rule, naming invariant, doc rules |
| `roadmap.md` | on-demand | choosing what to work on | Now / Next / Later, not-doing, exit criteria |
| `docs/status.md` | on-demand | resuming after a break | Current state, next work, pitfalls |
| `NOTICE` | once | redistributing, or asking about attribution | Fork statement, copyright, trademark |
| `COPYING` | once | legal questions | Full AGPL-3.0 text |
| `docs/naming.md` | on-demand | touching a name, id, path, or URL | What is CiteWell, what must stay `zotero` |
| `docs/sync.md` | on-demand | relating CiteWell to upstream | Branch model; upstream is reference only |
| `docs/branding.md` | on-demand | titles, icons, installer, channel | Where each piece of branding lives |
| `docs/decisions.md` | on-demand | asking why something is | Decision records and dead ends |
| `docs/ublock-spike.md` | on-demand | Browse content blocking | R38 spike |
| `docs/rust.md` | on-demand | choosing a language or dependency | Where Rust may land, crates, UI exemption |
| `docs/packaging.md` | on-demand | building or shipping a release | Linux AppImage pipeline, prerequisites, limits |
| `docs/connectors.md` | on-demand | the retired browser connector | Retirement record, 23119 listener |
| `docs/export.md` | on-demand | planning a vault export | Obsidian/Markdown export design and safety rules |
| `docs/cli.md` | on-demand | agents and scripting | `citewell` CLI, local API, write authorization |
| `docs/agent.md` | on-demand | the agent bridge and MCP tools | `/agent/v1`, verb surface, token model, phases |
| `docs/libreoffice.md` | on-demand | working on LibreOffice integration | OXT, protocol, citation, Flatpak safety |
| `docs/libreoffice-parity.md` | on-demand | building or repairing the LibreOffice adapter | Parity scope, protocol, invariants |
| `docs/why-citewell.md` | on-demand | deciding whether CiteWell fits | Selling points and honest trade-offs |
| `docs/attention.md` | on-demand | changing dialogs, activation, or notifications | Attention contract, escalation, tests |
| `docs/import.md` | on-demand | importing a Zotero library or changing data paths | Isolation, adopt-copy, merge rules |
| `docs/notes.md` | on-demand | changing notes or the editor | File-backed Markdown notes and migration |
| `docs/settings.md` | on-demand | reorganizing settings or adding a pane | Inventory, target tabs, registry rules |
| `docs/ui.md` | on-demand | UI copy, layout, interaction | Rules and their tests |
| `docs/kde-hig-audit.md` | on-demand | UI polish decisions | HIG conformance |
| `CLAUDE.md` | on-demand | needing upstream architecture detail | Zotero's own guide, kept verbatim |

## License

CiteWell is distributed under the GNU Affero General Public License, version 3 or later. The
full text is in `COPYING`; attribution, modification notices, and the trademark disclaimer are
in `NOTICE`. "Zotero" and the Zotero logo are registered trademarks of the Corporation for
Digital Scholarship, and the name is used here only to describe the origin of this software.

## Reporting

Bugs, questions, and feature ideas for CiteWell: [open an issue](https://github.com/EricBright/CiteWell/issues).
Bugs in upstream Zotero belong in the [Zotero forums](https://forums.zotero.org/), not here.
