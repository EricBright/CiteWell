# KDE HIG audit

**Status:** audit only, 2026-11-27. No code or copy changed. Code audited at `f24e45baf`,
which differs from release `2026.11.27.000` (`6f5f19f9a`) only in `docs/status.md`.

The audit reads all ten pages of the [KDE Human Interface Guidelines](https://develop.kde.org/hig/)
and checks the app against them. It is an input to a decision, not a work order. The companion
question is not "are we compliant" but "which of these gaps would a user feel, and what would each
cost".

## Scope and limits

The HIG says a KDE app is built with Qt and KDE Frameworks, and that applications outside Qt get the
principles but not the components. CiteWell is a XUL/GTK-themed application and will never satisfy
the component guidance. Every rule below is therefore graded on behaviour, not on toolkit.

The HIG also states that it is "not an ironclad law code" and covers "a *what* and a *why*, not a
*how*". Divergence is legitimate when it is deliberate and written down; the point of this page is
to make each divergence a decision rather than an accident.

**Method.** A rule set was extracted from the ten pages (200 rules, 181 applicable to a non-Qt
desktop app) and grouped into the checks below. Each check was verified by reading the source.
There was no runtime GUI pass: the machine has no virtual display, and launching the app would take
focus from the person using it. Checks that can only be settled at runtime are listed separately and
are **not** claimed either way.

## Highest-priority finding (outside the HIG)

**Settings > Help still opens Zotero's support site.** Four panes and one sub-pane in
[panes.json](../resource/settings/panes.json) carry a `helpURL` on `zotero.org`
(`#L18`, `#L35`, `#L82`, `#L146`, `#L163`), and the Help button under a pane launches it
(`preferences.js:167-170`). This contradicts D63, the rule in [ui.md](ui.md) that a link never
points at another product's documentation, and the published release note that "Zotero's support
site, forums and error-report service are no longer linked or contacted". It is a bug that survived
R6, not a guideline question.

Options: point each Help button at the matching CiteWell documentation (the repo's `docs/` is
public), point all of them at GitHub Discussions, or remove the button. Removing is the smallest
change; repointing keeps help useful.

**Resolved 2026-11-27 (D66):** the five links point at `https://github.com/EricBright/CiteWell`,
and the repository's Discussions and Issues were enabled so the app's support links resolve.

## Where the app conforms

These are the checks the app passes, with the evidence that made me say so.

| Check | HIG topic | Evidence |
|---|---|---|
| First launch and empty library show one line and one action | Simple by default, welcoming | `pane.items.intro.text1` rendered at `collectionViewItemTree.js:2160`; `uiCopyTest` pins the Browse action |
| No first-run wizard asking preferences | Simple by default, welcoming | No wizard flow exists |
| Settings apply immediately, no OK/Apply/Cancel | Powerful when needed, customization | `preferences.xhtml` has one Help button and no dialog buttons; changes write through `Zotero.Prefs` |
| Settings are searchable and one click from the menubar | Layout, navigation | `preferences.xhtml` search box; Settings sits between Tools and Help (`ui.md` rule 7) |
| Shortcuts use modifier keys, not bare functions | Layout, laptop use | Every app key has `accel`/`shift`, except `F3` Find Again (`editMenuOverlay.dtd:10`), which is the GTK/Firefox convention |
| Window size and position are restored | Simple by default, remember history | `persist="screenX screenY width height sizemode"` (`zoteroPane.xhtml:47`) |
| The selected view is restored | Same | Open tabs and their state are persisted in `session.json` (`session.js`), and the last settings pane is remembered |
| No system tray icon | Simple by default, background | No tray code |
| Tasks over a second show progress | Simple by default, responsiveness | `Zotero.ProgressWindow` in eight modules, determinate where a count exists |
| Errors point at CiteWell's own support | Status changes, errors | Help > Discussions and Report a Problem route to GitHub (D62, D63); the Zotero error service is not called |
| No negative technical language | Inclusiveness | No `Abort`, `Kill`, `Fatal`, `Force` in en-US strings |
| Search fields use the plain placeholder "Search" | Text and labels, placeholders | `zotero.dtd:144` |
| Renaming collections and items happens inline | Simple by default, common workflows | `collectionTree.js:250`, `.startEditing` |
| Window title names the open view | Text and labels, window titles | `document.title = tab.title + " - " + appName` (`tabs.js:415`) |
| Light and dark schemes are both handled | Consistency, colour | `prefers-color-scheme` mixins throughout `scss/` |
| Destructive item actions go to Trash, not deletion | Simple by default, safety | Trash is the default for items; "Delete from Library" is separate |
| Inline help sits under the control or at the top of the section | Displaying content, inline help | Sections in the settings panes carry a description line |
| The connector is explained in Settings, not sold in Tools | Simple by default, important UI | D65; `preferences_advanced.xhtml:91` |

## Where the app diverges

Grades: **A** is copy or a single attribute, no design question; **B** is a small layout or
behaviour change; **C** is a project.

| Divergence | HIG topic | Evidence | Grade |
|---|---|---|---|
| One button label uses three periods instead of `…` | Ellipses, symbols | `integration.mendeleyImport.openImporter` (`zotero.properties:922`) | A |
| One window has the wrong title: the file locator says "CiteWell Preferences" | Window titles | `locateManager.xhtml:35` uses `&zotero.preferences.title;` | A |
| Six user-facing dialogs have no title at all: About, hard confirmation, Merge, Libraries to Sync, Quick Copy site editor, Publications | Window titles | No `title` attribute and no `document.title` assignment | A |
| Confirmation text addresses the person: "Are you sure you want to…" (about 20 strings) | Mood and tone | `zotero.properties:310-323`, `reader.ftl:57-64` | A, with eight-locale cost |
| Some confirmations use "Yes"/"OK" rather than the verb | Imperative labels | `preferences_account.js:1097` passes `acceptLabel: yes` | A |
| Menu mnemonics are sparse: 6 of 26 menus and 8 of 199 menu items set an accesskey, and only six Fluent messages define one, so effective coverage is about 7% | Keyboard accelerators | `zoteroPane.xhtml` and `zotero.ftl` | C |
| Irrelevant menu items are hidden rather than disabled | Menus are static | `standalone.js:160-168` toggles `hidden` by tab type | B |
| The item list has no alternating row shading | Lists and grids | No `nth-child` striping outside the citation dialog | B |
| 30 standard prompt calls remain (12 `confirm`, 10 `alert`, 6 `confirmEx`, 1 `prompt`, 1 `confirmCheck`), plus two `window.prompt` | Minimize dialogs | `grep Services.prompt` across `chrome/content/zotero` | C |
| Second-person instructions in about 167 string lines | Mood and tone | `zotero.properties` | C, with eight-locale cost |
| Icons are bundled rather than taken from the system theme | Icons | `chrome/skin/` ships the icon set | C, structural |
| Shortcuts are assignable, but the editor sits under Advanced | Powerful when needed, accelerators | Keyboard-shortcut grid in `preferences_advanced.xhtml`; seven keys only | A, once it moves |
| Several toolbar buttons set `tabindex="-1"` | Accessibility, keyboard | `zoteroPane.xhtml` toolbar | Unknown until a keyboard pass |

## Decisions the audit raises

These are not defects. Each conflicts with something already decided, so the HIG is one input
rather than a verdict.

1. **The Browser Connector sat under "Advanced".** Resolved 2026-11-27 (D67): the section moved to
   Integrations, and the local API that shared the pane moved to Agent access. The HIG asked for
   this, and moving the controls needed no new translations because the strings travelled with
   them.
2. **Modal citation dialogs.** The HIG asks to minimize dialogs and to prefer inline input. The
   [attention contract](attention.md) deliberately makes citation and document-preferences dialogs
   parented and modal, because an invisible prompt was the original failure. The contract wins; the
   divergence should be recorded rather than fixed.
3. **Hiding menu items by tab type.** The HIG wants a static menubar with irrelevant items disabled.
   Disabling instead of hiding is a small code change but adds noise in the common case. Defensible
   either way; if kept, record it.
4. **No row shading in the item list.** The HIG recommends alternating backgrounds when rows carry
   right-side data. A dense bibliography is a wall of text; shading could help scanning or could add
   visual noise. This is the one purely visual experiment worth a screenshot before deciding.
5. **Em dashes, serial commas, and "&".** The HIG's typography rules conflict with [ui.md](ui.md)
   rule 1 and our comma practice. Our rules are deliberate and stay; record the divergence.
6. **Bundled icons.** The HIG asks for the FreeDesktop icon theme. A XUL app cannot consume Breeze
   icon names wholesale, and the inherited icon set is part of the product's look. Accept and
   record.

## Not verified

These need a person or a virtual display; the audit does not claim them either way:

- Keyboard-only operability of every control, and whether focus is visibly distinct from selection.
- Screen-reader names and duplicate labels (Orca).
- Tooltip text on keyboard focus.
- No dialogs stacked on dialogs.
- RTL layout with an Arabic locale.
- Two-finger touchpad scrolling behaviour.
- Drag-and-drop previews.
- Layout at a 14 px system font size.

## Adjacent findings, outside the HIG

- No AppStream `metainfo.xml`, so software centres have no description, screenshots or release
  notes for CiteWell. The desktop entry also lacks `Keywords`, `GenericName` and `StartupNotify`,
  and its Comment still reads "Research manager built on Zotero".
- Several legacy strings still say Zotero in en-US (`install.quickStartGuide.*`,
  `dataDir.selectedDirNonEmpty.text`, `dataDir.selectedDirEmpty.text`). Some are unused; the
  `quickStartGuide` block has no code reference.

## Recommendation

The gap between CiteWell and the HIG is smaller than expected in the places where a Windows-heritage
app usually fails: settings apply immediately, shortcuts are conventional, windows remember
themselves, errors route to our own tracker, and the copy avoids hostile technical language. The
real gaps cluster in three places: **dialog and window titles**, **confirmation wording**, and
**keyboard/mnemonic coverage**.

Suggested order, smallest first:

1. **Now, as a bug fix:** the Settings Help links to `zotero.org`, and the wrong title on the file
   locator. Both are small and both are currently misstatements about the product. The links were
   retargeted to the CiteWell repository and GitHub Discussions/Issues were enabled (D66).
2. **One copy batch, next release:** the ASCII ellipsis, the six missing dialog titles, and the
   confirmation rewrites. Batch them so the eight locales are touched once.
3. **One decision:** move the connector from Advanced to Integrations, or record why not.
4. **Defer:** mnemonics, row shading, dialog minimization, second-person copy, and the runtime
   accessibility pass. None is worth a project on its own evidence yet.

*For the full documentation index, see [../README.md](../README.md).*
