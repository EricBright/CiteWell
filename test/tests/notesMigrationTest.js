"use strict";

describe("Markdown note migration", function () {
	before(async function () {
		await resetDB({
			thisArg: this,
			skipBundledFiles: true
		});
	});

	it("converts a legacy note to a verified .md attachment and trashes the source", async function () {
		let parent = await createDataObject('item');
		let note = new Zotero.Item('note');
		note.libraryID = parent.libraryID;
		note.parentID = parent.id;
		note.setNote(
			'<div class="zotero-note znv1"><h1>Legacy title</h1>'
			+ '<p>Hello <strong>world</strong>.</p></div>'
		);
		await note.saveTx();

		assert.equal(await Zotero.Notes.countLegacyNotes(), 1);

		let result = await Zotero.Notes.migrateLegacyNotes();
		assert.equal(result.migrated, 1);
		assert.lengthOf(result.failed, 0);
		assert.equal(await Zotero.Notes.countLegacyNotes(), 0);

		let attachment = parent.getAttachments()
			.map(id => Zotero.Items.get(id))
			.find(item => Zotero.Notes.isMarkdownAttachment(item));
		assert.ok(attachment, "migrated note attachment exists");
		assert.equal(attachment.getField('title'), 'Legacy title');

		let markdown = await Zotero.Notes.getMarkdownAttachmentText(attachment);
		assert.include(markdown, '# Legacy title');
		assert.include(markdown, '**world**');

		let old = await Zotero.Items.getAsync(note.id);
		assert.isTrue(old.deleted, "old note is in Trash");
	});


	it("copies embedded images next to the Markdown file", async function () {
		let parent = await createDataObject('item');
		let note = new Zotero.Item('note');
		note.libraryID = parent.libraryID;
		note.parentID = parent.id;
		note.setNote('<div class="zotero-note znv1"><p>Before</p><p>After</p></div>');
		await note.saveTx();

		let imageFile = getTestDataDirectory();
		imageFile.append('test.png');
		let image = await Zotero.Attachments.importFromFile({
			file: imageFile,
			parentItemID: parent.id,
			contentType: 'image/png'
		});
		note.setNote(
			'<div class="zotero-note znv1"><p>Before</p>'
			+ `<img data-attachment-key="${image.key}"><p>After</p></div>`
		);
		await note.saveTx();

		let result = await Zotero.Notes.migrateLegacyNotes();
		assert.equal(result.migrated, 1);
		let markdownAttachment = parent.getAttachments()
			.map(id => Zotero.Items.get(id))
			.find(item => Zotero.Notes.isMarkdownAttachment(item));
		assert.ok(markdownAttachment);
		let markdown = await Zotero.Notes.getMarkdownAttachmentText(markdownAttachment);
		assert.include(markdown, `![`);
		assert.include(markdown, `${image.key}-test.png`);
		let dir = Zotero.Attachments.getStorageDirectory(markdownAttachment).path;
		assert.isTrue(await IOUtils.exists(OS.Path.join(dir, `${image.key}-test.png`)));
	});

	it("leaves a note in place when conversion fails", async function () {
		let parent = await createDataObject('item');
		let note = new Zotero.Item('note');
		note.libraryID = parent.libraryID;
		note.parentID = parent.id;
		note.setNote('<div class="zotero-note znv1"><p>Failure case</p></div>');
		await note.saveTx();

		let original = Zotero.Notes.htmlToMarkdown;
		Zotero.Notes.htmlToMarkdown = async () => {
			throw new Error('intentional conversion failure');
		};
		try {
			let result = await Zotero.Notes.migrateLegacyNotes();
			assert.equal(result.migrated, 0);
			assert.lengthOf(result.failed, 1);
			assert.equal(await Zotero.Notes.countLegacyNotes(), 1);
			let current = await Zotero.Items.getAsync(note.id);
			assert.isFalse(current.deleted);
		}
		finally {
			Zotero.Notes.htmlToMarkdown = original;
		}
	});
});
