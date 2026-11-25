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
 * The in-app Browse tab (D47) — a visible browsing surface inside the main window.
 *
 * This is Phase 1 of folding the Firefox connector into the app: a tab with an address bar
 * and navigation controls around a sandboxed content process. Translator detection and the
 * "Save to CiteWell" action arrive in Phase 2; this file owns only the browsing surface.
 *
 * Security posture (D47/D48):
 *  - The page lives in a remote content process (`type="content"` is remote by default under
 *    Fission); no chrome:// or script access crosses that boundary.
 *  - User input is normalized through `normalizeURL()`, which accepts only http/https and
 *    rejects javascript:, file:, chrome:, resource:, data: and anything with whitespace
 *    (v1 has no implicit search — a URL or nothing).
 *  - Navigation starts from chrome with the system principal, the same pattern HiddenBrowser
 *    uses, so the address bar cannot be tricked into a privileged load.
 *
 * Loaded into the zoteroPane window scope via loadSubScript (see zoteroPane.xhtml).
 */
"use strict";

var Zotero_BrowseTab = new (function () {
	// tabID -> { browser, urlbar, backButton, forwardButton, reloadButton, listeners }
	this._states = new Map();

	const ICON_DIR = "chrome://zotero/skin/16/universal/";
	const MAX_TAB_TITLE = 100;

	/**
	 * Synchronous Fluent lookup with a plain-English fallback, so a missing string never
	 * blocks opening a tab.
	 */
	function ftl(key, fallback) {
		try {
			let result = Zotero.ftl.formatValueSync(key);
			if (result && result.value) {
				return result.value;
			}
		}
		catch (e) {
			Zotero.logError(e);
		}
		return fallback;
	}

	/**
	 * Open a new Browse tab and select it.
	 *
	 * @param {String} [initialURL] - Pre-normalized URL to load, or omit for a blank tab
	 * @returns {String|null} The new tab id, or null if the tab could not be built
	 */
	this.open = function (initialURL) {
		let id = "tab-" + Zotero.Utilities.randomString();
		try {
			let { container } = Zotero_Tabs.add({
				id,
				type: "browse",
				title: ftl("browse-tab-title", "Browse"),
				select: true,
				data: { icon: "webpage" },
				onClose: () => this._teardown(id),
			});
			let state = this._build(container, id);
			this._states.set(id, state);
			if (initialURL) {
				this.navigate(id, initialURL);
			}
			state.urlbar.focus();
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
	 * The tab's <browser>, for tests and for the Phase 2 translator bridge.
	 */
	this.getBrowser = function (id) {
		let state = this._states.get(id);
		return state ? state.browser : null;
	};

	this.isOpen = function (id) {
		return this._states.has(id);
	};

	/**
	 * Normalize user input to a loadable http/https URL, or null if it must not be loaded.
	 * Exported as-is for tests: this function is the security gate for the address bar.
	 *
	 * Pure `URL` parsing, deliberately no XPCOM fixup service: one code path, fully
	 * deterministic, and every branch is covered by browseTabTest.
	 *
	 * @param {String} input
	 * @returns {String|null}
	 */
	this.normalizeURL = function (input) {
		if (typeof input !== "string") {
			return null;
		}
		let trimmed = input.trim();
		// v1: URLs only. Whitespace means this isn't a URL, and there is no search fallback.
		if (!trimmed || /\s/.test(trimmed)) {
			return null;
		}
		// If the input declares a scheme ("javascript:", "file:", "data:", …), it must be
		// one of the two web schemes — checked on the raw input, before any rewriting, so a
		// scheme that merely looks like a host can never slip through. A host:port form
		// ("localhost:8080", digits after the colon) declares a port, not a scheme.
		let looksLikeHostPort = /^[a-z0-9.-]+:\d+(?:[/?#].*)?$/i.test(trimmed);
		let schemeMatch = looksLikeHostPort
			? null
			: trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
		let candidate;
		if (schemeMatch) {
			let scheme = schemeMatch[1].toLowerCase();
			if (scheme !== "http" && scheme !== "https") {
				return null;
			}
			candidate = trimmed;
		}
		else {
			// No scheme declared? The browse tab assumes https.
			candidate = "https://" + trimmed;
		}
		let url = null;
		try {
			url = new URL(candidate);
		}
		catch (e) {
			return null;
		}
		// Belt and braces: even after parsing, only web schemes may leave the bar.
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return null;
		}
		return url.href;
	};

	/**
	 * Load a user-supplied address in the tab. Returns false without navigating if the
	 * input does not normalize to an allowed URL.
	 */
	this.navigate = function (id, input) {
		let state = this._states.get(id);
		if (!state) {
			return false;
		}
		let url = this.normalizeURL(input);
		if (!url) {
			return false;
		}
		state.browser.loadURI(Services.io.newURI(url), {
			triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
		});
		return true;
	};

	this._makeNavButton = function (doc, className, icon, labelKey, fallbackLabel) {
		let button = doc.createXULElement("toolbarbutton");
		button.className = "browse-nav " + className;
		button.setAttribute("image", ICON_DIR + icon);
		button.setAttribute("aria-label", ftl(labelKey, fallbackLabel));
		return button;
	};

	this._build = function (container, id) {
		let doc = container.ownerDocument;

		let vbox = doc.createXULElement("vbox");
		vbox.className = "browse-tab";
		vbox.setAttribute("flex", "1");

		let toolbar = doc.createXULElement("hbox");
		toolbar.className = "browse-toolbar";
		toolbar.setAttribute("align", "center");

		let backButton = this._makeNavButton(
			doc, "browse-back", "chevron-12.svg", "browse-nav-back", "Back"
		);
		backButton.disabled = true;
		let forwardButton = this._makeNavButton(
			doc, "browse-forward", "chevron-12.svg", "browse-nav-forward", "Forward"
		);
		forwardButton.disabled = true;
		let reloadButton = this._makeNavButton(
			doc, "browse-reload", "refresh.svg", "browse-nav-reload", "Reload"
		);

		// A real HTML input, not a XUL <textbox>: this platform no longer renders bare
		// <textbox> (verified visually in the AppImage — the element attached but never
		// drew), while HTML inputs render fine inside XUL boxes, as the search box proves.
		let urlbar = doc.createElementNS("http://www.w3.org/1999/xhtml", "input");
		urlbar.className = "browse-urlbar";
		urlbar.setAttribute("type", "text");
		urlbar.setAttribute("autocomplete", "off");
		urlbar.setAttribute("spellcheck", "false");
		urlbar.setAttribute("data-l10n-id", "browse-urlbar");
		urlbar.setAttribute("data-l10n-attrs", "placeholder");

		toolbar.appendChild(backButton);
		toolbar.appendChild(forwardButton);
		toolbar.appendChild(reloadButton);
		toolbar.appendChild(urlbar);

		let browser = doc.createXULElement("browser");
		browser.setAttribute("type", "content");
		browser.setAttribute("flex", "1");
		browser.setAttribute("disableglobalhistory", "true");
		browser.setAttribute("maychangeremoteness", "true");
		browser.setAttribute("messagemanagergroup", "citewell-browse");

		vbox.appendChild(toolbar);
		vbox.appendChild(browser);
		container.appendChild(vbox);

		let state = {
			browser,
			urlbar,
			backButton,
			forwardButton,
			reloadButton,
			listeners: [],
		};

		const listen = (target, event, handler) => {
			target.addEventListener(event, handler);
			state.listeners.push([target, event, handler]);
		};

		// v1 event set: load + pagetitlechanged covers navigations and redirects. JS-only
		// pushState changes update on the next real load; a webProgress location listener
		// is the hardening path if stale bar/button state ever shows up in use.
		listen(browser, "load", () => this._refresh(id));
		listen(browser, "pagetitlechanged", () => {
			this._refresh(id);
			let title = browser.contentTitle
				|| (browser.currentURI && browser.currentURI.spec)
				|| "";
			if (title) {
				if (title.length > MAX_TAB_TITLE) {
					title = title.slice(0, MAX_TAB_TITLE - 1) + "…";
				}
				Zotero_Tabs.rename(id, title);
			}
		});

		listen(urlbar, "keydown", (event) => {
			if (event.key === "Enter" || event.keyCode === 13) {
				event.preventDefault();
				this.navigate(id, urlbar.value);
			}
		});
		listen(backButton, "command", () => {
			try {
				state.browser.webNavigation.goBack();
			}
			catch (e) {
				Zotero.logError(e);
			}
		});
		listen(forwardButton, "command", () => {
			try {
				state.browser.webNavigation.goForward();
			}
			catch (e) {
				Zotero.logError(e);
			}
		});
		listen(reloadButton, "command", () => {
			try {
				state.browser.reloadWithFlags(0);
			}
			catch (e) {
				Zotero.logError(e);
			}
		});

		// Translate dynamically-created l10n markup (the urlbar placeholder).
		try {
			doc.l10n.translateFragment(vbox);
		}
		catch (e) {
			Zotero.logError(e);
		}

		return state;
	};

	/**
	 * Sync the address bar and back/forward state with the browser. Leaves the address
	 * bar alone while the user is typing in it.
	 */
	this._refresh = function (id) {
		let state = this._states.get(id);
		if (!state) {
			return;
		}
		let { browser, urlbar, backButton, forwardButton } = state;
		try {
			let nav = browser.webNavigation;
			backButton.disabled = !(nav && nav.canGoBack);
			forwardButton.disabled = !(nav && nav.canGoForward);
		}
		catch (e) {
			// Buttons stay as they are; browsing still works without history state.
		}
		try {
			let uri = browser.currentURI;
			let spec = uri ? uri.spec : "";
			if (spec === "about:blank") {
				spec = "";
			}
			let active = urlbar.ownerDocument.activeElement;
			if (active !== urlbar && urlbar.value !== spec) {
				urlbar.value = spec;
			}
		}
		catch (e) {
			// URL sync is best-effort.
		}
	};

	/**
	 * Tab close: stop the page and detach listeners before the container is removed.
	 */
	this._teardown = function (id) {
		let state = this._states.get(id);
		if (!state) {
			return;
		}
		this._states.delete(id);
		try {
			state.browser.stop();
		}
		catch (e) {}
		for (let [target, event, handler] of state.listeners) {
			target.removeEventListener(event, handler);
		}
		state.listeners = [];
	};
})();
