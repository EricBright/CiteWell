# UI architecture and the XUL question

**Status:** analysis, 2026-11-27. No code changed. This page answers two questions the settings
work exposed: why moving a control costs five edits, and whether dropping XUL would remove the
cause. Companion to [kde-hig-audit.md](kde-hig-audit.md) and [settings.md](settings.md).

## The symptom

Moving the Browser Connector from Advanced to Integrations took an afternoon and touched markup,
two scripts, the settings registry, two tests and three documents. The change was cosmetic to a
person using the app. The cost came from the code, not the design.

## Four layers, only one of them single-sourced

| Layer | State | Where location leaks in |
|---|---|---|
| Preference values | One source | `extensions.zotero.*`; a move never changes a key |
| Structure | Partial | `resource/settings/panes.json` registers the 9 panes and 9 generated sections, but a custom pane is a hand-written document; sections inside it are invisible to the registry |
| Identity | Not single | 39 element ids and 62 string keys name the pane; after the move the local API controls live in Agent access but still carry `preferences-advanced-*` keys |
| Behaviour | Not single | Scripts are declared per pane and loaded with that pane's document; `Zotero_Preferences.Advanced` owned functions for controls that moved |
| Expectations | Not single | Deep links target pane ids; tests assert file paths; `settings.md` records the layout |

The root cause is one sentence: **the pane document is the unit of everything**, so a section's
location is encoded in its name, its loader, its tests and its documentation. The preference values
are already a clean source of truth; the presentation is not.

## Is this inherited?

Partly. Upstream Zotero hand-writes panes, names its DTD keys after the pane, and keeps one module
per pane, but it never moves sections, so the coupling never cost anything. CiteWell added the pane
registry in D48 but stopped at pane metadata and generated sections; custom sections stayed
hand-written. The registry therefore knows panes, not sections.

## Can we drop XUL?

"XUL" covers two different things here, with different answers.

**The shell** is XUL: the main window, menubar, tabs, dialogs and the preferences window. CiteWell
runs Firefox ESR as its runtime (`zotero-bin -app application.ini`), not an embedded Gecko library.
Gecko no longer offers a supported embedding API, so removing the XUL shell means replacing Gecko
itself. That is not a UI change; it is an engine rewrite.

**The content** is already partly HTML and custom elements: 51 element modules, 32 `XULElement`
subclasses, React in the tab bar, 51 `html:` elements in the main window. Panes are XUL roots
holding HTML groups. Content can migrate to HTML and React incrementally, inside the same runtime.

What a rewrite would have to replace: 232k lines of JavaScript under `chrome/content/zotero`, 159
resource scripts including translators and the citation engine, 70 files that talk to the database
layer, the LibreOffice and word-processor bridges, and the build and packaging pipeline. That is a
multi-year program, not a cleanup, and it would still need a settings architecture.

## Options

| Option | What it fixes | Cost | Verdict |
|---|---|---|---|
| **A. Schema-driven settings inside Gecko** | The coupling: sections become data, ids and keys become semantic, initializers register once, tests assert the schema and the rendered DOM | Weeks, section by section | **Recommended now** |
| **B. Migrate pane content to HTML/React** | Per-pane documents and XUL widgets in content; makes A's renderer natural | Months, pane by pane | Do alongside A, pane by pane |
| **C. Out-of-process UI (Tauri/Electron) over a command API** | The whole UI stack; could later replace the engine | Quarters; the engine is not headless and the local API is read-mostly | Only after A/B create a command seam |
| **D. Full rewrite (Qt/Kirigami, Rust/Tauri, new engine)** | Everything | Years; loses compatibility and the tested data layer | Rejected |

Native look is not the deciding factor. It comes from theme integration, desktop conventions and
HIG conformance; a webview shell is not more native than a themed Firefox chrome, and Qt would be
native at the price of rewriting the engine.

## What "one source of truth" means concretely

A settings schema where each section is data:

- `id`, `paneId`, `order`, `titleKey`, optional `descriptionKey`;
- a control type, or `custom` with a component id;
- the preference key and its type, default and validation;
- a visibility predicate expressed as data, not code;
- an initializer id, registered once by the preferences window;
- search aliases and the deep-link target derived from the schema.

