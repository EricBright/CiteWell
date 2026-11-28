# Plumbing charter — after R19

**Approved 2026-11-28** · follows R19 · no code changed yet

## Purpose

R19 removes dead subsystems and leaves two local modules with honest names. This charter covers the
plumbing that is not dead but is harder to repair than it should be. It is deliberately small: three
workstreams, each justified by a concrete cost, each shippable on its own. It is not a rewrite and
not a framework.

## Principles

- **Deep modules.** A small interface with real behaviour behind it; callers and tests cross the
  same seam.
- **Manifest first.** Where behaviour is a list (settings, actions, verbs), make the list data,
  validate it, and generate what can be generated. The settings catalog and `actions.json` already
  prove this works.
- **Explicit dependencies.** New or refactored code imports what it uses; no new globals.
- **No new layers.** No DI container, no event bus, no generic repository abstraction. Indirection
  is a cost paid only where something actually varies.

The test for every item: deleting the module should scatter its complexity across callers. If it
disappears cleanly, it was a pass-through and should not exist.

## A1 — Agent verb manifest (first) — shipped 2026-11-28

**The cost today.** The agent surface is described three times: 18 capabilities in the JS dispatcher
(`server_agent.js`), 17 tools with schemas in Rust (`tools/cli/src/mcp.rs`), and a third list in
`docs/agent.md`. They already disagree — `citation.preview` is in the JS list but not the MCP list,
and names differ (`item.get` vs `get_item`). Adding a verb means editing three files in two
languages with no check that they agree.

**The shape.** One file, `resource/agent/verbs.json`, one entry per verb: protocol name, MCP name,
description, input schema, and whether it mutates. Three consumers:

- the JS dispatcher builds its capability list and validates its handler table against the manifest;
- the Rust MCP server builds its tool list from the same file (compiled in, not fetched; the
  server is already a shipped artifact, so the cross-language link exists today as hand-maintained
  duplication);
- `xtask` generates the verb table in `docs/agent.md` and fails on drift, the same way
  `validate-settings` guards the settings page.

A parity test asserts three things: every manifest verb has a handler, every handler is in the
manifest, and the MCP tool list matches. Adding a verb becomes one JSON entry plus one handler.

**Shipped:** `resource/agent/verbs.json` feeds the JS dispatcher, the Rust MCP tools and the
generated table in `docs/agent.md`; `validate-agent` runs in the commit hook and CI, and the agent
test asserts that manifest, handlers and capabilities agree. Commit `0942ffc56`.

**Estimate:** one session. **Risk:** cross-language generation; keep the JSON the only source and
generate rather than hand-edit.

## A2 — File plumbing (second) — wave 1 shipped 2026-11-28

**The cost today.** Five APIs touch files: `Zotero.File` (376 calls), `IOUtils` (266), `OS.File`
(245), `PathUtils` (256), `OS.Path` (149). A repair in path handling, atomic writes or trash has five
dialects to check, and `OS.File` is legacy.

**The shape.** Keep `Zotero.File` as the deep interface for the operations the app needs (read,
write atomically, copy, move, trash, exists, temp file) and make it the only caller of `IOUtils` and
`PathUtils` for those operations. Migrate call sites in waves by directory, starting with the
modules the app owns (not vendored translators or schema), and ratchet a grep gate so no new
`OS.File`/`OS.Path` call appears outside the allowed list. Each wave is behaviour-preserving and
test-covered; the old API disappears gradually.

The first wave confirms what `Zotero.File` already wraps; if it is a thin alias, the wrapping
functions land before any call site moves.

**Waves 1–2 shipped:** `Zotero.File` gained `exists`, `makeDirectory`, `removeDir`,
`removeEmptyDir` and `move` over `IOUtils`; `retractions.js`, `dictionaries.js`, `annotations.js`,
`locateManager.js` and `dataDirectory.js` now use those wrappers and `PathUtils`, with no
`OS.File`/`OS.Path` left in any of them except the one cross-device probe in
`dataDirectory.js` (it needs `OS.File.move`'s errno to tell a different filesystem from a real
failure). `validate-plumbing` runs in the commit hook and CI and fails if the app-wide counts grow
above `tools/file-plumbing.json` (now **185 `OS.File`, 80 `OS.Path`**). Tests: file, retractions,
dictionaries, annotations, sidecars and data directory 81/81 + 16/16; import and file renaming
40/40 after the data-directory move.

**Estimate:** two to three sessions in waves. **Risk:** large mechanical churn; do it after the
agent manifest and never mix it with a behaviour change.

## A3 — Dependency rules (continuous)

Three rules, enforced by a grep gate with a checked-in baseline that may only shrink:

1. **No new globals.** New and refactored code is an ES module with explicit imports; the
   `zotero.mjs` loader list stops growing.
2. **UI does not issue SQL.** Queries live in the data layer or a module's implementation; a UI file
   calling `Zotero.DB` is a defect.
3. **One owner for paths.** Path construction lives in `Zotero.File`/`PathUtils` helpers, not in
   callers.

The first run records the current count; each later change lowers it. No mass rewrite.

## Explicitly not doing

- Splitting `zoteroPane.js` (7,326 lines) or `item.js` (6,434). Upstream-shaped and heavily tested;
  the churn buys little repairability.
- Merging the local API, agent and connector servers. Their protocols and authentication differ;
  a shared router would be a shallow abstraction over three contracts.
- Any DI container, service locator or event bus.
- A big-bang conversion to ES modules.

## Order and success

A1 first (small, high leverage, removes an active drift). A2 second, in waves. A3 starts with the
first post-R19 change and never stops.

Success is measurable: one place to add an agent verb, one way to touch a file in app code, and a
loader list that only shrinks. Nothing here changes what the app does.

## Second opinion

Strata reviewed the charter once and passed it. Its one condition was that `Zotero.File` must be
shown to actually wrap `IOUtils`/`PathUtils` before the migration is planned in detail; that check
is now the first A2 step. It also confirmed the explicit out-of-scope list as the right boundary for
a single-user local app.

*For the full documentation index, see [index.md](index.md).*
