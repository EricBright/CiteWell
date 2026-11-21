# -*- coding: utf-8 -*-
"""CiteWell LibreOffice bridge scaffold.

Copyright © 2026 Eric Bright.
Licensed under the GNU Affero General Public License, version 3 or later.

The document-side shim is deliberately small: it maps the CiteWell menu URL
to a health check against CiteWell on 127.0.0.1:23121. Citation insertion and
the Rust core protocol are added later behind this boundary.

Patterns adapted with permission from the owner's Zarnegar LibreOffice
extension (AGPL-3.0-or-later).
"""

import datetime
import json
import os
import traceback
import urllib.request

_LOG_PATH = os.environ.get("CITEWELL_LO_LOG", "/tmp/citewell_lo.log")


def _early(message):
    try:
        with open(_LOG_PATH, "a") as handle:
            stamp = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
            handle.write("%s pid=%d %s\n" % (stamp, os.getpid(), message))
    except Exception:
        pass


_early("module import start")
import uno
import unohelper
try:
    from com.sun.star.frame import XDispatchProvider, XDispatch
    from com.sun.star.lang import XServiceInfo
except Exception:
    _early("UNO import failed\n%s" % traceback.format_exc())
    raise
_early("module import complete")

IMPL_PROVIDER = "org.citewell.comp.LibreOffice.Provider"
IMPL_DISPATCH = "org.citewell.comp.LibreOffice.Dispatch"
SERVICE = "org.citewell.LibreOffice"
HEALTH_URL = "http://127.0.0.1:23121/health"
LOG_PATH = _LOG_PATH


def _log(message):
    try:
        with open(LOG_PATH, "a") as handle:
            stamp = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
            handle.write("%s pid=%d %s\n" % (stamp, os.getpid(), message))
    except Exception:
        pass


def _health():
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=1) as response:
            return response.status, response.read(256).decode("utf-8", "replace")
    except Exception as exc:
        return None, str(exc)


def _show_message(ctx, text):
    try:
        toolkit = ctx.ServiceManager.createInstanceWithContext(
            "com.sun.star.awt.Toolkit", ctx
        )
        box = toolkit.createMessageBox(None, 1, 1, "CiteWell", text)
        box.execute()
    except Exception:
        _log("message box failed\n%s" % traceback.format_exc())


class Dispatch(unohelper.Base, XServiceInfo, XDispatch):
    def __init__(self, ctx, *args):
        self.ctx = ctx

    def getImplementationName(self):
        return IMPL_DISPATCH

    def supportsService(self, name):
        return name == SERVICE

    def getSupportedServiceNames(self):
        return (SERVICE,)

    def dispatch(self, url, args):
        status, body = _health()
        if status == 200:
            message = "CiteWell bridge is running on 127.0.0.1:23121."
            _log("health ok: %s" % body)
        else:
            message = ("CiteWell bridge is not running on 127.0.0.1:23121.\n"
                       "Start CiteWell and try again.")
            _log("health failed: %r" % (body,))
        if os.environ.get("CITEWELL_LO_SELFTEST"):
            return
        _show_message(self.ctx, message)

    def addStatusListener(self, listener, url):
        pass

    def removeStatusListener(self, listener, url):
        pass


class Provider(unohelper.Base, XServiceInfo, XDispatchProvider):
    def __init__(self, ctx, *args):
        self.ctx = ctx

    def getImplementationName(self):
        return IMPL_PROVIDER

    def supportsService(self, name):
        return name == SERVICE

    def getSupportedServiceNames(self):
        return (SERVICE,)

    def queryDispatch(self, url, target, flags):
        if url.Complete.startswith("vnd.citewell."):
            return Dispatch(self.ctx)
        return None

    def queryDispatches(self, requests):
        return tuple(
            self.queryDispatch(request.FeatureURL, request.FrameName, request.SearchFlags)
            for request in requests
        )

g_ImplementationHelper = unohelper.ImplementationHelper()
g_ImplementationHelper.addImplementation(Provider, IMPL_PROVIDER, (SERVICE,))
