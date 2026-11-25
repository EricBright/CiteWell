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
		Zotero.DNS.apply("cloudflare");

		Zotero.Utilities.Internal.openPreferences("zotero-prefpane-dns");
		let paneWin = null;
		await waitForCallback(() => {
			paneWin = Services.wm.getMostRecentWindow("zotero:pref");
			return paneWin && paneWin.document.getElementById("dns-resolver");
		}, 3000, 50);

		let group = paneWin.document.getElementById("dns-resolver");
		assert.equal(group.value, "cloudflare", "pane reflects the recorded resolver");

		// Drive the pane's own handler, as a click would.
		paneWin.Zotero_Preferences.DNS.choose("system");
		assert.equal(Zotero.DNS.resolver, "system");
		assert.equal(
			Services.prefs.getIntPref("network.trr.mode"),
			Ci.nsIDNSService.MODE_NATIVEONLY
		);
		// The view refreshes from state (init), which is what a reopen does.
		paneWin.Zotero_Preferences.DNS.init();
		assert.equal(
			paneWin.document.getElementById("dns-resolver").value,
			"system",
			"pane state follows the choice"
		);

		paneWin.close();
	});
});
