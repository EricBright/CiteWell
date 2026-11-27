# Naming: CiteWell vs. Zotero

The product is CiteWell. The code is Zotero's, and most of its identifiers must keep saying
`zotero` forever. This file is the boundary between the two, and the reason it is worth a
document is that both directions of the mistake are silent: a missing rename looks unfinished, a
wrong rename looks like it works until a plugin, a sync account, or a user's data directory
stops resolving.

## The rule

| Surface | Say | Examples |
|---|---|---|
| What a user sees | **CiteWell** | Window title, About panel, installer, desktop entry, icons, user-facing docs |
| What code and services call this app | `zotero` | `chrome://zotero/…`, `resource://zotero/…`, `Zotero.*`, `APP_ID`, `extensions.zotero.*`, data directory, sync client identity, plugin manifest targets |
| The upstream project | **Zotero**, always | Legal text, attribution, upstream issue links, commit messages referencing upstream |

## Never rename

| Identifier | Where it lives | What breaks if renamed |
|---|---|---|
| `APP_ID` (`zotero@zotero.org`) | [app/config.sh](../app/config.sh) | Add-on installation and update matching; sync client identity |
| `chrome://zotero/…`, `resource://zotero/…` | `chrome.manifest`, module imports | Every plugin that imports or links a Zotero module |
| `Zotero.*` global namespace | `chrome/content/zotero/**` | Every plugin, and every internal call site |
| `extensions.zotero.*` prefs | Defaults and preference panes | User settings silently reset |
| Data directory (`~/Zotero`) | `Zotero.DataDirectory` | Users appear to lose their library |
| `zotero://` URI scheme | Protocol handler registration | Word processor integration, connector handoff |
| Sync server endpoints | `xpcom/sync` | Accounts and libraries stop syncing |

## What may be renamed

- Display strings, once R4/R7 in [roadmap.md](../roadmap.md) are underway.
- New files, directories, docs, and tooling: use CiteWell in names.
- Icons, logos, installer metadata, desktop entry `Name=`.
- Documentation prose, which is why this file exists.

## New CiteWell-owned identifiers

For identifiers that did not exist in Zotero, use the narrowest conventional form:

| Kind | Form | Examples |
|---|---|---|
| Prose, UI, notices | **CiteWell** | “CiteWell needs your attention”, settings labels |
| Protocol, URL, environment, paths | lowercase `citewell` | `vnd.citewell.*`, `CITEWELL_*`, `~/.config/citewell`, `citewell-attention.service` |
| D-Bus well-known name | reverse-DNS with the product name as the final element | `ca.sophy.CiteWell` |
| Command-line executable | lowercase `citewell` | `citewell status` |
| Existing Zotero-owned identifiers | `zotero`, never changed | `zotero://`, `Zotero.*`, data directory |

The current systemd unit, D-Bus file, manifest path and protocol prefix already follow this rule.
Do not rename an existing wire prefix, service name or preference key just to make the spelling
prettier; compatibility wins over consistency.
The D-Bus name is `ca.sophy.CiteWell`; `sophy.ca` is owned by the project owner. The earlier
`org.citewell.CiteWell` name was retired because `citewell.org` is not owned.

The LibreOffice UNO service and Addons node names still contain `org.citewell` as internal
implementation identifiers. They are not D-Bus names, are scoped to this extension, and were left
unchanged to avoid leaving stale menu/toolbar nodes in existing profiles. Renaming them is a
separate compatibility change, not a namespace claim.

## What may be renamed with care

| Surface | Caveat |
|---|---|
| `chrome/locale/en-US/zotero/*.ftl` | Prefer adding overrides over editing upstream locale files; a full sweep is guaranteed merge conflict |
| `package.json` name and description | Cosmetic, but touches a file upstream edits regularly |
| Version string | Keep the `SOURCE` suffix until distribution is decided; see [branding.md](branding.md) |

## Before you rename anything

1. `grep -rn "<old string>" chrome/ resource/ app/ --include=*.js --include=*.mjs --include=*.xhtml --include=*.css`
2. Ask: is this string read by a user, or matched by a plugin, pref, URL, or service? If it is
   matched, stop.
3. Check the identifier against the table above.
4. If it is a new file, use CiteWell. If it is an existing tracked file, prefer leaving it and
   adding a layer.

*For the full documentation index, see [index.md](index.md).*
