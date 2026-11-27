describe("Advanced Preferences", function () {
	describe("Files & Folders", function () {
		describe("Linked Attachment Base Directory", function () {
			var setBaseDirectory = async function (basePath) {
				var win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
					pane: 'zotero-prefpane-advanced'
				});
				
				// Wait for tab to load
				await win.Zotero_Preferences.waitForFirstPaneLoad();
				
				var promise = waitForDialog();
				await win.Zotero_Preferences.Attachment_Base_Directory.changePath(basePath);
				await promise;
				
				win.close();
			};
			
			var clearBaseDirectory = async function (basePath) {
				var win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
					pane: 'zotero-prefpane-advanced',
					tabIndex: 1
				});
				
				// Wait for tab to load
				await win.Zotero_Preferences.waitForFirstPaneLoad();
				
				var promise = waitForDialog();
				await win.Zotero_Preferences.Attachment_Base_Directory.clearPath();
				await promise;
				
				win.close();
			};
			
			beforeEach(function () {
				Zotero.Prefs.clear('baseAttachmentPath');
				Zotero.Prefs.clear('saveRelativeAttachmentPath');
			});
			
			it("should set new base directory", async function () {
				var basePath = getTestDataDirectory().path;
				await setBaseDirectory(basePath);
				assert.equal(Zotero.Prefs.get('baseAttachmentPath'), basePath);
				assert.isTrue(Zotero.Prefs.get('saveRelativeAttachmentPath'));
			})
			
			it("should clear base directory", async function () {
				var basePath = getTestDataDirectory().path;
				await setBaseDirectory(basePath);
				await clearBaseDirectory();
				
				assert.equal(Zotero.Prefs.get('baseAttachmentPath'), '');
				assert.isFalse(Zotero.Prefs.get('saveRelativeAttachmentPath'));
			})
			
			it("should change absolute path of linked attachment under new base dir to prefixed path", async function () {
				var file = getTestDataDirectory();
				file.append('test.png');
				var attachment = await Zotero.Attachments.linkFromFile({ file });
				assert.equal(attachment.attachmentPath, file.path);
				
				var basePath = getTestDataDirectory().path;
				await setBaseDirectory(basePath);
				
				assert.equal(
					attachment.attachmentPath,
					Zotero.Attachments.BASE_PATH_PLACEHOLDER + 'test.png'
				);
			})
			
			it("should change prefixed path to absolute when changing base directory", async function () {
				var basePath = getTestDataDirectory().path;
				await setBaseDirectory(basePath);
				
				var file = getTestDataDirectory();
				file.append('test.png');
				var attachment = await Zotero.Attachments.linkFromFile({ file });
				assert.equal(
					attachment.attachmentPath,
					Zotero.Attachments.BASE_PATH_PLACEHOLDER + 'test.png'
				);
				
				// Choose a nonexistent directory for the base path
				var otherPath = OS.Path.join(OS.Path.dirname(basePath), 'foobar');
				await setBaseDirectory(otherPath);
				
				assert.equal(attachment.attachmentPath, file.path);
			})
			
			it("should change prefixed path to absolute when clearing base directory", async function () {
				var basePath = getTestDataDirectory().path;
				await setBaseDirectory(basePath);
				
				var file = getTestDataDirectory();
				file.append('test.png');
				var attachment = await Zotero.Attachments.linkFromFile({ file });
				assert.equal(
					attachment.attachmentPath,
					Zotero.Attachments.BASE_PATH_PLACEHOLDER + 'test.png'
				);
				
				await clearBaseDirectory();
				
				assert.equal(Zotero.Prefs.get('baseAttachmentPath'), '');
				assert.isFalse(Zotero.Prefs.get('saveRelativeAttachmentPath'));
				
				assert.equal(attachment.attachmentPath, file.path);
			});
			
			it("should ignore attachment with relative path already within new base directory", async function () {
				var file = getTestDataDirectory();
				file.append('test.png');
				file = file.path;
				
				var attachment = await Zotero.Attachments.linkFromFile({ file });
				assert.equal(attachment.attachmentPath, file);
				
				var basePath = getTestDataDirectory().path;
				await setBaseDirectory(basePath);
				
				var newBasePath = await getTempDirectory();
				await IOUtils.copy(file, PathUtils.joinRelative(newBasePath, 'test.png'));
				
				await setBaseDirectory(newBasePath);
				
				assert.equal(
					attachment.attachmentPath,
					Zotero.Attachments.BASE_PATH_PLACEHOLDER + 'test.png'
				);
			});

			it("should ignore attachment with invalid relative path", async function () {
				var file = getTestDataDirectory();
				file.append('test.pdf');
				file = file.path;
				
				var attachment = createUnsavedDataObject('item', { itemType: 'attachment' });
				attachment.attachmentLinkMode = Zotero.Attachments.LINK_MODE_LINKED_FILE;
				attachment.attachmentPath = 'attachments:/test.pdf'; // Invalid
				await attachment.saveTx();

				var basePath = getTestDataDirectory().path;
				await setBaseDirectory(basePath);

				var newBasePath = await getTempDirectory();
				await IOUtils.copy(file, PathUtils.joinRelative(newBasePath, 'test.pdf'));

				await setBaseDirectory(newBasePath);

				assert.equal(
					attachment.attachmentPath,
					Zotero.Attachments.BASE_PATH_PLACEHOLDER + '/test.pdf'
				);
			});
		})
	})
})

