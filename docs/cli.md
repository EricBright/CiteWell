# CLI and agent bridge

CiteWell ships a small Rust CLI, `citewell`, so a person — or a local agent — can work with the
library without clicking. It has two back ends:

| Surface | Endpoint | What it is for |
|---|---|---|
| Local API | `127.0.0.1:23120/api/` | Data: search, items, collections, tags, notes-as-items |
| Agent bridge | `127.0.0.1:23120/agent/v1` | Actions: validated item creation, translators, attachments, notes, collections, selection, opening items |

Both are loopback-only. The app stays the source of truth; the CLI never opens `zotero.sqlite`.

## Enable

- **Local API** is on by default (D16); the toggle is in **Agent access** settings, under Local API.
- **Agent bridge** is on by default; **Preferences → Agent access** has the toggle, the token,
  setup instructions and the audit log (D17).

## Build and install

```bash
cargo build --release --manifest-path tools/Cargo.toml -p citewell-cli
# binary: tools/target/release/citewell
```

Or `cargo install --path tools/cli`.

## Commands

```bash
citewell status
citewell search "attention deficit" --limit 10
citewell item ABCD1234
citewell api GET /api/users/0/collections
citewell agent ping --data-dir "$HOME/CiteWellData"
```

| Command | What it does |
|---|---|
| `status` | App version, API version, server ID, item count |
| `search QUERY` | Full-text search; JSON array on stdout |
| `item KEY` | One item as JSON |
| `api METHOD PATH` | Raw local-API request; `--body JSON` for writes |
| `authorize` | Asks the app for a local-API write key |
| `agent METHOD` | Calls the agent bridge; `--params JSON` (or `@file`) |
| `mcp` | Runs an MCP server on stdio, exposing the bridge as tools |

Global options may go before or after the command: `--url URL`, `--data-dir DIR`,
`--pretty`. The agent token is read from `<data-dir>/agent-token`; set `CITEWELL_DATA_DIR` or pass
`--data-dir` once instead of repeating it.

## Agent bridge examples

```bash
export CITEWELL_DATA_DIR="$HOME/CiteWellData"

citewell agent ping

citewell agent item.create --params '{
  "itemType": "book",
  "fields": { "title": "A Book", "date": "2026" },
  "creators": [{ "creatorType": "author", "firstName": "Ada", "lastName": "Lovelace" }],
  "tags": ["agent"]
}'

citewell agent item.addNote --params '{"key":"ABCD1234","text":"Read chapter 2."}'
citewell agent ui.select --params '{"keys":["ABCD1234"]}'
citewell agent ui.open   --params '{"key":"ABCD1234"}'

# DOI/ISBN/PMID or a page URL → item with metadata and attachments
citewell agent translate.save --params '{"identifier":"10.1038/nphys1170"}'

# Import a PDF already on disk
citewell agent item.attachFile --params '{"key":"ABCD1234","path":"/home/me/Downloads/paper.pdf"}'
```

The bridge authenticates with a token that **Preferences → Agent access** generates and shows. The
CLI reads the same file; a raw request needs both headers:

```bash
curl -s http://127.0.0.1:23120/agent/v1 \
  -H "Authorization: Bearer <token>" \
  -H "X-CiteWell-Agent: 1" \
  -H "Content-Type: application/json" \
  -d '{"method":"ping","params":{}}'
```

## Writing through the local API

Reads need no authentication. Writes follow Zotero's local-API rules:

```bash
citewell authorize --app-name "my-agent"     # the app shows Allow / Always Allow / Deny
# → {"key":"…","remember":true}

citewell api POST /api/users/0/items \
  --key "THE_KEY" \
  --body '[{"itemType":"book","title":"A Book"}]'
```

A one-time key is consumed by its first successful write; an "Always Allow" key is stored in the
profile. The CLI fetches the server ID itself for writes.

## For agents

- stdout is the response body and nothing else; diagnostics go to stderr.
- Exit codes: `0` success, `1` the app returned an error, `2` usage, `3` no connection.
- Use `--pretty` for readable JSON, or leave it off and pipe to `jq`.
- Every `agent` call is audited in `<data-dir>/agent-actions.log`.

## Limits

- The bridge has no arbitrary JavaScript execution and no destructive verbs: delete moves to the
  trash, emptying it is not exposed.
- Notes and `export.note` are available through the bridge; PDF annotation verbs are gone (D30).
  See [agent.md](agent.md).
- No HTTPS: both surfaces are loopback-only by design. Never expose port 23120 to a network.
- Reads on the local API are available to any process running as the same user; the bridge
  requires its token for both reads and writes.

## MCP

`citewell mcp --data-dir "$CITEWELL_DATA_DIR"` starts a stdio MCP server. It exposes 17 tools
(`search_library`, `create_item`, `save_identifier`, `attach_file`,
`export_note`, `select_items`, `open_item`, `notify`, and the rest of the bridge). Add it to an MCP client as:

```json
{
  "mcpServers": {
    "citewell": {
      "command": "citewell",
      "args": ["mcp", "--data-dir", "/home/me/CiteWell"]
    }
  }
}
```

stdout carries only JSON-RPC; logs never mix into the protocol stream.

*For the full documentation index, see [../README.md](../README.md).*
