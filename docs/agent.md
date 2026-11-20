# Agent bridge: letting an agent work inside the app

R23. The goal is not "an agent can read the database" — that already works through the local API.
The goal is an agent that can do what a person does in the window: create an item, fill its
fields, attach a PDF, add a note, put it in a collection, then select and open it so the person
can see the result.

## Layers

| Layer | Status | What it can do |
|---|---|---|
| Data API | **Exists** | Zotero's local API on `127.0.0.1:23119/api/`: items, collections, tags, searches, notes as items; writes need an in-app key |
| CLI | **Exists** | `citewell status/search/item/api/authorize`; raw HTTP with errors and exit codes ([cli.md](cli.md)) |
| App bridge | **R23** | `/agent/v1` on the same loopback server, calling `Zotero.*` directly: translators, attachments, notes, collections, selection, tabs, reader |
| MCP adapter | **R23** | `citewell mcp`: stdio MCP server exposing the bridge as tools, so DeepSeek, MiMo, Claude or a future agent needs no CiteWell-specific code |

The local API is a data CRUD surface. It cannot run a translator, import a file from disk, or
move the selection. Those live in the app, so the bridge calls the same JavaScript APIs the UI
calls — never SQLite.

## Architecture

```
agent ──stdio MCP──► citewell mcp ──HTTP──► /agent/v1 ──► Zotero.* (main process)
agent ──CLI JSON────► citewell ─────HTTP──► /agent/v1
```

- The endpoint is registered as `Zotero.Server.Endpoints["/agent/v1"]`, next to the local API, and
  shares the loopback-only `HttpServer`.
- Requests are `POST` with `{"method": "item.create", "params": {...}}`; responses are
  `{"ok": true, "result": ...}` or `{"ok": false, "error": {"code", "message"}}`.
- The bridge is versioned (`/agent/v1`), returns ids/keys and timestamps, and never returns more
  than the caller asked for.
- Long operations (translator saves, imports) are asynchronous inside the app and return when the
  item exists, with a 60-second cap and a clear timeout error.

## Authentication and safety

- A 32-byte token lives in `<data-dir>/agent-token`, mode `0600`, generated on first start.
  Requests need `Authorization: Bearer <token>` **and** `X-CiteWell-Agent: 1`. The custom header
  forces a CORS preflight, so a web page cannot reach the endpoint even through DNS rebinding;
  the server also checks `Host` is a loopback address.
- The CLI finds the token with `--data-dir` or `$CITEWELL_DATA_DIR`; `citewell mcp` takes the same.
- Reads and writes are both authenticated here, unlike the local API's open reads.
- v1 has no destructive library verbs: `item.delete` moves to trash, and emptying the trash is not
  exposed. Anything irreversible stays a human action.
- Every call appends one line to `<data-dir>/agent-actions.log` (timestamp, method, object keys,
  outcome — not note text or field contents). The log is the audit trail when an agent goes wrong.

## Verb surface

| Method | What it does | Zotero API |
|---|---|---|
| `ping` | Version, data dir, capabilities | — |
| `search` | Full-text / field search, paged | `Zotero.Search` |
| `item.get` | Fields, creators, tags, notes, attachments | `Zotero.Items.get` |
| `item.create` | New item from itemType + fields + creators, optionally into collections | `new Zotero.Item`, `save` |
| `item.update` | Change fields, creators or tags | `Zotero.Item` setters, `save` |
| `item.addNote` | Child note (Markdown or HTML) | `Zotero.Item` note |
| `item.attachFile` | Import a file from an absolute path | `Zotero.Attachments.importFromFile` |
| `item.attachURL` | Linked URL / snapshot | `Zotero.Attachments.linkFromURL` |
| `translate.save` | DOI, ISBN, PMID or URL → item(s) and optional attachments | `Zotero.Translate.Search` / `.Web` |
| `collection.list` / `create` / `addItems` | Collection tree and membership | `Zotero.Collections` |
| `tag.list` / `add` / `remove` | Tag operations | `Zotero.Tags` |
| `ui.status` | Active tab, collection and selection | `Zotero.getActiveZoteroPane()`, `Zotero_Tabs` |
| `ui.select` | Select items in the main window | `ZoteroPane.selectItems` |
| `ui.open` | Open an item, note or PDF reader | `Zotero.Reader.open`, `Zotero_Tabs` |
| `ui.notify` | Short in-app message so the person sees what happened | `Zotero.ProgressWindow` |

`item.create` accepts the natural shape (`itemType`, `fields`, `creators`, `tags`, `collections`)
and lets Zotero validate and save it. The bridge maps field names through
`Zotero.ItemFields.getID()` rather than writing columns.

`translate.save` is the important one for real work: an agent that has a DOI should not have to
invent a title and authors. It runs the same translators the "Add by Identifier" dialog runs and
returns the created item keys plus which attachments succeeded.

## MCP

`citewell mcp` speaks MCP over stdio (JSON-RPC, `initialize`, `tools/list`, `tools/call`) and maps
each verb to a tool with a JSON schema. The app does not need to embed an MCP server: MCP clients
start local processes, and the CLI already knows how to reach the app. This keeps the app free of
protocol code and lets the same bridge serve CLI scripts, MCP agents, and a future HTTP agent.

Example tools: `search_library`, `get_item`, `create_item`, `update_item`, `save_identifier`,
`attach_file`, `add_note`, `add_to_collection`, `select_items`, `open_item`, `get_selection`.

## Worked example

A person tells an agent: "Add the DOI 10.1234/example, attach the PDF in Downloads, put it in my
Reading collection, and show me."

1. `save_identifier { doi, collections: ["READING"] }` → translator creates the item and metadata.
2. `attach_file { key, path: "/home/me/Downloads/example.pdf" }` → child attachment, indexed.
3. `add_note { key, text: "Read for the methods section." }`.
4. `select_items { keys: [key] }` and `open_item { key }` → the window selects the row and opens
   the PDF.
5. `agent-actions.log` records four lines; the item is visible and editable like any other.

## Phases

| Phase | Outcome | Exit criterion |
|---|---|---|
| 1 | `/agent/v1` with token, audit, `ping/search/item/collection/ui` and `item.create/update/addNote` | A script creates an item, adds a note, selects and opens it; the app shows it; log has entries |
| 2 | `translate.save`, `attachFile`, `attachURL` | DOI → item with PDF, from one command, no manual metadata entry |
| 3 | `citewell mcp` with tool schemas | An MCP client lists tools and completes the worked example end to end |
| 4 | Reader annotations and export verbs | An agent highlights a page and exports the item's note to Markdown |

## Non-goals

- Arbitrary JavaScript execution. An agent gets verbs, not `eval`.
- Remote access. The bridge is loopback-only; exposing it to a network is a different product with
  a different security model.
- Bypassing Zotero's data layer. Every write goes through `Zotero.Items.save()` and friends, so
  notifier events, undo and sync-disabled state behave exactly as they do for a click.
- Replacing the local API. CRUD clients that only need data keep using `/api/`; the bridge is for
  actions that require the running app.

*For the full documentation index, see [../README.md](../README.md).*