describe("Settings manifest navigation", function () {
	it("renders the Language & Region descriptor in General", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-general"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.ok(win.document.getElementById("simple-section-language-region"));
			assert.ok(win.document.getElementById("bidi-ui"));
			assert.ok(win.document.getElementById("simple-section-groups"));
			assert.ok(win.document.getElementById("groups-copy-tags"));
			assert.isAbove(win.document.getElementById("groups-copy-tags").label.length, 0);
			assert.include(
				win.document.getElementById("simple-section-language-region")
					.getAttribute("data-search-strings-raw"),
				"bidirectional"
			);
			assert.ok(win.document.getElementById("simple-section-behaviour"));
			assert.ok(win.document.getElementById("automatic-tags"));
			assert.ok(win.document.getElementById("trash-auto-empty"));
		}
		finally {
			win.close();
		}
	});

	it("renders Citation Options in the Cite pane", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-cite"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.ok(win.document.getElementById("simple-section-citation-options"));
			assert.ok(win.document.getElementById("citation-paper-url"));
			assert.ok(win.document.getElementById("simple-section-citation-dialog"));
			assert.ok(win.document.getElementById("citation-dialog-mode"));
		}
		finally {
			win.close();
		}
	});

	it("renders Translator updates in Advanced", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-advanced"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.ok(win.document.getElementById("simple-section-translator-updates"));
			assert.ok(win.document.getElementById("translator-auto-update"));
			assert.ok(win.document.getElementById("update-translators"));
		}
		finally {
			win.close();
		}
	});

	it("loads the Integrations pane from the manifest", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-integrations"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.ok(win.document.getElementById("zotero-prefpane-integrations"));
			assert.ok(win.document.getElementById("citewell-lo-install"));
			assert.ok(win.document.getElementById("citewell-integration-repair"));
			assert.ok(win.document.getElementById("browser-connector"));
			assert.ok(win.document.getElementById("browser-connector-download"));
			assert.equal(
				win.document.querySelectorAll("#zotero-prefpane-integrations .main-section")[1].id,
				"browser-connector",
				"the catalog section did not take its declared position"
			);
		}
		finally {
			win.close();
		}
	});

	it("places a catalog section in the pane the catalog names", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-integrations"
		});
		let original = win.Zotero.PreferencePanes.sections;
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			// The only change is the pane name: this is the move the catalog exists for.
			win.Zotero.PreferencePanes.sections = original.map(section =>
				section.id === "browser-connector"
					? { ...section, paneId: "zotero-prefpane-agent", before: null }
					: section
			);
			let container = win.document.createElement("vbox");
			win.Zotero_Preferences._renderCatalogSections(
				"zotero-prefpane-agent", container
			);
			assert.ok(
				container.querySelector("#browser-connector"),
				"the moved section did not render in the named pane"
			);
			assert.isNull(container.querySelector("#citewell-lo-install"));
		}
		finally {
			win.Zotero.PreferencePanes.sections = original;
			win.close();
		}
	});

	it("keeps Cite immediately after General", async function () {
		await Zotero.PreferencePanes.loadBuiltInPanes();
		let ids = Zotero.PreferencePanes.builtInPanes
			.filter(pane => !pane.requiresOnlineSync && !pane.parent)
			.map(pane => pane.id);
		assert.isBelow(ids.indexOf("zotero-prefpane-general"), ids.indexOf("zotero-prefpane-cite"));
		assert.equal(ids.indexOf("zotero-prefpane-cite"), ids.indexOf("zotero-prefpane-general") + 1);
	});

	it("loads Library & Files with file controls", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-library"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.ok(win.document.getElementById("simple-section-file-handling"));
			assert.ok(win.document.getElementById("file-auto-recognize"));
			assert.ok(win.document.getElementById("simple-section-attachment-titles"));
			assert.ok(win.document.getElementById("attachment-show-filenames"));
			assert.ok(win.document.getElementById("file-renaming-configure-button"));
			assert.ok(win.document.getElementById("baseAttachmentPath"));
			assert.ok(win.document.getElementById("data-dir-path"));
			assert.ok(win.document.getElementById("zotero-prefpane-locate-groupbox"));
			assert.ok(win.document.getElementById("library-current-path"));
		}
		finally {
			win.close();
		}
	});

	it("loads the Notes & Annotations pane", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-notes"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.ok(win.document.getElementById("zotero-prefpane-notes"));
			assert.ok(win.document.getElementById("open-note-in-new-window"));
			assert.ok(win.document.getElementById("library-notes-migrate"));
			assert.ok(win.document.getElementById("library-annotations-export"));
		}
		finally {
			win.close();
		}
	});

	it("does not expose the retired PDF indexing control", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-advanced"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.isNull(win.document.getElementById("fulltext-pdfMaxPages"));
		}
		finally {
			win.close();
		}
	});
});
