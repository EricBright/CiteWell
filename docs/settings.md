For the full documentation index, see [index.md](index.md).

# Settings information architecture

Status: **Phases 0–3 implemented.** Pane order, labels, icons, custom content sources and retirement metadata now come
from [`resource/settings/panes.json`](../resource/settings/panes.json). The first Phase 2 slice adds
an **Integrations** pane, a **Notes & Annotations** pane, and an **Import & Export** pane; the old
Export pane has been merged into it. Cite now sits immediately after General. File handling, file
renaming, attachment-title controls and Language & Region have moved to their task panes. No
preference key has changed.

## Why this exists

The current panes grew around upstream implementation history. The same user task is often split
across panes, while implementation details occupy their own sections. Examples:

- Note behaviour is in General, note migration is in Library, and legacy annotation export is in
  Library.
- File handling and renaming are in General; data and attachment base directories are in Advanced.
- System integration is inside Cite.
- Export contains only Quick Copy.
- Advanced carried a section named "Miscellaneous" with a single control (removed in D67).

The target is not "more tabs for their own sake". The target is one semantic settings document that
owns pane, section, label, order, search alias and visibility metadata, rendered by the presentation
layer. Complex workflows remain custom components; they are placed by the registry, not generated
from raw preference values.

## Principles

1. **UI-only reorganization.** Preference keys and stored values do not change. No settings data
   migration is part of this work.
2. **Preserve pane IDs until the links are migrated.** Pane IDs are used by deep links, tests and
   `lastSelectedPrefPane`.
3. **One section belongs to one task.** A section may move; it must not be duplicated.
4. **Custom is a first-class section type.** Library import/restore, Agent setup, style management
   and data-directory migration are not generic form rows.
5. **No new JavaScript for the registry phase.** The renderer starts in the existing preferences
   shell; complex sections keep their existing scripts. A new module would require a decision
   record.
6. **Localizable from the start.** New labels use FTL keys; do not add more raw English labels.
7. **The registry is data, not executable policy.** It may say "visible when preference X equals Y";
   it may not contain arbitrary functions or expressions.

## Manifest pane IDs

The manifest is the source of these IDs. The settings validator requires each one to remain
documented.

<!-- BEGIN SETTINGS CATALOG -->
<!-- Generated from resource/settings/panes.json by `cargo run -p xtask -- settings-docs`. Do not edit. -->
| Pane | Order | Sections |
|---|---|---|
| `zotero-prefpane-general` | 10 | `general-appearance` (component, 0 items); `language-region` (group, 1 item); `groups` (group, 5 items); `behaviour` (group, 2 items) |
| `zotero-prefpane-cite` | 20 | `styles` (component, 0 items); `cite-tools` (component, 0 items); `citation-dialog` (group, 1 item); `citation-options` (group, 1 item); `wordProcessors` (component, 0 items) |
| `zotero-prefpane-notes` | 40 | `notes-migration` (component, 0 items); `annotations-export` (component, 0 items); `note-behaviour` (group, 1 item) |
| `zotero-prefpane-import-export` | 50 | `import-library` (component, 0 items); `restore-points` (component, 0 items); `duplicate-review` (component, 0 items); `last-import` (component, 0 items); `quick-copy` (component, 0 items) |
| `zotero-prefpane-integrations` | 60 | `browser-connector` (content, 3 items); `libreoffice` (component, 0 items); `system-integration` (component, 0 items) |
| `zotero-prefpane-agent` | 70 | `agent-access` (component, 0 items); `agent-setup` (component, 0 items); `local-api` (group, 5 items); `agent-capabilities` (component, 0 items); `agent-skill` (component, 0 items); `agent-audit` (component, 0 items) |
| `zotero-prefpane-library` | 80 | `library-current` (component, 0 items); `file-handling` (group, 3 items); `library-file-renaming` (component, 0 items); `attachment-titles` (group, 1 item); `library-base-dir` (component, 0 items); `library-data-dir` (component, 0 items); `library-locate` (component, 0 items) |
| `zotero-prefpane-advanced` | 90 | `dns` (group, 3 items); `database-maintenance` (group, 2 items); `keyboard-shortcuts` (component, 0 items); `feeds` (component, 0 items); `search-index` (component, 0 items); `translator-updates` (group, 3 items) |
<!-- END SETTINGS CATALOG -->

## Current inventory

