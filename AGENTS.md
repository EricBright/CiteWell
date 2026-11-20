# Agent contract

Read [README.md](README.md) first — it is the entry point, the command reference, and the
documentation index. This file holds only the rules a change to this repository must not
violate.

## Rules

1. **New code is Rust.** Do not add JavaScript, Python, or shell programs. Markdown, YAML,
   JSON, CSS, HTML, and other data or configuration files are exempt. Tooling lives under
   `tools/`. Rationale: [docs/decisions.md](docs/decisions.md), D4.
2. **Internal identifiers stay `zotero`.** Never rename `chrome://zotero/…`, the `Zotero.*`
   namespace, `APP_ID`, `extensions.zotero.*` preference keys, the data directory, or the sync
   protocol. Rule and failure modes: [docs/naming.md](docs/naming.md).
3. **README is always-tier.** Do not add detail to it. New documentation goes under `docs/`, is
   registered in the README index, and carries the back-reference line. `tools/docs-check`
   enforces the word cap and the completeness of the index.
4. **Prefer new files over edits to upstream files.** `COPYING`, `CLAUDE.md`, and
   `CONTRIBUTING.md` are upstream's and stay unmodified; every edit to a tracked upstream file
   is a future merge conflict. CiteWell documentation therefore lives in `docs/`.

The name `CLAUDE.md` is upstream's, not this project's agent contract. It is kept verbatim as an
architecture reference for all tools.

5. **Never push to `zotero/zotero`.** This is a personal fork and contributes nothing
   upstream — not a branch, not a pull request, not an issue comment. `upstream` is fetch-only
   (`pushurl = DISABLED`), `remote.pushDefault` is `origin`, and `gh`'s default repository is the
   fork. `tools/docs-check` fails if any remote can push to upstream.

## Where to look

| Question | File |
|---|---|
| How do I build, run, and test? | [README.md](README.md) |
| Why is the code structured this way? | [CLAUDE.md](CLAUDE.md) |
| How do I merge upstream changes? | [docs/sync.md](docs/sync.md) |
| Why was a choice made? | [docs/decisions.md](docs/decisions.md) |
| What am I allowed to rename? | [docs/naming.md](docs/naming.md) |
| Where does each piece of branding live? | [docs/branding.md](docs/branding.md) |
