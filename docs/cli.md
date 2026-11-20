# Agent interface: the `citewell` CLI

CiteWell ships a small Rust CLI so a person — or a local agent — can read and write the library
without opening the window. It is a thin client over Zotero's **local API**, which the app already
serves on loopback at `http://127.0.0.1:23119/api/`. The app stays the source of truth; the CLI
does not open `zotero.sqlite` and does not cache anything.

## Enable it

The local API is on by default in CiteWell (D16) and is reachable only from this machine
(`127.0.0.1`). It can be turned off in **Advanced** preferences if it is not wanted. The CLI
reports a connection error and points at that setting when the server is not there.

## Build and install

```bash
cargo build --release --manifest-path tools/Cargo.toml -p citewell-cli
# binary: tools/target/release/citewell
```

Or put it on `PATH` with `cargo install --path tools/cli`.

## Commands

```bash
citewell status
citewell search "attention deficit" --limit 10
citewell item ABCD1234
citewell api GET /api/users/0/collections
```

| Command | What it does |
|---|---|
| `status` | Prints the app version, API version, server ID, and item count |
| `search QUERY` | Full-text search; JSON array on stdout |
| `item KEY` | One item as JSON |
| `api METHOD PATH` | Raw request; `POST`/`PUT`/`PATCH` take `--body JSON` |
| `authorize` | Asks the app for a write key through its normal dialog |

Global options go before or after the command: `--url URL` (default
`http://127.0.0.1:23119`, or `$CITEWELL_URL`) and `--pretty` for indented JSON.

The `api` command adds the API prefix when the path does not start with `/`: `citewell api GET
users/0/items` is the same as `citewell api GET /api/users/0/items`.

## Writing

Reads need no authentication. Writes do, following Zotero's local-API rules:

```bash
citewell authorize --app-name "my-agent"     # the app shows Allow / Always Allow / Deny
# → {"key":"…","remember":true}

citewell api POST /api/users/0/items \
  --key "THE_KEY" \
  --body '[{"itemType":"book","title":"A Book"}]'
```

`authorize` blocks until the person answers the dialog. A one-time key is consumed by its first
successful write; an "Always Allow" key is stored in the profile. The CLI fetches the server ID
itself for writes; pass `--server-id` only when replaying a request elsewhere.

## For agents

- stdout is the response body and nothing else; diagnostics go to stderr.
- Exit codes: `0` success, `1` the app returned an error, `2` usage, `3` no connection.
- Use `--pretty` for readable JSON, or leave it off and pipe to `jq`.
- The API is the same one documented for `api.zotero.org` (version 3), minus remote-only features;
  the app's own [local API header](https://github.com/zotero/zotero) is the reference.

## Limits

- No arbitrary JavaScript execution and no UI actions yet. An agent can read and write items,
  collections, tags and searches, but cannot select, open, or scroll an item.
- No HTTPS: the API is loopback-only by design. Never expose port 23119 to a network.
- Reads are available to any process running as the same user. That is the same trust boundary as
  the database file; writes are still gated by the in-app dialog.

UI verbs and an MCP adapter are R23 on the [roadmap](../roadmap.md).

*For the full documentation index, see [../README.md](../README.md).*
