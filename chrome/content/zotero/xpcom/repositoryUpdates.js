/*
    Copyright © 2026 Eric Bright
    This file is part of CiteWell, a fork of Zotero.
    Licensed under the GNU Affero General Public License, version 3 or later.
    See COPYING and NOTICE.
*/

/**
 * Translator and style repository updates: bundled-file installation, the periodic and
 * notification-driven checks, the timers, and the reset actions.
 *
 * Extracted from schema.js, which keeps the database schema and the version table.
 */
Zotero.RepositoryUpdates = new function () {
	this.REPO_UPDATE_PERIODIC = 0;
	this.REPO_UPDATE_MANUAL = 1;
	this.REPO_UPDATE_INITIAL = 2;
	this.REPO_UPDATE_STARTUP = 3;
	this.REPO_UPDATE_NOTIFICATION = 4;

	const REPOSITORY_CHECK_INTERVAL = 86400;
	const REPOSITORY_RETRY_INTERVAL = 3600;

	var _repositoryTimerID;
	var _repositoryNotificationTimerID;
	var _nextRepositoryUpdate;
	var _remoteUpdateInProgress = false;
	var _localUpdateInProgress = false;
	var _hiddenNoticesWithoutIDs = new Map();

	var self = this;

	this.updateBundledFiles = async function (mode) {
		if (Zotero.skipBundledFiles) {
			Zotero.debug("Skipping bundled file installation");
			return;
		}
		
		if (_localUpdateInProgress) {
			Zotero.debug("Bundled file update already in progress", 2);
			return;
		}
		
		_localUpdateInProgress = true;
		
		try {
			await Zotero.proxyAuthComplete;
			await Zotero.Promise.delay(1000);
			
			Zotero.debug("Updating bundled " + (mode || "files"));
			
			// Get path to add-on
			
			var installLocation = Components.classes["@mozilla.org/file/directory_service;1"]
				.getService(Components.interfaces.nsIProperties)
				.get("AChrom", Components.interfaces.nsIFile).parent;
			installLocation.append("omni.ja");
			installLocation = installLocation.path;
			
			let initOpts = { fromSchemaUpdate: true };
			
			// Update files
			switch (mode) {
			case 'styles':
				await Zotero.Styles.init(initOpts);
				var updated = await _updateBundledFilesAtLocation(installLocation, mode);
				break;
			
			case 'translators':
				await Zotero.Translators.init(initOpts);
				var updated = await _updateBundledFilesAtLocation(installLocation, mode);
				break;
			
			default:
				await Zotero.Translators.init(initOpts);
				let up1 = await _updateBundledFilesAtLocation(installLocation, 'translators', true);
				await Zotero.Styles.init(initOpts);
				let up2 = await _updateBundledFilesAtLocation(installLocation, 'styles');
				var updated = up1 || up2;
			}
		}
		finally {
			_localUpdateInProgress = false;
		}
		
		return updated;
	};
	
	/**
	 * Update bundled files in a given location
	 *
	 * @param {String} installLocation - Path to XPI or source dir
	 * @param {'translators','styles'} mode
	 * @param {Boolean} [skipVersionUpdates=false]
	 */
	var _updateBundledFilesAtLocation = async function (installLocation, mode, skipVersionUpdates) {
		const { FileUtils } = ChromeUtils.importESModule("resource://gre/modules/FileUtils.sys.mjs");
		
		var isUnpacked = (await OS.File.stat(installLocation)).isDir;
		if(!isUnpacked) {
			var xpiZipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
					.createInstance(Components.interfaces.nsIZipReader);
			xpiZipReader.open(new FileUtils.File(installLocation));
		}
		
		switch (mode) {
			case "translators":
				var titleField = 'label';
				var fileExt = ".js";
				var destDir = Zotero.getTranslatorsDirectory().path;
				break;
			
			case "styles":
				var titleField = 'title';
				var fileExt = ".csl";
				var destDir = Zotero.getStylesDirectory().path;
				var hiddenDir = OS.Path.join(destDir, 'hidden');
				break;
			
			default:
				throw new Error("Invalid mode '" + mode + "'");
		}
		
		var modeType = mode.substr(0, mode.length - 1);
		var ModeType = Zotero.Utilities.capitalize(modeType);
		var Mode = Zotero.Utilities.capitalize(mode);
		
		var repotime = await Zotero.File.getResourceAsync("resource://zotero/schema/repotime.txt");
		var date = Zotero.Date.sqlToDate(repotime.trim(), true);
		repotime = Zotero.Date.toUnixTimestamp(date);
		
		var fileNameRE = new RegExp("^[^\.].+\\" + fileExt + "$");
		
		// If directory is empty, force reinstall
		var forceReinstall = true;
		let iterator = new OS.File.DirectoryIterator(destDir);
		try {
			outer:
			while (true) {
				let entries = await iterator.nextBatch(10);
				if (!entries.length) break;
				for (let i = 0; i < entries.length; i++) {
					let entry = entries[i];
					if (!entry.name.match(fileNameRE) || entry.isDir) {
						continue;
					}
					// Not empty
					forceReinstall = false;
					break outer;
				}
			}
		}
		finally {
			iterator.close();
		}
		
		//
		// Delete obsolete files
		//
		var sql = "SELECT version FROM version WHERE schema='delete'";
		var lastVersion = await Zotero.DB.valueQueryAsync(sql);
		
		if(isUnpacked) {
			var deleted = OS.Path.join(installLocation, 'deleted.txt');
			// In source builds, deleted.txt is in the translators directory
			if (!(await OS.File.exists(deleted))) {
				deleted = OS.Path.join(installLocation, 'translators', 'deleted.txt');
				if (!(await OS.File.exists(deleted))) {
					deleted = false;
				}
			}
		} else {
			var deleted = xpiZipReader.getInputStream("deleted.txt");
		}
		
		let deletedVersion;
		if (deleted) {
			deleted = await Zotero.File.getContentsAsync(deleted);
			deleted = deleted.match(/^([^\s]+)/gm);
			deletedVersion = deleted.shift();
		}
		
		if (!lastVersion || lastVersion < deletedVersion) {
			var toDelete = [];
			let iterator = new OS.File.DirectoryIterator(destDir);
			try {
				while (true) {
					let entries = await iterator.nextBatch(10);
					if (!entries.length) break;
					for (let i = 0; i < entries.length; i++) {
						let entry = entries[i];
						
						if ((entry.isSymLink && !(await OS.File.exists(entry.path))) // symlink to non-existent file
								|| entry.isDir) {
							continue;
						}
						
						if (mode == 'styles') {
							switch (entry.name) {
								// Remove update script (included with 3.0 accidentally)
								case 'update':
								
								// Delete renamed/obsolete files
								case 'chicago-note.csl':
								case 'mhra_note_without_bibliography.csl':
								case 'mhra.csl':
								case 'mla.csl':
									toDelete.push(entry.path);
									continue;
								
								// Be a little more careful with this one, in case someone
								// created a custom 'aaa' style
								case 'aaa.csl':
									let str = await Zotero.File.getContentsAsync(entry.path, false, 300);
									if (str.indexOf("<title>American Anthropological Association</title>") != -1) {
										toDelete.push(entry.path);
									}
									continue;
							}
						}
						
						if (forceReinstall || !entry.name.match(fileNameRE)) {
							continue;
						}
						
						if (mode == 'translators') {
							// TODO: Change if the APIs change
							let newObj = await Zotero[Mode].loadFromFile(entry.path);
							if (!deleted.includes(newObj[modeType + "ID"])) {
								continue;
							}
							toDelete.push(entry.path);
						}
					}
				}
			}
			finally {
				iterator.close();
			}
			
			for (let i = 0; i < toDelete.length; i++) {
				let path = toDelete[i];
				Zotero.debug("Deleting " + path);
				try {
					await OS.File.remove(path);
				}
				catch (e) {
					Components.utils.reportError(e);
					Zotero.debug(e, 1);
				}
			}
			
			if (!skipVersionUpdates) {
				let sql = "REPLACE INTO version (schema, version) VALUES ('delete', ?)";
				await Zotero.DB.queryAsync(sql, deletedVersion);
			}
		}
		
		//
		// Update files
		//
		var sql = "SELECT version FROM version WHERE schema=?";
		var lastModTime = await Zotero.DB.valueQueryAsync(sql, mode);
		// Fix millisecond times (possible in 4.0?)
		if (lastModTime > 9999999999) {
			lastModTime = Math.round(lastModTime / 1000);
		}
		var cache = {};
		
		// XPI installation
		if (!isUnpacked) {
			var modTime = Math.round(
				(await OS.File.stat(installLocation)).lastModificationDate.getTime() / 1000
			);
			
			if (!forceReinstall && lastModTime && modTime <= lastModTime) {
				Zotero.debug("Installed " + mode + " are up-to-date with XPI");
				return false;
			}
			
			Zotero.debug("Updating installed " + mode + " from XPI");
			
			let tmpDir = Zotero.getTempDirectory().path;
			
			if (mode == 'translators') {
				// Parse translators.json
				if (!xpiZipReader.hasEntry("translators.json")) {
					Zotero.logError("translators.json not found");
					return false;
				}
				let index = JSON.parse(await Zotero.File.getContentsAsync(
					xpiZipReader.getInputStream("translators.json"))
				);
				for (let id in index) {
					index[id].extract = true;
				}
				
				let sql = "SELECT rowid, fileName, metadataJSON FROM translatorCache";
				let rows = await Zotero.DB.queryAsync(sql);
				// If there's anything in the cache, see what we actually need to extract
				for (let i = 0; i < rows.length; i++) {
					let json = rows[i].metadataJSON;
					try {
						let metadata = JSON.parse(json);
						let id = metadata.translatorID;
						if (index[id] && index[id].lastUpdated <= metadata.lastUpdated) {
							index[id].extract = false;
						}
					}
					catch (e) {
						Zotero.logError(e);
						Zotero.debug(json, 1);
						
						// If JSON is invalid, clear from cache
						await Zotero.DB.queryAsync(
							"DELETE FROM translatorCache WHERE rowid=?",
							rows[i].rowid
						);
					}
				}
				
				for (let translatorID in index) {
					// Use index file and DB cache for translator entries,
					// extracting only what's necessary
					let entry = index[translatorID];
					if (!entry.extract) {
						//Zotero.debug("Not extracting '" + entry.label + "' -- same version already in cache");
						continue;
					}
					
					let tmpFile = OS.Path.join(tmpDir, entry.fileName)
					await Zotero.File.removeIfExists(tmpFile);
					xpiZipReader.extract("translators/" + entry.fileName, new FileUtils.File(tmpFile));
					
					var existingObj = Zotero.Translators.get(translatorID);
					if (!existingObj) {
						Zotero.debug("Installing translator '" + entry.label + "'");
					}
					else {
						Zotero.debug("Updating translator '" + existingObj.label + "'");
						await Zotero.File.removeIfExists(existingObj.path);
					}
					
					let destFile = OS.Path.join(destDir, entry.fileName);
					try {
						await OS.File.move(tmpFile, destFile, {
							noOverwrite: true
						});
					}
					catch (e) {
						if (e instanceof OS.File.Error && e.becauseExists) {
							// Could overwrite automatically, but we want to log this
							Zotero.warn("Overwriting translator with same filename '"
								+ entry.fileName + "'");
							await OS.File.move(tmpFile, destFile);
						}
						else {
							throw e;
						}
					}
				}
			}
			// Styles
			else {
				let entries = xpiZipReader.findEntries('styles/*.csl');
				while (entries.hasMore()) {
					let entry = entries.getNext();
					let fileName = entry.substr(7); // strip 'styles/'
					
					let tmpFile = OS.Path.join(tmpDir, fileName);
					await Zotero.File.removeIfExists(tmpFile);
					xpiZipReader.extract(entry, new FileUtils.File(tmpFile));
					let code = await Zotero.File.getContentsAsync(tmpFile);
					let newObj = new Zotero.Style(code);
					
					let existingObj = Zotero.Styles.get(newObj[modeType + "ID"]);
					if (!existingObj) {
						Zotero.debug("Installing style '" + newObj[titleField] + "'");
					}
					else {
						Zotero.debug("Updating "
							+ (existingObj.hidden ? "hidden " : "")
							+ "style '" + existingObj[titleField] + "'");
						await Zotero.File.removeIfExists(existingObj.path);
					}
					
					if (!existingObj || !existingObj.hidden) {
						await OS.File.move(tmpFile, OS.Path.join(destDir, fileName));
					}
					else {
						await OS.File.move(tmpFile, OS.Path.join(hiddenDir, fileName));
					}
				}
			}
			
			if(xpiZipReader) xpiZipReader.close();
		}
		// Source installation
		else {
			let sourceDir = OS.Path.join(installLocation, mode);
			
			var modTime = 0;
			let sourceFilesExist = false;
			let iterator;
			try {
				iterator = new OS.File.DirectoryIterator(sourceDir);
			}
			catch (e) {
				if (e instanceof OS.File.Error && e.becauseNoSuchFile) {
					let msg = "No " + mode + " directory";
					Zotero.debug(msg, 1);
					Components.utils.reportError(msg);
					return false;
				}
				throw e;
			}
			try {
				while (true) {
					let entries = await iterator.nextBatch(10); // TODO: adjust as necessary
					if (!entries.length) break;
					for (let i = 0; i < entries.length; i++) {
						let entry = entries[i];
						if (!entry.name.match(fileNameRE) || entry.isDir) {
							continue;
						}
						sourceFilesExist = true;
						let d;
						if ('winLastWriteDate' in entry) {
							d = entry.winLastWriteDate;
						}
						else {
							d = (await OS.File.stat(entry.path)).lastModificationDate;
						}
						let fileModTime = Math.round(d.getTime() / 1000);
						if (fileModTime > modTime) {
							modTime = fileModTime;
						}
					}
				}
			}
			finally {
				iterator.close();
			}
			
			// Don't attempt installation for source build with missing styles
			if (!sourceFilesExist) {
				Zotero.debug("No source " + modeType + " files exist -- skipping update");
				return false;
			}
			
			if (!forceReinstall && lastModTime && modTime <= lastModTime) {
				Zotero.debug("Installed " + mode + " are up-to-date with " + mode + " directory");
				return false;
			}
			
			Zotero.debug("Updating installed " + mode + " from " + mode + " directory");
			
			iterator = new OS.File.DirectoryIterator(sourceDir);
			try {
				while (true) {
					let entries = await iterator.nextBatch(10); // TODO: adjust as necessary
					if (!entries.length) break;
					
					for (let i = 0; i < entries.length; i++) {
						let entry = entries[i];
						if (!entry.name.match(fileNameRE) || entry.isDir) {
							continue;
						}
						let newObj;
						if (mode == 'styles') {
							let code = await Zotero.File.getContentsAsync(entry.path);
							newObj = new Zotero.Style(code);
						}
						else if (mode == 'translators') {
							newObj = await Zotero.Translators.loadFromFile(entry.path);
						}
						else {
							throw new Error("Invalid mode '" + mode + "'");
						}
						let existingObj = Zotero[Mode].get(newObj[modeType + "ID"]);
						if (!existingObj) {
							Zotero.debug("Installing " + modeType + " '" + newObj[titleField] + "'");
						}
						else {
							Zotero.debug("Updating "
								+ (existingObj.hidden ? "hidden " : "")
								+ modeType + " '" + existingObj[titleField] + "'");
							await Zotero.File.removeIfExists(existingObj.path);
						}
						
						let fileName;
						if (mode == 'translators') {
							fileName = Zotero.Translators.getFileNameFromLabel(
								newObj[titleField], newObj.translatorID
							);
						}
						else if (mode == 'styles') {
							fileName = entry.name;
						}
						
						try {
							let destFile;
							if (!existingObj || !existingObj.hidden) {
								destFile = OS.Path.join(destDir, fileName);
							}
							else {
								destFile = OS.Path.join(hiddenDir, fileName)
							}
							
							try {
								await OS.File.copy(entry.path, destFile, { noOverwrite: true });
							}
							catch (e) {
								if (e instanceof OS.File.Error && e.becauseExists) {
									// Could overwrite automatically, but we want to log this
									Zotero.warn("Overwriting " + modeType + " with same filename "
										+ "'" + fileName + "'", 1);
									await OS.File.copy(entry.path, destFile);
								}
								else {
									throw e;
								}
							}
							
							if (mode == 'translators') {
								cache[fileName] = newObj.metadata;
							}
						}
						catch (e) {
							Components.utils.reportError("Error copying file " + fileName + ": " + e);
						}
					}
				}
			}
			finally {
				iterator.close();
			}
		}
		
		await Zotero.DB.executeTransaction(async function () {
			var sql = "REPLACE INTO version VALUES (?, ?)";
			await Zotero.DB.queryAsync(sql, [mode, modTime]);
			
			if (!skipVersionUpdates) {
				sql = "REPLACE INTO version VALUES ('repository', ?)";
				await Zotero.DB.queryAsync(sql, repotime);
			}
		});
		
		await Zotero[Mode].reinit({
			metadataCache: cache,
			fromSchemaUpdate: true
		});
		
		return true;
	};
	
	
	this.notify = async function (delay) {
		if (!Zotero.Prefs.get('automaticScraperUpdates')) {
			return;
		}
		
		// If another repository check -- either from notification or daily check -- is scheduled
		// before delay, just wait for that one
		if (_nextRepositoryUpdate) {
			if (_nextRepositoryUpdate <= (Date.now() + delay)) {
				Zotero.debug("Next scheduled update from repository is in "
					+ Math.round((_nextRepositoryUpdate - Date.now()) / 1000) + " seconds "
					+ "-- ignoring notification");
				return;
			}
			if (_repositoryNotificationTimerID) {
				clearTimeout(_repositoryNotificationTimerID);
			}
		}
		
		_nextRepositoryUpdate = Date.now() + delay;
		Zotero.debug(`Updating from repository in ${Math.round(delay / 1000)} seconds`);
		_repositoryNotificationTimerID = setTimeout(() => {
			this.check(this.REPO_UPDATE_NOTIFICATION)
		}, delay);
	};
	
	
	/**
	 * Send XMLHTTP request for updated translators and styles to the central repository
	 *
	 * @param {Integer} [mode=0] - If non-zero, force a repository query regardless of how long it's
	 *     been since the last check. Should be a REPO_UPDATE_* constant.
	 */
	this.check = async function (mode = 0) {
		if (Zotero.skipBundledFiles) {
			Zotero.debug("No bundled files -- skipping repository update");
			return;
		}
		
		if (_remoteUpdateInProgress) {
			Zotero.debug("A remote update is already in progress -- not checking repository");
			return false;
		}
		
		if (mode == this.REPO_UPDATE_PERIODIC) {
			// Check user preference for automatic updates
			if (!Zotero.Prefs.get('automaticScraperUpdates')) {
				Zotero.debug('Automatic repository updating disabled -- not checking repository', 4);
				return false;
			}
			
			// Determine the earliest local time that we'd query the repository again
			let lastCheck = await Zotero.Schema.getDBVersion('lastcheck');
			let nextCheck = new Date();
			nextCheck.setTime((lastCheck + REPOSITORY_CHECK_INTERVAL) * 1000);
			
			// If enough time hasn't passed, don't update
			var now = new Date();
			if (now < nextCheck) {
				Zotero.debug('Not enough time since last update -- not checking repository', 4);
				// Set the repository timer to the remaining time
				_setRepositoryTimer(Math.round((nextCheck.getTime() - now.getTime()) / 1000));
				return false;
			}
		}
		
		if (_localUpdateInProgress) {
			Zotero.debug('A local update is already in progress -- delaying repository check', 4);
			_setRepositoryTimer(600);
			return false;
		}
		
		if (Zotero.locked) {
			Zotero.debug('Zotero is locked -- delaying repository check', 4);
			_setRepositoryTimer(600);
			return false;
		}
		
		// If an update from a notification is queued, stop it, since we're updating now
		if (_repositoryNotificationTimerID) {
			clearTimeout(_repositoryNotificationTimerID);
			_repositoryNotificationTimerID = null;
			_nextRepositoryUpdate = null;
		}
		
		if (Zotero.DB.inTransaction()) {
			await Zotero.DB.waitForTransaction();
		}
		
		if (mode == this.REPO_UPDATE_PERIODIC || mode == this.REPO_UPDATE_STARTUP) {
			try {
				await Zotero.Retractions.updateFromServer();
			}
			catch (e) {
				Zotero.logError(e);
			}
		}
		
		// Get the last timestamp we got from the server
		var lastUpdated = await Zotero.Schema.getDBVersion('repository');
		var updated = false;
		
		try {
			var url = ZOTERO_CONFIG.REPOSITORY_URL + 'updated?'
				+ (lastUpdated ? 'last=' + lastUpdated + '&' : '')
				+ 'version=' + Zotero.zoteroCompatVersion;
			
			Zotero.debug('Checking repository for translator and style updates');
			
			_remoteUpdateInProgress = true;
			
			if (mode) {
				url += '&m=' + mode;
			}
			
			// Report versions from a mismatched build detected at startup
			var buildMismatch = Zotero.Prefs.get('buildMismatch');
			if (buildMismatch) {
				url += '&mismatch=' + encodeURIComponent(buildMismatch);
			}
			
			// Send list of installed styles
			var styles = Zotero.Styles.getAll();
			var styleTimestamps = [];
			for (let id in styles) {
				let styleUpdated = Zotero.Date.sqlToDate(styles[id].updated, true);
				styleUpdated = styleUpdated ? styleUpdated.getTime() / 1000 : 0;
				var selfLink = styles[id].url;
				var data = {
					id: id,
					updated: styleUpdated
				};
				if (selfLink) {
					data.url = selfLink;
				}
				styleTimestamps.push(data);
			}
			var body = 'styles=' + encodeURIComponent(JSON.stringify(styleTimestamps));
			
			try {
				var xmlhttp = await Zotero.HTTP.request(
					"POST",
					url,
					{
						body,
						errorDelayMax: 5000,
						errorDelayIntervals: [5000]
					}
				);
				if (buildMismatch) {
					Zotero.Prefs.clear('buildMismatch');
				}
				updated = await _handleRepositoryResponse(xmlhttp, mode);
			}
			catch (e) {
				if (mode == this.REPO_UPDATE_PERIODIC) {
					if (e instanceof Zotero.HTTP.UnexpectedStatusException
							|| e instanceof Zotero.HTTP.BrowserOfflineException) {
						let msg = " -- retrying in " + REPOSITORY_RETRY_INTERVAL
						if (e instanceof Zotero.HTTP.BrowserOfflineException) {
							Zotero.debug("Browser is offline" + msg, 2);
						}
						else {
							Zotero.logError(e);
							Zotero.debug(e.status, 1);
							Zotero.debug(e.xmlhttp.responseText, 1);
							Zotero.debug("Error updating from repository " + msg, 1);
						}
						// TODO: instead, add an observer to start and stop timer on online state change
						_setRepositoryTimer(REPOSITORY_RETRY_INTERVAL);
						return;
					}
				}
				if (xmlhttp) {
					Zotero.debug(xmlhttp.status, 1);
					Zotero.debug(xmlhttp.responseText, 1);
				}
				throw e;
			};
		}
		finally {
			if (mode == this.REPO_UPDATE_PERIODIC) {
				_setRepositoryTimer(REPOSITORY_RETRY_INTERVAL);
			}
			_remoteUpdateInProgress = false;
		}
		
		return updated;
	};
	
	
	this.stopTimer = function () {
		if (_repositoryTimerID) {
			Zotero.debug('Stopping repository check timer');
			clearTimeout(_repositoryTimerID);
			_repositoryTimerID = null;
		}
		if (_repositoryNotificationTimerID) {
			Zotero.debug('Stopping repository notification update timer');
			clearTimeout(_repositoryNotificationTimerID);
			_repositoryNotificationTimerID = null
		}
		_nextRepositoryUpdate = null;
	}
	
	
	this.resetTranslatorsAndStyles = async function () {
		Zotero.debug("Resetting translators and styles");
		
		var sql = "DELETE FROM version WHERE schema IN "
			+ "('translators', 'styles', 'repository', 'lastcheck')";
		await Zotero.DB.queryAsync(sql);
		
		sql = "DELETE FROM translatorCache";
		await Zotero.DB.queryAsync(sql);
		
		Zotero.Schema.clearDBVersion('repository');
		Zotero.Schema.clearDBVersion('lastcheck');
		
		var translatorsDir = Zotero.getTranslatorsDirectory();
		var stylesDir = Zotero.getStylesDirectory();
		
		translatorsDir.remove(true);
		stylesDir.remove(true);
		
		// Recreate directories
		Zotero.getTranslatorsDirectory();
		Zotero.getStylesDirectory();
		
		await Promise.all(Zotero.Translators.reinit(), Zotero.Styles.reinit());
		var updated = await this.updateBundledFiles();
		if (updated && Zotero.Prefs.get('automaticScraperUpdates')) {
			await Zotero.RepositoryUpdates.check(this.REPO_UPDATE_MANUAL);
		}
		return updated;
	};
	
	
	this.resetTranslators = async function () {
		Zotero.debug("Resetting translators");
		
		var sql = "DELETE FROM version WHERE schema IN "
			+ "('translators', 'repository', 'lastcheck')";
		await Zotero.DB.queryAsync(sql);
		
		sql = "DELETE FROM translatorCache";
		await Zotero.DB.queryAsync(sql);
		
		Zotero.Schema.clearDBVersion('repository');
		Zotero.Schema.clearDBVersion('lastcheck');
		
		var translatorsDir = Zotero.getTranslatorsDirectory();
		translatorsDir.remove(true);
		Zotero.getTranslatorsDirectory(); // recreate directory
		await Zotero.Translators.reinit();
		var updated = await this.updateBundledFiles('translators');
		if (updated && Zotero.Prefs.get('automaticScraperUpdates')) {
			await Zotero.RepositoryUpdates.check(this.REPO_UPDATE_MANUAL);
		}
		return updated;
	};
	
	
	this.resetStyles = async function () {
		Zotero.debug("Resetting styles");
		
		var sql = "DELETE FROM version WHERE schema IN "
			+ "('styles', 'repository', 'lastcheck')";
		await Zotero.DB.queryAsync(sql);
		Zotero.Schema.clearDBVersion('repository');
		Zotero.Schema.clearDBVersion('lastcheck');
		
		var stylesDir = Zotero.getStylesDirectory();
		stylesDir.remove(true);
		Zotero.getStylesDirectory(); // recreate directory
		await Zotero.Styles.reinit()
		var updated = await this.updateBundledFiles('styles');
		if (updated && Zotero.Prefs.get('automaticScraperUpdates')) {
			await Zotero.RepositoryUpdates.check(this.REPO_UPDATE_MANUAL);
		}
		return updated;
	};

	async function _handleRepositoryResponse(xmlhttp, mode) {
		if (!xmlhttp.responseXML){
			try {
				if (xmlhttp.status>1000){
					Zotero.debug('No network connection', 2);
				}
				else {
					Zotero.debug(xmlhttp.status);
					Zotero.debug(xmlhttp.responseText);
					Zotero.debug('Invalid response from repository', 2);
				}
			}
			catch (e){
				Zotero.debug('Repository cannot be contacted');
			}
			return false;
		}
		
		var currentTime = xmlhttp.responseXML.
			getElementsByTagName('currentTime')[0].firstChild.nodeValue;
		var lastCheckTime = Math.round(new Date().getTime()/1000);
		var translatorUpdates = xmlhttp.responseXML.getElementsByTagName('translator');
		var styleUpdates = xmlhttp.responseXML.getElementsByTagName('style');
		
		_showRepositoryMessage(xmlhttp.responseXML);
		_checkRepositoryPrefs(xmlhttp.responseXML);
		
		if (!translatorUpdates.length && !styleUpdates.length){
			await Zotero.DB.executeTransaction(async function (conn) {
				// Store the timestamp provided by the server
				await Zotero.Schema.setDBVersion('repository', currentTime);
				
				// And the local timestamp of the update time
				await Zotero.Schema.setDBVersion('lastcheck', lastCheckTime);
			});
			
			Zotero.debug('All translators and styles are up-to-date');
			if (mode == self.REPO_UPDATE_PERIODIC) {
				_setRepositoryTimer(REPOSITORY_CHECK_INTERVAL);
			}
			return true;
		}
		
		var updated = false;
		try {
			for (var i=0, len=translatorUpdates.length; i<len; i++){
				await _translatorXMLToFile(translatorUpdates[i]);
			}
			
			for (var i=0, len=styleUpdates.length; i<len; i++){
				await _styleXMLToFile(styleUpdates[i]);
			}
			
			// Rebuild caches
			let fromSchemaUpdate = mode != self.REPO_UPDATE_MANUAL;
			await Zotero.Translators.reinit({ fromSchemaUpdate });
			await Zotero.Styles.reinit({ fromSchemaUpdate });
			
			updated = true;
		}
		catch (e) {
			Zotero.logError(e);
		}
		
		if (updated) {
			await Zotero.DB.executeTransaction(async function (conn) {
				// Store the timestamp provided by the server
				await Zotero.Schema.setDBVersion('repository', currentTime);
				
				// And the local timestamp of the update time
				await Zotero.Schema.setDBVersion('lastcheck', lastCheckTime);
			});
		}
		
		return updated;
	}
	
	
	/**
	 * Show dialog if repo returns a message
	 */
	function _showRepositoryMessage(responseXML) {
		try {
			var messageElem = responseXML.querySelector('message');
			if (!messageElem || !messageElem.textContent) {
				return;
			}
			
			let hiddenNotices = Zotero.Prefs.get('hiddenNotices') || '{}';
			try {
				hiddenNotices = JSON.parse(hiddenNotices);
			}
			catch (e) {
				Zotero.logError(e);
				hiddenNotices = {};
			}
			
			let id = messageElem.getAttribute('id');
			let title = messageElem.getAttribute('title');
			let text = messageElem.textContent;
			let url = messageElem.getAttribute('infoURL');
			let now = Math.round(Date.now() / 1000);
			let thirtyDays = 86400 * 30;
			
			if (id) {
				if (hiddenNotices[id] && hiddenNotices[id] > now) {
					Zotero.debug("Not showing hidden notice " + id, 2);
					Zotero.debug(text, 2);
					return;
				}
			}
			else {
				let exp = _hiddenNoticesWithoutIDs.get(text);
				if (exp && exp > now) {
					Zotero.debug("Not showing hidden notice", 2);
					Zotero.debug(text, 2);
					return;
				}
			}
			
			setTimeout(() => {
				Zotero.debug(text, 2);
				
				var ps = Services.prompt;
				var buttonFlags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_OK
					+ ps.BUTTON_POS_1 * ps.BUTTON_TITLE_IS_STRING;
				var checkState = {};
				var index = ps.confirmEx(
					null,
					title || Zotero.getString('general.warning'),
					text,
					buttonFlags,
					"",
					// Show "More Information" button if repo includes a URL
					url ? Zotero.getString('general.moreInformation') : "",
					"",
					// Show "Don't show again for 30 days" if repo includes an id
					id ? Zotero.getString('general.dontShowAgainFor', 30, 30) : null,
					checkState
				);
				
				if (index == 1) {
					setTimeout(function () {
						Zotero.launchURL(url);
					}, 1);
				}
				// Handle "Don't show again for 30 days" checkbox
				if (id) {
					if (checkState.value) {
						hiddenNotices[id] = now + thirtyDays;
					}
					// If not checked, still don't show again for a day
					else {
						hiddenNotices[id] = now + 86400;
					}
					// Remove expired hidden notices
					for (let i in hiddenNotices) {
						if (hiddenNotices[i] < now) {
							delete hiddenNotices[i];
						}
					}
					if (Object.keys(hiddenNotices).length) {
						Zotero.Prefs.set('hiddenNotices', JSON.stringify(hiddenNotices));
					}
					else {
						Zotero.Prefs.clear('hiddenNotices');
					}
				}
				else {
					// Don't show id-less messages again for a day
					_hiddenNoticesWithoutIDs.set(text, now + 86400);
				}
			}, 500);
		}
		catch (e) {
			Zotero.logError(e);
		}
	}
	
	
	/**
	 * Check for remotely set preferences
	 *
	 * Format:
	 *
	 * <prefs>
	 *     <prefset version="1">
	 *         <pref name="extensions.zotero.import.mendeleyUseOAuth" value="true" />
	 *     </prefset>
	 * </prefs>
	 *
	 * Prefsets must be in increasing order
	 *
	 * @param {XMLDocument} responseXML - Response document from repository
	 */
	function _checkRepositoryPrefs(responseXML) {
		const allowedPrefs = new Set([
			'extensions.zotero.import.mendeleyUseOAuth'
		]);
		try {
			var prefsElem = responseXML.querySelector('prefs');
			if (!prefsElem) {
				return;
			}
			var prefsets = prefsElem.querySelectorAll('prefset');
			for (let prefset of prefsets) {
				let version = parseInt(prefset.getAttribute('version'));
				let pref = prefset.querySelector('pref');
				if (!pref) {
					Zotero.logError('<pref> not found within <prefset>');
					continue;
				}
				if (version <= Zotero.Prefs.get('prefVersion.remote')) {
					break;
				}
				let name = pref.getAttribute('name');
				if (!allowedPrefs.has(name)) {
					Zotero.logError(`${name} cannot be set remotely`);
					continue;
				}
				let value = pref.getAttribute('value');
				if (value == "true") value = true;
				if (value == "false") value = false;
				Zotero.Prefs.set(name, value, true);
				Zotero.Prefs.set('prefVersion.remote', version);
			}
		}
		catch (e) {
			Zotero.logError(e);
		}
	}
	
	
	/**
	* Set the interval between repository queries
	*
	* We add an additional two seconds to avoid race conditions
	**/
	function _setRepositoryTimer(delay) {
		var fudge = 2; // two seconds
		var displayInterval = delay + fudge;
		delay = (delay + fudge) * 1000; // convert to ms
		
		if (_repositoryTimerID) {
			clearTimeout(_repositoryTimerID);
			_repositoryTimerID = null;
		}
		if (_repositoryNotificationTimerID) {
			clearTimeout(_repositoryNotificationTimerID);
			_repositoryNotificationTimerID = null;
		}
		
		Zotero.debug('Scheduling next repository check in ' + displayInterval + ' seconds');
		_repositoryTimerID = setTimeout(() => Zotero.RepositoryUpdates.check(), delay);
		_nextRepositoryUpdate = Date.now() + delay;
	}
	
	
	/**
	 * Traverse an XML translator node from the repository and
	 * update the local translators folder with the translator data
	 *
	 * @return {Promise}
	 */
	var _translatorXMLToFile = async function (xmlnode) {
		// Don't split >4K chunks into multiple nodes
		// https://bugzilla.mozilla.org/show_bug.cgi?id=194231
		xmlnode.normalize();
		var translatorID = xmlnode.getAttribute('id');
		var translator = Zotero.Translators.get(translatorID);
		
		// Delete local version of remote translators with priority 0
		if (xmlnode.getElementsByTagName('priority')[0].firstChild.nodeValue === "0") {
			if (translator && (await OS.File.exists(translator.path))) {
				Zotero.debug("Deleting translator '" + translator.label + "'");
				await OS.File.remove(translator.path);
			}
			return false;
		}
		
		var metadata = {
			translatorID: translatorID,
			translatorType: parseInt(xmlnode.getAttribute('type')),
			label: xmlnode.getElementsByTagName('label')[0].firstChild.nodeValue,
			creator: xmlnode.getElementsByTagName('creator')[0].firstChild.nodeValue,
			target: (xmlnode.getElementsByTagName('target').item(0) &&
						xmlnode.getElementsByTagName('target')[0].firstChild)
					? xmlnode.getElementsByTagName('target')[0].firstChild.nodeValue
					: null,
			minVersion: xmlnode.getAttribute('minVersion'),
			maxVersion: xmlnode.getAttribute('maxVersion'),
			priority: parseInt(
				xmlnode.getElementsByTagName('priority')[0].firstChild.nodeValue
			),
			inRepository: true,
		};
		
		var browserSupport = xmlnode.getAttribute('browserSupport');
		if (browserSupport) {
			metadata.browserSupport = browserSupport;
		}
		
		for (let attr of ["configOptions", "displayOptions", "hiddenPrefs"]) {
			try {
				var tags = xmlnode.getElementsByTagName(attr);
				if(tags.length && tags[0].firstChild) {
					metadata[attr] = JSON.parse(tags[0].firstChild.nodeValue);
				}
			} catch(e) {
				Zotero.logError("Invalid JSON for "+attr+" in new version of "+metadata.label+" ("+translatorID+") from repository");
				return;
			}
		}
		
		metadata.lastUpdated = xmlnode.getAttribute('lastUpdated');
		
		// detectCode can not exist or be empty
		var detectCode = (xmlnode.getElementsByTagName('detectCode').item(0) &&
					xmlnode.getElementsByTagName('detectCode')[0].firstChild)
				? xmlnode.getElementsByTagName('detectCode')[0].firstChild.nodeValue
				: null;
		var code = xmlnode.getElementsByTagName('code')[0].firstChild.nodeValue;
		code = (detectCode ? detectCode + "\n\n" : "") + code;
		
		return Zotero.Translators.save(metadata, code);
	};
	
	
	/**
	 * Traverse an XML style node from the repository and
	 * update the local styles folder with the style data
	 */
	var _styleXMLToFile = async function (xmlnode) {
		// Don't split >4K chunks into multiple nodes
		// https://bugzilla.mozilla.org/show_bug.cgi?id=194231
		xmlnode.normalize();
		
		var uri = xmlnode.getAttribute('id');
		var shortName = uri.replace("http://www.zotero.org/styles/", "");
		
		// Delete local style if CSL code is empty
		if (!xmlnode.firstChild) {
			var style = Zotero.Styles.get(uri);
			if (style) {
				await OS.File.remove(style.path);
			}
			return;
		}
		
		// Remove renamed styles, as instructed by the server
		var oldID = xmlnode.getAttribute('oldID');
		if (oldID) {
			var style = Zotero.Styles.get(oldID, true);
			if (style && (await OS.File.exists(style.path))) {
				Zotero.debug("Deleting renamed style '" + oldID + "'");
				await OS.File.remove(style.path);
			}
		}
		
		var str = xmlnode.firstChild.nodeValue;
		var style = Zotero.Styles.get(uri);
		if (style) {
			await Zotero.File.removeIfExists(style.path);
			var destFile = style.path;
		}
		else {
			// Get last part of URI for filename
			var matches = uri.match(/([^\/]+)$/);
			if (!matches) {
				throw ("Invalid style URI '" + uri + "' from repository");
			}
			var destFile = OS.Path.join(
				Zotero.getStylesDirectory().path,
				matches[1] + ".csl"
			);
			if (await OS.File.exists(destFile)) {
				throw new Error("Different style with filename '" + matches[1]
					+ "' already exists");
			}
		}
		
		Zotero.debug("Saving style '" + uri + "'");
		return Zotero.File.putContentsAsync(destFile, str);
	};
};