The renderer mounts sections where `paneId` says. Custom widgets register by type. Element ids and
string keys are derived from the section id, never from the pane. Tests assert schema invariants
and the rendered DOM, not file paths. `settings.md` can then be generated from the schema rather
than maintained by hand.

## What a two-week spike must prove

Take the Browser Connector section, which already moved once, and mount it from the schema:

1. A section moves by changing `paneId` only; no markup move, no id rename, no test edit.
2. Mounting is deterministic across XUL and HTML, with no duplicate nodes and stable order.
3. One initializer runs once, with no cross-pane state leakage and no script double-loading.
4. A migrated HTML control keeps the theme, focus ring, keyboard behaviour and accessible name of
   the XUL control it replaces.
5. Settings search finds the section and its deep link opens the right pane and scrolls to it.

If 3 or 4 fails structurally, stop and keep the current mechanism; that is the honest kill
criterion. If they pass, migrate the remaining movable sections one at a time.

## Why this is not wasted if the UI later leaves Gecko

The schema, the stable ids, the initializer registry and the test invariants are renderer-neutral.
Only the mount code is Gecko-specific. A future out-of-process UI would consume the same schema and
the same command boundary, which is the part a rewrite would otherwise have to invent first.

## Recommendation

Do not drop XUL or Gecko to fix this. Keep the shell, make the settings section the unit, migrate
content to HTML as sections are touched, and define the UI-to-core command seam before considering
an out-of-process UI. Record the schema decision before the next section moves, so the moves stop
being five-edit changes.

*For the full documentation index, see [../README.md](../README.md).*

## Proposed plan (awaiting approval)

**Status:** proposed 2026-11-27. No code until this is accepted. The four shape decisions are
settled: entries exist for groups and for the controls inside them; new semantic ids with today's
element ids kept as aliases; every label the book renders moves to Fluent, one item at a time;
actions live in the same book as preference controls.

The order below is the result of an adversarial pass. Its main correction was that migrating 55
controls and 8 locales before a renderer has mounted anything is the step that fails first, and
that the legacy label must not be deleted until the pilot proves parity.

### P0 — Freeze and inventory

Freeze every settings change, placement and copy. Derive one read-only placement inventory from the
current pane XHTML, `panes.json`, the CSS anchors and the pane-named ids, and reconcile it against
the rendered DOM: every one of the 55 controls, every section title and every action appears exactly
once, with its current pane, order, label key and behaviour.

**Gate G1:** the inventory count matches the DOM; nothing is unaccounted for. No behaviour changes.

The first pass found 10 pane documents, 33 preference-bound controls in markup, 18 settings
generated from `panes.json`, and 18 action buttons. The merged seed holds 26 sections and 126
items, including display text and duplicate account controls that the reconciliation will collapse.
It also surfaced two defects the copy tests could not see: the DNS radio labels and the sync "Stop"
button are hardcoded English, and the connector and local API titles are written by scripts at
runtime, so the inventory must include script-rendered text as well as markup.

### P1 — Schema, validator, aliases, resolver

Define the catalog format (panes, groups, controls, actions, aliases, label keys, visibility) and a
validator that enforces: one placement per item, one label per item, one binding per control, unique
ids, no orphan sections. Add a read-only resolver so a label key can be found in Fluent, in
`.properties` or in DTD while the migration is in flight, and a test that each key resolves in
exactly one system.

**Gate G2:** a dry-run renders the catalog into a skeleton page and every pane, section and control
resolves; deep links and search still find the current panes.

The rules are already in the settings validator: `sections[]` is optional today, and when present it
requires a known pane, a unique id, an order and a title key; each item needs exactly one binding
(a preference, a command, a display value or a text key); and a preference or item id may appear
once in the whole manifest. Five unit tests cover the rejections. No section uses the array yet, so
the live manifest still validates unchanged.

### P2 — Pilot A1: placement, Browser Connector

