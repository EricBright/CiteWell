describe('Zotero.LibrarySettings', function () {
	it('should not affect cached value when modifying the setting after #set() call', async function () {
		let setting = {athing: 1};
		await Zotero.LibrarySettings.set(Zotero.Libraries.userLibraryID, 'lastPageIndex_u_AAAAAAAA', setting);
		
		setting.athing = 2;
		let storedSetting = Zotero.LibrarySettings.get(Zotero.Libraries.userLibraryID, 'lastPageIndex_u_AAAAAAAA');
		assert.notDeepEqual(setting, storedSetting);
	});
	
	describe("#set()", function () {
		it("should throw for a setting this build does not write", async function () {
			let libraryID = Zotero.Libraries.userLibraryID;
			let e = await getPromiseError(
				Zotero.LibrarySettings.set(libraryID, 'plugin.setting.ABCD2345', 'foo')
			);
			assert.ok(e);
			assert.include(e.message, "Invalid library setting 'plugin.setting.ABCD2345'");
			assert.isNull(Zotero.LibrarySettings.get(libraryID, 'plugin.setting.ABCD2345'));
		});
		
		it("should store, read back and clear a setting", async function () {
			let libraryID = Zotero.Libraries.userLibraryID;
			await Zotero.LibrarySettings.set(libraryID, 'autoRenameFiles', true);
			assert.isTrue(Zotero.LibrarySettings.get(libraryID, 'autoRenameFiles'));
			
			await Zotero.LibrarySettings.clear(libraryID, 'autoRenameFiles');
			assert.isNull(Zotero.LibrarySettings.get(libraryID, 'autoRenameFiles'));
		});
	});
});
