"""Unit tests for the pure LibreOffice protocol helpers."""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..",
    "extensions", "citewell-libreoffice", "src", "pythonpath"
)))

import citewell_protocol as protocol  # noqa: E402


class NamingTests(unittest.TestCase):
    def test_parse_roundtrip(self):
        code = '{"citationItems":[{"id":1}]}'
        self.assertEqual(protocol.parse_code(protocol.raw_name(code)), code)

    def test_reads_zotero_prefixes(self):
        self.assertEqual(protocol.parse_code("ZOTERO_abc RND123"), "abc")
        self.assertEqual(protocol.parse_code(" CSL_abc RND123"), "abc")

    def test_rnd_suffix_is_stripped(self):
        self.assertEqual(protocol.parse_code("CITEWELL_" + "x" * 10 + " RNDABC"), "x" * 10)

    def test_plain_name_is_not_a_field(self):
        self.assertIsNone(protocol.parse_code("Bookmark1"))
        self.assertFalse(protocol.is_field_name("Bookmark1"))

    def test_raw_names_are_unique(self):
        code = "{}"
        self.assertNotEqual(protocol.raw_name(code), protocol.raw_name(code))


class FrameTests(unittest.TestCase):
    def test_pack_header(self):
        frame = protocol.pack(7, ["hello", [{"protocol": 1}]])
        transaction, length = protocol.unpack_header(frame[:8])
        self.assertEqual(transaction, 7)
        self.assertEqual(length, len(frame) - 8)

    def test_pack_utf8_length(self):
        frame = protocol.pack(1, ["Doc", ["café"]])
        _, length = protocol.unpack_header(frame[:8])
        self.assertEqual(json.loads(frame[8:].decode("utf-8")), ["Doc", ["café"]])
        self.assertEqual(length, len(frame[8:]))

    def test_oversize_is_rejected(self):
        with self.assertRaises(ValueError):
            protocol.pack_raw(1, b"x" * (protocol.MAX_FRAME + 1))


if __name__ == "__main__":
    unittest.main()
