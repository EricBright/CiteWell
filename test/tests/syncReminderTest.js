"use strict";

describe("Sync reminders with sync disabled", function () {
	it("should keep the sync banner hidden after an item is added", async function () {
		assert.isFalse(ZOTERO_CONFIG.ONLINE_SYNC);
		let win = await loadZoteroPane();
		try {
			await createDataObject('item');
			// The reminder observer waits five seconds before showing the banner
			await Zotero.Promise.delay(6500);
			let panel = win.document.getElementById('sync-reminder-container');
			assert.ok(panel);
			assert.isTrue(panel.hasAttribute('collapsed'));
		}
		finally {
			win.close();
		}
	});
});
