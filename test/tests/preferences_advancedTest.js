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

	it("renders the General appearance section from the catalog", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-general"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			for (let id of ["color-scheme", "locale-menu", "item-pane-header-menulist",
				"item-pane-header-style-menu", "item-pane-header-locale-menu"]) {
				assert.ok(win.document.getElementById(id), `${id} did not render`);
			}
			assert.isAbove(
				win.document.getElementById("general-appearance-title").textContent.trim().length,
				0
			);
			assert.isAbove(
				win.document.querySelectorAll("#color-scheme radio").length, 2
			);
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
			assert.ok(win.document.getElementById("translator-updates"));
			assert.ok(win.document.getElementById("translator-auto-update"));
			assert.ok(win.document.getElementById("update-translators"));
			assert.isAbove(
				win.document.getElementById("translator-updates-title")
					.textContent.trim().length,
				0,
				"the catalog title was not translated"
			);
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
			let paneRoot = win.document.getElementById("zotero-prefpane-integrations");
			let mains = win.document.querySelectorAll(
				"#zotero-prefpane-integrations .main-section"
			);
			assert.isAbove(
				mains.length, 0,
				"no catalog sections found; pane children: "
					+ [...paneRoot.children].map(c => c.localName + "." + c.className).join(" | ")
			);
			assert.equal(
				mains[0].id,
				"browser-connector",
				"the catalog section did not take its declared position"
			);
			assert.equal(
				win.document.getElementById("browser-connector-title").textContent,
				"Browser Connector",
				"the Fluent title was not translated"
			);
			assert.isAbove(
				win.document.getElementById("browser-connector-download")
					.getAttribute("label").length,
				0,
				"the Fluent button label was not applied"
			);
		}
		finally {
			win.close();
		}
	});

	it("renders the DNS resolver from the catalog", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-advanced"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.equal(
				win.document.getElementById("dns-title").textContent,
				"DNS",
				"the Fluent title was not translated"
			);
			let group = win.document.getElementById("dns-resolver");
			assert.ok(group, "the radio group did not render");
			assert.equal(group.value, win.Zotero.DNS.resolver);
			let radios = [...group.querySelectorAll("radio")];
			assert.lengthOf(radios, 2);
			for (let radio of radios) {
				assert.isAbove(
					radio.getAttribute("label").length, 0,
					"a radio label was not translated"
				);
			}
		}
		finally {
			win.close();
		}
	});

	it("renders feeds and the index panel from components", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-advanced"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.isAbove(
				win.document.getElementById("feeds-title").textContent.trim().length, 0
			);
			assert.ok(win.document.getElementById("feed-sort"), "the feed sort menu is missing");
			assert.ok(
				win.document.getElementById("zotero-prefpane-advanced-feeds-feedDefaults"),
				"the feed defaults group is missing"
			);
			assert.isAbove(
				win.document.getElementById("search-index-title").textContent.trim().length, 0
			);
			assert.ok(
				win.document.getElementById("fulltext-maxLength"),
				"the cache-size input is missing"
			);
			assert.ok(
				win.document.getElementById("fulltext-stats"),
				"the index panel is missing"
			);
		}
		finally {
			win.close();
		}
	});

	it("renders keyboard shortcuts from the catalog component", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-advanced"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.isAbove(
				win.document.getElementById("keyboard-shortcuts-title")
					.textContent.trim().length,
				0,
				"the Fluent title was not translated"
			);
			let grid = win.document.getElementById("zotero-keys-grid");
			assert.ok(grid, "the component grid did not render");
			assert.lengthOf(grid.querySelectorAll("input"), 7);
			let label = win.document.querySelector('label[for="textbox-newItem"]');
			assert.isAbove(
				label.textContent.trim().length, 0,
				"a shortcut label was not translated"
			);
		}
		finally {
			win.close();
		}
	});

	it("renders database maintenance from the catalog", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-advanced"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			assert.equal(
				win.document.getElementById("database-maintenance-title").textContent,
				"Database Maintenance",
				"the Fluent title was not translated"
			);
			let check = win.document.getElementById("check-integrity");
			let reset = win.document.getElementById("reset-translators");
			assert.ok(check && reset, "the catalog actions did not render");
			assert.include(check.getAttribute("label"), "Check Database Integrity");
			assert.include(reset.getAttribute("label"), "Reset Translators");
		}
		finally {
			win.close();
		}
	});

	it("renders agent access and connection from the catalog", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-agent"
		});
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			for (let id of [
				"agent-enabled", "agent-token", "agent-token-copy", "agent-token-rotate",
			]) {
				assert.ok(win.document.getElementById(id), `${id} did not render`);
			}
			assert.isAbove(
				win.document.getElementById("agent-access-title").textContent.trim().length, 0
			);
			assert.isAbove(
				win.document.getElementById("agent-token-path").textContent.trim().length, 0,
				"the token path was not localized"
			);
			for (let id of ["agent-setup", "agent-setup-copy", "agent-audit-open"]) {
				assert.ok(win.document.getElementById(id), `${id} did not render`);
			}
			assert.include(
				win.document.getElementById("agent-setup").value,
				"citewell agent ping"
			);
			assert.isAbove(
				win.document.getElementById("agent-capabilities-description")
					.textContent.trim().length,
				0
			);
			for (let id of ["agent-skill-copy", "agent-skill-open", "agent-skill-url",
				"agent-audit-path"]) {
				assert.ok(win.document.getElementById(id), `${id} did not render`);
			}
			assert.isAbove(
				win.document.getElementById("agent-skill-url").textContent.trim().length, 0
			);
			assert.isAbove(
				win.document.getElementById("agent-audit-path").textContent.trim().length, 0
			);
		}
		finally {
			win.close();
		}
	});

	it("renders the local API group from the catalog", async function () {
		let win = await loadWindow("chrome://zotero/content/preferences/preferences.xhtml", {
			pane: "zotero-prefpane-agent"
		});
		let localAPI = win.Zotero.Prefs.get("httpServer.localAPI.enabled");
		try {
			await win.Zotero_Preferences.waitForFirstPaneLoad();
			let title = win.document.getElementById("local-api-title");
			assert.equal(title.textContent, "Local API", "the Fluent title was not translated");
			let enabled = win.document.getElementById("local-api-enabled");
			let url = win.document.getElementById("local-api-url");
			let clear = win.document.getElementById("local-api-clear");
			let disabledNote = win.document.getElementById("local-api-server-disabled");
			assert.ok(enabled && url && clear && disabledNote);
			assert.isFalse(url.hidden, "the address should be visible while enabled");
			assert.isFalse(clear.hidden, "the clear button should be visible while enabled");
			assert.isTrue(disabledNote.hidden, "the server-disabled note should be hidden");

			win.Zotero.Prefs.set("httpServer.localAPI.enabled", false);
			win.Zotero_Preferences._refreshLocalAPI(win.document.getElementById("local-api"));
			assert.isTrue(url.hidden, "disabling the API should hide the address");
			assert.isTrue(clear.hidden, "disabling the API should hide the clear button");
		}
		finally {
			win.Zotero.Prefs.set("httpServer.localAPI.enabled", localAPI);
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
