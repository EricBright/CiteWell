# CiteWell LibreOffice icon sets

Each directory is a complete toolbar icon set. The build selects one set with
`build.py --icon-set <name>`; the default is `citewell`.

## Naming contract

For every action used by the toolbar:

```text
<set>/<action>_16.png
<set>/<action>_26.png
<set>/<action>_dark_16.png
<set>/<action>_dark_26.png
```

16 px and 26 px are required. The dark pair is optional; when present it is
used for `ImageSmallHCURL` and `ImageBigHCURL`. Files are PNG with transparency.
Actions that only appear in the menu do not need icons.

Source SVGs live in `<set>/source/` and use `{{ink}}` and `{{accent}}` tokens.
They are the editable originals, not used at runtime. `render_icons.py` renders
the PNGs with the palette in `palette.json`; it needs ImageMagick, but the
committed PNGs mean normal builds do not.

## Current set: `citewell`

Original CiteWell artwork by the CiteWell contributors, licensed
AGPL-3.0-or-later.

- `cite` — quotation bubble
- `note` — page with a plus
- `bibliography` — three books
- `refresh` — circular arrow
- `preferences` — sliders
- `unlink` — broken chain

A replacement set only needs the PNGs and the same action names. It can omit
`source/` if the artwork is maintained elsewhere.
