# -*- coding: utf-8 -*-
"""CiteWell LibreOffice document adapter.

Copyright © 2026 Eric Bright.
Licensed under the GNU Affero General Public License, version 3 or later.

This module is deliberately free of protocol code: it only reads and writes
Writer structures.  The app owns citation formatting and decisions; this layer
turns them into bookmarks, reference marks, document properties and RTF.
"""

import functools

import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.text.ControlCharacter import PARAGRAPH_BREAK

from citewell_protocol import (
    MAX_PROPERTY_LENGTH,
    PLACEHOLDER,
    is_field_name,
    parse_code,
    raw_name,
)


def _prop(name, value):
    prop = PropertyValue()
    prop.Name = name
    prop.Value = value
    return prop


class Field(object):
    """A reference mark, bookmark or text section that carries a code."""

    def __init__(self, document, named, raw_name, kind="ReferenceMark", field_id=None):
        self.document = document
        self.named = named
        self.raw_name = raw_name
        self.kind = kind
        self.content = named
        self.anchor = named.getAnchor()
        self.id = field_id

    # -- identity ---------------------------------------------------------

    @property
    def code(self):
        return parse_code(self.raw_name) or ""

    @property
    def text(self):
        return self.anchor.getString()

    @property
    def note_index(self):
        return 0

    def set_code(self, code):
        old_name = self.raw_name
        new_name = raw_name(code)
        self.named.setName(new_name)
        self.raw_name = new_name
        # Renaming can recreate the mark; refresh the anchor so later calls see
        # the live one.  The app re-applies the formatted text afterwards.
        self.content = self.named
        self.anchor = self.named.getAnchor()
        self.document._renamed(self, old_name, new_name)

    # -- content ----------------------------------------------------------

    def set_text(self, text, rich=False):
        text_object = self.anchor.getText()
        cursor = text_object.createTextCursorByRange(self.anchor)
        if not self.anchor.getString():
            # Renaming can leave an empty mark behind, and replacing an empty
            # reference mark is not supported.  Remove it and give the cursor
            # a placeholder selection so the RTF import replaces text rather
            # than inserting at a collapsed point.
            text_object.removeTextContent(self.content)
            cursor.setString("CITEWELL_PLACEHOLDER")
        pre_break = None
        post_break = None
        if rich:
            # Isolate the citation in its own paragraphs while replacing it.
            # Without this, a citation at the end of the document can grow to
            # absorb the next one.
            pre_break = cursor.getStart()
            post_break = cursor.getEnd()
            text_object.insertControlCharacter(pre_break, PARAGRAPH_BREAK, True)
            text_object.insertControlCharacter(post_break, PARAGRAPH_BREAK, True)
        if not text:
            cursor.setString("")
        elif rich:
            data = uno.ByteSequence(text.encode("latin-1", "replace"))
            stream = self.document.context.ServiceManager.createInstanceWithArgumentsAndContext(
                "com.sun.star.io.SequenceInputStream", (data,), self.document.context
            )
            cursor.insertDocumentFromURL(
                "private:stream",
                (
                    _prop("FilterName", "Rich Text Format"),
                    _prop("InputStream", stream),
                ),
            )
        else:
            cursor.setString(text)
        # Replacing the text disposes the old mark; attach a new one with the
        # same name over the replacement (the cursor still covers it).
        mark = self.document.component.createInstance("com.sun.star.text.ReferenceMark")
        mark.setName(self.raw_name)
        mark.attach(cursor)
        self.named = mark
        self.content = mark
        self.anchor = mark.getAnchor()
        if pre_break is not None:
            pre_break.setString("")
            post_break.setString("")

    def remove_code(self):
        """Keep the text, drop the field identity.

        Replacing the text with itself disposes the reference mark while
        leaving the visible citation in place.
        """
        text_object = self.anchor.getText()
        old = self.anchor.getString()
        if old:
            # Setting the range to its own text disposes the mark and keeps
            # the visible citation.
            self.anchor.setString(old)
        else:
            text_object.removeTextContent(self.content)
        self.document._unregister(self)
        self.named = None
        self.content = None

    def delete(self):
        text_object = self.anchor.getText()
        self.anchor.setString("")
        try:
            text_object.removeTextContent(self.content)
        except Exception:
            pass
        self.document._unregister(self)
        self.named = None
        self.content = None

    def select(self):
        controller = self.document.component.getCurrentController()
        try:
            controller.select(self.anchor)
        except Exception:
            pass

    # -- ordering ---------------------------------------------------------

    def compare_to(self, other):
        # XTextRangeCompare returns 1 when the first range starts *before* the
        # second, which is the opposite of a Python sort comparator.
        return -self.document.text.compareRegionStarts(self.anchor, other.anchor)


