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

	it("should run against an isolated test library", function () {
		assert.notEqual(
			Zotero.DataDirectory.dir,
			OS.Path.join(OS.Constants.Path.homeDir, "CiteWell"),
			"tests must not use the real CiteWell library"
		);
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

	it("should follow identity aliases through a chain", function () {
		let identity = Zotero.LibraryImport;
		identity._identityKeys = new Map([
			["AAAA1111", "BBBB2222"],
			["BBBB2222", "CCCC3333"],
		]);
		identity._identityGroups = new Map([
			["42/DDDD4444", "EEEE5555"],
		]);
		assert.equal(identity._resolveIdentityKey("AAAA1111", null), "CCCC3333");
		assert.equal(identity._resolveIdentityKey("DDDD4444", "42"), "EEEE5555");
		identity._identityKeys.set("CCCC3333", "AAAA1111");
		assert.isNull(identity._resolveIdentityKey("AAAA1111", null));
		identity._identityKeys = null;
		identity._identityGroups = null;
	});

	it("should register the Library preferences pane", async function () {
		await Zotero.PreferencePanes.loadBuiltInPanes();
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
			assert.ok(win.document.getElementById("library-current-path"));
			assert.include(
				win.document.getElementById("library-current-path").textContent,
				"Zotero"
			);
		}
		finally {
			if (win) win.close();
		}
	});

	it("should open the Import & Export pane", async function () {
		this.timeout(60000);
		let win;
		try {
			win = Zotero.Utilities.Internal.openPreferences("zotero-prefpane-import-export");
			if (win.document.readyState !== "complete") {
				await new Promise(resolve => win.addEventListener("load", resolve, { once: true }));
			}
			await Zotero.Promise.delay(1500);
			assert.ok(win.document.getElementById("zotero-prefpane-import-export"));
			assert.ok(win.document.getElementById("library-import"));
			assert.ok(win.document.getElementById("library-merge"));
			assert.ok(win.document.getElementById("library-replace"));
			assert.ok(win.document.getElementById("library-import-target"));
			assert.ok(win.document.getElementById("zotero-quickCopy-menu"));
			assert.ok(win.document.getElementById("library-restore-points"));
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

	it("should list and queue a restore point", async function () {
		let root = OS.Path.join(Zotero.DataDirectory.dir, ".import-backup");
		let backup = OS.Path.join(root, "test-backup");
		await Zotero.File.createDirectoryIfMissingAsync(backup);
		await Zotero.DB.queryAsync("PRAGMA wal_checkpoint(TRUNCATE)");
		await IOUtils.copy(
			Zotero.DataDirectory.getDatabase(),
			OS.Path.join(backup, "zotero.sqlite")
		);
		await Zotero.File.putContentsAsync(
			OS.Path.join(backup, "backup.json"),
			JSON.stringify({
				version: 1,
				kind: "replace",
				createdAt: new Date().toISOString(),
				replacedCounts: { items: 2, collections: 1 },
			})
		);

		try {
			let backups = await Zotero.LibraryImport.listBackups();
			assert.isTrue(backups.some(item => item.id === "test-backup"));

			await Zotero.LibraryImport.queueRestore(backup);
			assert.isTrue(await Zotero.LibraryImport.hasPendingRestore());

			await Zotero.LibraryImport.cancelRestore();
			assert.isFalse(await Zotero.LibraryImport.hasPendingRestore());
		}
		finally {
			await Zotero.LibraryImport.cancelRestore();
			await IOUtils.remove(backup, { recursive: true, ignoreAbsent: true });
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

	it("should merge items, collections and notes without touching the source", async function () {
		this.timeout(120000);
		let source = OS.Path.join(Zotero.DataDirectory.dir, "import-test-merge-source");
		await Zotero.File.createDirectoryIfMissingAsync(source);

		try {
			let parent = new Zotero.Collection();
			parent.libraryID = 1;
			parent.name = "Merge parent";
			await parent.saveTx();

			let child = new Zotero.Collection();
			child.libraryID = 1;
			child.name = "Merge child";
			child.parentID = parent.id;
			await child.saveTx();

			let item = new Zotero.Item("book");
			item.libraryID = 1;
			item.setField("title", "Merge fixture");
			item.setField("date", "2024");
			item.setCreators([{ firstName: "Ada", lastName: "Lovelace", creatorType: "author" }]);
			item.setTags([{ tag: "fixture", type: 1 }]);
			item.setCollections([child.id]);
			await item.saveTx();
			let sourceItemKey = item.key;

			let note = new Zotero.Item("note");
			note.libraryID = 1;
			note.parentID = item.id;
			note.setNote("<p>Imported note body</p>");
			await note.saveTx();

			await Zotero.DB.queryAsync("PRAGMA wal_checkpoint(TRUNCATE)");
			await IOUtils.copy(
				Zotero.DataDirectory.getDatabase(),
				OS.Path.join(source, "zotero.sqlite")
			);
			let hashBefore = await Zotero.LibraryImport.hashFile(
				OS.Path.join(source, "zotero.sqlite")
			);

			await resetData();
			let aliasesPath = OS.Path.join(Zotero.DataDirectory.dir, "identity", "aliases.jsonl");
			await IOUtils.remove(aliasesPath, { ignoreAbsent: true });
			Zotero.LibraryImport._identityKeys = null;
			Zotero.LibraryImport._identityGroups = null;
			let existing = new Zotero.Item("book");
			existing.libraryID = 1;
			existing.setField("title", "Existing item");
			await existing.saveTx();
			let current = await Zotero.LibraryImport.getCurrentLibraryInfo();
			assert.isFalse(current.empty);

			let progress = [];
			let result = await Zotero.LibraryImport.merge(source, {
				onProgress: line => progress.push(line),
			});
			assert.isAtLeast(result.items, 1);
			assert.isAtLeast(result.notes, 1);
			assert.ok(progress.some(line => /^Items: 1\//.test(line)));

			let items = await Zotero.Items.getAll(1);
			let merged = items.find(
				candidate => candidate.itemType === "book"
					&& candidate.getField("title") === "Merge fixture"
			);
			assert.ok(merged);
			assert.equal(merged.key, sourceItemKey, "merge should preserve a free source key");
			let aliasText = await Zotero.File.getContentsAsync(aliasesPath);
			let aliasEntries = aliasText.trim().split("\n").map(line => JSON.parse(line));
			assert.ok(aliasEntries.some(entry => entry.sourceKey === sourceItemKey
				&& entry.destKey === merged.key));
			let aliasItem = await Zotero.LibraryImport.getItemForURIs([
				`http://zotero.org/users/local/test/items/${sourceItemKey}`,
			]);
			assert.equal(aliasItem?.id, merged.id);
			assert.equal(merged.getCreators()[0].lastName, "Lovelace");
			assert.include(merged.getTags().map(tag => tag.tag), "fixture");

			let childCollection = Zotero.Collections.get(merged.getCollections()[0]);
			assert.ok(childCollection);
			assert.equal(childCollection.name, "Merge child");
			assert.equal(Zotero.Collections.get(childCollection.parentID).name, "Merge parent");

			let attachments = merged.getAttachments();
			assert.lengthOf(attachments, 1);
			let attachment = Zotero.Items.get(attachments[0]);
			assert.equal(attachment.attachmentContentType, "text/html");
			let attachmentPath = await attachment.getFilePathAsync();
			assert.isTrue(await IOUtils.exists(attachmentPath));
			let html = await Zotero.File.getContentsAsync(attachmentPath);
			assert.include(html, "Imported note body");
			assert.equal(items.filter(candidate => candidate.itemType === "note").length, 0);

			let hashAfter = await Zotero.LibraryImport.hashFile(
				OS.Path.join(source, "zotero.sqlite")
			);
			assert.equal(hashAfter, hashBefore);
		}
		finally {
			await resetData();
			await IOUtils.remove(
				OS.Path.join(Zotero.DataDirectory.dir, "identity", "aliases.jsonl"),
				{ ignoreAbsent: true }
			);
			Zotero.LibraryImport._identityKeys = null;
			Zotero.LibraryImport._identityGroups = null;
			await IOUtils.remove(source, { recursive: true, ignoreAbsent: true });
		}
	});
});