**Done 2026-11-27.** The connector is the first catalog section: `sections[]` names its pane, order,
title and items, the renderer mounts it, and the Integrations pane no longer contains its markup.
Its old element id is recorded as an alias. `preferences_advancedTest` proves the section renders in
the integrations pane at its declared position, and a second test changes only `paneId` and asserts
it renders in Agent access instead. The labels are still the existing `.properties` strings, so P3
is unchanged text on a new mounting path.

### P3 — Pilot A2: labels, Browser Connector

**Done 2026-11-27 for the pilot section.** Its four strings moved to Fluent in all eight locales,
the translations were copied, and the old `.properties` keys were deleted. The renderer resolves a
text key through the old string table first and falls back to Fluent, so both systems work during
the migration without a second lookup table; the test asserts the title and the button label are
actually translated, not merely present.

**Gate G3:** no visual or accessibility difference; the locale test passes in all eight languages;
no item uses two label systems at once.

### P4 — Pilot B: Local API

**Done 2026-11-27.** The group is catalog data: a pref-bound checkbox, a computed address, a clear
action, the server-disabled note and the enable-and-restart action. Visibility and disabled state
are named conditions resolved centrally, not pane code; the address and the authorization count are
set by a registered initializer. The Agent pane no longer contains the group or its functions.

The test proves the Fluent title, the address and the clear button render, and that turning the API
off hides both without a reload. The server-disabled branch is code-reviewed but not exercised: the
suite runs with the server enabled, and flipping that preference would stop the server mid-run.

### P5 — Pilot C: actions, Database Maintenance

**Done 2026-11-27.** The two actions are catalog items with no preference, bound in the shared action
table and moved out of the pane module, so they travel with the section. Their labels moved from DTD
to Fluent in all eight locales. The integrity-check failure message no longer points at
`zotero.org/utils/dbfix`; it reuses the existing "report this problem on CiteWell's issue tracker"
string, so the old Zotero tool link is gone without a new translation.

The test proves the Fluent title and both action labels render. Gate G4 was met in P2's move test:
changing only `paneId` renders the section in another pane.

**Gate G4:** moving a group is a one-field edit plus a test run.

### Advanced slice (in progress)

The Advanced pane is the forced case because it contains one of each remaining shape.

- **Radios are supported.** A setting may bind a preference directly or name a `change` action, which
  is how the DNS resolver applies itself. Its section moved to the catalog, its six hardcoded English
  strings were drafted into all eight locales, and the DNS module is now loaded with the preferences
  window rather than the pane, so the section can move without losing its behaviour.
- **Components are supported.** A section may name a registered component instead of items. The
  Keyboard Shortcuts grid is the first one: the component builds the seven rows, the labels moved
  from DTD to Fluent in eight locales, and the section is now placed by data.
- **Ordering rule.** While hand-written content remains in a pane, a section may use `before` or
  `after` as a transition anchor. Once a pane is fully catalog-owned, only `order` decides. Anchors
  are therefore temporary, not a second map.
- **Translator updates moved too.** The generated section became a catalog group, so the last
  manifest-generated section in Advanced is now catalog data.
- **Feeds and the full-text index panel are components too.** With them, every section in Advanced
  is catalog data: DNS, database maintenance, keyboard shortcuts, translator updates, feeds and the
  index panel. The transition anchors were removed, so catalog order alone places them; only the
  Config Editor row remains hand-written at the end of the pane, outside the section list.

### Integrations pane (done)

The whole pane is catalog data now: the connector, the LibreOffice extension and the system
integration are three sections, in that order, each a component. The pane document is empty except
for its load hook.

The move fixed a latent bug: the system-integration refresh looked up an element id that no longer
existed, so the status line and the repair/remove buttons were never updated. The component now
marks its group, and the status text uses Fluent with the manifest path passed as an argument.

It also fixed mounting for an empty pane: a pane with no hand-written section used to put its title
beside the pane document, which sent catalog sections outside it. The title and the sections now go
inside the pane root.

### Agent access (done)

