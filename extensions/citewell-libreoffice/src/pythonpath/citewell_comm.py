# -*- coding: utf-8 -*-
"""CiteWell LibreOffice protocol client.

Copyright © 2026 Eric Bright.
Licensed under the GNU Affero General Public License, version 3 or later.

The app owns the listening socket.  The shim connects, authenticates, and then
serves document commands until the app says the session is done.
"""

import json
import os
import socket
import struct
import traceback

import citewell_doc
from citewell_protocol import MAX_FRAME, pack, pack_raw

PROTOCOL = 1
SHIM_VERSION = "0.1.0"
HOST = "127.0.0.1"
PORT = 23121
HELLO_TIMEOUT = 10
COMMAND_TIMEOUT = 120

_documents = None


def _log_path():
    return os.environ.get("CITEWELL_LO_LOG", "/tmp/citewell_lo.log")


def log(message):
    try:
        with open(_log_path(), "a") as handle:
            handle.write("shim pid=%d %s\n" % (os.getpid(), message))
    except Exception:
        pass


def _read_token():
    literal = os.environ.get("CITEWELL_LO_TOKEN")
    if literal:
        return literal.strip()
    path = os.environ.get("CITEWELL_LO_TOKEN_FILE")
    if not path:
        path = os.path.join(os.path.expanduser("~"), "CiteWell", "lo-token")
    with open(path) as handle:
        return handle.read().strip()


def documents(context):
    global _documents
    if _documents is None or _documents.context is not context:
        _documents = citewell_doc.Documents(context, log=log)
    return _documents


class ProtocolError(Exception):
    pass


class Connection(object):
    def __init__(self, context):
        self.context = context
        self.socket = None
        self.next_transaction = 1
        self.pending = {}

    # -- framing ----------------------------------------------------------

    def _send(self, transaction, payload):
        if isinstance(payload, bytes):
            frame = pack_raw(transaction, payload)
        else:
            frame = pack(transaction, payload)
        self.socket.sendall(frame)

    def _recv_exact(self, count):
        chunks = []
        remaining = count
        while remaining:
            chunk = self.socket.recv(remaining)
            if not chunk:
                raise ProtocolError("CiteWell closed the connection.")
            chunks.append(chunk)
            remaining -= len(chunk)
        return b"".join(chunks)

    def _read(self):
        header = self._recv_exact(8)
        transaction, length = struct.unpack(">II", header)
        if length > MAX_FRAME:
            raise ProtocolError("Frame exceeds the size limit.")
        data = self._recv_exact(length)
        try:
            payload = json.loads(data.decode("utf-8"))
        except Exception:
            raise ProtocolError("CiteWell sent an invalid message.")
        return transaction, payload

    # -- session ----------------------------------------------------------

    def connect(self):
        self.socket = socket.create_connection((HOST, PORT), timeout=HELLO_TIMEOUT)
        self.socket.settimeout(COMMAND_TIMEOUT)
        hello = {
            "protocol": PROTOCOL,
            "shim": SHIM_VERSION,
            "lo": os.environ.get("CITEWELL_LO_VERSION", "unknown"),
            "token": _read_token(),
        }
        self._send(0, {"command": "hello", "protocol": PROTOCOL,
                       "shim": SHIM_VERSION, "lo": hello["lo"],
                       "token": hello["token"]})
        while True:
            transaction, response = self._read()
            if transaction != 0 or not isinstance(response, dict):
                continue
            if response.get("command") != "helloResult":
                continue
            if not response.get("ok"):
                raise ProtocolError(
                    response.get("error") or "CiteWell rejected the handshake."
                )
            if response.get("protocol") != PROTOCOL:
                raise ProtocolError(
                    "The CiteWell LibreOffice extension does not match this CiteWell build. "
                    "Reinstall it from CiteWell's Cite settings."
                )
            return

    def close(self):
        if self.socket is not None:
            try:
                self.socket.close()
            except Exception:
                pass
            self.socket = None

    # -- commands ---------------------------------------------------------

    def request(self, command, args):
        transaction = self.next_transaction
        self.next_transaction += 1
        self._send(transaction, [command, args])
        return self._serve(transaction)

    def _serve(self, wanted=None):
        while True:
            transaction, payload = self._read()
            if wanted is not None and transaction == wanted:
                return payload
            if transaction == 0:
                command = payload.get("command") if isinstance(payload, dict) else None
                if command == "done":
                    return payload
                if command:
                    log("app event: %s" % command)
                    continue
                raise ProtocolError("CiteWell sent an invalid event.")
            try:
                result = dispatch(self.context, payload)
                self._send(transaction, result)
            except Exception as exc:  # noqa: BLE001 - report to the app
                log("command failed: %s\n%s" % (exc, traceback.format_exc()))
                self._send(transaction, ("ERR:" + (str(exc) or "Command failed.")).encode("utf-8"))

    def trigger(self, command):
        self.connect()
        try:
            self._send(0, {"command": command, "templateVersion": 1})
            self._serve()
        finally:
            self.close()


def trigger(context, command):
    try:
        Connection(context).trigger(command)
        log("session complete: %s" % command)
    except Exception as exc:  # noqa: BLE001 - surface to the user
        log("session failed: %s\n%s" % (exc, traceback.format_exc()))
        raise


# -- command dispatch -----------------------------------------------------


def dispatch(context, message):
    if not isinstance(message, list) or len(message) != 2:
        raise ProtocolError("Invalid command.")
    command, args = message[0], message[1]
    docs = documents(context)

    if command == "Application_getActiveDocument":
        document = docs.active()
        return [PROTOCOL, document.id]

    if not isinstance(args, list) or not args:
        raise ProtocolError("Missing document id.")
    document = docs.get(args[0])

    if command == "Document_displayAlert":
        return document.display_alert(args[1], args[2], args[3])
    if command == "Document_activate":
        document.activate()
        return None
    if command == "Document_canInsertField":
        return document.can_insert_field(args[1])
    if command == "Document_getDocumentData":
        return document.get_document_data()
    if command == "Document_setDocumentData":
        document.set_document_data(args[1])
        return None
    if command == "Document_insertField":
        field = document.insert_field(args[1], args[2] if len(args) > 2 else 0)
        return [field.id, field.code, field.note_index]
    if command == "Document_getFields":
        fields = document.fields(args[1])
        return [
            [field.id for field in fields],
            [field.code for field in fields],
            [field.note_index for field in fields],
            [-1 for _ in fields],
        ]
    if command == "Document_cursorInField":
        field = document.cursor_in_field(args[1])
        if field is None:
            return None
        return [field.id, field.code, field.note_index]
    if command == "Document_insertText":
        document.insert_text(args[1])
        return None
    if command == "Document_setBibliographyStyle":
        document.set_bibliography_style(*args[1:])
        return None
    if command == "Document_cleanup":
        document.cleanup()
        return None
    if command == "Document_complete":
        document.complete()
        return None

    if command.startswith("Field_"):
        field = document.field(args[1])
        if command == "Field_getCode":
            return field.code
        if command == "Field_setCode":
            field.set_code(args[2])
            return None
        if command == "Field_getText":
            return field.text
        if command == "Field_setText":
            field.set_text(args[2], bool(args[3]) if len(args) > 3 else False)
            return None
        if command == "Field_delete":
            field.delete()
            return None
        if command == "Field_removeCode":
            field.remove_code()
            return None
        if command == "Field_select":
            field.select()
            return None
        if command == "Field_convert":
            field.convert(args[2], int(args[3]) if len(args) > 3 else 0)
            return None

    raise ProtocolError("Unsupported command: %s" % command)
