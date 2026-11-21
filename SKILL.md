---
name: citewell
description: Drive the CiteWell desktop research library — search, create and edit items, resolve DOIs/ISBNs/URLs, attach PDFs, add notes, file items into collections, and select or open them in the app. Use this skill whenever the user wants an agent to work with their CiteWell (or Zotero-style) library, even if they do not say "CiteWell" explicitly, including requests like "add this paper to my library", "file these PDFs", "make a reading list", or "open that item for me".
compatibility: Linux desktop; requires the running CiteWell app and the `citewell` CLI (MCP-capable). DOI/URL lookups need network; no Zotero account or sync is used.
---

# Driving CiteWell

CiteWell is a desktop research manager (a fork of Zotero). The app owns the library; this skill
talks to it through an authenticated loopback bridge. Never read or write `zotero.sqlite` yourself.

## Before anything

1. The CiteWell window must be running. It can be minimised, but not closed.
2. Find the library data directory. The default is `~/CiteWell`; if the person launched with
   `-datadir`, use that path instead.
3. Check the connection:

```bash
export CITEWELL_DATA_DIR="$HOME/CiteWell"
citewell agent ping
```

`{"ok":true,...}` means you are ready. `cannot read the agent token` means the app has never run
with that data directory, or the path is wrong. `Connection refused` means CiteWell is not running.

The token is read from `<data-dir>/agent-token`. Never print it or put it in a prompt.

## Preferred connection: MCP

Start the MCP server and use its tools:

```bash
citewell mcp --data-dir "$CITEWELL_DATA_DIR"
```

MCP client entry:

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

The server speaks newline-delimited JSON-RPC on stdio. Use the tools below; do not shell out to
`citewell` as well.

## Tools

| Tool | Arguments | When |
|---|---|---|
| `citewell_status` | — | Verify the app and version |
| `search_library` | `query`, `limit?` | Always search before creating |
| `get_item` | `key` | Fields, creators, tags, notes, attachments |
| `save_identifier` | `identifier`, `collections?`, `saveAttachments?` | DOI, ISBN, PMID or page URL → real metadata |
| `create_item` | `itemType`, `fields`, `creators?`, `tags?`, `collections?` | Manual item when no identifier exists |
| `update_item` | `key`, `fields?`, `creators?`, `tags?` | Fill or correct fields |
| `add_note` | `key`, `text` | Child `.md` file attachment; edited by the host |
| `attach_file` | `key`, `path`, `title?` | Import a PDF/file already on disk |
| `attach_url` | `key`, `url`, `title?` | Linked URL attachment |
| `list_annotations` | `key` | Annotations on a PDF/EPUB |
| `export_note` | `key` | Markdown note file contents |
| `list_collections` | — | Collection tree |
| `create_collection` | `name`, `parentKey?` | New collection |
| `add_to_collection` | `collectionKey`, `itemKeys` | File existing items |
| `get_selection` | — | What the person has selected |
| `select_items` | `keys` | Show items in the window |
| `open_item` | `key` | Open item/note/PDF |
| `notify` | `text` | Short message in the app |

## A good working loop

1. **Search first.** Duplicate items are easy to create accidentally. Search by title, author,
   DOI, ISBN or a distinctive phrase.
2. **Prefer `save_identifier`.** For a DOI/ISBN/PMID/URL it creates correct metadata and optional
   attachments. Do not invent titles or authors.
3. **Then enrich.** Use `update_item` for missing fields, `add_note` for reading notes, and
   `attach_file` for a PDF path.
4. **File it.** Use `add_to_collection` with the collection key; create a collection first if
   needed.
5. **Show the result.** `select_items` and `open_item` put the item in front of the person;
   `notify` explains what you did.

Example: “Add 10.1038/nphys1170, attach ~/Downloads/paper.pdf, and show me.”

1. `save_identifier { "identifier": "10.1038/nphys1170" }`
2. `attach_file { "key": "<returned key>", "path": "/home/me/Downloads/paper.pdf" }`
3. `select_items { "keys": ["<key>"] }`
4. `open_item { "key": "<key>" }`

## Rules

- **Never touch `~/Zotero`, the Zotero profile, or Zotero’s port 23119.** CiteWell is isolated;
  its data is `~/CiteWell`, profile `~/.config/citewell/profile`, port 23120.
- **No destructive verbs exist.** Do not try to delete items, empty the trash, or modify the
  database directly. Ask the person to do it in the app.
- **Absolute paths only** for `attach_file`. Files are copied into CiteWell storage; the original
  is left alone.
- **Use Zotero field names** (`title`, `date`, `publicationTitle`, `DOI`, `url`, `abstractNote`,
  …) and item types (`book`, `journalArticle`, `preprint`, `webpage`, …).
- **If a tool returns `isError: true`**, read the message. A 401 means the token changed; ask the
  person to copy the current token from Preferences → Agent access. A connection error means the
  app is not running.
- **Do not batch blindly.** Create one item, check its key and fields, then continue. This keeps
  failures small and reversible.
- **`export_note`** takes a Markdown attachment key and returns its file contents; it does not write a file.
- **Markdown only.** Notes are `.md` file attachments; do not send HTML or expect an in-app editor.

## CLI fallback

If MCP is unavailable, the same bridge is reachable one call at a time:

```bash
citewell agent search --params '{"query":"attention","limit":5}'
citewell agent translate.save --params '{"identifier":"10.1038/nphys1170"}'
citewell agent item.attachFile --params '{"key":"ABCD1234","path":"/home/me/paper.pdf"}'
citewell agent ui.notify --params '{"text":"Added the paper"}'
```

Method names are the bridge names, not the MCP tool names. Prefer MCP when it is available.

More detail: `docs/agent.md` and `docs/cli.md` in the CiteWell repository.
