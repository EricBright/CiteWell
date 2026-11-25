describe("Settings tab (D48)", function () {
	var win, doc;

	before(async function () {
		win = await loadZoteroPane();
		doc = win.document;
	});

	after(function () {
		win.Zotero_Tabs.closeAll();
		win.close();
	});

	// The hosting spike, kept as the regression guard for the platform behavior
	// the whole design rests on: a XUL <window> document lives in an iframe,
	// initializes there, and cannot close the main window from inside.
	it("hosts the preferences window document in an iframe", async function () {
		this.timeout(30000);
		let iframe = doc.createElementNS("http://www.w3.org/1999/xhtml", "iframe");
		iframe.setAttribute("src", "chrome://zotero/content/preferences/preferences.xhtml");
		// Invisible on purpose: this raw platform probe must never flash over the
		// UI during test runs (it did — caught in a user screenshot).
		iframe.style.width = "10px";
		iframe.style.height = "10px";
		iframe.style.visibility = "hidden";

		let diag = "not loaded";
		doc.documentElement.appendChild(iframe);
		await Zotero.Promise.delay(5000);

		let iwin = iframe.contentWindow;
		let idoc = iwin && iwin.document;
		diag = "contentWindow=" + !!iwin
			+ " readyState=" + (idoc && idoc.readyState)
			+ " root=" + (idoc && idoc.documentElement
				? idoc.documentElement.localName : "(none)")
			+ " prefsNav=" + !!(idoc && idoc.getElementById("prefs-navigation"))
			+ " Zotero_Preferences=" + !!(iwin && iwin.Zotero_Preferences);

		assert.ok(iwin, "contentWindow reachable; diag: " + diag);
		assert.equal(
			idoc.documentElement.localName, "window",
			"iframe document root should be the window element; diag: " + diag
		);
		assert.ok(
			iwin.Zotero_Preferences,
			"preferences logic lives in the iframe window; diag: " + diag
		);
		await waitForCallback(
			() => idoc.getElementById("prefs-navigation")
				&& idoc.getElementById("prefs-navigation").childElementCount > 0,
			8000, 100
		);
		assert.ok(
			idoc.getElementById("prefs-navigation").childElementCount >= 3,
			"navigation list should show several panes; diag: " + diag
		);

		try {
			iwin.close();
		}
		catch (e) {
			// A thrown "not allowed to close" is also acceptable.
		}
		await Zotero.Promise.delay(200);
		assert.isFalse(win.closed, "main window must survive iframe window.close()");

		iframe.remove();
	});

	it("opens, deep-links, reroutes openPreferences, and closes cleanly", async function () {
		this.timeout(45000);
		let SettingsTab = win.Zotero_SettingsTab;
		let Zotero_Tabs = win.Zotero_Tabs;

		// Open straight to the DNS pane we shipped in D50.
		let id = SettingsTab.open("zotero-prefpane-dns");
		assert.ok(id, "open() returns a tab id");
		assert.equal(Zotero_Tabs.selectedID, id, "settings tab is selected");
		assert.isTrue(SettingsTab.isOpen(id));

		let iframe = SettingsTab.getFrame(id);
		assert.isNotNull(iframe, "frame exists");
		let frameWin = iframe.contentWindow;

		// Deep link: the DNS pane fragment loads inside the frame.
		await waitForCallback(() => {
			try {
				return frameWin.document.getElementById("dns-resolver");
			}
			catch (e) {
				return false;
			}
		}, 10000, 100);
		assert.isNotNull(
			frameWin.document.getElementById("dns-resolver"),
			"DNS pane loaded via deep link"
		);

		// The choke point reroutes: no zotero:pref popup window may open.
		let returned = win.Zotero.Utilities.Internal.openPreferences("zotero-prefpane-library");
		assert.equal(returned, id, "openPreferences reuses the settings tab");
		assert.isNull(
			Services.wm.getMostRecentWindow("zotero:pref"),
			"no preferences popup window may exist"
		);
		await waitForCallback(
			() => frameWin.Zotero_Preferences.navigation.value === "zotero-prefpane-library",
			10000, 100
		);
		assert.equal(
			frameWin.Zotero_Preferences.navigation.value,
			"zotero-prefpane-library",
			"deep link navigates the frame"
		);

		// Second open with a pane reuses the same tab.
		let again = SettingsTab.open("zotero-prefpane-cite");
		assert.equal(again, id, "second open reuses the tab");

		// Ctrl+W inside the frame closes the tab (the frame's own keyset scope).
		frameWin.dispatchEvent(new frameWin.KeyboardEvent("keydown", {
			key: "w", keyCode: 87, ctrlKey: true, bubbles: true, cancelable: true,
		}));
		await waitForCallback(() => !SettingsTab.isOpen(id), 5000, 50);
		assert.isFalse(SettingsTab.isOpen(id), "Ctrl+W closed the settings tab");
		assert.isNull(doc.getElementById(id), "tab container removed from the deck");
		assert.isNull(SettingsTab.getFrame(id), "frame reference released");
	});

	it("shows a loading state and a failure state instead of a blank panel", async function () {
		this.timeout(45000);
		let SettingsTab = win.Zotero_SettingsTab;
		let Zotero_Tabs = win.Zotero_Tabs;

		// The failure renders into the same element the loading phase created, so it
		// is checked while that element still exists. The 5 s probe cap cannot be
		// forced without breaking the frame, so the rendering path is called directly.
		let id = SettingsTab.open();
		assert.ok(id, "open() returns a tab id");
		assert.equal(SettingsTab.getState(id), "loading", "a new tab starts loading");
		let state = SettingsTab._states.get(id);
		SettingsTab._settleStatus(state, "failed");
		assert.equal(SettingsTab.getState(id), "failed");
		let failed = doc.querySelector(".settings-status");
		assert.ok(failed, "the failure status is shown");
		assert.include(failed.textContent, "could not be loaded");
		Zotero_Tabs.close(id);
		await waitForCallback(() => !SettingsTab.isOpen(id), 5000, 50);

		let id2 = SettingsTab.open();
		assert.equal(SettingsTab.getState(id2), "loading");
		let status = doc.querySelector(".settings-status");
		assert.ok(status, "the loading status is shown");
		assert.include(status.textContent, "Loading settings");
		await waitForCallback(
			() => SettingsTab.getState(id2) === "ready",
			15000,
			100
		);
		assert.equal(SettingsTab.getState(id2), "ready");
		assert.isNull(doc.querySelector(".settings-status"), "the status is removed when ready");
		Zotero_Tabs.close(id2);
	});
});
