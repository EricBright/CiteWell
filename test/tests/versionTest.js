"use strict";

describe("Version", function () {
	it("should report a CalVer source build", function () {
		// Published build: 2026.11.26.000.SOURCE.<sha>. Between releases the counter is
		// dropped: 2026.11.26.SOURCE.<sha>. The commit hash identifies the tree either way.
		var pattern = /^\d{4}\.\d{2}\.\d{2}(\.\d{3})?\.SOURCE\.[0-9a-f]+$/;
		assert.isTrue(pattern.test(Zotero.version), "unexpected version: " + Zotero.version);
		assert.isTrue(Zotero.isSourceBuild);
	});

	it("should keep the CiteWell number out of the Zotero compatibility claim", function () {
		assert.equal(Zotero.zoteroCompatVersion, "10.0.9");
		assert.isTrue(/^\d+\.\d+\.\d+$/.test(Zotero.zoteroCompatVersion));
		assert.notInclude(Zotero.zoteroCompatVersion, "SOURCE");
		assert.notEqual(Zotero.zoteroCompatVersion, Zotero.version);
	});

	it("should give Zotero-shaped consumers the compatibility version", async function () {
		// The integration and recognition code runs in contexts this test cannot invoke,
		// so the check is a scan of the shipped files through chrome://. It fails if a call
		// site is reverted to Zotero.version, which is the regression the split prevents:
		// those consumers would then be told the CiteWell date.
		//
		// The translation framework is deliberately not in this list. It runs in its own
		// sandbox where Zotero.version is the framework's version, so its call sites keep
		// that value.
		var sites = [
			["xpcom/server/server.js", 'X-Zotero-Version: "+Zotero.zoteroCompatVersion'],
			["xpcom/repositoryUpdates.js", "'version=' + Zotero.zoteroCompatVersion"],
			["xpcom/recognizeDocument.js", "var version = Zotero.zoteroCompatVersion;"],
			["xpcom/integration.js", "[data.zoteroVersion, Zotero.zoteroCompatVersion]"],
			["xpcom/integration.js", "zoteroVersion: this.zoteroVersion || Zotero.zoteroCompatVersion,"],
			["xpcom/integration.js", "htmlSpecialChars(this.zoteroVersion || Zotero.zoteroCompatVersion)"],
			["xpcom/zotero.js", 'setRequestHeader("X-Zotero-Version", Zotero.zoteroCompatVersion'],
		];
		for (let [path, needle] of sites) {
			let text = await Zotero.File.getResourceAsync("chrome://zotero/content/" + path);
			assert.include(text, needle, path + " no longer uses the compatibility version");
		}
	});
});