class Document(object):
    def __init__(self, manager, component, document_id):
        self.manager = manager
        self.component = component
        self.id = document_id
        self.context = manager.context
        self.text = component.getText()
        self.properties = _DocumentProperties(component)
        self._fields_by_name = {}
        self._fields_by_id = {}
        self._next_field_id = 0

    # -- document data ----------------------------------------------------

    def get_document_data(self):
        return self.properties.get("CITEWELL_PREFS")

    def set_document_data(self, data):
        self.properties.set("CITEWELL_PREFS", data)

    # -- fields -----------------------------------------------------------

    def _all_named(self):
        marks = self.component.getReferenceMarks()
        for index in range(marks.getCount()):
            yield marks.getByIndex(index), "ReferenceMark"
        try:
            sections = self.component.getTextSections()
        except Exception:
            sections = None
        if sections is not None:
            for index in range(sections.getCount()):
                yield sections.getByIndex(index), "TextSection"

    def _register(self, named, kind):
        name = named.getName()
        field = self._fields_by_name.get(name)
        if field is not None:
            field.named = named
            field.content = named
            field.anchor = named.getAnchor()
            return field
        self._next_field_id += 1
        field = Field(self, named, name, kind, self._next_field_id)
        self._fields_by_name[name] = field
        self._fields_by_id[field.id] = field
        return field

    def _renamed(self, field, old_name, new_name):
        if self._fields_by_name.get(old_name) is field:
            del self._fields_by_name[old_name]
        self._fields_by_name[new_name] = field

    def _unregister(self, field):
        if field.raw_name:
            self._fields_by_name.pop(field.raw_name, None)
        self._fields_by_id.pop(field.id, None)

    def field(self, field_id):
        try:
            return self._fields_by_id[int(field_id)]
        except Exception:
            raise RuntimeError("That citation is no longer in the document.")

    def fields(self, field_type="ReferenceMark"):
        found = []
        for named, kind in self._all_named():
            name = named.getName()
            if kind != field_type:
                continue
            if not is_field_name(name):
                continue
            found.append(self._register(named, kind))
        found.sort(key=functools.cmp_to_key(lambda a, b: a.compare_to(b)))
        return found

    def insert_field(self, field_type="ReferenceMark", note_type=0):
        controller = self.component.getCurrentController()
        view_cursor = controller.getViewCursor()
        cursor = self.text.createTextCursorByRange(view_cursor)
        cursor.setString(PLACEHOLDER)
        raw = raw_name("")
        mark = self.component.createInstance("com.sun.star.text.ReferenceMark")
        mark.setName(raw)
        mark.attach(cursor)
        return self._register(mark, "ReferenceMark")

    def cursor_in_field(self, field_type="ReferenceMark"):
        controller = self.component.getCurrentController()
        view_cursor = controller.getViewCursor()
        for field in self.fields(field_type):
            try:
                starts = self.text.compareRegionStarts(field.anchor, view_cursor)
                ends = self.text.compareRegionEnds(field.anchor, view_cursor)
            except Exception:
                continue
            if starts >= 0 and ends <= 0:
                return field
        return None

    def can_insert_field(self, field_type="ReferenceMark"):
        return True

    # -- insertion --------------------------------------------------------

    def insert_text(self, text):
        controller = self.component.getCurrentController()
        view_cursor = controller.getViewCursor()
        cursor = self.text.createTextCursorByRange(view_cursor)
        self.text.insertString(cursor, text, False)

    # -- lifecycle --------------------------------------------------------

    def activate(self):
        try:
            self.component.getCurrentController().getFrame().getContainerWindow().toFront()
        except Exception:
            pass

    def display_alert(self, message, icon=0, buttons=0):
        # In the self-test harness, answer OK/Yes so unattended runs do not hang.
        import os
        if os.environ.get("CITEWELL_LO_SELFTEST"):
            self.manager.log("displayAlert (auto-confirmed): %s" % message)
            return 1
        self.manager.log("displayAlert: %s" % message)
        try:
            toolkit = self.context.ServiceManager.createInstanceWithContext(
                "com.sun.star.awt.Toolkit", self.context
            )
            box = toolkit.createMessageBox(
                None, 0, {0: 1, 1: 2, 2: 3, 3: 4}.get(int(buttons), 1),
                "CiteWell", message
            )
            return box.execute()
        except Exception:
            self.manager.log("message box failed\n%s" % __import__("traceback").format_exc())
            return 0

    def set_bibliography_style(self, *args):
        # Bibliography styling is an M4 item; accepting the call keeps the
        # document-preferences path from failing.
        self.manager.log("setBibliographyStyle: not applied yet")
        return None

    def complete(self):
        pass

    def cleanup(self):
        pass


class _DocumentProperties(object):
    def __init__(self, component):
        supplier = component.getDocumentProperties()
        self.container = supplier.getUserDefinedProperties()
        self.props = self.container

    def get(self, name):
        chunks = []
        index = 1
        while True:
            try:
                value = self.props.getPropertyValue("%s_%d" % (name, index))
            except Exception:
                break
            if value is None:
                break
            chunks.append(str(value))
            index += 1
        return "".join(chunks)

    def set(self, name, value):
        index = 0
        length = len(value)
        while length > index * MAX_PROPERTY_LENGTH:
            index += 1
            key = "%s_%d" % (name, index)
            chunk = value[(index - 1) * MAX_PROPERTY_LENGTH: index * MAX_PROPERTY_LENGTH]
            try:
                self.container.addProperty(key, 0, "")
            except Exception:
                pass
            self.props.setPropertyValue(key, chunk)
        while True:
            index += 1
            key = "%s_%d" % (name, index)
            try:
                self.container.removeProperty(key)
            except Exception:
                break


class Documents(object):
    def __init__(self, context, log=None):
        self.context = context
        self.log = log or (lambda message: None)
        self.desktop = context.ServiceManager.createInstanceWithContext(
            "com.sun.star.frame.Desktop", context
        )
        self._by_id = {}
        self._next_id = 0

    def active(self):
        component = self.desktop.CurrentComponent
        if component is None:
            components = self.desktop.Components.createEnumeration()
            while components.hasMoreElements():
                candidate = components.nextElement()
                if hasattr(candidate, "getText"):
                    component = candidate
                    break
        if component is None:
            raise RuntimeError("Open a Writer document first.")
        return self._wrap(component)

    def _wrap(self, component):
        for document in self._by_id.values():
            if document.component == component:
                return document
        self._next_id += 1
        document = Document(self, component, self._next_id)
        self._by_id[document.id] = document
        return document

    def get(self, document_id):
        try:
            return self._by_id[int(document_id)]
        except Exception:
            raise RuntimeError("That document is no longer open.")
