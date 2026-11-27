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
