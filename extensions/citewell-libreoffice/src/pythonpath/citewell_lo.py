# -*- coding: utf-8 -*-
"""CiteWell LibreOffice menu dispatcher.

Copyright © 2026 Eric Bright.
Licensed under the GNU Affero General Public License, version 3 or later.

The dispatcher is deliberately thin: it maps a menu URL to a protocol command.
Citation formatting and document state belong to CiteWell; the document
adapter lives in citewell_doc and the transport in citewell_comm.
"""

import os
import sys
import traceback

# The Python loader executes components by URL and does not add the extension's
# pythonpath to sys.path, so sibling modules need it explicitly.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import unohelper

try:
    from com.sun.star.frame import XDispatchProvider, XDispatch
    from com.sun.star.lang import XServiceInfo
except Exception:
    from com.sun.star.frame import XDispatchProvider, XDispatch
    from com.sun.star.lang import XServiceInfo

import citewell_comm

IMPL_PROVIDER = "org.citewell.comp.LibreOffice.Provider"
IMPL_DISPATCH = "org.citewell.comp.LibreOffice.Dispatch"
SERVICE = "org.citewell.LibreOffice"

COMMANDS = {
    "vnd.citewell.cite:": "addEditCitation",
    "vnd.citewell.bibliography:": "addEditBibliography",
    "vnd.citewell.refresh:": "refresh",
    "vnd.citewell.unlink:": "removeCodes",
    "vnd.citewell.docprefs:": "setDocPrefs",
    "vnd.citewell.note:": "addNote",
    "vnd.citewell.m0test:": "m0test",
    "vnd.citewell.m1insert:": "m1insert",
    "vnd.citewell.m1cancel:": "m1cancel",
    "vnd.citewell.m2multi:": "m2multi",
    "vnd.citewell.m2style:": "m2style",
    "vnd.citewell.health:": "selftest",
}


def _log(message):
    try:
        with open(citewell_comm._log_path(), "a") as handle:
            handle.write("shim pid=%d %s\n" % (os.getpid(), message))
    except Exception:
        pass


def _show_message(context, text):
    try:
        toolkit = context.ServiceManager.createInstanceWithContext(
            "com.sun.star.awt.Toolkit", context
        )
        box = toolkit.createMessageBox(None, 1, 1, "CiteWell", text)
        box.execute()
    except Exception:
        _log("message box failed\n%s" % traceback.format_exc())


class Dispatch(unohelper.Base, XServiceInfo, XDispatch):
    def __init__(self, context, *args):
        self.context = context

    def getImplementationName(self):
        return IMPL_DISPATCH

    def supportsService(self, name):
        return name == SERVICE

    def getSupportedServiceNames(self):
        return (SERVICE,)

    def dispatch(self, url, args):
        command = COMMANDS.get(url.Complete)
        message = None
        failed = False
        if command is None:
            message = "This CiteWell action is not available in this build."
            failed = True
            _log("unknown URL: %s" % url.Complete)
        else:
            try:
                citewell_comm.trigger(self.context, command)
                if command == "m0test":
                    message = "CiteWell connection test passed."
            except Exception as exc:  # noqa: BLE001 - show to the user
                failed = True
                message = str(exc) or "CiteWell could not complete the action."
                _log("dispatch failed: %s\n%s" % (exc, traceback.format_exc()))
        if os.environ.get("CITEWELL_LO_SELFTEST"):
            _log("selftest result: %r failed=%s" % (message, failed))
            return
        if message:
            _show_message(self.context, message)

    def addStatusListener(self, listener, url):
        pass

    def removeStatusListener(self, listener, url):
        pass


class Provider(unohelper.Base, XServiceInfo, XDispatchProvider):
    def __init__(self, context, *args):
        self.context = context

    def getImplementationName(self):
        return IMPL_PROVIDER

    def supportsService(self, name):
        return name == SERVICE

    def getSupportedServiceNames(self):
        return (SERVICE,)

    def queryDispatch(self, url, target, flags):
        if url.Complete.startswith("vnd.citewell."):
            return Dispatch(self.context)
        return None

    def queryDispatches(self, requests):
        return tuple(
            self.queryDispatch(request.FeatureURL, request.FrameName, request.SearchFlags)
            for request in requests
        )


g_ImplementationHelper = unohelper.ImplementationHelper()
g_ImplementationHelper.addImplementation(Provider, IMPL_PROVIDER, (SERVICE,))
