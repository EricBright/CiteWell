#!/usr/bin/env python3
"""Build the CiteWell LibreOffice OXT.

Copyright © 2026 Eric Bright. AGPL-3.0-or-later.

Adapted with permission from the owner's Zarnegar LibreOffice extension
builder (AGPL-3.0-or-later). This script only reads `src/` and writes a unique
temporary package under `build/`; it does not delete anything outside it.

`src/actions.json` is the single source for the menu, the toolbar, the image
mapping and the runtime URL-to-command table. The XCU is generated here.
"""
import argparse
import json
import os
import shutil
import tempfile
import zipfile
from xml.sax.saxutils import escape

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.dirname(HERE)
SRC = os.path.join(EXT, "src")
BUILD = os.path.join(EXT, "build")
OUT = os.path.join(BUILD, "CiteWell_LibreOffice_Integration.oxt")


def load_manifest():
    path = os.path.join(SRC, "actions.json")
    with open(path, encoding="utf-8") as handle:
        manifest = json.load(handle)
    if not isinstance(manifest, dict):
        raise SystemExit("actions.json must contain an object")
    return manifest


def validate(manifest, icon_set):
    actions = manifest.get("actions")
    if not isinstance(actions, dict) or not actions:
        raise SystemExit("actions.json needs a non-empty actions object")
    urls = set()
    for action_id, action in actions.items():
        for key in ("command", "url", "title"):
            if not isinstance(action.get(key), str) or not action[key]:
                raise SystemExit("action %r is missing %s" % (action_id, key))
        if action["url"] in urls:
            raise SystemExit("duplicate URL %r" % action["url"])
        urls.add(action["url"])

    def check_items(label, items):
        if not isinstance(items, list) or not items:
            raise SystemExit("%s needs a non-empty items list" % label)
        for item in items:
            if item == "-":
                continue
            if item not in actions:
                raise SystemExit("%s refers to unknown action %r" % (label, item))

    check_items("menu", manifest.get("menu", {}).get("items"))
    check_items("toolbar", manifest.get("toolbar", {}).get("items"))

    icons = os.path.join(SRC, "icons", icon_set)
    if not os.path.isdir(icons):
        raise SystemExit("missing icon set %r at %s" % (icon_set, icons))
    for item in manifest["toolbar"]["items"]:
        if item == "-":
            continue
        icon = actions[item].get("icon")
        if not icon:
            raise SystemExit("toolbar action %r has no icon" % item)
        for suffix in ("16", "26"):
            path = os.path.join(icons, "%s_%s.png" % (icon, suffix))
            if not os.path.isfile(path):
                raise SystemExit("missing %s" % os.path.relpath(path, EXT))
        dark16 = os.path.join(icons, "%s_dark_16.png" % icon)
        dark26 = os.path.join(icons, "%s_dark_26.png" % icon)
        if os.path.isfile(dark16) != os.path.isfile(dark26):
            raise SystemExit("icon %r has only one dark variant" % icon)


def title_prop(value, indent):
    return (
        '%s<prop o:name="Title" xml:lang="en-US"><value>%s</value></prop>\n'
        % (" " * indent, escape(value))
    )


def image_node(action_id, action, icon_set, indent=8):
    icon = action["icon"]
    base = "%%origin%%/icons/%s/%s" % (icon_set, icon)
    lines = [
        " " * indent + '<node o:name="org.citewell.images.%s" o:op="replace">' % action_id,
        " " * (indent + 2) + '<prop o:name="URL"><value>%s</value></prop>' % escape(action["url"]),
        " " * (indent + 2) + '<node o:name="UserDefinedImages">',
        " " * (indent + 4) + '<prop o:name="ImageSmallURL"><value>%s_16.png</value></prop>' % escape(base),
        " " * (indent + 4) + '<prop o:name="ImageBigURL"><value>%s_26.png</value></prop>' % escape(base),
    ]
    icons = os.path.join(SRC, "icons", icon_set)
    if os.path.isfile(os.path.join(icons, icon + "_dark_16.png")):
        lines += [
            " " * (indent + 4) + '<prop o:name="ImageSmallHCURL"><value>%s_dark_16.png</value></prop>' % escape(base),
            " " * (indent + 4) + '<prop o:name="ImageBigHCURL"><value>%s_dark_26.png</value></prop>' % escape(base),
        ]
    lines += [
        " " * (indent + 2) + "</node>",
        " " * indent + "</node>",
    ]
    return "\n".join(lines) + "\n"


