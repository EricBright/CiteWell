describe("DNS settings (D50)", function () {
	const MIRROR = "extensions.zotero.dns.resolver";
	const CLOUDFLARE_URI = "https://1.1.1.2/dns-query";
	let oldMirror, oldMode, oldURI;

	before(function () {
		oldMirror = Zotero.Prefs.get(MIRROR, true);
		oldMode = Services.prefs.getIntPref("network.trr.mode", -1);
		oldURI = Services.prefs.getCharPref("network.trr.uri", "");
	});

	after(function () {
		if (oldMirror === undefined || oldMirror === null) {
			Zotero.Prefs.clear(MIRROR, true);
		}
		else {
			Zotero.Prefs.set(MIRROR, oldMirror, true);
		}
		if (oldMode === -1) {
			Services.prefs.clearUserPref("network.trr.mode");
		}
		else {
			Services.prefs.setIntPref("network.trr.mode", oldMode);
		}
		if (oldURI === "") {
			Services.prefs.clearUserPref("network.trr.uri");
		}
		else {
			Services.prefs.setCharPref("network.trr.uri", oldURI);
		}
	});

	it("uses the platform's symbolic TRR mode constants", function () {
		// Tripwire: if Firefox renames these, the DNS default stops applying and
		// this fails loudly instead of silently degrading to system DNS.
		assert.isNumber(Ci.nsIDNSService.MODE_TRRONLY);
		assert.isNumber(Ci.nsIDNSService.MODE_NATIVEONLY);
		assert.notEqual(
			Ci.nsIDNSService.MODE_TRRONLY,
			Ci.nsIDNSService.MODE_NATIVEONLY
		);
	});

	it("applies the Cloudflare default deterministically", function () {
		Zotero.DNS.applyDefaults();
		assert.equal(Zotero.DNS.resolver, "cloudflare");
		assert.equal(
			Services.prefs.getCharPref("network.trr.uri"),
			CLOUDFLARE_URI
		);
		assert.equal(
			Services.prefs.getIntPref("network.trr.mode"),
			Ci.nsIDNSService.MODE_TRRONLY
		);
	});

	it("switches to the system resolver and back", function () {
		Zotero.DNS.apply("system");
		assert.equal(Zotero.DNS.resolver, "system");
		assert.equal(
			Services.prefs.getIntPref("network.trr.mode"),
			Ci.nsIDNSService.MODE_NATIVEONLY
		);

		Zotero.DNS.apply("cloudflare");
		assert.equal(Zotero.DNS.resolver, "cloudflare");
		assert.equal(
			Services.prefs.getCharPref("network.trr.uri"),
			CLOUDFLARE_URI
		);
		assert.equal(
			Services.prefs.getIntPref("network.trr.mode"),
			Ci.nsIDNSService.MODE_TRRONLY
		);
	});

	it("surfaces the choice in the settings pane", async function () {
		this.timeout(30000);
		// D48: settings lives in a main-window tab — load the pane window and open
		// settings through the same route every menu item uses.
		let mainWin = await loadZoteroPane();
		Zotero.DNS.apply("cloudflare");

		let id = mainWin.Zotero_SettingsTab.open("zotero-prefpane-dns");
		let iframe = mainWin.Zotero_SettingsTab.getFrame(id);
		assert.isNotNull(iframe, "settings tab frame exists");
		let frameWin = iframe.contentWindow;

		await waitForCallback(() => {
			try {
				return frameWin.document.getElementById("dns-resolver");
			}
			catch (e) {
				return false;
			}
		}, 10000, 100);
		let group = frameWin.document.getElementById("dns-resolver");
		assert.equal(group.value, "cloudflare", "pane reflects the recorded resolver");

		// Drive the pane's own handler, as a click would.
		frameWin.Zotero_Preferences.DNS.choose("system");
		assert.equal(Zotero.DNS.resolver, "system");
		assert.equal(
			Services.prefs.getIntPref("network.trr.mode"),
			Ci.nsIDNSService.MODE_NATIVEONLY
		);
		// The view refreshes from state (init), which is what a reopen does.
		frameWin.Zotero_Preferences.DNS.init();
		assert.equal(
			frameWin.document.getElementById("dns-resolver").value,
			"system",
			"pane state follows the choice"
		);

		mainWin.Zotero_Tabs.close(id);
	});
});
