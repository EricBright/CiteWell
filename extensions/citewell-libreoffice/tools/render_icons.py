#!/usr/bin/env python3
"""Render a CiteWell toolbar icon set from its SVG sources.

Copyright © 2026 Eric Bright. AGPL-3.0-or-later.

Design-time helper only: the rendered PNGs are committed, so building the OXT
does not need ImageMagick. Run from anywhere:

    python3 extensions/citewell-libreoffice/tools/render_icons.py --set citewell
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.dirname(HERE)
SRC = os.path.join(EXT, "src", "icons")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--set", default="citewell", help="icon set directory name")
    parser.add_argument("--sizes", default="16,26", help="comma-separated pixel sizes")
    args = parser.parse_args()

    icon_set = os.path.join(SRC, args.set)
    source = os.path.join(icon_set, "source")
    palette_path = os.path.join(icon_set, "palette.json")
    if not os.path.isdir(source) or not os.path.isfile(palette_path):
        raise SystemExit("missing %s or palette.json" % source)
    with open(palette_path, encoding="utf-8") as handle:
        palette = json.load(handle)

    renderer = shutil.which("magick") or shutil.which("convert")
    if not renderer:
        raise SystemExit("ImageMagick (magick or convert) is required to re-render icons")
    sizes = [int(value) for value in args.sizes.split(",") if value.strip()]

    with tempfile.TemporaryDirectory(prefix="citewell-icons-") as temp:
        for name in sorted(os.listdir(source)):
            if not name.endswith(".svg"):
                continue
            action = name[:-4]
            svg = open(os.path.join(source, name), encoding="utf-8").read()
            for mode in ("light", "dark"):
                colors = palette.get(mode)
                if not colors:
                    continue
                rendered = svg.replace("{{ink}}", colors["ink"]).replace(
                    "{{accent}}", colors["accent"]
                )
                if mode == "dark":
                    # Source SVGs carry the light palette so they open normally in
                    # vector editors; recolour those literals for the dark pair.
                    for key in ("ink", "accent"):
                        rendered = re.sub(
                            re.escape(palette["light"][key]),
                            colors[key],
                            rendered,
                            flags=re.IGNORECASE,
                        )
                path = os.path.join(temp, "%s-%s.svg" % (action, mode))
                with open(path, "w", encoding="utf-8") as handle:
                    handle.write(rendered)
                for size in sizes:
                    suffix = "" if mode == "light" else "_dark"
                    target = os.path.join(
                        icon_set, "%s%s_%d.png" % (action, suffix, size)
                    )
                    subprocess.run(
                        [
                            renderer,
                            "-background",
                            "none",
                            "-density",
                            "960",
                            path,
                            "-resize",
                            "%dx%d" % (size, size),
                            target,
                        ],
                        check=True,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                    print("wrote %s" % os.path.relpath(target, EXT))


if __name__ == "__main__":
    main()