Every block in the pane is catalog data: Agent access and Connection, the local API, Set up an
agent, What agents can do, Agent skill and Audit. The shell snippet keeps its commands in English
because they are code, while its five step comments are Fluent messages assembled around those
commands, so the snippet stays valid shell in every language. The capability list keeps the protocol
verb names in English for the same reason; the sentence around them is translated.

Its labels are Fluent drafts in eight locales, and the token and audit paths use Fluent messages with
the path as an argument instead of hardcoded prefixes.

### Library & Files (in progress)

Current library, Locations, File renaming and the attachment base directory are catalog components.
The file-renaming button keeps its Fluent labels and its search aliases. The base directory's
preference listener moved from the Advanced module's init into the section initializer, so the field
updates in the pane that owns it; its message also said "Zotero will use relative paths" in every
locale and now says CiteWell.

Locate/OpenURL is a component too: the resolver menu and the server field keep their ids and the
General handlers that populate them, and its title moved from DTD to Fluent.

Section initializers now run after the section is inserted into the document. That order is what
lets an initializer use `document.getElementById()` like a pane module does; before this, the base
directory initializer ran against a detached tree and silently found nothing.

The data directory is the last Library component: current path, Change, the command-line override
note, Reveal, custom/reset/default states and the migration button. Its logic still delegates to the
Advanced module for now; extracting it into a data-directory module is a follow-up, not a placement
question. With it, the Library pane document is empty and the whole pane is catalog-owned.

### Settings text audit (2026-11-27)

All pane labels are Fluent now. What remains is not labels but three pools:

- **The hidden Account/Sync pane is gone** (2026-11-27). The pane, its reset subpane, the
  libraries-to-sync dialog, its script and its test were removed, along with every code path that
  opened it. Unreferenced DTD entities were pruned from all eight locales; the pruning counts a
  reference in JavaScript and `panes.json` as a use, because `Zotero.getString()` reads the DTD as a
  string bundle.
- **About seventy `.properties` keys used by preferences JavaScript** for dialogs and status text:
  `general.error`, `general.warning`, `general.restartRequired`, `db.integrityCheck.*`,
  `zotero.preferences.advanced.reset*`, `zotero.preferences.export.quickCopy.*`, the data-directory
  migration messages and the style-reset prompts. These are runtime messages, not pane labels, and
  moving them needs an asynchronous Fluent helper because `Zotero.getString()` is synchronous.
- **Dialogs opened from Settings.** The Quick Copy site editor is Fluent now; the file-renaming
  dialog already was; the confirmation dialog takes its labels from callers; the libraries-to-sync
  dialog belongs to the hidden sync pane.

Recommended order: decide the sync pane's fate, then migrate the visible message keys with a small
`formatMessage` helper, then re-run this audit. The audit is a count and a classification, not a
bulk rewrite.

### Import & Export (done)

**Quick Copy (done).** It is a catalog component now: instructions, the two format menus, the
locale menu, Copy as HTML, the note-format options, the site-specific table, Edit/Remove/Add and the
drag limit. Its labels moved from DTD to Fluent, and the Export module initializes after mounting,
deferred and error-guarded.

**The import half is done too.** Import from Zotero, Restore points, Duplicate review and Last
import are four components, with their twenty English strings drafted in eight locales and the
staged import/restore/merge states kept as ids and classes for the Library module. The pane document
is empty except for its root, and the pane order is catalog order.

Every settings pane is now catalog-owned.

### Cite pane (done 2026-11-27)

The style manager, its three buttons, the style editor and preview tools, and the hidden
word-processor block are catalog components. The section ids `styles` and `wordProcessors` were
kept because deep links target them. The pane's init now runs from the styles section initializer
after mounting, deferred and error-guarded, instead of from a pane load hook that ran before the
catalog existed.

The Manage Styles test expected a separate preferences window; since D48 routes settings into a main
window tab, the test now stubs `openPreferences` and asserts that the button targets the Cite pane
with `#styles`. The real routing is covered by `settingsTabTest`.

### One list (done 2026-11-27)

