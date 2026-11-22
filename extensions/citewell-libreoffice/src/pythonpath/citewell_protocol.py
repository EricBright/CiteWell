# -*- coding: utf-8 -*-
"""Pure CiteWell LibreOffice protocol helpers.

Copyright © 2026 Eric Bright.
Licensed under the GNU Affero General Public License, version 3 or later.

This module has no UNO imports so the naming and framing rules can be tested
with plain Python.
"""

import json
import random
import string
import struct

PREFIX = "CITEWELL_"
READ_PREFIXES = ("CITEWELL_", "ZOTERO_", " CSL_")
PLACEHOLDER = "CITEWELL_ITEM"
MAX_PROPERTY_LENGTH = 255
MAX_FRAME = 8 * 1024 * 1024


def random_tag(length=10):
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def raw_name(code):
    return PREFIX + code + " RND" + random_tag()


def parse_code(name):
    """Return the JSON code from a CiteWell/Zotero reference-mark name."""
    marker = name.rfind(" RND")
    body = name[:marker] if marker != -1 else name
    for prefix in READ_PREFIXES:
        if body.startswith(prefix):
            return body[len(prefix):]
    return None


def is_field_name(name):
    return parse_code(name) is not None


def pack_raw(transaction, data):
    if len(data) > MAX_FRAME:
        raise ValueError("Frame exceeds the size limit.")
    return struct.pack(">II", transaction, len(data)) + data


def pack(transaction, payload):
    return pack_raw(transaction, json.dumps(payload).encode("utf-8"))


def unpack_header(header):
    return struct.unpack(">II", header)
