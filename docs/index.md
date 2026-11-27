# Documentation

CiteWell's documentation, grouped by what you are trying to do. Start with the README if you are
new; start with the agent context if you are working in the repository.

## Documentation index

### Start here

| File | Read it when | Purpose |
|---|---|---|
| `README.md` | first visit | What CiteWell is, install, features and limits |
| `docs/why-citewell.md` | deciding whether CiteWell fits | Full selling points and trade-offs |
| `roadmap.md` | choosing what to work on | Now / Next / Later, not-doing, exit criteria |
| `docs/status.md` | resuming after a break | Current state, next work, pitfalls |

### Working in the repository

| File | Read it when | Purpose |
|---|---|---|
| `AGENTS.md` | working as an AI agent | Agent contract and hard rules |
| `docs/agent-context.md` | starting any session | Build, test, repository map, state |
| `docs/packaging.md` | building or shipping a release | AppImage pipeline, prerequisites |
| `docs/rust.md` | choosing a language or dependency | Where Rust may land, crates |
| `docs/sync.md` | relating CiteWell to upstream | Branch model; upstream is reference only |
| `docs/decisions.md` | asking why something is | Decision records and dead ends |
| `docs/naming.md` | touching a name, id, path, or URL | What is CiteWell, what must stay `zotero` |
| `docs/branding.md` | titles, icons, installer, channel | Where each piece of branding lives |
| `docs/ui.md` | UI copy, layout, interaction | Rules and their tests |
| `docs/ui-architecture.md` | UI structure decisions | Settings schema, toolkit limits |
| `docs/settings.md` | reorganizing settings or adding a pane | Inventory, registry rules, tests |
| `docs/kde-hig-audit.md` | UI polish decisions | HIG conformance |
| `docs/ublock-spike.md` | Browse content blocking | R38 spike |
| `CLAUDE.md` | needing upstream architecture detail | Zotero's own guide, kept verbatim |

### Using CiteWell

| File | Read it when | Purpose |
|---|---|---|
| `docs/cli.md` | agents and scripting | `citewell` CLI, local API, write authorization |
| `docs/agent.md` | the agent bridge and MCP tools | `/agent/v1`, verb surface, token model |
| `docs/import.md` | importing a Zotero library or changing data paths | Isolation, adopt-copy, merge |
| `docs/notes.md` | changing notes or the editor | File-backed Markdown notes |
| `docs/export.md` | planning a vault export | Obsidian/Markdown export design |
| `docs/libreoffice.md` | working on LibreOffice integration | OXT, protocol, citation, Flatpak safety |
| `docs/libreoffice-parity.md` | building or repairing the LibreOffice adapter | Parity scope, protocol |
| `docs/attention.md` | changing dialogs, activation, or notifications | Attention contract, escalation |
| `docs/connectors.md` | the retired browser connector | Retirement record, 23119 listener |

### Project and legal

| File | Read it when | Purpose |
|---|---|---|
| `docs/index.md` | looking for a document | This index |
| `NOTICE` | redistributing, or asking about attribution | Fork statement, copyright, trademark |
| `COPYING` | legal questions | Full AGPL-3.0 text |

*For the full documentation index, see [index.md](index.md).*