The generated-section list (`simpleSections`) is retired. Its eight sections — Language & Region,
Groups, Behaviour, the citation-dialog mode, file handling, attachment titles and Note behaviour —
are ordinary catalog sections now, with the number control added for the trash-retention field.
`panes.json` no longer contains a second structure list, and the generated-section renderer is
gone.

A duplicate copy of the catalog renderer, found while doing this, was removed; both copies were
identical, so no behavior changed, but the duplication would have hidden a future edit to the dead
copy.

### General pane (in progress)

The Appearance section is a catalog component: the colour scheme radios, the bibliography locale
menu, the item-pane header menu and its dependent style and locale menus. The menu ids and their
handlers are unchanged, so the General module still initializes them. The locale label moved from
DTD to Fluent.

The rest of General is still the generated-section mechanism (`simpleSections`): Language & Region,
Groups and Behaviour. Those are already data, but in a second list. Converting them to the same
catalog is the next step, and it needs the number control the Behaviour section uses.

### Notes pane (done)

Both sections are catalog components: note migration and the legacy PDF-annotation export. Their six
English strings moved to Fluent in eight locales as drafts, and the pane document is empty except
for its load hook. The Notes module still owns the behaviour, and its status and progress elements
keep their ids.

### P6 — Bulk text migration

Only after the pilots: migrate every string in Settings, per item, including the dialogs and
messages that Settings opens (the integrity-check results, for example). Copy the existing
translations, delete the legacy key, and extend the locale completeness test. No item keeps both
systems. This is the widened scope confirmed on 2026-11-27; strings outside Settings are not part
of it.

### P7 — Rollout and cleanup

Migrate the remaining sections pane by pane; generate `settings.md` from the catalog; delete an alias
when a search finds no test, deep link or document still using it.

**Gate G5:** the generated settings page matches the catalog; no alias remains in use.

### Rollback and kill criteria

Each pilot is one group: reverting it is restoring its markup and removing one catalog entry. Old
label keys survive until parity is proven; aliases survive until no consumer remains.

Stop the program if a migrated HTML control cannot keep the theme, focus ring, keyboard behaviour
and accessible name of the XUL control it replaced, or if mounting is not deterministic. Those are
structural, not cosmetic, and no amount of catalog design fixes them.

### Scope boundary

The text scope is the whole Settings surface, including the dialogs it opens; that was confirmed on
2026-11-27. Strings elsewhere in the app, such as import errors or the main window, are not part of
this program. Dropping XUL or Gecko, and moving menu actions into the same book, are separate
decisions after this plan.

## Worked entries

Three real items, in the proposed format:

```yaml
- id: browser-connector
  kind: content
  placement: { pane: integrations, order: 10 }
  title: browser-connector-title
  body: [browser-connector-body1, browser-connector-body2]
  button: { label: browser-connector-download, opens: connector-download-page }

- id: local-api
  kind: group
  placement: { pane: agent-access, order: 30 }
  title: preferences-local-api-title
  description: preferences-local-api-description
  controls:
    - id: local-api-enabled
      kind: setting
      control: checkbox
      pref: extensions.zotero.httpServer.localAPI.enabled
      label: preferences-local-api-enabled
    - id: local-api-url
      kind: display
      label: preferences-local-api-available
      value: local-server-url
      visible-when: local-api-enabled
    - id: local-api-clear
      kind: action
      action: clear-local-api-authorizations
      label: preferences-local-api-clear-authorizations
      visible-when: local-api-enabled
    - id: local-api-enable-server
      kind: action
      action: enable-http-server
      label: preferences-local-api-enable-server
      visible-when: server-disabled

- id: database-maintenance
  kind: group
  placement: { pane: advanced, order: 20 }
  title: preferences-database-maintenance
  controls:
    - id: check-integrity
      kind: action
      action: check-database-integrity
      label: preferences-database-integrity-check
    - id: reset-translators
      kind: action
      action: reset-translators
      label: preferences-database-reset-translators

- id: agent-access
  kind: pane
  title: preferences-pane-agent
  order: 70
```

The Local API entry shows the two current defects the book exposes: the group has no translatable
title or description today, and its existing label keys still say `advanced` although the group
lives in Agent access.
