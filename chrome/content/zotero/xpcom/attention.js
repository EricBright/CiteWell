/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2026 Eric Bright

    This file is part of CiteWell.

    CiteWell is free software: you can redistribute it and/or modify it under
    the terms of the GNU Affero General Public License as published by the Free
    Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    ***** END LICENSE BLOCK *****
*/

/**
 * Attention scheduling for CiteWell-owned windows.
 *
 * The controller is deliberately platform-free: it knows when to ask for
 * attention, not how. A presenter adapter supplies the actual urgency,
 * notification, InfoBar and banner operations. Tests inject a fake clock and a
 * fake adapter, so no test waits on real time or a compositor.
 *
 * See docs/attention.md for the contract and the 1/3/10 second ladder.
 */
Zotero.Attention = new function () {
	this.TIMINGS = Object.freeze({
		urgency: 1000,
		escalate: 3000,
		banner: 10000,
	});

	/**
	 * @param {Object} adapter
	 *   isFocused(window) -> Boolean
	 *   requestAttention(entry)        (optional on progress entries)
	 *   escalate(entry)                (optional on progress entries)
	 *   showBanner(entry)
	 *   setTitleCue(entry, active)     (optional)
	 *   clearTitleCue(entry)           (optional)
	 *   log(message, error)            (optional)
	 * @param {Object} [options]
	 *   clock: { setTimeout, clearTimeout }
	 *   timings: override defaults
	 */
	this.Controller = function (adapter, options = {}) {
		if (!adapter || typeof adapter.isFocused !== "function") {
			throw new Error("Attention controller requires an isFocused adapter");
		}
		var self = this;
		var clock = options.clock || {
			setTimeout: (fn, delay) => setTimeout(fn, delay),
			clearTimeout: id => clearTimeout(id),
		};
		var timings = Object.assign({}, Zotero.Attention.TIMINGS, options.timings || {});
		var entries = new Map();
		var nextID = 1;

		function log(message, error) {
			try {
				if (adapter.log) adapter.log(message, error);
				else if (Zotero && Zotero.logError) Zotero.logError(error || message);
			}
			catch (e) {}
		}

		function call(entry, method, ...args) {
			try {
				if (typeof adapter[method] === "function") {
					return adapter[method](entry, ...args);
				}
			}
			catch (e) {
				log("attention adapter failed: " + method, e);
			}
			return undefined;
		}

		function clearTimer(entry, name) {
			if (entry.timers[name]) {
				clock.clearTimeout(entry.timers[name]);
				entry.timers[name] = null;
			}
		}

		function clearAll(entry) {
			clearTimer(entry, "urgency");
			clearTimer(entry, "escalate");
			clearTimer(entry, "banner");
		}

		function clearCue(entry) {
			if (entry.titleCue) {
				entry.titleCue = false;
				call(entry, "clearTitleCue");
			}
		}

		function stop(entry) {
			clearAll(entry);
			clearCue(entry);
			entry.closed = true;
			entries.delete(entry.window);
		}

		function focused(entry) {
			if (entry.focused || entry.closed) return true;
			try {
				if (adapter.isFocused(entry.window)) {
					entry.focused = true;
					clearAll(entry);
					clearCue(entry);
					entries.delete(entry.window);
					return true;
				}
			}
			catch (e) {
				log("attention focus check failed", e);
			}
			return false;
		}

		function schedule(entry, name, delay) {
			entry.timers[name] = clock.setTimeout(() => {
				entry.timers[name] = null;
				if (entry.closed || focused(entry)) return;
				switch (name) {
					case "urgency":
						call(entry, "requestAttention");
						entry.titleCue = true;
						call(entry, "setTitleCue", true);
						break;
					case "escalate":
						call(entry, "escalate");
						break;
					case "banner":
						call(entry, "showBanner");
						break;
				}
			}, delay);
		}

		/**
		 * Start watching a window.
		 *
		 * options:
		 *   kind: "dialog" (default) or "progress"
		 *   surface: "app" (default), "libreoffice" or "connector"
		 *   requiresInput: defaults to kind == "dialog"
		 */
		this.watch = function (window, options = {}) {
			if (!window) throw new Error("Attention controller requires a window");
			if (entries.has(window)) return entries.get(window);
			var kind = options.kind || "dialog";
			var entry = {
				id: nextID++,
				window,
				kind,
				surface: options.surface || "app",
				requiresInput: options.requiresInput === undefined
					? kind === "dialog"
					: !!options.requiresInput,
				focused: false,
				titleCue: false,
				closed: false,
				timers: { urgency: null, escalate: null, banner: null },
			};
			entries.set(window, entry);
			if (entry.requiresInput) {
				schedule(entry, "urgency", timings.urgency);
				schedule(entry, "escalate", timings.escalate);
			}
			schedule(entry, "banner", timings.banner);
			return entry;
		};

		/** The window received focus; cancel every escalation. */
		this.focus = function (window) {
			var entry = entries.get(window);
			if (!entry || entry.closed) return;
			entry.focused = true;
			clearAll(entry);
			clearCue(entry);
			entries.delete(window);
		};

		/** The window closed or the operation completed. */
		this.close = function (window) {
			var entry = entries.get(window);
			if (entry) stop(entry);
		};

		this.getEntry = function (window) {
			return entries.get(window);
		};

		this.pendingCount = function () {
			return entries.size;
		};
	};
	/**
	 * The default app-side adapter. The notification and activation calls are
	 * injectable so tests can exercise them without a compositor or an alert
	 * daemon.
	 */
	this.AppAdapter = function (options = {}) {
		var activate = options.activate || (win => Zotero.Utilities.Internal.activate(win));
		var alerts = options.alerts;
		var notifier = options.notify;
		var adapter = {
			isFocused: function (window) {
				try {
					return !!(window && !window.closed && window.document && window.document.hasFocus());
				}
				catch (e) {
					return false;
				}
			},

			requestAttention: function (entry) {
				try {
					entry.window.getAttention();
				}
				catch (e) {}
				try {
					activate(entry.window);
				}
				catch (e) {
					adapter.log("attention activation failed", e);
				}
			},

			setTitleCue: function (entry, active) {
				var doc = entry.window && entry.window.document;
				if (!doc) return;
				if (active) {
					if (entry.originalTitle === undefined) {
						entry.originalTitle = doc.title;
					}
					doc.title = "⚠ CiteWell — waiting for you";
				}
				else {
					adapter.clearTitleCue(entry);
				}
			},

			clearTitleCue: function (entry) {
				var doc = entry.window && entry.window.document;
				if (!doc || entry.originalTitle === undefined) return;
				doc.title = entry.originalTitle;
				entry.originalTitle = undefined;
			},

			escalate: function (entry) {
				adapter.notify(entry);
			},

			showBanner: function (entry) {
				adapter.setTitleCue(entry, true);
				adapter.notify(entry);
			},

			notify: function (entry) {
				if (entry.notified) return;
				entry.notified = true;
				var text = entry.kind === "progress"
					? "CiteWell is still working. Open CiteWell to see the progress."
					: "A CiteWell window may be behind another application. Click to bring it forward.";
				try {
					if (notifier) {
						notifier(entry, text);
					}
					else if (alerts && alerts.showAlertNotification) {
						alerts.showAlertNotification(
							"",
							"CiteWell needs your attention",
							text,
							true,
							null,
							{ observe: () => activate(entry.window) },
							null,
							"citewell-attention"
						);
					}
				}
				catch (e) {
					adapter.log("attention notification failed", e);
				}
			},

			log: function (message, error) {
				if (options.log) options.log(message, error);
				else if (Zotero && Zotero.logError) Zotero.logError(error || message);
			},
		};
		return adapter;
	};

	/**
	 * Opens a window, attaches the controller, and returns the window.
	 */
	this.Presenter = function (adapter, options = {}) {
		var controller = options.controller || new Zotero.Attention.Controller(adapter, options);
		this.controller = controller;
		var activate = options.activate || (win => Zotero.Utilities.Internal.activate(win));
		var openWindow = options.openWindow || function (parent, url, name, features, io) {
			if (parent && typeof parent.openDialog === "function") {
				return parent.openDialog(url, name, features, io);
			}
			return Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
				.getService(Components.interfaces.nsIWindowWatcher)
				.openWindow(null, url, name, features, io);
		};

		this.open = function (opts) {
			var parent = opts.parent === undefined ? Zotero.getMainWindow() : opts.parent;
			var features = ["chrome", "centerscreen"];
			if (opts.modal) {
				// The user explicitly chose parented modal dialogs for actions
				// that wait on input.
				features.push("modal=yes", "dependent=yes");
			}
			else {
				features.push("dialog=no");
			}
			if (opts.features) features.push(opts.features);
			var window = openWindow(parent, opts.url, opts.name || "", features.join(","), opts.io);
			if (!window) throw new Error("Attention presenter could not open " + opts.url);
			this.watchWindow(window, opts);
			return window;
		};

		this.watchWindow = function (window, opts = {}) {
			var watched = false;
			var watch = function () {
				if (watched) return;
				watched = true;
				controller.watch(window, {
					kind: opts.kind || "dialog",
					surface: opts.surface || "app",
					requiresInput: opts.requiresInput,
				});
			};
			window.addEventListener("focus", () => controller.focus(window));
			window.addEventListener("unload", () => controller.close(window));
			window.addEventListener("load", watch);
			if (window.document && window.document.readyState === "complete") {
				watch();
			}
			if (opts.focusOnOpen !== false) {
				try {
					activate(window);
				}
				catch (e) {}
			}
		}
	};

};
