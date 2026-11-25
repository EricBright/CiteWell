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
 * This is Phase 2a of folding the Firefox connector into the app (D47): a tab with an
 * address bar, navigation controls and a "Save to CiteWell" button around a sandboxed
 * content process. The page-side half of saving is the app's own Translation JSWindowActor
 * (actors/TranslationChild.mjs); this file drives it through RemoteTranslate.mjs — the
 * connector's inject scripts are deliberately not ported. Multi-item picker: Phase 2b.
 * This file still owns only the browsing surface and that save bridge; Google Docs glue
 * and PDF capture are later phases.
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
	// How long the Save button shows the "saved" tick before returning to its normal state.
	const SAVED_STATE_MS = 1500;
	// A detection that has not settled by then is abandoned: the actor waits for the page
	// to finish loading, and a page that never does must not leave the button stuck.
	const DETECT_TIMEOUT_MS = 15000;

	// Loaded lazily: RemoteTranslate.mjs pulls in the translation actor manager, which is
	// already initialized by the time a browse tab exists, but keeping the import out of the
	// top level makes the file loadable before startup finishes.
	let RemoteTranslateClass = null;
	function getRemoteTranslateClass() {
		if (!RemoteTranslateClass) {
			RemoteTranslateClass = ChromeUtils.importESModule(
				"chrome://zotero/content/RemoteTranslate.mjs"
			).RemoteTranslate;
		}
		return RemoteTranslateClass;
	}

	/**
	 * Synchronous Fluent lookup with a plain-English fallback, so a missing string never
	 * blocks opening a tab.
	 */
	function ftl(key, fallback, args) {
		try {
			let result = args
				? Zotero.ftl.formatValueSync(key, args)
				: Zotero.ftl.formatValueSync(key);
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
	 * Ctrl/Cmd+L: focus the address bar of the selected Browse tab, or open one when the
	 * selected tab is the Library (there is nowhere else to type a web address).
	 */
	this.focusOrOpen = function () {
		let id = Zotero_Tabs.selectedID;
		if (!this.isOpen(id)) {
			id = this.open();
		}
		if (id) {
			this.focusURLBar(id);
		}
		return id;
	};

	/**
	 * Focus the address bar and select its text, so typing replaces the URL instead of
	 * appending to it.
	 */
	this.focusURLBar = function (id) {
		let state = this._states.get(id);
		if (!state) {
			return false;
		}
		state.urlbar.focus();
		state.urlbar.select();
		return true;
	};

	/**
	 * True for a URL whose path names a PDF. The Browse tab has no PDF viewer (D30), so
	 * these are captured as attachments instead of being navigated to.
	 */
	function isPDFURL(spec) {
		try {
			let url = new URL(spec);
			return /\.pdf$/i.test(url.pathname);
		}
		catch (e) {
			return false;
		}
	}

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
		if (isPDFURL(url) && this._capturePDF(id, url)) {
			return true;
		}
		state.browser.loadURI(Services.io.newURI(url), {
			triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
		});
		return true;
	};

	/**
	 * Override the translator provider for a tab (tests and first-party callers). Not part
	 * of the browsing surface: detection normally uses the app's translator repository.
	 */
	this.setTranslatorProvider = function (id, provider) {
		let state = this._states.get(id);
		if (state) {
			state.translatorProvider = provider || null;
		}
	};

	/**
	 * True while the tab still exists and no navigation/close has happened since the
	 * detection or save that captured this generation.
	 */
	this._isCurrent = function (id, state, generation) {
		return this._states.get(id) === state && state.generation === generation;
	};

	/**
	 * Drop the tab's RemoteTranslate. While a save is in flight the instance is kept alive
	 * until that save settles: disposing it mid-save would remove its TranslationManager
	 * entry while the ItemSaver is still calling back into it, which surfaces as a silently
	 * half-finished save (found by the Phase 2a Strata pass).
	 */
	this._retireTranslate = function (state) {
		let translate = state.translate;
		state.translate = null;
		state.translators = null;
		if (!translate) {
			return;
		}
		if (state.saving) {
			state.staleTranslates.push({ translate, token: state.savingToken });
			return;
		}
		try {
			translate.dispose();
		}
		catch (e) {
			Zotero.logError(e);
		}
	};

	this._clearDetectTimer = function (state) {
		if (state.detectTimer) {
			clearTimeout(state.detectTimer);
			state.detectTimer = null;
		}
	};

	/**
	 * Dispose only the instances parked by the save identified by `token`. A save that never
	 * settles keeps its own entries; the teardown safety timer bounds that case.
	 */
	this._disposeStale = function (state, token) {
		let remaining = [];
		for (let entry of state.staleTranslates) {
			if (entry.token !== token) {
				remaining.push(entry);
				continue;
			}
			try {
				entry.translate.dispose();
			}
			catch (e) {
				Zotero.logError(e);
			}
		}
		state.staleTranslates = remaining;
	};

	/**
	 * Stop a PDF navigation before Gecko's removed viewer path (D30) and put the tab into
	 * the PDF save state. Safe to call twice for the same URL.
	 */
	this._capturePDF = function (id, spec) {
		let state = this._states.get(id);
		if (!state || !spec) {
			return false;
		}
		state.generation++;
		state.detectingURL = null;
		state.detectedURL = spec;
		state.pdfURL = spec;
		this._clearDetectTimer(state);
		this._retireTranslate(state);
		this._setSaveState(id, "pdf");
		try {
			state.browser.stop();
		}
		catch (e) {
			Zotero.logError(e);
		}
		return true;
	};

	// Button text per state. Keys are the -suffix in zotero.ftl; values are plain fallbacks.
	const SAVE_LABELS = {
		detecting: ["browse-save-detecting", "Looking for citation data…"],
		none: ["browse-save-none", "No citation data on this page"],
		available: ["browse-save-available", "Save to CiteWell"],
		saving: ["browse-save-saving", "Saving…"],
		saved: ["browse-save-saved", "Saved to CiteWell"],
		failed: ["browse-save-failed", "Couldn't save to CiteWell"],
		pdf: ["browse-save-pdf", "Save PDF to CiteWell"],
	};
	const SAVE_ICONS = {
		detecting: "book.svg",
		none: "book.svg",
		available: "book.svg",
		saving: "book.svg",
		saved: "tick.svg",
		failed: "cross.svg",
		pdf: "book.svg",
	};

	/**
	 * Drive the Save button's enabled/icon/text state.
	 *
	 * @param {String} id
	 * @param {String} name - One of SAVE_LABELS
	 * @param {String} [translatorLabel] - Shown in the tooltip when a translator is active
	 */
	this._setSaveState = function (id, name, translatorLabel) {
		let state = this._states.get(id);
		if (!state || !state.saveButton) {
			return;
		}
		let [key, fallback] = SAVE_LABELS[name] || SAVE_LABELS.none;
		let text = ftl(key, fallback);
		if (name === "available" && translatorLabel) {
			text = ftl(
				"browse-save-tooltip",
				"Save to CiteWell — " + translatorLabel,
				{ translator: translatorLabel }
			);
		}
		state.saveButton.classList.remove(
			"detecting", "none", "available", "saving", "saved", "failed"
		);
		state.saveButton.classList.add(name);
		// "pdf" is an actionable state too: it saves the file rather than a translation.
		state.saveButton.disabled = name !== "available" && name !== "pdf";
		state.saveButton.setAttribute("image", ICON_DIR + SAVE_ICONS[name]);
		state.saveButton.setAttribute("tooltiptext", text);
		state.saveButton.setAttribute("aria-label", text);
	};

	/**
	 * Look for a web translator for the page now loaded in the tab (Phase 2a).
	 *
	 * One RemoteTranslate per page. A navigation, reload or close bumps the generation, so a
	 * late detection result can never re-enable a button for a page that is no longer shown.
	 * A page that already has a detected translator skips re-detection on reload. A watchdog
	 * abandons a detection that never settles, because the actor waits for the page to finish
	 * loading and a page that never does must not leave the button stuck.
	 */
	this._detect = async function (id, specOverride) {
		let state = this._states.get(id);
		if (!state) {
			return;
		}
		let spec = specOverride || (state.browser.currentURI && state.browser.currentURI.spec) || "";
		if (isPDFURL(spec)) {
			this._capturePDF(id, spec);
			return;
		}
		// A real navigation ends the PDF state; the about:blank reset that follows a
		// stopped PDF load must not (handled below).
		if (spec && spec !== "about:blank") {
			state.pdfURL = null;
		}
		if (!spec || spec === "about:blank") {
			if (state.pdfURL) {
				// Stopping a PDF load resets the browser to about:blank; the capture state
				// must survive that reset.
				this._setSaveState(id, "pdf");
				return;
			}
			// Invalidate any detection still running for the previous page, then forget it.
			state.generation++;
			state.detectingURL = null;
			this._clearDetectTimer(state);
			this._retireTranslate(state);
			this._setSaveState(id, "none");
			return;
		}
		if (state.detectingURL === spec) {
			return;
		}
		if (state.translators && state.detectedURL === spec) {
			return;
		}
		if (state.saveTimer) {
			clearTimeout(state.saveTimer);
			state.saveTimer = null;
		}
		state.detectedURL = spec;
		state.detectingURL = spec;
		let generation = ++state.generation;
		this._clearDetectTimer(state);
		this._retireTranslate(state);
		this._setSaveState(id, "detecting");
		let translate = null;
		let timer = null;
		try {
			let RemoteTranslate = getRemoteTranslateClass();
			translate = new RemoteTranslate();
			state.translate = translate;
			if (state.translatorProvider) {
				translate.setTranslatorProvider(state.translatorProvider);
			}
			timer = setTimeout(() => {
				if (state.detectTimer !== timer || state.detectingURL !== spec) {
					return;
				}
				state.detectTimer = null;
				state.detectingURL = null;
				// Invalidate the abandoned detection: its late result must not flip the
				// button back to "available" after the watchdog has given up.
				state.generation++;
				if (state.translate === translate) {
					this._retireTranslate(state);
				}
				this._setSaveState(id, "none");
			}, DETECT_TIMEOUT_MS);
			state.detectTimer = timer;
			await translate.setBrowser(state.browser);
			let translators = await translate.detect();
			if (!this._isCurrent(id, state, generation)) {
				return;
			}
			if (!translators || !translators.length) {
				state.translators = null;
				this._setSaveState(id, "none");
				return;
			}
			state.translators = translators;
			this._setSaveState(id, "available", translators[0].label || "");
		}
		catch (e) {
			if (this._isCurrent(id, state, generation)) {
				Zotero.logError(e);
				if (state.translate === translate) {
					this._retireTranslate(state);
				}
				this._setSaveState(id, "none");
			}
		}
		finally {
			if (state.detectTimer === timer) {
				clearTimeout(timer);
				state.detectTimer = null;
			}
			// Clear only if this detection still owns the in-flight marker: a navigation may
			// have started a newer detection for a different URL meanwhile.
			if (state.detectingURL === spec) {
				state.detectingURL = null;
			}
		}
	};


	/**
	 * Save the page with the detected translator (Phase 2a).
	 *
	 * Two deliberate limits: every item the translator returns is saved (the connector's
	 * picker dialog is Phase 2b), and the save target is the library/collection that the
	 * connector itself would use (`getSaveTarget()`), so both save paths agree.
	 */
	this._save = async function (id) {
		let state = this._states.get(id);
		if (!state || state.saving) {
			return;
		}
		if (state.pdfURL) {
			return this._savePDF(id, state);
		}
		if (!state.translators || !state.translate) {
			return;
		}
		let translate = state.translate;
		let generation = state.generation;
		let saveSpec = state.detectedURL;
		// Tags instances retired during *this* save, so a later save cannot dispose them
		// (and this save cannot dispose a previous save's instances).
		let token = {};
		state.savingToken = token;
		let target = this._getSaveTarget();
		let savedItems = [];
		let errorMessage = null;
		let aborted = false;
		let selectionCancelled = false;
		state.saving = true;
		this._setSaveState(id, "saving");
		let progress = this._showProgress(
			"browse-save-progress-headline",
			"Saving to CiteWell"
		);
		try {
			translate.setHandler("itemDone", (remoteTranslate, dbItem) => {
				if (dbItem && typeof dbItem.getField == "function") {
					savedItems.push(dbItem);
				}
			});
			translate.setHandler("error", (remoteTranslate, message) => {
				errorMessage = String(message);
			});
			// Phase 2b: the translator asks which of several items to save. An empty map
			// makes the engine save nothing; the cancelled flag keeps that from being
			// reported as a failure.
			translate.setHandler("select", (remoteTranslate, items, resolve) => {
				// resolve() runs on every path: the engine's selectItems contract cannot
				// time out, so a throwing picker would otherwise hang the translation.
				let selected = null;
				try {
					selected = this._selectItemsInteractive(id, items, target);
				}
				catch (e) {
					Zotero.logError(e);
					selected = null;
				}
				if (!selected) {
					selectionCancelled = true;
					resolve({});
				}
				else {
					resolve(selected);
				}
			});
			// Re-detect right before translating. Detection result for the *current*
			// document, not the one that was loaded when the button was enabled: a page can
			// swap its content without a navigation event, and the old translator must never
			// run against a document it was not detected for.
			let translators = await translate.detect();
			if (!this._isCurrent(id, state, generation)) {
				aborted = true;
				return;
			}
			if (!translators || !translators.length) {
				aborted = true;
				this._retireTranslate(state);
				this._setSaveState(id, "none");
				this._finishProgress(progress, "empty");
				return;
			}
			state.translators = translators;
			if (((state.browser.currentURI && state.browser.currentURI.spec) || "") !== saveSpec) {
				// The re-detection may have taken long enough for a navigation to commit; the
				// pinned actor would then reject, but say so instead of failing opaquely.
				aborted = true;
				this._setSaveState(id, "failed");
				this._finishProgress(
					progress,
					"error",
					"the page changed while it was being saved"
				);
				return;
			}
			await translate.translate({
				libraryID: target.libraryID,
				collections: target.collections,
			});
		}
		catch (e) {
			errorMessage = errorMessage || e.message || String(e);
			Zotero.logError(e);
		}
		finally {
			// Handlers close over this save's counters; drop them so a later save on the
			// same tab does not accumulate closures.
			for (let name of ["itemDone", "select", "error"]) {
				try {
					translate.clearHandlers(name);
				}
				catch (e) {
					Zotero.logError(e);
				}
			}
			state.savingToken = null;
			state.saving = false;
			this._disposeStale(state, token);
			if (state.staleCleanupTimer) {
				clearTimeout(state.staleCleanupTimer);
				state.staleCleanupTimer = null;
			}
			if (!aborted && this._isCurrent(id, state, generation)) {
				// Saved items are the truth, not the `done` flag: a translator can report
				// success with nothing to save, and a late attachment error must not claim
				// that nothing landed.
				if (selectionCancelled && !savedItems.length) {
					this._setSaveState(id, "available", state.translators[0].label || "");
					this._finishProgress(progress, "cancelled");
				}
				else if (savedItems.length) {
					this._setSaveState(id, "saved");
					this._finishProgress(progress, "saved", {
						items: savedItems,
						error: errorMessage,
					});
					this._restoreSaveButtonLater(id, generation);
				}
				else if (errorMessage) {
					this._setSaveState(id, "failed");
					this._finishProgress(progress, "error", errorMessage);
				}
				else {
					this._setSaveState(id, "failed");
					this._finishProgress(progress, "empty");
				}
			}
		}
	};

	/**
	 * Save a PDF page as an imported-URL attachment. The download runs through the app's
	 * own cookie jar, which is the same jar the tab uses, so authenticated PDFs work
	 * without exposing the file to the page.
	 */
	this._savePDF = async function (id, state) {
		let generation = state.generation;
		let url = state.pdfURL;
		state.saving = true;
		this._setSaveState(id, "saving");
		let target = this._getSaveTarget();
		let progress = this._showProgress("browse-save-progress-headline", "Saving to CiteWell");
		let item = null;
		let errorMessage = null;
		try {
			let title = "PDF";
			try {
				let leaf = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
				title = leaf.replace(/\.pdf$/i, "") || "PDF";
			}
			catch (e) {}
			item = await Zotero.Attachments.importFromURL({
				url,
				contentType: "application/pdf",
				title,
				libraryID: target.libraryID,
				collections: target.collections,
			});
		}
		catch (e) {
			errorMessage = e.message || String(e);
			Zotero.logError(e);
		}
		finally {
			state.saving = false;
			if (this._isCurrent(id, state, generation)) {
				if (item) {
					this._setSaveState(id, "saved");
					this._finishProgress(progress, "saved", { items: [item], error: null });
					this._restoreSaveButtonLater(id, generation);
				}
				else {
					this._setSaveState(id, "failed");
					this._finishProgress(
						progress, "error", errorMessage || "Couldn't save the PDF"
					);
				}
			}
		}
	};

	/**
	 * The connector's save target (focused collection, else the library row), so the in-app
	 * Save button and a browser-connector save land in the same place. Falls back to the
	 * user library if the pane is unavailable.
	 */
	this._getSaveTarget = function () {
		try {
			let target = Zotero.Server.Connector.getSaveTarget();
			if (target && target.library) {
				return {
					libraryID: target.library.libraryID,
					collections: target.collection ? [target.collection.id] : undefined,
					label: target.collection ? target.collection.name : target.library.name,
				};
			}
		}
		catch (e) {
			Zotero.logError(e);
		}
		return {
			libraryID: Zotero.Libraries.userLibraryID,
			collections: undefined,
			label: Zotero.Libraries.userLibrary.name,
		};
	};

	/**
	 * Show the 2b item picker modally and return the selected id -> value map, or null
	 * when the user cancels or the dialog cannot open. openDialog is synchronous, so the
	 * translation can never be left waiting on a picker that will not answer; the dialog
	 * also writes null from beforeunload for a window-manager close.
	 */
	this._selectItemsInteractive = function (id, items, target) {
		let state = this._states.get(id);
		if (!state) {
			return null;
		}
		try {
			let args = { items, target: (target && target.label) || "", result: null };
			window.openDialog(
				"chrome://zotero/content/browseItemSelector.xhtml",
				"citewell-browse-item-selector",
				"chrome,modal,centerscreen,resizable",
				args
			);
			return args.result;
		}
		catch (e) {
			Zotero.logError(e);
			return null;
		}
	};

	/**
	 * Progress UI is a courtesy: a failure to create the window must never fail the save.
	 */
	this._showProgress = function (headlineKey, headlineFallback) {
		try {
			let progress = new Zotero.ProgressWindow({ closeOnClick: true });
			progress.changeHeadline(ftl(headlineKey, headlineFallback));
			progress.show();
			return progress;
		}
		catch (e) {
			Zotero.logError(e);
			return null;
		}
	};

	this._finishProgress = function (progress, kind, payload) {
		if (!progress) {
			return;
		}
		try {
			if (kind === "saved") {
				let items = payload.items;
				progress.changeHeadline(ftl("browse-save-saved", "Saved to CiteWell"));
				if (items.length === 1) {
					let title = items[0].getField("title");
					progress.addDescription(ftl(
						"browse-save-result-one",
						"Saved “" + title + "” to CiteWell",
						{ title }
					));
				}
				else {
					progress.addDescription(ftl(
						"browse-save-result-many",
						"Saved " + items.length + " items to CiteWell",
						{ count: items.length }
					));
				}
				if (payload.error) {
					progress.addDescription(payload.error);
				}
				progress.startCloseTimer(4000);
			}
			else if (kind === "cancelled") {
				progress.changeHeadline(ftl("browse-save-cancelled", "Nothing selected"));
				progress.startCloseTimer(2500);
			}
			else if (kind === "error") {
				progress.changeHeadline(ftl("browse-save-failed", "Couldn't save to CiteWell"));
				progress.addDescription(payload);
				progress.startCloseTimer(8000);
			}
			else {
				progress.changeHeadline(ftl("browse-save-empty", "Nothing to save from this page"));
				progress.startCloseTimer(3000);
			}
		}
		catch (e) {
			Zotero.logError(e);
		}
	};

	/**
	 * Return the button to its normal state a moment after a successful save. The timer is
	 * owned by the tab state and cleared on teardown, navigation and the next save.
	 */
	this._restoreSaveButtonLater = function (id, generation) {
		let state = this._states.get(id);
		if (!state) {
			return;
		}
		if (state.saveTimer) {
			clearTimeout(state.saveTimer);
		}
		state.saveTimer = setTimeout(() => {
			state.saveTimer = null;
			if (!this._isCurrent(id, state, generation) || state.saving) {
				return;
			}
			if (state.pdfURL) {
				this._setSaveState(id, "pdf");
			}
			else if (state.translators) {
				this._setSaveState(id, "available", state.translators[0].label || "");
			}
			else {
				this._setSaveState(id, "none");
			}
		}, SAVED_STATE_MS);
	};

	this._makeNavButton = function (doc, className, icon, labelKey, fallbackLabel, iconDir) {
		let button = doc.createXULElement("toolbarbutton");
		button.className = "browse-nav " + className;
		button.setAttribute("image", (iconDir || ICON_DIR) + icon);
		button.setAttribute("aria-label", ftl(labelKey, fallbackLabel));
		return button;
	};

	/**
	 * Watch responses in our tabs: a PDF is captured by content type, not by URL suffix,
	 * because real PDF URLs often carry none (`/pdf/1706.03762v7`). The channel is
	 * cancelled before the (removed, D30) viewer path consumes it, and the saved copy is
	 * fetched again through the app's cookie jar.
	 */
	this._ensurePDFObserver = function () {
		if (this._pdfObserver) {
			return;
		}
		let self = this;
		this._pdfObserver = {
			observe(subject) {
				let channel;
				try {
					channel = subject.QueryInterface(Ci.nsIHttpChannel);
				}
				catch (e) {
					return;
				}
				// Only a top-level document load means "the tab is showing a PDF". A PDF
				// fetched as a subresource (iframe, object, XHR preview) must not hijack
				// the tab into the capture state.
				if (channel.contentType !== "application/pdf"
					|| !channel.loadInfo
					|| channel.loadInfo.externalContentPolicyType !== Ci.nsIContentPolicy.TYPE_DOCUMENT) {
					return;
				}
				let browserId = channel.browserId;
				for (let [id, state] of self._states) {
					if (!state.browser || state.browser.browserId !== browserId) {
						continue;
					}
					// Already captured (a second request for the same document).
					if (state.pdfURL) {
						return;
					}
					try {
						channel.cancel(Cr.NS_BINDING_ABORTED);
					}
					catch (e) {
						Zotero.logError(e);
					}
					self._capturePDF(id, channel.URI.spec);
					return;
				}
			},
		};
		Services.obs.addObserver(this._pdfObserver, "http-on-examine-response");
	};

	this._dropPDFObserverIfIdle = function () {
		if (this._pdfObserver && !this._states.size) {
			try {
				Services.obs.removeObserver(this._pdfObserver, "http-on-examine-response");
			}
			catch (e) {
				Zotero.logError(e);
			}
			this._pdfObserver = null;
		}
	};

	this._build = function (container, id) {
		this._ensurePDFObserver();
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

		// The control hugging the address bar is Go, the convention every browser trained
		// users on. Save-to-library sits on the far side of a divider so it is not mistaken
		// for the address bar's submit action (owner feedback, 2026-11-25).
		let goButton = this._makeNavButton(
			doc, "browse-go", "arrow-right.svg", "browse-nav-go", "Go",
			"chrome://zotero/skin/20/universal/"
		);
		// Like every browser tab, Go is inert until there is an address to go to.
		goButton.disabled = true;

		let saveButton = this._makeNavButton(
			doc, "browse-save", "book.svg", "browse-save-available", "Save to CiteWell"
		);
		saveButton.disabled = true;
		saveButton.setAttribute(
			"tooltiptext",
			ftl("browse-save-detecting", "Looking for citation data…")
		);
		saveButton.setAttribute(
			"aria-label",
			ftl("browse-save-detecting", "Looking for citation data…")
		);

		toolbar.appendChild(backButton);
		toolbar.appendChild(forwardButton);
		toolbar.appendChild(reloadButton);
		toolbar.appendChild(urlbar);
		toolbar.appendChild(goButton);
		let divider = doc.createXULElement("separator");
		divider.className = "browse-divider";
		toolbar.appendChild(divider);
		toolbar.appendChild(saveButton);

		let browser = doc.createXULElement("browser");
		browser.setAttribute("type", "content");
		browser.setAttribute("flex", "1");
		browser.setAttribute("disableglobalhistory", "true");
		browser.setAttribute("maychangeremoteness", "true");
		browser.setAttribute("messagemanagergroup", "citewell-browse");

		vbox.appendChild(toolbar);
		vbox.appendChild(browser);
		container.appendChild(vbox);

		// Only available once the browser is in the document.
		let webProgress = browser.webProgress;

		let state = {
			browser,
			urlbar,
			saveButton,
			backButton,
			forwardButton,
			reloadButton,
			listeners: [],
			// Save bridge (Phase 2a): one RemoteTranslate per loaded page.
			translate: null,
			translatorProvider: null,
			translators: null,
			detectedURL: null,
			// Set when the tab is pointed at a PDF: the Save action saves that file.
			pdfURL: null,
			// URL whose detection is currently in flight (null when none is).
			detectingURL: null,
			generation: 0,
			saving: false,
			// Token of the save currently in flight, so retiring code can tag instances.
			savingToken: null,
			// RemoteTranslate instances retired while a save was in flight, tagged with the
			// save token that owns them; disposed by that save's finally.
			staleTranslates: [],
			saveTimer: null,
			detectTimer: null,
			staleCleanupTimer: null,
			progressListener: null,
		};

		const listen = (target, event, handler) => {
			target.addEventListener(event, handler);
			state.listeners.push([target, event, handler]);
		};

		// Navigation signal: webProgress location changes (see below). The XUL `load` event
		// is not reliable for <browser> on this platform: the Phase 2a tests proved navigation
		// completes without it ever firing. webProgress is what HiddenBrowser.mjs uses. It
		// also reports same-document navigations (pushState), which is exactly when a
		// translator detected for the previous document would go stale.
		let self = this;
		let progressListener = {
			onLocationChange(progress, request, location, flags) {
				if (!progress.isTopLevel) {
					return;
				}
				// The location-change notification fires at the start of the load, when
				// currentURI may still be the previous document, so pass the destination.
				self._refresh(id, location && location.spec);
				self._detect(id, location && location.spec);
			},
			onStateChange(progress, request, stateFlags, status) {
				if (!progress.isTopLevel) {
					return;
				}
				let startDocument = Ci.nsIWebProgressListener.STATE_START
					| Ci.nsIWebProgressListener.STATE_IS_DOCUMENT;
				if ((stateFlags & startDocument) === startDocument
					&& request && request.URI && isPDFURL(request.URI.spec)) {
					// A link to a PDF (or a redirect to one): stop before the viewer path.
					self._capturePDF(id, request.URI.spec);
					return;
				}
				let stopWindow = Ci.nsIWebProgressListener.STATE_STOP
					| Ci.nsIWebProgressListener.STATE_IS_WINDOW;
				if ((stateFlags & stopWindow) === stopWindow) {
					// Once the document has committed, back/forward and the bar are final.
					self._refresh(id);
				}
			},
			QueryInterface: ChromeUtils.generateQI([
				"nsIWebProgressListener",
				"nsISupportsWeakReference",
			]),
		};
		try {
			webProgress.addProgressListener(
				progressListener,
				Ci.nsIWebProgress.NOTIFY_LOCATION | Ci.nsIWebProgress.NOTIFY_STATE_WINDOW
			);
			state.progressListener = progressListener;
		}
		catch (e) {
			Zotero.logError(e);
		}

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

		const markRejected = (navigated) => {
			if (navigated) {
				urlbar.removeAttribute("aria-invalid");
			}
			else {
				urlbar.setAttribute("aria-invalid", "true");
			}
		};
		listen(urlbar, "input", () => {
			goButton.disabled = !urlbar.value.trim();
			urlbar.removeAttribute("aria-invalid");
		});
		listen(urlbar, "keydown", (event) => {
			if (event.key === "Enter" || event.keyCode === 13) {
				event.preventDefault();
				markRejected(this.navigate(id, urlbar.value));
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
		listen(goButton, "command", () => {
			markRejected(this.navigate(id, urlbar.value));
		});
		listen(saveButton, "command", () => this._save(id));

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
	this._refresh = function (id, specOverride) {
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
			let spec = specOverride || (uri ? uri.spec : "");
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
		// Everything _build created is released here: generation invalidates in-flight
		// detection, the timer is cleared, and the RemoteTranslate is disposed now — or, if a
		// save is in flight, when that save settles (disposing mid-save would strand the
		// ItemSaver's itemDone callbacks in TranslationManager).
		state.generation++;
		if (state.saveTimer) {
			clearTimeout(state.saveTimer);
			state.saveTimer = null;
		}
		this._clearDetectTimer(state);
		state.detectingURL = null;
		// A save in flight keeps its RemoteTranslate in staleTranslates, disposed by the
		// save's own finally — never here, mid-save. If that save never settles, this timer
		// bounds the TranslationManager entry's lifetime instead of leaking it forever.
		this._retireTranslate(state);
		if (state.saving) {
			state.staleCleanupTimer = setTimeout(() => {
				state.staleCleanupTimer = null;
				for (let entry of state.staleTranslates.splice(0)) {
					try {
						entry.translate.dispose();
					}
					catch (e) {
						Zotero.logError(e);
					}
				}
			}, 120000);
		}
		if (state.progressListener) {
			try {
				state.browser.webProgress.removeProgressListener(state.progressListener);
			}
			catch (e) {
				Zotero.logError(e);
			}
			state.progressListener = null;
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
		this._dropPDFObserverIfIdle();
	};
})();
