"use strict";

describe("PDF annotation sidecars", function () {
	before(async function () {
		await resetDB({
			thisArg: this,
			skipBundledFiles: true
		});
	});

	it("exports annotations once and never overwrites the sidecar", async function () {
		let attachment = await importFileAttachment('test.pdf');
		assert.equal(await Zotero.Notes.countAnnotatedAttachments(), 0);

		await Zotero.Annotations.saveFromJSON(attachment, {
			key: Zotero.DataObjectUtilities.generateKey(),
			type: 'highlight',
			authorName: '',
			text: 'quoted text',
			comment: 'why it matters',
			color: '#ffd400',
			pageLabel: '4',
			sortIndex: '00001|000000|00000',
			position: { pageIndex: 3, rects: [[10, 10, 100, 20]] },
		});
		assert.equal(await Zotero.Notes.countAnnotatedAttachments(), 1);

		let result = await Zotero.Notes.exportAnnotationSidecars();
		assert.equal(result.written, 1);
		assert.lengthOf(result.failed, 0);

		let dir = Zotero.Attachments.getStorageDirectory(attachment).path;
		let path = OS.Path.join(dir, 'annotations.md');
		assert.isTrue(await IOUtils.exists(path));
		let first = await Zotero.File.getContentsAsync(path);
		assert.include(first, '# Annotations');
		assert.include(first, 'page 4');
		assert.include(first, '> quoted text');
		assert.include(first, 'why it matters');
		assert.include(first, '```json');

		await Zotero.File.putContentsAsync(path, 'do not overwrite');
		let second = await Zotero.Notes.exportAnnotationSidecars();
		assert.equal(second.skipped, 1);
		assert.equal(await Zotero.File.getContentsAsync(path), 'do not overwrite');
	});
});
