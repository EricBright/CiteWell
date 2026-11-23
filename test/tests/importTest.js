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

	it("should persist and find an incomplete merge checkpoint", async function () {
		let id = "test-merge-checkpoint";
		try {
			await Zotero.LibraryImport._writeMergeCheckpoint(id, {
				source: "/tmp/source-library",
				sourceHash: "test-hash",
				status: "items",
				createdAt: new Date().toISOString(),
			});
			let found = await Zotero.LibraryImport._findIncompleteMerge(
				"/tmp/source-library", "test-hash"
			);
			assert.equal(found?.id, id);
			assert.isNull(await Zotero.LibraryImport._findIncompleteMerge(
				"/tmp/source-library", "other-hash"
			));
		}
		finally {
			await Zotero.LibraryImport._removeMergeCheckpoint(id);
		}
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

	it("should scan existing duplicates into a review report", async function () {
		let reportPath = null;
		try {
			await resetData();
			let first = new Zotero.Item("journalArticle");
			first.libraryID = 1;
			first.setField("title", "Duplicate review fixture");
			first.setField("DOI", "10.1234/review");
			await first.saveTx();
			let second = new Zotero.Item("journalArticle");
			second.libraryID = 1;
			second.setField("title", "Duplicate review fixture");
			second.setField("DOI", "10.1234/review");
			await second.saveTx();

			let result = await Zotero.LibraryImport.findLibraryDuplicates();
			let group = result.groups.find(candidate =>
				candidate.items.some(item => item.id === first.id)
				&& candidate.items.some(item => item.id === second.id)
			);
			assert.ok(group);
			reportPath = await Zotero.LibraryImport.writeLibraryDuplicateReport(result);
			assert.isTrue(await IOUtils.exists(reportPath));
			let report = JSON.parse(await Zotero.File.getContentsAsync(reportPath));
			assert.isAtLeast(report.groups.length, 1);
		}
		finally {
			await resetData();
			if (reportPath) {
				await IOUtils.remove(reportPath, { ignoreAbsent: true });
			}
		}
	});

	it("should match embedded citation data and import missing items", async function () {
		let aliasesPath = OS.Path.join(Zotero.DataDirectory.dir, "identity", "aliases.jsonl");
		try {
			await resetData();
			let existing = new Zotero.Item("journalArticle");
			existing.libraryID = 1;
			existing.setField("title", "An existing citation target");
			existing.setField("DOI", "10.1234/citewell-test");
			await existing.saveTx();

			let match = await Zotero.LibraryImport.findCitationMatches({
				type: "article-journal",
				title: "An existing citation target",
				DOI: "https://doi.org/10.1234/citewell-test",
			});
			assert.equal(match.item?.id, existing.id);
			assert.equal(match.by, "DOI");

			let unknown = await Zotero.LibraryImport.findCitationMatches({
				type: "article-journal",
				title: "Not in this library",
				DOI: "10.9999/absent",
			});
			assert.isNull(unknown.item);

			let uri = "http://zotero.org/users/1/items/ABCD2345";
			let imported = await Zotero.LibraryImport.importCitationItem({
				type: "book",
				title: "Imported from a detached citation",
				DOI: "10.9999/imported",
			}, [uri]);
			assert.equal(imported.key, "ABCD2345");
			assert.equal(imported.getField("title"), "Imported from a detached citation");
			assert.equal(imported.getField("DOI"), "10.9999/imported");

			await Zotero.LibraryImport.recordCitationAlias([uri], imported);
			let resolved = await Zotero.LibraryImport.getItemForURIs([uri]);
			assert.equal(resolved?.id, imported.id);
		}
		finally {
			await resetData();
			await IOUtils.remove(aliasesPath, { ignoreAbsent: true });
			Zotero.LibraryImport._identityKeys = null;
			Zotero.LibraryImport._identityGroups = null;
		}
	});

	it("should keep annotations when a resumed merge finds an existing attachment", async function () {
		this.timeout(30000);
		let source = OS.Path.join(Zotero.DataDirectory.dir, "resume-source");
		let staging = OS.Path.join(Zotero.DataDirectory.dir, "resume-staging");
		try {
			await resetData();
			await Zotero.File.createDirectoryIfMissingAsync(source);

			let item = new Zotero.Item("book");
			item.libraryID = 1;
			item.setField("title", "Resume fixture");
			await item.saveTx();
			let sourceKey = item.key;

			let pdfPath = OS.Path.join(Zotero.DataDirectory.dir, "resume-source.pdf");
			await Zotero.File.putContentsAsync(pdfPath, "%PDF-1.4\n%%EOF");
			let sourceAttachment = await Zotero.Attachments.importFromFile({
				file: pdfPath,
				parentItemID: item.id,
				title: "Resume PDF",
				contentType: "application/pdf",
			});
			await IOUtils.remove(pdfPath, { ignoreAbsent: true });

			let annotation = new Zotero.Item("annotation");
			annotation.libraryID = 1;
			annotation.parentID = sourceAttachment.id;
			annotation.annotationType = "highlight";
			annotation.annotationText = "Annotation on a previously copied attachment";
			annotation.annotationPageLabel = "1";
			annotation.annotationSortIndex = "00001|000001|00000";
			annotation.annotationPosition = JSON.stringify({
				pageIndex: 0,
				rects: [[0, 0, 1, 1]],
			});
			await annotation.saveTx();

			await Zotero.DB.queryAsync("PRAGMA wal_checkpoint(TRUNCATE)");
			await IOUtils.copy(
				Zotero.DataDirectory.getDatabase(),
				OS.Path.join(source, "zotero.sqlite")
			);
			await Zotero.File.copyDirectory(
				OS.Path.join(Zotero.DataDirectory.dir, "storage"),
				OS.Path.join(source, "storage")
			);
			let sourceDb = new Zotero.DBConnection(
				OS.Path.join(source, "zotero.sqlite")
			);
			let inspected;
			try {
				inspected = await Zotero.LibraryImport._readMergeSource(sourceDb);
			}
			finally {
				await sourceDb.closeDatabase(true);
			}

			await resetData();
			let destination = new Zotero.Item("book");
			destination.libraryID = 1;
			destination._key = sourceKey;
			destination.setField("title", "Resume fixture");
			await destination.saveTx();

			// Simulate an attachment copied by the interrupted first pass.
			let existingPath = OS.Path.join(Zotero.DataDirectory.dir, "resume-existing.pdf");
			await Zotero.File.putContentsAsync(existingPath, "%PDF-1.4\n%%EOF");
			await Zotero.Attachments.importFromFile({
				file: existingPath,
				parentItemID: destination.id,
				title: "Resume PDF",
				contentType: "application/pdf",
			});
			await IOUtils.remove(existingPath, { ignoreAbsent: true });
			await Zotero.File.createDirectoryIfMissingAsync(staging);

			let result = await Zotero.LibraryImport._applyMergeSource(
				inspected,
				staging,
				null,
				null,
				false,
				source,
				{
					items: { [sourceKey]: destination.key },
					skippedKeys: [],
					notesCollectionID: 0,
					collections: 0,
					itemsImported: 1,
					skippedItems: 0,
					duplicates: [],
				}
			);
			assert.equal(result.attachments, 0);
			assert.equal(result.skippedAttachments, 1);
			assert.equal(result.annotations, 1,
				"an annotation must follow an attachment copied before the interruption");
			let annotationIDs = await Zotero.DB.columnQueryAsync(
				"SELECT itemID FROM itemAnnotations WHERE parentItemID=?",
				[destination.getAttachments()[0]]
			);
			assert.lengthOf(annotationIDs, 1);
			assert.equal(
				Zotero.Items.get(annotationIDs[0]).annotationText,
				"Annotation on a previously copied attachment"
			);
		}
		finally {
			await resetData();
			await IOUtils.remove(source, { recursive: true, ignoreAbsent: true });
			await IOUtils.remove(staging, { recursive: true, ignoreAbsent: true });
			Zotero.LibraryImport._identityKeys = null;
			Zotero.LibraryImport._identityGroups = null;
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

			let collision = new Zotero.Item("book");
			collision.libraryID = 1;
			collision.setField("title", "Collision fixture");
			await collision.saveTx();
			let collisionKey = collision.key;

			let duplicate = new Zotero.Item("journalArticle");
			duplicate.libraryID = 1;
			duplicate.setField("title", "Duplicate fixture");
			duplicate.setField("DOI", "10.1234/dup");
			await duplicate.saveTx();
			let duplicateKey = duplicate.key;
			let duplicateAttachmentFile = OS.Path.join(
				Zotero.DataDirectory.dir, "duplicate-attachment.txt"
			);
			await Zotero.File.putContentsAsync(
				duplicateAttachmentFile, "duplicate attachment body"
			);
			await Zotero.Attachments.importFromFile({
				file: duplicateAttachmentFile,
				parentItemID: duplicate.id,
				title: "Duplicate attachment",
			});
			await IOUtils.remove(duplicateAttachmentFile, { ignoreAbsent: true });

			let attachmentFile = OS.Path.join(Zotero.DataDirectory.dir, "source-attachment.txt");
			await Zotero.File.putContentsAsync(attachmentFile, "attachment body");
			await Zotero.Attachments.importFromFile({
				file: attachmentFile,
				parentItemID: item.id,
				title: "Source attachment",
			});
			await IOUtils.remove(attachmentFile, { ignoreAbsent: true });

			let pdfFile = OS.Path.join(Zotero.DataDirectory.dir, "source.pdf");
			await Zotero.File.putContentsAsync(pdfFile, "%PDF-1.4\n%%EOF");
			let pdfAttachment = await Zotero.Attachments.importFromFile({
				file: pdfFile,
				parentItemID: item.id,
				title: "Source PDF",
				contentType: "application/pdf",
			});
			await IOUtils.remove(pdfFile, { ignoreAbsent: true });
			let annotation = new Zotero.Item("annotation");
			annotation.libraryID = 1;
			annotation.parentID = pdfAttachment.id;
			annotation.annotationType = "highlight";
			annotation.annotationText = "Highlighted source text";
			annotation.annotationComment = "Source comment";
			annotation.annotationColor = "#ffd400";
			annotation.annotationPageLabel = "1";
			annotation.annotationSortIndex = "00001|000001|00000";
			annotation.annotationPosition = JSON.stringify({
				pageIndex: 0,
				rects: [[0, 0, 1, 1]],
			});
			await annotation.saveTx();

			let savedSearch = new Zotero.Search();
			savedSearch.libraryID = 1;
			savedSearch.name = "Imported search fixture";
			savedSearch.addCondition("title", "contains", "Merge");
			await savedSearch.saveTx();

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
			await Zotero.File.copyDirectory(
				OS.Path.join(Zotero.DataDirectory.dir, "storage"),
				OS.Path.join(source, "storage")
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
			let occupied = new Zotero.Item("book");
			occupied.libraryID = 1;
			occupied._key = collisionKey;
			occupied.setField("title", "Occupied key");
			await occupied.saveTx();
			let existingDuplicate = new Zotero.Item("journalArticle");
			existingDuplicate.libraryID = 1;
			existingDuplicate.setField("title", "Duplicate fixture");
			existingDuplicate.setField("DOI", "10.1234/dup");
			await existingDuplicate.saveTx();
			let directMatch = await Zotero.LibraryImport.findCitationMatches({
				DOI: "10.1234/dup",
			});
			assert.equal(directMatch.item?.id, existingDuplicate.id,
				`direct=${JSON.stringify(directMatch)} existing=${existingDuplicate.id}`);
			let allowedMatch = await Zotero.LibraryImport.findCitationMatches(
				{ DOI: "10.1234/dup" },
				{ allowedItemIDs: new Set([existingDuplicate.id]) }
			);
			assert.equal(allowedMatch.item?.id, existingDuplicate.id,
				`allowed=${JSON.stringify(allowedMatch)}`);
			let current = await Zotero.LibraryImport.getCurrentLibraryInfo();
			assert.isFalse(current.empty);

			let progress = [];
			let result = await Zotero.LibraryImport.merge(source, {
				onProgress: line => progress.push(line),
				skipExactDuplicates: true,
			});
			assert.isAtLeast(result.items, 1);
			assert.isAtLeast(result.notes, 1);
			assert.isAtLeast(result.attachments, 2);
			assert.isAtLeast(result.annotations, 1);
			assert.isAtLeast(result.savedSearches, 1);
			assert.ok(progress.some(line => /^Items: [0-9]+\//.test(line)));
			assert.equal(result.skippedItems, 1);
			assert.equal(result.skippedAttachments, 1);
			assert.ok(result.duplicates.some(entry => entry.sourceKey === duplicateKey
				&& entry.destKey === existingDuplicate.key && entry.skipped),
				`duplicates=${JSON.stringify(result.duplicates)} source=${duplicateKey} dest=${existingDuplicate.key}`);
			assert.isTrue(await IOUtils.exists(result.duplicateReport));
			let duplicateReport = JSON.parse(
				await Zotero.File.getContentsAsync(result.duplicateReport)
			);
			assert.equal(duplicateReport.duplicates.length, result.duplicates.length);

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
			let mergedCollision = items.find(
				candidate => candidate.itemType === "book"
					&& candidate.getField("title") === "Collision fixture"
			);
			assert.ok(mergedCollision);
			assert.notEqual(mergedCollision.key, collisionKey);
			assert.ok(aliasEntries.some(entry => entry.sourceKey === collisionKey
				&& entry.destKey === mergedCollision.key));
			let aliasItem = await Zotero.LibraryImport.getItemForURIs([
				`http://zotero.org/users/local/test/items/${sourceItemKey}`,
			]);
			assert.equal(aliasItem?.id, merged.id);
			let collisionAliasItem = await Zotero.LibraryImport.getItemForURIs([
				`http://zotero.org/users/local/test/items/${collisionKey}`,
			]);
			assert.equal(collisionAliasItem?.id, mergedCollision.id);
			let duplicateAliasItem = await Zotero.LibraryImport.getItemForURIs([
				`http://zotero.org/users/local/test/items/${duplicateKey}`,
			]);
			assert.equal(duplicateAliasItem?.id, existingDuplicate.id);
			let duplicateDOIItems = items.filter((candidate) => {
				try {
					return candidate.getField("DOI") === "10.1234/dup";
				}
				catch (e) {
					return false;
				}
			});
			assert.lengthOf(duplicateDOIItems, 1);
			assert.lengthOf(existingDuplicate.getAttachments(), 0);
			assert.equal(merged.getCreators()[0].lastName, "Lovelace");
			assert.include(merged.getTags().map(tag => tag.tag), "fixture");

			let childCollection = Zotero.Collections.get(merged.getCollections()[0]);
			assert.ok(childCollection);
			assert.equal(childCollection.name, "Merge child");
			assert.equal(Zotero.Collections.get(childCollection.parentID).name, "Merge parent");

			let attachments = merged.getAttachments()
				.map(attachmentID => Zotero.Items.get(attachmentID));
			assert.lengthOf(attachments, 3);
			let noteAttachment = attachments.find(candidate =>
				candidate.attachmentContentType === "text/html"
			);
			let fileAttachment = attachments.find(candidate =>
				candidate.attachmentContentType !== "text/html"
			);
			assert.ok(noteAttachment);
			assert.ok(fileAttachment);
			assert.equal(fileAttachment.getField("title"), "Source attachment");
			let noteAttachmentPath = await noteAttachment.getFilePathAsync();
			assert.isTrue(await IOUtils.exists(noteAttachmentPath));
			let html = await Zotero.File.getContentsAsync(noteAttachmentPath);
			assert.include(html, "Imported note body");
			let fileAttachmentPath = await fileAttachment.getFilePathAsync();
			assert.isTrue(await IOUtils.exists(fileAttachmentPath));
			assert.equal(await Zotero.File.getContentsAsync(fileAttachmentPath), "attachment body");
			let pdfAttachmentItem = attachments.find(candidate =>
				candidate.attachmentContentType === "application/pdf"
			);
			assert.ok(pdfAttachmentItem);
			assert.equal(pdfAttachmentItem.getField("title"), "Source PDF");
			let annotationIDs = await Zotero.DB.columnQueryAsync(
				"SELECT itemID FROM itemAnnotations WHERE parentItemID=?",
				[pdfAttachmentItem.id]
			);
			assert.isAtLeast(annotationIDs.length, 1);
			let importedAnnotation = Zotero.Items.get(annotationIDs[0]);
			assert.equal(importedAnnotation.annotationText, "Highlighted source text");
			assert.equal(importedAnnotation.annotationComment, "Source comment");
			let savedSearches = await Zotero.Searches.getAll(1);
			assert.ok(savedSearches.some(search => search.name === "Imported search fixture"));
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
