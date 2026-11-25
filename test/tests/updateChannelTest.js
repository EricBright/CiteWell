"use strict";

describe("Update channel", function () {
	it("should carry no Mozilla update URL", function () {
		// app/assets/application.ini has no [AppUpdate] section, so the inherited
		// updater has nothing to check. This failing means a zotero.org URL (or
		// any update URL) came back into the build.
		assert.equal(Services.appinfo.updateURL, "");
	});

	it("should not download or install updates automatically", function () {
		assert.isFalse(Services.prefs.getBoolPref("app.update.auto"));
	});

	it("should point the manual update links at CiteWell's releases", function () {
		assert.equal(
			Services.prefs.getStringPref("app.update.url.manual"),
			Zotero.UPDATE_RELEASES_URL
		);
		assert.equal(
			Services.prefs.getStringPref("app.update.url.details"),
			Zotero.UPDATE_RELEASES_URL
		);
	});

	it("should offer the releases page instead of the inherited wizard", function () {
		assert.equal(
			Zotero.UPDATE_RELEASES_URL,
			"https://github.com/EricBright/CiteWell/releases"
		);
		assert.equal(typeof Zotero.openCheckForUpdatesWindow, "function");
		// The Mozilla wizard must not be what the command opens. The URL exists for
		// upstream code, but no shipped path refers to it any more.
		assert.notInclude(
			String(Zotero.openCheckForUpdatesWindow),
			"updates.xhtml"
		);
	});
});
