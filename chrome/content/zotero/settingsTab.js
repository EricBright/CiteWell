/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2026 Eric Bright
    This file is part of CiteWell, a fork of Zotero.

    CiteWell is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    CiteWell is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with CiteWell.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

/**
 * The Settings tab (D48) — settings lives in the main-window deck, not a popup.
 *
 * Hosting: the existing preferences.xhtml *window document* is hosted in an
 * iframe. The spike (settingsTabTest) proved a XUL <window> root parses, inits
 * its navigation list, and that window.close() inside the frame cannot take the
 * main window down — so the frame path is safe and no shell re-mount is needed.
 *
 * - openPreferences() in utilities_internal routes here (single choke point;
 *   Edit → Settings and every deep link pass through it).
 * - Ctrl+W inside the frame closes the tab; the frame's own keyset keeps its
 *   Ctrl+L/Ctrl+F search shortcuts (they resolve inside the frame).
 * - Teardown is explicit on tab close: listeners removed, iframe removed. The
 *   frame window's unload hooks are deliberately not relied on.
 */
"use strict";

var Zotero_SettingsTab = new (function () {
	// tabID -> { iframe, ready, listeners }
	this._states = new Map();

	function ftl(key, fallback) {
		try {
			let result = Zotero.ftl.formatValueSync(key);
			if (result && result.value) {
				return result.value;
			}
		}
		catch (e) {
			// Zotero.ftl may not be ready this early; fallback is fine.
		}
		return fallback;
	}

	this._findTab = function () {
		for (let id of this._states.keys()) {
			return id;
		}
		return null;
	};

	/**
	 * Open (or focus) the settings tab, optionally deep-linking to a pane.
	 *
	 * @param {String} [paneID] - e.g. "zotero-prefpane-dns"; omit for the default pane
	 * @return {String|null} The tab id
	 */
	this.open = function (paneID) {
		let existing = this._findTab();
		// Defensive: if a close path ever skipped onClose, drop the stale state
		// instead of selecting a dead tab id (Strata code pass, finding 4).
		if (existing && !document.getElementById(existing)) {
			this._teardown(existing);
			existing = null;
		}
		if (existing) {
			Zotero_Tabs.select(existing);
			if (paneID) {
				this._navigate(existing, paneID);
			}
			return existing;
		}
		let id = "tab-" + Zotero.Utilities.randomString();
		try {
			let { container } = Zotero_Tabs.add({
				id,
				type: "settings",
				title: ftl("settings-tab-title", "Settings"),
				select: true,
				data: { cssIcon: "cog" },
				onClose: () => this._teardown(id),
			});
			let state = this._build(container, id);
			this._states.set(id, state);
			if (paneID) {
				this._navigate(id, paneID);
			}
			return id;
		}
		catch (e) {
			Zotero.logError(e);
			try {
				Zotero_Tabs.close(id);
			}
			catch (ignored) {}
			return null;
		}
	};

	/**
	 * The tab's load phase: "loading" until the frame's navigation list exists,
	 * then "ready", or "failed" when the probe gives up.
	 */
	this.getState = function (id) {
		let state = this._states.get(id);
		return state ? state.phase : null;
	};

	this._settleStatus = function (state, phase) {
		state.phase = phase;
		if (!state.status) return;
		if (phase === "ready") {
			state.status.remove();
			state.status = null;
			return;
		}
		state.status.textContent = ftl(
			"settings-tab-failed",
			"Settings could not be loaded. Close this tab and try again."
		);
		state.status.classList.add("error");
	};

	this.getFrame = function (id) {
		let state = this._states.get(id);
		return state ? state.iframe : null;
	};

	this.isOpen = function (id) {
		return this._states.has(id);
	};

	this._build = function (container, id) {
		let doc = container.ownerDocument;
		let vbox = doc.createXULElement("vbox");
		vbox.className = "settings-tab";
		vbox.setAttribute("flex", "1");

		// The frame document loads asynchronously and can fail to initialize. Say so
		// instead of showing an empty panel, which reads as "settings are missing".
		let status = doc.createXULElement("description");
		status.className = "settings-status";
		status.textContent = ftl("settings-tab-loading", "Loading settings…");
		vbox.appendChild(status);

		let iframe = doc.createElementNS("http://www.w3.org/1999/xhtml", "iframe");
		iframe.className = "settings-frame";
		iframe.setAttribute("src", "chrome://zotero/content/preferences/preferences.xhtml");
		vbox.appendChild(iframe);
		container.appendChild(vbox);

		let state = {
			iframe,
			status,
			phase: "loading",
			listeners: [],
			ready: null,
			_resolveReady: null,
		};
		state.ready = new Promise((resolve) => {
			state._resolveReady = resolve;
		});

		// Frame readiness: the element load event is unreliable for chrome iframes
		// (the spike observed fully-loaded content with no event), so poll for the
		// initialized navigation list — that also means init() finished.
		let tries = 0;
		let timer = setInterval(() => {
			tries++;
			let ready = null;
			try {
				let win = iframe.contentWindow;
				let nav = win && win.document.getElementById("prefs-navigation");
				if (win && win.Zotero_Preferences && nav && nav.childElementCount > 0) {
					ready = win;
				}
			}
			catch (e) {
				// Frame may be mid-teardown; keep polling until the cap.
			}
			if (ready || tries > 100) {
				clearInterval(timer);
				if (ready) {
					this._attachFrameKeys(state, ready, id);
				}
				this._settleStatus(state, ready ? "ready" : "failed");
				// Always settle: on timeout resolve null so awaiting _navigate
				// unblocks instead of hanging forever (Strata finding 2).
				state._resolveReady(ready);
			}
		}, 50);
		state.timer = timer;

		return state;
	};

	/**
	 * Ctrl+W inside the frame closes the settings tab. Key events do not cross
	 * the frame boundary on their own (Strata risk: main keysets never see frame
	 * focus), so the frame listens for itself.
	 *
	 * v1 limitation (documented, Strata finding 3): the bridge is bound to the
	 * frame window captured at ready-time. The preferences document never
	 * navigates itself — panes inject into the same document — so there is no
	 * reload path to re-bind; if that ever changes, re-attach on frame load.
	 */
	this._attachFrameKeys = function (state, frameWindow, id) {
		let onKey = (event) => {
			let key = event.key || "";
			if ((key === "w" || event.keyCode === 87)
				&& (event.ctrlKey || event.metaKey)
				&& !event.shiftKey && !event.altKey) {
				event.preventDefault();
				event.stopPropagation();
				if (this._states.has(id)) {
					Zotero_Tabs.close(id);
				}
			}
		};
		frameWindow.addEventListener("keydown", onKey);
		state.listeners.push([frameWindow, "keydown", onKey]);
	};

	this._navigate = async function (id, paneID) {
		let state = this._states.get(id);
		if (!state) {
			return;
		}
		let frameWindow = await state.ready;
		if (!frameWindow || !this._states.has(id)) {
			return;
		}
		let previous = null;
		try {
			previous = frameWindow.Zotero_Preferences.navigation?.value || null;
		}
		catch (e) {
			previous = null;
		}
		try {
			await frameWindow.Zotero_Preferences.navigateToPane(paneID, {});
			// A successful pane replaces an earlier pane failure notice.
			if (state.status) {
				state.status.remove();
				state.status = null;
			}
		}
		catch (e) {
			Zotero.logError(e);
			// The navigation list may already mark the pane as chosen while the pane
			// content is still the previous one. Put the selection back so the list
			// does not claim a pane that never appeared.
			try {
				if (previous && frameWindow.Zotero_Preferences.navigation) {
					frameWindow.Zotero_Preferences.navigation.value = previous;
				}
			}
			catch (ignored) {}
			this._showPaneFailure(state);
		}
	};

	/**
	 * A pane failed inside a ready frame. This is not the whole-tab failure state:
	 * the rest of Settings still works, so the notice names the pane and lets the
	 * person choose another.
	 */
	this._showPaneFailure = function (state) {
		let message = ftl(
			"settings-tab-pane-failed",
			"That settings pane could not be opened. Choose another pane from the list."
		);
		if (state.status) {
			state.status.textContent = message;
			state.status.classList.add("error");
			return;
		}
		let doc = state.iframe.ownerDocument;
		let status = doc.createXULElement("description");
		status.className = "settings-status error";
		status.textContent = message;
		state.iframe.parentNode.insertBefore(status, state.iframe);
		state.status = status;
	};

	this._teardown = function (id) {
		let state = this._states.get(id);
		if (!state) {
			return;
		}
		this._states.delete(id);
		// Stop the readiness probe and settle any awaiters (Strata findings 1+2):
		// a closed tab must not leave a live timer probing a detached frame.
		if (state.timer) {
			clearInterval(state.timer);
			state.timer = null;
		}
		if (state._resolveReady) {
			state._resolveReady(null);
		}
		for (let [target, event, handler] of state.listeners) {
			try {
				target.removeEventListener(event, handler);
			}
			catch (e) {}
		}
		state.listeners = [];
		try {
			state.iframe.remove();
		}
		catch (e) {}
	};
})();
