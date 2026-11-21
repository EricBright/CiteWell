#!/usr/bin/env python3
"""Build the CiteWell LibreOffice OXT.

Copyright © 2026 Eric Bright. AGPL-3.0-or-later.

Adapted with permission from the owner's Zarnegar LibreOffice extension
builder (AGPL-3.0-or-later). This script only reads `src/` and writes a unique
temporary package under `build/`; it does not delete anything outside it.
"""
import os
import shutil
import tempfile
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.dirname(HERE)
SRC = os.path.join(EXT, "src")
BUILD = os.path.join(EXT, "build")
OUT = os.path.join(BUILD, "CiteWell_LibreOffice_Integration.oxt")

def main():
    os.makedirs(BUILD, exist_ok=True)
    package = tempfile.mkdtemp(prefix="package-", dir=BUILD)
    for name in os.listdir(SRC):
        source = os.path.join(SRC, name)
        target = os.path.join(package, name)
        if os.path.isdir(source):
            shutil.copytree(source, target, ignore=shutil.ignore_patterns("__pycache__"))
        else:
            shutil.copy2(source, target)

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as archive:
        for base, _dirs, files in os.walk(package):
            for name in sorted(files):
                path = os.path.join(base, name)
                archive.write(path, os.path.relpath(path, package))
    print("built %s (%d bytes)" % (OUT, os.path.getsize(OUT)))
    print("package source: %s" % package)

if __name__ == "__main__":
    main()
