# Agent bridge: letting an agent work inside the app

R23. The goal is not "an agent can read the database" — that already works through the local API.
The goal is an agent that can do what a person does in the window: create an item, fill its
fields, attach a PDF, add a note, put it in a collection, then select and open it so the person
can see the result.

## Layers

| Layer | Status | What it can do |
|---|---|---|
| Data API | **Exists** | Zotero's local API on `127.0.0.1:23120/api/`: items, collections, tags, searches, notes as items; writes need an in-app key |
| CLI | **Exists** | `citewell status/search/item/api/authorize`; raw HTTP with errors and exit codes ([cli.md](cli.md)) |
| App bridge | **Phases 1–2 built** | `/agent/v1` on the same loopback server, calling `Zotero.*` directly: item creation, notes, collections, selection, tabs, translators, file and URL attachments |
| MCP adapter | **Phase 3 built** | `citewell mcp`: stdio MCP server exposing the bridge as tools, so DeepSeek, MiMo, Claude or a future agent needs no CiteWell-specific code |

The local API is a data CRUD surface. It cannot run a translator, import a file from disk, or
move the selection. Those live in the app, so the bridge calls the same JavaScript APIs the UI
calls — never SQLite.

## Bundled skill

[SKILL.md](../SKILL.md) is the short, self-contained version for an agent that has never seen
CiteWell: prerequisites, MCP setup, the 18 tools, a working loop, and the rules that keep it out of
Zotero's data.

In the app, it is two clicks away: **Help → Agents and SKILL.md** opens **Preferences → Agent
access**, whose **Agent skill** section shows the download URL, a Copy button and an Open button.
Download from
`https://raw.githubusercontent.com/EricBright/CiteWell/citewell/SKILL.md` and place it in the
agent's skill directory as `citewell/SKILL.md`.

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

- A 64-hex-character token lives in `<data-dir>/agent-token`, mode `0600`, generated on first
  start. It is shown, copied and regenerated in **Preferences → Agent access**.
  Requests need `Authorization: Bearer <token>` **and** `X-CiteWell-Agent: 1`. The custom header
  forces a CORS preflight, so a web page cannot reach the endpoint even through DNS rebinding;
  the server also checks `Host` is a loopback address.
- The CLI finds the token with `--data-dir` or `$CITEWELL_DATA_DIR`; `citewell mcp` takes the same.
- Reads and writes are both authenticated here, unlike the local API's open reads.
- v1 has no destructive library verbs: `item.delete` moves to trash, and emptying the trash is not
  exposed. Anything irreversible stays a human action.
- Every call appends one line to `<data-dir>/agent-actions.log` (timestamp, method, object keys,
  outcome — not note text or field contents). The log is the audit trail when an agent goes wrong,
  and **Preferences → Agent access** can reveal it.

## Settings and setup

**Preferences → Agent access** is the whole setup surface:

| Control | What it does |
|---|---|
| Allow local agents | Toggles `extensions.zotero.agent.enabled`; off returns 403 to every call |
| Token | Shows the current token, with Copy and Regenerate; the file is mode 0600 |
| Setup snippet | Copyable commands for the CLI and a raw `curl` request, with this data directory filled in |
| Audit | Shows the audit-log path and opens it in the file manager |

The pane also states what this build can and cannot do, so the instructions stay true as phases
land. The token is created on first start even before the pane is opened, so an agent can connect
without a trip through the UI.

## Verb surface

| Method | What it does | Zotero API |
|---|---|---|
| `ping` | Version, data dir, capabilities | — |
| `search` | Full-text / field search, paged | `Zotero.Search` |
| `item.get` | Fields, creators, tags, notes, attachments | `Zotero.Items.get` |
| `item.create` | New item from itemType + fields + creators, optionally into collections | `new Zotero.Item`, `save` |
| `item.update` | Change fields, creators or tags | `Zotero.Item` setters, `save` |
| `item.addNote` | Child Markdown file attachment; no HTML, no in-app editor | `Zotero.Notes.createMarkdownAttachment` |
| `item.attachFile` | Import a file from an absolute path | `Zotero.Attachments.importFromFile` |
| `item.attachURL` | Linked URL / snapshot | `Zotero.Attachments.linkFromURL` |
| `translate.save` | DOI, ISBN, PMID or URL → item(s) and optional attachments | `Zotero.Translate.Search` / `.Web` |
| `annotation.list` | Annotations on a PDF/EPUB attachment | `Zotero.Items.getAnnotations` |
| `export.note` | Markdown attachment contents | File read |
| `collection.list` / `create` / `addItems` | Collection tree and membership | `Zotero.Collections` |
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

`citewell mcp --data-dir <library>` reads the same token file and speaks newline-delimited
JSON-RPC on stdin/stdout. It never prints anything else to stdout; diagnostics go to stderr. A
typical client entry is:

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

## Worked example

A person tells an agent: "Add the DOI 10.1234/example, attach the PDF in Downloads, put it in my
Reading collection, and show me."

1. `translate.save { identifier: "10.1234/example", collections: ["READING"] }` → translator
   creates the item and metadata.
2. `item.attachFile { key, path: "/home/me/Downloads/example.pdf" }` → child attachment, indexed.
3. `item.addNote { key, text: "Read for the methods section." }`.
4. `ui.select { keys: [key] }` and `ui.open { key }` → the window selects the row and opens the
   PDF.
5. `agent-actions.log` records four lines; the item is visible and editable like any other.

## Phases

| Phase | Outcome | Exit criterion |
|---|---|---|
| 1 **built** | `/agent/v1` with token, audit, `ping/search/item/collection/ui` and `item.create/update/addNote`; Preferences → Agent access | A script creates an item, adds a note, selects and opens it; the app shows it; log has entries |
| 2 **built** | `translate.save`, `attachFile`, `attachURL` | DOI → item with PDF, from one command, no manual metadata entry |
| 3 **built** | `citewell mcp` with tool schemas | An MCP client lists tools and completes the worked example end to end |
| 4 **built** | Reader annotations and export verbs | An agent highlights a page and exports the item's note to Markdown |

## Non-goals

- Arbitrary JavaScript execution. An agent gets verbs, not `eval`.
- Remote access. The bridge is loopback-only; exposing it to a network is a different product with
  a different security model.
- Bypassing Zotero's data layer. Every write goes through `Zotero.Items.save()` and friends, so
  notifier events, undo and sync-disabled state behave exactly as they do for a click.
- Replacing the local API. CRUD clients that only need data keep using `/api/`; the bridge is for
  actions that require the running app.

*For the full documentation index, see [../README.md](../README.md).*
