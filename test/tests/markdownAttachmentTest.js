"use strict";

describe("Markdown note attachments", function () {
	before(async function () {
		await resetDB({
			thisArg: this,
			skipBundledFiles: true
		});
	});

	it("makes a plain-text excerpt and indexes the file", async function () {
		let parent = await createDataObject('item', { title: "Note parent" });
		let attachment = await Zotero.Notes.createMarkdownAttachment({
			parentItemID: parent.id,
			title: "Reading note",
			text: "# Heading\n\nHello **world** and [link](https://example.com).\n\n`code`"
		});

		let text = await Zotero.Notes.getMarkdownAttachmentText(attachment);
		let excerpt = Zotero.Notes.getMarkdownExcerpt(text);
		assert.include(excerpt, "Hello world and link");
		assert.notInclude(excerpt, "**");
		assert.notInclude(excerpt, "https://example.com");

		let indexed = await Zotero.Notes.indexMarkdownAttachments();
		assert.isAtLeast(indexed, 1);
		let count = await Zotero.DB.valueQueryAsync(
			"SELECT COUNT(*) FROM fulltextItems WHERE itemID=?", attachment.id
		);
		assert.equal(count, 1);
		let stats = await Zotero.DB.rowQueryAsync(
			"SELECT indexedChars, totalChars FROM fulltextItems WHERE itemID=?", attachment.id
		);
		assert.isAbove(stats.indexedChars || 0, 0, "indexedChars should be positive");
		assert.isTrue(Zotero.MIME.isTextType(attachment.attachmentContentType), "markdown is a text type");

		let search = new Zotero.Search();
		search.libraryID = parent.libraryID;
		search.addCondition('quicksearch-everything', 'contains', 'Hello world');
		let ids = await search.search();
		assert.isAtLeast(ids.length, 1);
		assert.include(ids, attachment.id);
	});

	it("shows the parent, date and excerpt in the attachment pane", async function () {
		let parent = await createDataObject('item', { title: "Visible parent" });
		let attachment = await Zotero.Notes.createMarkdownAttachment({
			parentItemID: parent.id,
			title: "Visible note",
			text: "# Visible note\n\nA plain excerpt."
		});
		let win = await loadZoteroPane();
		try {
			await win.ZoteroPane.selectItem(attachment.id);
			await Zotero.Promise.delay(300);
			let excerpt = win.document.getElementById('markdown-note-excerpt');
			assert.ok(excerpt);
			assert.include(excerpt.textContent, 'A plain excerpt.');
			assert.equal(win.document.getElementById('markdown-note-parent').textContent, 'Visible parent');
		}
		finally {
			win.close();
		}
	});
});
