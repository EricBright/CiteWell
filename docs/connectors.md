# The bundled Firefox connector, retired

**Status: removed 2026-11-25 under D47/R34.** This page is the record of what the tree did, what
replaced it, and what deliberately stayed behind. There is no connector source in this repository
and nothing here is mergeable with upstream any more.

## What it was

The tree at `connectors/` was a `git subtree` import of `zotero/zotero-connectors` (branch `main`,
imported at `02271dc76` on 2026-11-05, the 5.0.x line) built for Firefox only as **CiteWell
Connector**, extension id `citewell-connector@sophy.ca`. It was never the AMO-published Zotero
Connector: different id, different branding, and a patch list (skin icons from the app, one
`book-section` shape for every item type, brand tokens from `brand.json`, generated dark and
state-dot artwork). It talked to the app on `127.0.0.1:23120`, the port D19 gave CiteWell so it
could sit next to Zotero. The build was upstream's `build.sh` plus gulp, with its own
`node_modules` (96 MB): the last npm tree in the repository after D46.

The add-on existed for one reason the app could not satisfy at the time: a visible page context
with translator detection and a save action. D47's Browse tab supplied that in-process, and Google
Docs was the only remaining piece only an extension could host, because its page-side half is
Zotero's React/Kix client.

## What replaced it

| Need | Replacement |
|---|---|
| Save a page to the library | Browse tab Save: `RemoteTranslate` detects a web translator and `ItemSaver` saves to the app's own target (D47 Phase 2a/2b) |
| Multi-item pages | `browseItemSelector.xhtml` picker |
| PDFs | Captured by content type in the Browse tab and imported as an attachment (D47 Phase 3) |
| Google Docs citations | Zotero's **official** connector in Firefox; the Browse tab gates `docs.google.com/document/*` with an explainer and never contacts Google itself (D47, owner-approved) |
| Protocol compatibility | Unchanged: all `/connector/*` endpoints stay in `server_connector.js` and `server_connectorIntegration.js` |

The official connector only asks `127.0.0.1:23119` (its default, with no port setting in its UI).
CiteWell keeps `23120` as its own address and also serves the same handlers on `23119` when that
port is free, which is what lets Docs citations reach this app; when a running Zotero owns
`23119`, the app says so in the Docs explainer instead of pretending otherwise. The listener is
`Zotero.Server.connectorPort`, covered by `server_connectorIntegrationTest.js`.

## What was removed

On 2026-11-25, in one pass: the whole `connectors/` tree (117 MB, including `node_modules`, the
gulp/XPI pipeline and three submodule working trees), `tools/rsvg-shim` (its rasteriser, used only
by that icon pipeline), the `xtask connectors` command with its brand substitution and hardcoded-
name guard, and the three `connectors/src/*` entries in `.gitmodules`. Removals went to Trash
under D26. `build/dist/CiteWell-Connector.xpi` no longer exists and nothing regenerates it.

The patch table that used to live here was a merge aid. With the tree gone it would be a list of
edits to files this repository does not contain, so only the durable lessons remain: one icon
shape for every item type, state as a corner dot, and brand values in one place.

## If Docs needs work later

Zotero's connector is a third-party project. Changes belong in its repository, or in the app's
`/connector/*` handling; nothing about Docs is re-imported here. The app never holds a Google
session and no Google request is ever made from CiteWell itself (D47, D49).

*For the full documentation index, see [../README.md](../README.md).*
