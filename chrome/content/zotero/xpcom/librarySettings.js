/*
    Copyright © 2026 Eric Bright
    This file is part of CiteWell, a fork of Zotero.
    Licensed under the GNU Affero General Public License, version 3 or later.
    See COPYING and NOTICE.
*/

/**
 * Per-library settings stored beside the library: the attachment rename template, tag colours,
 * feeds and per-item read state. Values are JSON in the syncedSettings table, which keeps its name.
 */
Zotero.LibrarySettings = (function () {
	var _cache = {};

	// Keys this build writes. Unknown keys from an older profile are read but never created.
	const SETTINGS = [
		'attachmentRenameTemplate',
		'autoRenameFiles',
		'autoRenameFilesFileTypes',
		'feeds',
		'tagColors',
		/^lastPageIndex_(u|g[0-9]+)_[A-Z0-9]{8}$/,
		/^lastRead_(g[0-9]+)_[A-Z0-9]{8}$/,
		/^lastReadAloudPosition_(u|g[0-9]+)_[A-Z0-9]{8}$/,
		'readerCustomThemes'
	];

	function _isAllowedSetting(setting) {
		return SETTINGS.some(x => (typeof x == 'string' ? x === setting : x.test(setting)));
	}

	var module = {
		loadAll: async function (libraryID) {
			Zotero.debug("Loading library settings for library " + libraryID);

			_cache[libraryID] = {};

			var sql = "SELECT setting, value FROM syncedSettings WHERE libraryID=?";
			await Zotero.DB.queryAsync(
				sql,
				libraryID,
				{
					onRow: function (row) {
						var setting = row.getResultByIndex(0);
						try {
							_cache[libraryID][setting] = JSON.parse(row.getResultByIndex(1));
						}
						catch (e) {
							Zotero.logError(`Invalid library setting '${setting}' for library ${libraryID}`);
						}
					}
				}
			);

			// Sanitize colored tags -- shouldn't be necessary, but just in case a bad value makes it
			// into the setting
			if (_cache[libraryID].tagColors) {
				let fixed = false;
				let tagColors = _cache[libraryID].tagColors;
				if (!Array.isArray(tagColors)) {
					tagColors = [];
					fixed = true;
				}
				tagColors = tagColors.filter((color) => {
					if (typeof color != 'object' || typeof color.name != 'string' || typeof color.color != 'string') {
						Zotero.logError("Removing invalid colored tag: " + JSON.stringify(color));
						fixed = true;
						return false;
					}
					return true;
				});
				// Before whitespace was trimmed in Tags.setColor() in 5.0.75
				tagColors.forEach((tag) => {
					let trimmed = tag.name.trim();
					if (trimmed != tag.name) {
						tag.name = trimmed;
						fixed = true;
					}
				});
				if (fixed) {
					await this.set(libraryID, 'tagColors', tagColors);
				}
			}
		},

		get: function (libraryID, setting) {
			if (!_cache[libraryID]) {
				throw new Zotero.Exception.UnloadedDataException(
					"Library settings not loaded for library " + libraryID,
					"librarySettings"
				);
			}

			if (typeof _cache[libraryID][setting] == 'undefined') {
				return null;
			}

			return JSON.parse(JSON.stringify(_cache[libraryID][setting]));
		},

		set: async function (libraryID, setting, value) {
			if (typeof value == 'undefined') {
				throw new Error("Value not provided");
			}

			if (!_isAllowedSetting(setting)) {
				throw new Error(`Invalid library setting '${setting}'`);
			}

			// Prevents a whole bunch of headache if you continue modifying the object after calling #set()
			if (Array.isArray(value)) {
				value = Array.from(value);
			}
			else if (typeof value == 'object') {
				value = Object.assign({}, value);
			}

			var currentValue = this.get(libraryID, setting);
			var hasCurrentValue = currentValue !== null;

			if (value === currentValue) {
				return false;
			}

			var id = libraryID + '/' + setting;
			var extraData = {};
			if (hasCurrentValue) {
				extraData[id] = { changed: { value: currentValue } };
			}

			var event = hasCurrentValue ? 'modify' : 'add';

			if (hasCurrentValue) {
				await Zotero.DB.queryAsync(
					"UPDATE syncedSettings SET value=? WHERE setting=? AND libraryID=?",
					[JSON.stringify(value), setting, libraryID]
				);
			}
			else {
				await Zotero.DB.queryAsync(
					"INSERT INTO syncedSettings (setting, libraryID, value) VALUES (?, ?, ?)",
					[setting, libraryID, JSON.stringify(value)]
				);
			}

			_cache[libraryID][setting] = value;

			await Zotero.Notifier.trigger(event, 'setting', [id], extraData);
			return true;
		},

		clear: async function (libraryID, setting) {
			var currentValue = this.get(libraryID, setting);
			if (currentValue === null) {
				return false;
			}

			var id = libraryID + '/' + setting;
			var extraData = {};
			extraData[id] = { changed: { value: currentValue } };

			await Zotero.DB.queryAsync(
				"DELETE FROM syncedSettings WHERE setting=? AND libraryID=?",
				[setting, libraryID]
			);

			delete _cache[libraryID][setting];

			await Zotero.Notifier.trigger('delete', 'setting', [id], extraData);
			return true;
		}
	};

	return module;
}());
