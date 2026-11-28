# Agent context

Read this after `AGENTS.md`. The README is the human front page; this page holds what an agent
needs before touching code.

CiteWell is a citation catalogue built on Zotero's engine. The branch is `citewell`; the version
file is `2026.11.28.SOURCE` between releases. Current state and pitfalls: [status.md](status.md).

## Commands

```bash
app/scripts/build_and_run            # build and launch with debug output
cargo run --manifest-path tools/Cargo.toml -p xtask -- build
test/runtests.sh                     # tests, in a built app
```

There is no JS watcher: rerun `xtask build` after JavaScript changes. Test files are packed into the
app image, so after editing a test run `xtask build` and then `ZOTERO_TEST=1 app/scripts/dir_build -p l -f`
before `test/runtests.sh`.

Gates:

```bash
cargo run --quiet --manifest-path tools/docs-check/Cargo.toml
cargo run --quiet --manifest-path tools/Cargo.toml -p xtask -- validate-settings
cargo run --quiet --manifest-path tools/Cargo.toml -p xtask -- validate-agent
```

## Repository map

| Path | Contents |
|---|---|
| `chrome/` | Application UI and XPCOM |
| `resource/` | Bundled runtime resources, including `settings/panes.json` and `agent/verbs.json` |
| `scss/` | Styles, compiled to CSS during the build |
| `app/` | Packaging and platform runtimes |
| `test/` | Tests and support code |
| `docs/` | Documentation; `research/` is archival |
| `tools/` | Rust tooling |

## Rules that bite

- Read `AGENTS.md` before changing anything; it holds the language, naming and dependency rules.
- Never `rm`. Use Trash. Never interact with `zotero/zotero`.
- Tests use an isolated profile; never point them at the real library.
- Settings are data: change `resource/settings/panes.json`, run the validator, and regenerate the
  inventory with `xtask settings-docs`.
- Release procedure is in [packaging.md](packaging.md); the installed app lives outside the repo.

## Where to look

- Documentation index: [index.md](index.md)
- Current state: [status.md](status.md)
- Why a choice was made: [decisions.md](decisions.md)
- How to build and ship: [packaging.md](packaging.md)
