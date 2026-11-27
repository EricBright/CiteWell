"use strict";

describe("Create Bibliography Dialog", function () {
	var win, zp;
	
	before(async function () {
		win = await loadZoteroPane();
		await Zotero.Styles.init();
		zp = win.ZoteroPane;
	});
	
	after(function () {
		win.close();
	});
	
	it("should remap renamed style IDs to their current IDs", async function () {
		await createDataObject('item');
		
		let styleID;
		
		var deferred = Zotero.Promise.defer();
		waitForWindow("chrome://zotero/content/bibliography.xhtml", function (dialog) {
			(async function () {
				await dialog.isLoadedPromise;
				let styleSelector = dialog.document.getElementById('style-selector');
				// Set the value to an old/renamed style ID
				styleSelector.value = "chicago-fullnote-bibliography";
				// Should be remapped to the current style ID
				styleID = styleSelector.value;
				dialog.close();
				deferred.resolve();
			})();
		});
		await win.Zotero_File_Interface.bibliographyFromItems();
		await deferred.promise;

		assert.equal(styleID, "http://www.zotero.org/styles/chicago-notes-bibliography");
	});
	
	it("should send Manage Styles to the Cite pane", async function () {
		await createDataObject('item');

		let original = Zotero.Utilities.Internal.openPreferences;
		let calls = [];
		Zotero.Utilities.Internal.openPreferences = (...args) => {
			calls.push(args);
			return null;
		};
		let deferred = Zotero.Promise.defer();
		waitForWindow("chrome://zotero/content/bibliography.xhtml", async function (dialog) {
			try {
				await dialog.isLoadedPromise;
				dialog.document.getElementById('manage-styles').click();
			}
			finally {
				deferred.resolve();
			}
		});
		try {
			await win.Zotero_File_Interface.bibliographyFromItems();
			await deferred.promise;
		}
		finally {
			Zotero.Utilities.Internal.openPreferences = original;
		}

		assert.lengthOf(calls, 1);
		assert.equal(calls[0][0], "zotero-prefpane-cite");
		assert.equal(calls[0][1].scrollTo, "#styles");
	});
});