The generated block above is the structural inventory: panes in order, and the catalog sections each
owns. Behavioural notes that do not fit a table row live in the code and its tests; this page does not
repeat them by hand.

## Deep links and tests

| Entry point | Current target | Must update when |
|---|---|---|
| [integration.js](../chrome/content/zotero/xpcom/integration.js) | Cite pane, `#wordProcessors` | Word-processor tools move |
| [bibliography.js](../chrome/content/zotero/bibliography.js) | Cite pane, `#styles` | Styles move |
| [locateMenu.js](../chrome/content/zotero/locateMenu.js) | General pane, `#zotero-prefpane-locate-groupbox` | Locate moves |
| [itemPaneHeader.js](../chrome/content/zotero/elements/itemPaneHeader.js) | General pane | General changes |
| [zoteroPane.xhtml](../chrome/content/zotero/zoteroPane.xhtml) | Agent pane | Agent pane ID changes |
| [preferences_advancedTest.js](../test/tests/preferences_advancedTest.js) | Advanced pane | Base-directory or file controls move |
| [importTest.js](../test/tests/importTest.js) | Library pane registration/open | Library splits |
| [agentTest.js](../test/tests/agentTest.js) | Agent pane | Agent moves |
| [bibliographyTest.js](../test/tests/bibliographyTest.js) | Cite pane selection | Cite splits |

## Target layout

Eight visible panes:

| Tab | Sections |
|---|---|
| **General** | Appearance, Language & Region, item-pane header, Behaviour (automatic tags, trash, group copy) |
| **Citations & Writing** | Styles, citation dialog, citation options |
| **Notes & Annotations** | Note opening, Markdown migration, legacy annotation export |
| **Import & Export** | Import from Zotero, restore points, last import, Quick Copy |
| **Integrations** | Browser Connector, LibreOffice extension, system integration, Word-processor/Google Docs bridges and the hidden upgrade group |
| **Agent & API** | Agent access, local API, authorizations, audit |
| **Library & Files** | Current library, locations, item lookup/OpenURL, file handling, file renaming, attachment titles, data directory, attachment base directory |
| **Advanced** | Database maintenance, search index, feeds, keyboard shortcuts, translator updates/diagnostics |

Locked defaults:

- **Notes & Annotations** is a standalone tab.
- **Locate/OpenURL** belongs in **Library & Files**.
- Word-processor bridges belong in **Integrations**; Citation settings stay formatting-focused.
- **Feeds** is an Advanced subpane, not a top-level tab.

## Phase 1 implementation

[`resource/settings/panes.json`](../resource/settings/panes.json) is the current structure manifest.
It contains the existing panes as `custom` content entries, their order, labels, icons, scripts,
help URLs, the online-sync condition and a `retired` list.
[preferencePanes.js](../chrome/content/zotero/xpcom/preferencePanes.js) loads it asynchronously;
[preferences.js](../chrome/content/zotero/preferences/preferences.js) waits for it before building
the sidebar.

`cargo run --manifest-path tools/Cargo.toml -p xtask -- validate-settings` checks version, IDs,
labels, order, parent references, content types, scripts and retirement entries. The pre-commit
hook and the guard workflow run it.

The Phase 1 retirement action is deliberate and small: the obsolete **PDF max pages** indexing
control has been removed from Advanced → Search, and the manifest marks
`fulltext.pdfMaxPages` as retired. The Library → **PDF annotations** group remains temporarily
because it is the one-time export path for legacy annotations; the manifest marks it
`migration-only`. It moves to Notes & Annotations (or disappears after the migration window) in
Phase 2 rather than being silently hidden before users can export.

## Phase 2 progress

First slice:

- New `zotero-prefpane-integrations` pane, backed by
  [preferences_integrations.xhtml](../chrome/content/zotero/preferences/preferences_integrations.xhtml).
- LibreOffice extension installation and system-integration controls moved out of Cite.
- Existing `preferences_cite.js` behavior is reused; no new script module was added.
- New `zotero-prefpane-notes` pane, backed by
  [preferences_notes.xhtml](../chrome/content/zotero/preferences/preferences_notes.xhtml).
- Note behaviour moved out of General; note migration and legacy PDF annotation export moved out of
  Library. `preferences_library.js` now exposes a small `Notes` initializer while retaining the
  migration methods.
