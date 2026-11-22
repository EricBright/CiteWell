For the full documentation index, see [README.md](../README.md).

# Settings information architecture

Status: **Phase 0 inventory complete; Phase 1 structure manifest implemented; Phase 2 first slice
in progress.** Pane order, labels, icons, custom content sources and retirement metadata now come
from [`resource/settings/panes.json`](../resource/settings/panes.json). The first Phase 2 slice adds
an **Integrations** pane and moves LibreOffice and system integration out of Cite. No preference key
has changed.

## Why this exists

The current panes grew around upstream implementation history. The same user task is often split
across panes, while implementation details occupy their own sections. Examples:

- Note behaviour is in General, note migration is in Library, and legacy annotation export is in
  Library.
- File handling and renaming are in General; data and attachment base directories are in Advanced.
- System integration is inside Cite.
- Export contains only Quick Copy.
- General and Advanced both contain sections named "Miscellaneous".

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

## Current inventory

### General

Source: [preferences_general.xhtml](../chrome/content/zotero/preferences/preferences_general.xhtml).
Script: `preferences_general.js`.

| Section | Contents / keys | Script concern | Proposed destination |
|---|---|---|---|
| Appearance | Colour scheme, bibliography locale, item-pane header and its bibliography style/locale | General init also initializes locale menu | General |
| File Handling | `downloadAssociatedFiles`, `autoRecognizeFiles`, `automaticSnapshots` | General | Library & Files |
| File Renaming | File-renaming dialog | General | Library & Files |
| Attachment Titles | `showAttachmentFilenames` | General | Library & Files |
| Notes | `openNoteInNewWindow` | General | Notes & Annotations |
| Locate | OpenURL resolver and base URL | General | Library & Files |
| Miscellaneous | `automaticTags`, `trashAutoEmptyDays` | General | General → Behaviour |
| Groups | Copy child notes/files/annotations/links/tags | General | General → Behaviour |

### Library

Source: [preferences_library.xhtml](../chrome/content/zotero/preferences/preferences_library.xhtml).
Script: `preferences_library.js`. This pane is mostly workflow, not preference rows.

| Section | Contents | Script concern | Proposed destination |
|---|---|---|---|
| Current library | Open/move/replace active library | `preferences_library.js` | Library & Files |
| Locations | Per-component paths | same | Library & Files |
| Notes | Markdown migration and verification | same | Notes & Annotations |
| PDF annotations | One-time legacy annotation export | same | Notes & Annotations → Migration |
| Import from Zotero | Adopt-copy, replace, staged import | same | Import & Export |
| Restore points | Backups and restore | same | Import & Export |
| Last import | Last result | same | Import & Export |

### Export

Source: [preferences_export.xhtml](../chrome/content/zotero/preferences/preferences_export.xhtml).
Script: `preferences_export.js`.

| Section | Contents | Proposed destination |
|---|---|---|
| Quick Copy | `export.quickCopy.dragLimit`, format/site editor | Import & Export |

### Cite

Source: [preferences_cite.xhtml](../chrome/content/zotero/preferences/preferences_cite.xhtml).
Script: `preferences_cite.jsx`.

| Section | Contents | Script concern | Proposed destination |
|---|---|---|---|
| Styles | Style manager table and installed styles | `styles` deep link | Citations & Writing |
| Citation Dialog | `integration.citationDialogMode` | Cite | Citations & Writing |
| Citation Options | `export.citePaperJournalArticleURL` | Cite | Citations & Writing |
| Tools | Word-processor tools / template upgrade | `#wordProcessors` deep link | Integrations |
| LibreOffice | OXT install/repair, status, logs | `preferences_cite.jsx` | Integrations |
| System integration | systemd/D-Bus attention integration | Cite | Integrations |
| Word Processors | Hidden group used by integration upgrade | `#wordProcessors` | Integrations |

### Agent

Source: [preferences_agent.xhtml](../chrome/content/zotero/preferences/preferences_agent.xhtml).
Script: `preferences_agent.js`.

| Section | Contents | Proposed destination |
|---|---|---|
| Agent access / Connection / Setup / Capabilities / Skill / Audit | `agent.enabled`, token/endpoint, setup guidance, audit | Agent & API |

### Advanced

Source: [preferences_advanced.xhtml](../chrome/content/zotero/preferences/preferences_advanced.xhtml).
Script: `preferences_advanced.js`.

| Section | Contents / keys | Proposed destination |
|---|---|---|
| Miscellaneous | `automaticScraperUpdates`, translator update/failure reporting, local API | Advanced; local API → Agent & API |
| Language & Region | `bidi.browser.ui` | General |
| Files and Folders | `baseAttachmentPath`, `dataDir`, database maintenance | Library & Files; database maintenance → Advanced |
| Keys | Keyboard shortcuts | Advanced |
| Feeds | Feed defaults, TTL, cleanup and sorting | Advanced → Feeds subpane |
| Search | Full-text cache, index statistics | Advanced → Search subpane |

### Account

Source: [preferences_account.xhtml](../chrome/content/zotero/preferences/preferences_account.xhtml).
Hidden while `ONLINE_SYNC` is false. Keep the pane and its reset subpane conditional; it is not part
of the visible eight.

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
| [preferences_accountTest.js](../test/tests/preferences_accountTest.js) | Account pane | Sync remains conditional |

## Target layout

Eight visible panes, plus Account/Sync when online:

| Tab | Sections |
|---|---|
| **General** | Appearance, Language & Region, item-pane header, Behaviour (automatic tags, trash, group copy) |
| **Library & Files** | Current library, locations, item lookup/OpenURL, file handling, file renaming, attachment titles, data directory, attachment base directory |
| **Notes & Annotations** | Note opening, Markdown migration, legacy annotation export |
| **Citations & Writing** | Styles, citation dialog, citation options |
| **Import & Export** | Import from Zotero, restore points, last import, Quick Copy |
| **Integrations** | LibreOffice extension, system integration, Word-processor/Google Docs bridges and the hidden upgrade group |
| **Agent & API** | Agent access, local API, authorizations, audit |
| **Advanced** | Database maintenance, search index, feeds, keyboard shortcuts, translator updates/diagnostics |

Recommended defaults (to lock before Phase 1):

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
- The retired PDF indexing control remains removed from Advanced → Search.
- Library's legacy PDF annotation export remains marked `migration-only` until the Notes &
  Annotations split, so users do not lose their one-time export path.

Remaining Phase 2 work: split Library into Library & Files / Import & Export, create Notes &
Annotations, move file/data controls into Library & Files, migrate simple controls to descriptors,
and update the deep links that still point at General/Cite sections.

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
- Account remains hidden unless `ONLINE_SYNC`; do not make the eight-tab canvas depend on it.
- No preference key, data-directory path or stored value changes as part of the reorg.
