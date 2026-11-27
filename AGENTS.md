# Agent contract

Read [docs/agent-context.md](docs/agent-context.md) first: commands, repository map, current state.
[README.md](README.md) is the human front page and is not agent context.

## Rules

1. **New code is Rust.** Do not add JavaScript, Python, or shell programs. Markdown, YAML, JSON,
   CSS, HTML and other data files are exempt. Tooling lives under `tools/`. Rationale: D4 in
   [docs/decisions.md](docs/decisions.md).
2. **Internal identifiers stay `zotero`.** Never rename `chrome://zotero/…`, the `Zotero.*`
   namespace, `APP_ID`, `extensions.zotero.*` keys, the data directory or the sync protocol. See
   [docs/naming.md](docs/naming.md).
3. **Documentation has one index.** New documents go under `docs/`, are registered in
   [docs/index.md](docs/index.md), and carry the back-reference line. `tools/docs-check` enforces
   the budgets and the index.
4. **Leave upstream files alone.** `COPYING`, `CLAUDE.md` and `CONTRIBUTING.md` are upstream's.
   `CLAUDE.md` is Zotero's architecture reference, not our contract.
5. **Never interact with `zotero/zotero`.** No pushes, issues, PRs, comments, mentions or
   `zotero/zotero#NNN` references. Upstream is fetch-only; pushes go to `origin`.
6. **Port JavaScript seam by seam.** Plan the module, keep JavaScript as the test oracle, prove
   parity before deleting it; no big-bang translation. See [docs/rust.md](docs/rust.md).
7. **Never `rm`; add no dependencies without approval.** Use Trash. No npm, new crates or
   toolchains (D32). External profiles are append-only: add our artifact, never rewrite user state.

## Where to look

| Question | File |
|---|---|
| How do I build, run, test? | [docs/agent-context.md](docs/agent-context.md) |
| Why is the code structured this way? | [CLAUDE.md](CLAUDE.md) |
| How do I merge upstream? | [docs/sync.md](docs/sync.md) |
| Why was a choice made? | [docs/decisions.md](docs/decisions.md) |
| What may I rename? | [docs/naming.md](docs/naming.md) |
