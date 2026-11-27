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

The hardest group: a preference checkbox, a computed value, two actions, and visibility rules. Add
its initializer to the central registry rather than the pane script. Prove pref reads and writes,
dependent UI, and that no initializer runs twice.

### P5 — Pilot C: actions, Database Maintenance

Two actions with no preference. Bind them through the central action registry, add a test that every
catalog action has a live handler (a registered action that does nothing is the silent failure),
and run the acceptance test: change only the `pane` field, assert the group renders in the new pane,
with its labels, aliases and deep link intact.

**Gate G4:** moving a group is a one-field edit plus a test run.

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
