# UI behaviour

**Status:** R6, started 2026-11-25. Every behaviour change gets a decision record and a test that
can fail; this page holds the rules and where each is enforced. [decisions.md](decisions.md) holds
why each surface is shaped the way it is, and [settings.md](settings.md) the pane inventory.

## Rules

1. **No em dash in user-facing copy.** It applies to Fluent and `.properties` strings, preference
   pane XHTML text and labels, window titles, tooltips, button labels, status lines and name the
   app generates for the person (for example the import collection), because all of those are read
   as prose. It does not apply to data formats: exported Markdown, CSL output, file names, or code
   comments. Use a colon, a comma, or a rewrite instead. The rule covers the
   copy this project owns, `en-US`; other locales are upstream translation data.
2. **Steps are lines.** Numbered instructions put each step on its own line with one description;
   never wrap two steps into one sentence.
3. **Disabled is visible.** An enabled and a disabled control must be distinguishable without
   squinting. Measure contrast, do not trust the eye. The Browse toolbar uses `#ffffff` on
   `#1a1a1a` when enabled and `#8a8a8a` on `#7a7a7a` when disabled. Measured from those text
   colours, the states are 4.05:1 apart in the light theme and 3.45:1 in the dark theme, above the
   3:1 non-text floor. A new custom control ships with its measured pairs; native controls keep
   their platform look, whose disabled rendering the test harness cannot sample.
4. **Browser habits win.** Go sits immediately after the address bar, Save sits behind a divider at
   the far right, and Ctrl/Cmd+L opens the Browse tab from the Library and focuses and selects the
   URL.
5. **Wording is honest.** A handoff says "your browser" unless the situation is specifically
   Firefox (the Google Docs connector is the exception, because it really runs in Firefox). No
   control promises a capability that is not there.
6. **Docs links to the Connector.** The Docs explainer points at Zotero's connectors page, not the
   main download page.
7. **Settings is one click.** Settings is a top-level menubar command between Tools and Help, not
   a submenu and not an Edit item. Clicking the label opens the Settings tab directly; the keyboard
   shortcut stays `Ctrl+,`. There is one affordance, so there is no "which Settings menu" question.
8. **An empty view states, it does not instruct.** The empty library says what it is in one line
   and may offer one action (Browse the web). Instructions and tutorials belong under Help, not in
   the content area, and a link never points at another product's documentation.
9. **Help points at CiteWell.** A Help or support control opens a page this project controls: the
   GitHub repository today, a wiki page when one exists (D66). No control opens Zotero's support
   site. The connector download, the Style Manager catalog and dictionary downloads are the named
   exceptions (D63). The sweep covers Settings, dialogs, error messages and the sync strings; the
   OpenURL resolver list is fetched data, not a help link, and is recorded in D66.

## Where each rule is enforced

| Rule | Check |
|---|---|
| 1 | `test/tests/uiCopyTest.js` scans the en-US locale files and every preference pane XHTML; JS string literals are checked in review. It reads locale from the source tree because the test runtime can resolve to a translation (en-GB here) |
| 2 | The same test checks that each `docs-gate-stepN` string is one numbered line |
| 3 | `test/tests/uiContrastTest.js` reads the toolbar's two colour pairs from `scss/components/_browseTab.scss` and fails below 3:1 in either theme. The other disabled styles in `scss/` are upstream components drawn by the platform theme, so they are review, not test |
| 4 | `test/tests/browseTabTest.js` covers the toolbar order, the `key_focusBrowseURL` accelerator declaration and `focusOrOpen`/`focusURLBar`. A synthetic key press is not supported by the harness, so the declaration plus the tested command stands in for it |
| 5 | `test/tests/uiCopyTest.js` pins the Docs handoff shape: the button says browser, the reason names Firefox because it is specific. Legacy locale strings elsewhere are not scanned; a blanket scan would flag upstream data |
| 6 | `test/tests/uiCopyTest.js` asserts the gate's one launch URL is the connectors page |
| 7 | `test/tests/settingsTabTest.js` asserts the item exists between Tools and Help, that the Edit menu no longer carries a second entry, and that a click opens the Settings tab |
| 8 | `test/tests/uiCopyTest.js` fails if the removed welcome strings or their references return, and pins the Browse action and its handler |
| 9 | `test/tests/uiCopyTest.js` reads `resource/settings/panes.json` and fails if a pane help link leaves the CiteWell repository, if a help pane loses its link, or if `HELP_URL`/`DISCUSSIONS_URL` drift; it also pins the connector exception |

A rule without a check is a rule waiting to rot. When a change cannot be tested, say so in its
decision record instead of adding a test that cannot fail.

*For the full documentation index, see [index.md](index.md).*