def generate_xcu(manifest, icon_set):
    actions = manifest["actions"]
    menu = manifest["menu"]
    toolbar = manifest["toolbar"]
    context = "com.sun.star.text.TextDocument, com.sun.star.text.GlobalDocument"

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<o:items xmlns:o="http://openoffice.org/2001/registry">',
        '  <item o:path="/org.openoffice.Office.Addons">',
        '    <node o:name="AddonUI">',
        '      <node o:name="OfficeMenuBar">',
        '        <node o:name="org.citewell.libreoffice" o:op="replace">',
        title_prop(menu["title"], 10).rstrip("\n"),
        '          <node o:name="Submenu">',
    ]

    for index, item in enumerate(menu["items"], 1):
        if item == "-":
            lines += [
                '            <node o:name="%d" o:op="replace">' % index,
                '              <prop o:name="URL"><value>private:separator</value></prop>',
                "            </node>",
            ]
            continue
        action = actions[item]
        lines += [
            '            <node o:name="%d" o:op="replace">' % index,
            '              <prop o:name="URL"><value>%s</value></prop>' % escape(action["url"]),
            title_prop(action["title"], 14).rstrip("\n"),
            "            </node>",
        ]

    lines += [
        "          </node>",
        "        </node>",
        "      </node>",
        '      <node o:name="OfficeToolBar">',
        '        <node o:name="%s" o:op="replace">' % escape(toolbar["id"]),
        title_prop(toolbar["title"], 10).rstrip("\n"),
    ]

    for index, item in enumerate(toolbar["items"], 1):
        if item == "-":
            lines += [
                '          <node o:name="m%d" o:op="replace">' % index,
                '            <prop o:name="URL"><value>private:separator</value></prop>',
                "          </node>",
            ]
            continue
        action = actions[item]
        lines += [
            '          <node o:name="m%d" o:op="replace">' % index,
            '            <prop o:name="Context"><value>%s</value></prop>' % context,
            '            <prop o:name="URL"><value>%s</value></prop>' % escape(action["url"]),
            title_prop(action["title"], 12).rstrip("\n"),
            '            <prop o:name="Target"><value>_self</value></prop>',
            "          </node>",
        ]

    lines += [
        "        </node>",
        "      </node>",
        '      <node o:name="Images">',
    ]
    for action_id in toolbar["items"]:
        if action_id == "-":
            continue
        action = actions[action_id]
        if action.get("icon"):
            lines.append(image_node(action_id, action, icon_set, 8).rstrip("\n"))
    lines += [
        "      </node>",
        "    </node>",
        "  </item>",
        "</o:items>",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--icon-set", default=None,
                        help="icon set under src/icons (default: manifest defaultIconSet)")
    args = parser.parse_args()

    manifest = load_manifest()
    icon_set = args.icon_set or manifest.get("defaultIconSet", "citewell")
    if "/" in icon_set or "\\" in icon_set or icon_set in ("", ".", ".."):
        raise SystemExit("invalid icon set name %r" % icon_set)
    validate(manifest, icon_set)
    xcu = generate_xcu(manifest, icon_set)

    os.makedirs(BUILD, exist_ok=True)
    package = tempfile.mkdtemp(prefix="package-", dir=BUILD)
    for name in os.listdir(SRC):
        source = os.path.join(SRC, name)
        target = os.path.join(package, name)
        if os.path.isdir(source):
            shutil.copytree(source, target, ignore=shutil.ignore_patterns("__pycache__"))
        else:
            shutil.copy2(source, target)
    with open(os.path.join(package, "Addons.xcu"), "w", encoding="utf-8") as handle:
        handle.write(xcu)

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as archive:
        for base, _dirs, files in os.walk(package):
            for name in sorted(files):
                path = os.path.join(base, name)
                archive.write(path, os.path.relpath(path, package))
    print("built %s (%d bytes)" % (OUT, os.path.getsize(OUT)))
    print("icon set: %s" % icon_set)
    print("package source: %s" % package)


if __name__ == "__main__":
    main()