- The retired PDF indexing control remains removed from Advanced → Search.
- The legacy PDF annotation export remains visible in Notes & Annotations and is marked
  `migration-only`, so users do not lose their one-time export path.
- Import & Export now contains Quick Copy, import from Zotero, restore points and last-import
  status. The old standalone Export pane is retired.
- Library & Files now contains current-library/location controls plus file handling, file renaming,
  attachment titles and the OpenURL resolver is still pending a later split.
- Language & Region moved from Advanced to General.
- Cite is ordered immediately after General; the settings test asserts that adjacency.
- Attachment base-directory and data-directory controls moved from Advanced to Library & Files;
  database maintenance remains in Advanced.
- OpenURL/Locate moved from General to Library & Files; the Locate menu deep link opens that pane,
  and the no-resolver prompt now names Library & Files instead of General.
- Language & Region, Notes → Note behaviour, General → Groups, Cite → Citation Dialog, Cite →
  Citation Options, Library & Files → File Handling and Library & Files → Attachment Titles are now
  catalog sections rendered by the preferences shell. The renderer supports
  checkbox and radio controls, ordered insertion, and labels through the existing DTD/FTL string
  path; controls still use the existing preference binding.

Phase 3 is complete: search aliases, documentation coverage, duplicate validation and cleanup are in
place. Further conversion of the remaining complex custom sections is optional and should be driven
by need, not by a desire to make every control generic.

## Phase 3 implementation

- Simple sections can declare `searchAliases`; the renderer exposes them through the existing
  `data-search-strings-raw` search path, so a descriptor need not rely only on visible labels.
- `validate-settings` now requires every manifest pane ID to appear in this document, rejects
  duplicate simple setting IDs and duplicate preference keys, and validates alias arrays.
- The manifest pane-ID table above is the documentation hook for that check.
- Descriptor controls remain preference-bound through the shell; radio/number/button handlers are
  validated where they are rendered.

## Cleanup decisions

- The old `preferences_export.xhtml` is retired; Quick Copy lives in
  `preferences_import_export.xhtml`, and the old Export pane is recorded as a retired manifest
  entry.
- Legacy PDF annotation export stays in Notes & Annotations as `migration-only` until the
  migration window closes. It is not a supported PDF feature.
- The hidden Word-processor integration group stays in Cite for now; it is the target of the
  integration upgrade deep link and is not part of the Linux presentation.

## Registry shape

Phase 1 introduces a data document for structure only:

```text
pane:    id, labelKey, icon, order, helpURL, visibility
section: id, paneId, labelKey, descriptionKey, order, visibility
setting: id, sectionId, type, preferenceKey, labelKey, descriptionKey,
         searchAliases, options, visibility
custom:  id, sectionId, component, script, order
```

The renderer maps `type` to existing XUL/HTML controls. `custom` selects an existing component;
it does not receive arbitrary JavaScript from the data file. A small predicate vocabulary handles
visibility, for example `pref-equals` and `platform`. The document is versioned and validated by
Rust tooling; the runtime renderer lives in the existing preferences shell.

## Migration phases

**Phase 0 — inventory.** This document. Lock the target taxonomy and decision points.

**Phase 1 — structure manifest.** Add the pane/section registry and render the current pane
fragments as custom sections. No preference control is converted yet. This delivers tab order,
section order, labels, search metadata, deep-link IDs and the documentation inventory.

**Phase 2 — simple controls.** Convert appearance, language/region, behaviour, file handling,
attachment titles and similar basic rows to descriptors. Keep Library workflows, Agent, Styles,
data migration and Advanced tool panels custom.

**Phase 3 — reuse.** Generate settings-search metadata, docs inventory and tests from the registry.
Do not build a general-purpose form builder or a mini-language for custom workflows.

## Guardrails for implementation

- Keep pane IDs stable until every caller and test is updated; changing an ID is a separate
  mechanical commit.
- Never duplicate a preference key between panes. Validation rejects duplicates and unregistered
  keys.
- A moved section must move its script behaviour or explicitly reuse the owner script. Avoid
  loading the same initializer twice with duplicate listeners.
- New labels get FTL keys. Keep raw labels only where the existing pane already has them, and
  convert them during the relevant phase.
- Search aliases and help URLs belong in the registry, not in per-pane special cases.
- The settings search must remain able to find moved controls; test by searching for a moved label
  and its old alias if one exists.
- No preference key, data-directory path or stored value changes as part of the reorg.
