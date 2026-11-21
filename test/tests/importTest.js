"use strict";

describe("Library import", function () {
	before(async function () {
		this.timeout(60000);
		await resetDB({
			thisArg: this,
			skipBundledFiles: true
		});
		// Load annotations and other child data so resetData() can erase the
		// template items without an UnloadedDataException.
		for (let item of await Zotero.Items.getAll(1, true, true)) {
			await item.loadAllData();
		}
		await resetData();
	});

	it("should be loaded in the application", function () {
		assert.ok(Zotero.LibraryImport);
		assert.isFunction(Zotero.LibraryImport.detectSources);
		assert.isFunction(Zotero.LibraryImport.applyPending);
	});

	it("should parse profiles.ini sections", function () {
		let sections = Zotero.LibraryImport._parseProfilesIni([
			"[Profile0]",
			"Name=default",
			"IsRelative=1",
			"Path=83xz898i.default",
			"Default=1",
			"",
			"[General]",
			"StartWithLastProfile=1",
			"Version=2",
		].join("\n"));
		assert.lengthOf(sections, 1);
		assert.equal(sections[0].Name, "default");
		assert.equal(sections[0].Path, "83xz898i.default");
		assert.equal(sections[0].IsRelative, "1");
	});

	it("should read only Zotero's data-directory prefs", function () {
		let prefs = Zotero.LibraryImport._parseZoteroPrefs([
			'user_pref("extensions.zotero.dataDir", "/run/media/eric/RedDragon/Zotero_Library");',
			'user_pref("extensions.zotero.useDataDir", true);',
			'user_pref("extensions.zotero.lastDataDir", "/home/eric/Zotero");',
			'user_pref("extensions.zotero.baseAttachmentPath", "/var/home/eric/Zotero");',
			'user_pref("extensions.zotero.sync.server.username", "someone");',
		].join("\n"));

		assert.equal(prefs.dataDir, "/run/media/eric/RedDragon/Zotero_Library");
		assert.isTrue(prefs.useDataDir);
		assert.equal(prefs.lastDataDir, "/home/eric/Zotero");
		assert.notProperty(prefs, "baseAttachmentPath");
		assert.notProperty(prefs, "sync.server.username");
	});

	it("should format byte counts for the pane", function () {
		assert.equal(Zotero.LibraryImport.formatBytes(0), "0 B");
		assert.equal(Zotero.LibraryImport.formatBytes(1024), "1.0 KB");
		assert.equal(Zotero.LibraryImport.formatBytes(1024 * 1024 * 1536), "1.5 GB");
	});

	it("should register the Library preferences pane", function () {
		let pane = Zotero.PreferencePanes.builtInPanes.find(
			item => item.id === "zotero-prefpane-library"
		);
		assert.ok(pane);
		assert.equal(
			pane.src,
			"chrome://zotero/content/preferences/preferences_library.xhtml"
		);
	});

	it("should open the Library preferences pane", async function () {
		this.timeout(60000);
		let win;
		try {
			win = Zotero.Utilities.Internal.openPreferences("zotero-prefpane-library");
			if (win.document.readyState !== "complete") {
				await new Promise(resolve => win.addEventListener("load", resolve, { once: true }));
			}
			await Zotero.Promise.delay(1500);
			assert.ok(win.document.getElementById("zotero-prefpane-library"));
			assert.ok(win.document.getElementById("library-import"));
			assert.include(
				win.document.getElementById("library-current-path").textContent,
				"CiteWell"
			);
		}
		finally {
			if (win) win.close();
		}
	});

	it("should list the current library locations", function () {
		let locations = Zotero.LibraryImport.getLocations();
		let labels = locations.map(location => location.label);
		assert.include(labels, "Library");
		assert.include(labels, "Database");
		assert.include(labels, "Attachments");
		assert.include(labels, "Settings and profile");
		for (let location of locations) {
			assert.isString(location.path);
			assert.isAbove(location.path.length, 0);
		}
	});

	it("should inspect, stage and cancel a copy without touching the source", async function () {
		let source = OS.Path.join(Zotero.DataDirectory.dir, "import-test-source");
		let db = Zotero.DataDirectory.getDatabase();
		await Zotero.File.createDirectoryIfMissingAsync(source);

		try {
			await Zotero.DB.queryAsync("PRAGMA wal_checkpoint(TRUNCATE)");
			await IOUtils.copy(db, OS.Path.join(source, "zotero.sqlite"));

			let current = await Zotero.LibraryImport.getCurrentLibraryInfo();
			assert.isTrue(
				current.empty,
				`items=${current.items} collections=${current.collections} searches=${current.savedSearches}`
			);

			let info = await Zotero.LibraryImport.inspect(source);
			assert.isTrue(info.healthy);
			assert.equal(info.schemaVersion > 0, true);

			let hashBefore = await Zotero.LibraryImport.hashFile(
				OS.Path.join(source, "zotero.sqlite")
			);
			let request = await Zotero.LibraryImport.stage(source, { counts: info });
			assert.isTrue(await Zotero.LibraryImport.hasPendingRequest());
			assert.ok(await IOUtils.exists(OS.Path.join(request.staging, "zotero.sqlite")));
			assert.ok(await IOUtils.exists(OS.Path.join(request.staging, "storage")));

			let hashAfter = await Zotero.LibraryImport.hashFile(
				OS.Path.join(source, "zotero.sqlite")
			);
			assert.equal(hashAfter, hashBefore);

			await Zotero.LibraryImport.cancel();
			assert.isFalse(await Zotero.LibraryImport.hasPendingRequest());
			assert.isFalse(await IOUtils.exists(request.staging));
		}
		finally {
			await Zotero.LibraryImport.cancel();
			await IOUtils.remove(source, { recursive: true, ignoreAbsent: true });
		}
	});
});
