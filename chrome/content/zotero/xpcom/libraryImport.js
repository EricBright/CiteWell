/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2026 Eric Bright
    This file is part of CiteWell, a fork of Zotero.

    CiteWell is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    CiteWell is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with CiteWell.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

"use strict";

var { Subprocess } = ChromeUtils.importESModule("resource://gre/modules/Subprocess.sys.mjs");

/**
 * Adopt a copy of a Zotero library.
 *
 * The file engine is the Rust `citewell-import` helper. This module owns the
 * data-layer side: detection, read-only inspection, the database snapshot, the
 * request file and the pre-start apply hook. It never writes to the source
 * library and never lets the Rust helper open SQLite.
 *
 * @namespace
 */
Zotero.LibraryImport = {
	REQUEST_FILENAME: "library-import-request.json",
	RESTORE_FILENAME: "library-restore-request.json",
	RESULT_FILENAME: "library-import-result.json",
	APPLY_MARKER: ".import-apply-in-progress",
	IDENTITY_FILENAME: "aliases.jsonl",

	get dataDir() {
		return Zotero.DataDirectory.dir;
	},

	get profileDir() {
		return Zotero.Profile.dir;
	},

	get requestPath() {
		return PathUtils.join(this.profileDir, this.REQUEST_FILENAME);
	},

	get restorePath() {
		return PathUtils.join(this.profileDir, this.RESTORE_FILENAME);
	},

	get resultPath() {
		return PathUtils.join(this.profileDir, this.RESULT_FILENAME);
	},

	get identityDir() {
		return PathUtils.join(this.dataDir, "identity");
	},

	get identityPath() {
		return PathUtils.join(this.identityDir, this.IDENTITY_FILENAME);
	},

	get mergeSessionsDir() {
		return PathUtils.join(this.identityDir, "merge-sessions");
	},

	/**
	 * Find likely Zotero libraries without asking the person to know a path.
	 *
	 * @return {Promise<Array<Object>>} candidates, best first
	 */
	detectSources: async function () {
		var candidates = [];
		var home = OS.Constants.Path.homeDir;
		var selfPath = PathUtils.normalize(this.dataDir);

		var add = async (path, origin, label, extra = {}) => {
			if (!path) return;
			try {
				path = PathUtils.normalize(path);
			}
			catch {
				// PathUtils.normalize() stats the path and throws when a configured
				// library is on a disconnected drive. Keep the string so the pane can
				// still show that location and ask for the drive.
				path = path.replace(/\/+$/, "");
			}
			// Never offer CiteWell's own library as a source.
			if (path === selfPath) return;

			var allowMissing = extra.allowMissing;
			delete extra.allowMissing;
			var dbPath = PathUtils.join(path, "zotero.sqlite");
			var exists = await IOUtils.exists(dbPath);
			if (!exists && !allowMissing) return;
			var stat = null;
			if (exists) {
				try {
					stat = await IOUtils.stat(dbPath);
				}
				catch {}
			}
			if (!exists && origin === "configured") {
				label = "Zotero's settings point here, but it is not connected";
			}
			candidates.push({
				path,
				origin,
				label,
				exists,
				missing: !exists,
				dbSize: stat ? stat.size : 0,
				mtime: stat ? stat.lastModified : 0,
				...extra,
			});
		};

		// Zotero's own pointer is authoritative for custom locations.
		var profiles = await this._zoteroProfiles();
		for (var profile of profiles) {
			var prefs = this._parseZoteroPrefs(profile.prefs);
			var configured = (prefs.useDataDir && prefs.dataDir) || prefs.lastDataDir;
			if (!configured) continue;
			var label = prefs.useDataDir && prefs.dataDir
				? "From Zotero's settings"
				: "From Zotero's last-used location";
			if (profile.name) label += ` (profile “${profile.name}”)`;
			await add(configured, "configured", label, {
				allowMissing: true,
				configured: true,
				profile: profile.name || null,
			});
		}

		await add(PathUtils.join(home, "Zotero"), "default", "Zotero's default location");

		var common = [
			PathUtils.join(home, "Documents", "Zotero"),
			PathUtils.join(home, "Documents", "Zotero Library"),
			PathUtils.join(home, "Dropbox", "Zotero"),
			PathUtils.join(home, "Nextcloud", "Zotero"),
			PathUtils.join(home, "ownCloud", "Zotero"),
		];
		for (var path of common) {
			await add(path, "common", "Found nearby");
		}

		// Top-level home folders catch a library with a custom name without
		// walking the whole home directory.
		for (let homeChild of await this._childDirs(home)) {
			await add(homeChild, "common", "Found nearby");
		}

		// Mounted volumes. Two levels deep is enough for the usual
		// /run/media/$USER/<volume>/<library> layout.
		var user = PathUtils.filename(home);
		for (var root of [`/run/media/${user}`, `/media/${user}`, `/mnt`]) {
			for (var volume of await this._childDirs(root)) {
				await add(volume, "drive", "Found on a drive");
				for (let volumeChild of await this._childDirs(volume)) {
					await add(volumeChild, "drive", "Found on a drive");
				}
			}
		}

		// Flatpak keeps both the profile and the default data directory inside
		// its per-app tree.
		await add(
			PathUtils.join(home, ".var", "app", "org.zotero.Zotero", "Zotero"),
			"flatpak",
			"Found in Flatpak"
		);

		var rank = { configured: 0, default: 1, common: 2, drive: 3, flatpak: 3 };
		var deduped = new Map();
		for (var candidate of candidates) {
			var previous = deduped.get(candidate.path);
			if (!previous) {
				deduped.set(candidate.path, candidate);
				continue;
			}
			// Prefer the configured copy if the same path was found twice, and
			// an existing library over a missing one.
			var better = (rank[candidate.origin] ?? 9) < (rank[previous.origin] ?? 9)
				|| (candidate.exists && !previous.exists);
			if (better) deduped.set(candidate.path, candidate);
		}

		var list = Array.from(deduped.values());
		list.sort((a, b) => {
			var rankDiff = (rank[a.origin] ?? 9) - (rank[b.origin] ?? 9);
			if (rankDiff) return rankDiff;
			if (a.missing != b.missing) return a.missing ? -1 : 1;
			return (b.mtime || 0) - (a.mtime || 0) || a.path.localeCompare(b.path);
		});
		return list;
	},

	/**
	 * Read Zotero's profiles.ini files and their prefs.js data-directory keys.
	 * Read-only: the profile is never copied, written or imported.
	 *
	 * @return {Promise<Array<{name: String, path: String, prefs: String}>>}
	 */
	_zoteroProfiles: async function () {
		var home = OS.Constants.Path.homeDir;
		var roots = [
			PathUtils.join(home, ".zotero", "zotero"),
			PathUtils.join(home, ".config", "zotero", "zotero"),
			PathUtils.join(home, ".var", "app", "org.zotero.Zotero", ".zotero", "zotero"),
		];
		var profiles = [];

		for (var root of roots) {
			var ini = await this._readIfExists(PathUtils.join(root, "profiles.ini"));
			if (ini) {
				for (var section of this._parseProfilesIni(ini)) {
					var profilePath = section.IsRelative === "1"
						? PathUtils.join(root, ...section.Path.split("/"))
						: section.Path;
					var prefs = await this._readIfExists(PathUtils.join(profilePath, "prefs.js"));
					if (!prefs) continue;
					profiles.push({
						name: section.Name || PathUtils.filename(profilePath),
						path: profilePath,
						prefs,
					});
				}
				continue;
			}

			// A profile directory passed directly, without profiles.ini.
			var directPrefs = await this._readIfExists(PathUtils.join(root, "prefs.js"));
			if (directPrefs) {
				profiles.push({ name: PathUtils.filename(root), path: root, prefs: directPrefs });
			}
		}
		return profiles;
	},

	_parseProfilesIni: function (contents) {
		var sections = [];
		var current = null;
		for (var line of contents.split(/\r?\n/)) {
			line = line.trim();
			if (!line || line.startsWith(";") || line.startsWith("#")) continue;
			if (line.startsWith("[") && line.endsWith("]")) {
				current = { section: line.slice(1, -1) };
				sections.push(current);
				continue;
			}
			if (!current) continue;
			var equals = line.indexOf("=");
			if (equals === -1) continue;
			current[line.slice(0, equals).trim()] = line.slice(equals + 1).trim();
		}
		return sections.filter(section => section.Path);
	},

	_parseZoteroPrefs: function (contents) {
		var prefs = {};
		for (var line of contents.split(/\r?\n/)) {
			var match = line.match(
				/^user_pref\("extensions\.zotero\.(dataDir|useDataDir|lastDataDir)",\s*(.+?)\);\s*$/
			);
			if (!match) continue;
			try {
				prefs[match[1]] = JSON.parse(match[2]);
			}
			catch {
				Zotero.debug(`Ignoring unparseable Zotero pref: ${line}`, 2);
			}
		}
		return prefs;
	},

	_readIfExists: async function (path) {
		try {
			return await Zotero.File.getContentsAsync(path);
		}
		catch (e) {
			if (e.name === "NotFoundError" || e.becauseNoSuchFile) return null;
			throw e;
		}
	},

	_childDirs: async function (path) {
		var dirs = [];
		try {
			for (var child of await IOUtils.getChildren(path)) {
				try {
					var stat = await IOUtils.stat(child);
					if (stat.type === "directory") dirs.push(child);
				}
				catch {}
			}
		}
		catch {}
		return dirs;
	},

	/**
	 * Inspect a library through a disposable copy, so the source is never
	 * opened for writing and cannot be locked by the inspection.
	 */
	inspect: async function (path) {
		var dbPath = PathUtils.join(path, "zotero.sqlite");
		if (!(await IOUtils.exists(dbPath))) {
			throw new Error(`No zotero.sqlite in ${path}`);
		}

		var tmp = PathUtils.join(
			OS.Constants.Path.tmpDir,
			`citewell-import-inspect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
		);
		await Zotero.File.createDirectoryIfMissingAsync(tmp);
		var copy = PathUtils.join(tmp, "zotero.sqlite");

		try {
			await IOUtils.copy(dbPath, copy);
			for (var suffix of ["-wal", "-shm"]) {
				if (await IOUtils.exists(dbPath + suffix)) {
					await IOUtils.copy(dbPath + suffix, copy + suffix);
				}
			}

			var db = new Zotero.DBConnection(copy);
			try {
				var value = async (sql) => {
					try {
						return await db.valueQueryAsync(sql);
					}
					catch {
						return null;
					}
				};
				var num = async (sql) => {
					var result = await value(sql);
					return result === null || result === undefined ? null : Number(result);
				};

				var integrity = await value("PRAGMA integrity_check(1)");
				return {
					path,
					healthy: integrity == "ok",
					integrity,
					schemaVersion: await num("SELECT version FROM version WHERE schema='userdata'"),
					items: await num("SELECT COUNT(*) FROM items"),
					regularItems: await num(`
						SELECT COUNT(*) FROM items i
						JOIN itemTypes it ON it.itemTypeID = i.itemTypeID
						WHERE it.typeName NOT IN ('attachment', 'annotation', 'note')
						AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
					`),
					itemsTrashed: await num(
						"SELECT COUNT(*) FROM items WHERE itemID IN (SELECT itemID FROM deletedItems)"
					),
					collections: await num("SELECT COUNT(*) FROM collections"),
					notes: await num("SELECT COUNT(*) FROM itemNotes"),
					attachments: await num("SELECT COUNT(*) FROM itemAttachments"),
					annotations: await num("SELECT COUNT(*) FROM itemAnnotations"),
					savedSearches: await num("SELECT COUNT(*) FROM savedSearches"),
					groups: await num("SELECT COUNT(*) FROM libraries WHERE type='group'"),
					dbSize: (await IOUtils.stat(dbPath)).size,
					storageSize: await this._treeSize(PathUtils.join(path, "storage")),
				};
			}
			finally {
				await db.closeDatabase(true);
			}
		}
		finally {
			await IOUtils.remove(tmp, { recursive: true, ignoreAbsent: true });
		}
	},

	/**
	 * Counts for the library CiteWell currently has open.
	 */
	getCurrentLibraryInfo: async function () {
		var value = async (sql) => {
			try {
				return Number(await Zotero.DB.valueQueryAsync(sql));
			}
			catch {
				return null;
			}
		};
		var items = await value("SELECT COUNT(*) FROM items");
		var regularItems = await value(`
			SELECT COUNT(*) FROM items i
			JOIN itemTypes it ON it.itemTypeID = i.itemTypeID
			WHERE it.typeName NOT IN ('attachment', 'annotation', 'note')
			AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
		`);
		var collections = await value("SELECT COUNT(*) FROM collections");
		var savedSearches = await value("SELECT COUNT(*) FROM savedSearches");
		var schemaVersion = await value("SELECT version FROM version WHERE schema='userdata'");
		var dbPath = Zotero.DataDirectory.getDatabase();
		var info = {
			path: this.dataDir,
			dbPath,
			items,
			regularItems,
			collections,
			savedSearches,
			schemaVersion,
			empty: items === 0 && collections === 0 && savedSearches === 0,
		};
		try {
			info.dbSize = (await IOUtils.stat(dbPath)).size;
		}
		catch {
			info.dbSize = 0;
		}
		return info;
	},

	_stateAtPath: async function (dbPath) {
		if (!(await IOUtils.exists(dbPath))) {
			return { empty: true, items: 0, collections: 0, savedSearches: 0, schemaVersion: null };
		}
		var db = new Zotero.DBConnection(dbPath);
		try {
			var items = Number(await db.valueQueryAsync("SELECT COUNT(*) FROM items"));
			var collections = Number(await db.valueQueryAsync("SELECT COUNT(*) FROM collections"));
			var savedSearches = Number(await db.valueQueryAsync("SELECT COUNT(*) FROM savedSearches"));
			var schema = await db.valueQueryAsync("SELECT version FROM version WHERE schema='userdata'");
			return {
				empty: items === 0 && collections === 0 && savedSearches === 0,
				items,
				collections,
				savedSearches,
				schemaVersion: schema === null || schema === undefined ? null : Number(schema),
			};
		}
		finally {
			await db.closeDatabase(true);
		}
	},

	/**
	 * SHA-256 of a file, streamed so a large database is not read into memory.
	 */
	hashFile: async function (path) {
		var file = Zotero.File.pathToFile(path);
		var stream = Cc["@mozilla.org/network/file-input-stream;1"]
			.createInstance(Ci.nsIFileInputStream);
		stream.init(file, -1, 0, 0);
		try {
			var hash = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
			hash.init(Ci.nsICryptoHash.SHA256);
			var available = stream.available();
			if (available > 0) {
				hash.updateFromStream(stream, available);
			}
			var bytes = hash.finish(false);
			return Array.from(bytes, char => char.charCodeAt(0).toString(16).padStart(2, "0")).join("");
		}
		finally {
			stream.close();
		}
	},

	/**
	 * Stage a library for adoption. The pane has already inspected the source;
	 * the counts are stored in the request for the receipt.
	 *
	 * @param {String} sourcePath
	 * @param {Object} [options]
	 * @param {Object} [options.counts] result of inspect()
	 * @param {Function} [options.onProgress] receives progress lines
	 * @return {Promise<Object>} the request
	 */
	stage: async function (sourcePath, { counts = null, onProgress = null, replace = false } = {}) {
		var current = await this.getCurrentLibraryInfo();
		if (!replace && !current.empty) {
			throw new Error(
				"CiteWell's library is not empty. Adopt-copy only works with an empty library."
			);
		}

		if (PathUtils.normalize(sourcePath) === PathUtils.normalize(this.dataDir)) {
			throw new Error("That is CiteWell's own library; choose a Zotero library instead.");
		}

		var sourceDb = PathUtils.join(sourcePath, "zotero.sqlite");
		if (!(await IOUtils.exists(sourceDb))) {
			throw new Error(`No zotero.sqlite in ${sourcePath}`);
		}
		var walPath = sourceDb + "-wal";
		if ((await IOUtils.exists(walPath)) && (await IOUtils.stat(walPath)).size > 0) {
			throw new Error(
				"Zotero's database has an active write-ahead log. Quit Zotero completely, "
				+ "then rescan and try again."
			);
		}

		var storageSize = await this._treeSize(PathUtils.join(sourcePath, "storage"));
		var freeSpace = Zotero.File.pathToFile(this.dataDir).diskSpaceAvailable;
		if (freeSpace < storageSize + 64 * 1024 * 1024) {
			throw new Error(
				`Not enough free space in ${this.dataDir}: `
				+ `${this.formatBytes(freeSpace)} available, `
				+ `${this.formatBytes(storageSize)} of attachments to copy.`
			);
		}

		var id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		var importRoot = PathUtils.join(this.dataDir, ".import");
		var staging = PathUtils.join(importRoot, id);
		await Zotero.File.createDirectoryIfMissingAsync(importRoot);
		await Zotero.File.createDirectoryIfMissingAsync(staging);

		try {
			var hashBefore = await this.hashFile(sourceDb);
			await IOUtils.copy(sourceDb, PathUtils.join(staging, "zotero.sqlite"));
			for (let suffix of ["-wal", "-shm"]) {
				if (await IOUtils.exists(sourceDb + suffix)) {
					await IOUtils.copy(sourceDb + suffix, PathUtils.join(staging, "zotero.sqlite" + suffix));
				}
			}

			// Checkpoint the copy's WAL and prove the copy is healthy before
			// spending time on attachments.
			var copyDb = PathUtils.join(staging, "zotero.sqlite");
			var db = new Zotero.DBConnection(copyDb);
			try {
				var integrity = await db.valueQueryAsync("PRAGMA integrity_check(1)");
				if (integrity != "ok") {
					throw new Error(`The copied database failed its integrity check: ${integrity}`);
				}
			}
			finally {
				await db.closeDatabase(true);
			}
			for (let suffix of ["-wal", "-shm"]) {
				await IOUtils.remove(copyDb + suffix, { ignoreAbsent: true });
			}

			var hashAfterCopy = await this.hashFile(sourceDb);
			if (hashBefore !== hashAfterCopy) {
				throw new Error(
					"The Zotero database changed while it was being copied. Quit Zotero and try again."
				);
			}

			var output = await this._runSidecar(
				["stage", "--source", sourcePath, "--staging", staging],
				onProgress
			);
			var staged = this._parseStageOutput(output);

			var hashAfterStage = await this.hashFile(sourceDb);
			if (hashBefore !== hashAfterStage) {
				throw new Error(
					"The Zotero database changed while attachments were being copied. "
					+ "Quit Zotero and try again."
				);
			}

			var request = {
				version: 1,
				id,
				mode: replace ? "replace" : "adopt",
				source: sourcePath,
				staging,
				dataDir: this.dataDir,
				createdAt: new Date().toISOString(),
				sourceHash: hashBefore,
				counts: counts || await this.inspect(sourcePath),
				previous: {
					items: current.items,
					collections: current.collections,
					savedSearches: current.savedSearches,
					schemaVersion: current.schemaVersion,
				},
				staged,
			};
			await this._queue(request);
			return request;
		}
		catch (e) {
			await IOUtils.remove(staging, { recursive: true, ignoreAbsent: true });
			throw e;
		}
	},

	_parseStageOutput: function (output) {
		var match = output.match(/^ok staged files=(\d+) bytes=(\d+)$/m);
		if (!match) {
			throw new Error(`Unexpected helper output: ${output.trim() || "(empty)"}`);
		}
		return { files: Number(match[1]), bytes: Number(match[2]) };
	},

	/**
	 * Merge a Zotero library into the current, non-empty CiteWell library.
	 *
	 * Only regular items, collections and HTML notes are copied. Attachments,
	 * annotations and saved searches wait for Phase 3. The source is copied and
	 * only that copy is read; the source database is hashed before and after.
	 */
	merge: async function (sourcePath, { onProgress = null, skipExactDuplicates = false } = {}) {
		var current = await this.getCurrentLibraryInfo();
		if (current.empty) {
			throw new Error("CiteWell's library is empty; use the first-import path instead.");
		}
		if (PathUtils.normalize(sourcePath) === PathUtils.normalize(this.dataDir)) {
			throw new Error("That is CiteWell's own library; choose a Zotero library instead.");
		}
		var sourceDb = PathUtils.join(sourcePath, "zotero.sqlite");
		if (!(await IOUtils.exists(sourceDb))) {
			throw new Error(`No zotero.sqlite in ${sourcePath}`);
		}
		var walPath = sourceDb + "-wal";
		if ((await IOUtils.exists(walPath)) && (await IOUtils.stat(walPath)).size > 0) {
			throw new Error(
				"Zotero's database has an active write-ahead log. Quit Zotero completely, "
				+ "then rescan and try again."
			);
		}

		var hashBefore = await this.hashFile(sourceDb);
		var resume = await this._findIncompleteMerge(sourcePath, hashBefore);
		if (!resume) {
			// An interrupted merge whose source has changed since cannot be resumed:
			// the checkpoint no longer describes the rows it would skip. Merging again
			// would duplicate the part that already landed, so refuse and name the
			// restore point the interrupted merge kept.
			var stale = await this._findStaleMerge(sourcePath, hashBefore);
			if (stale) throw this._staleMergeError(stale, hashBefore);
		}
		var id = resume?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		var staging = PathUtils.join(
			this.dataDir, ".import", resume ? `merge-${id}-resume` : `merge-${id}`
		);
		await Zotero.File.createDirectoryIfMissingAsync(staging);
		var copyDbPath = PathUtils.join(staging, "zotero.sqlite");
		var backupPath = resume?.backup
			|| PathUtils.join(this.dataDir, `zotero.sqlite.merge-${id}.bak`);

		try {
			await IOUtils.copy(sourceDb, copyDbPath);
			for (let suffix of ["-wal", "-shm"]) {
				if (await IOUtils.exists(sourceDb + suffix)) {
					await IOUtils.copy(sourceDb + suffix, copyDbPath + suffix);
				}
			}
			var copyDb = new Zotero.DBConnection(copyDbPath);
			try {
				let integrity = await copyDb.valueQueryAsync("PRAGMA integrity_check(1)");
				if (integrity != "ok") {
					throw new Error(`The copied database failed its integrity check: ${integrity}`);
				}
			}
			finally {
				await copyDb.closeDatabase(true);
			}
			for (let suffix of ["-wal", "-shm"]) {
				await IOUtils.remove(copyDbPath + suffix, { ignoreAbsent: true });
			}

			var hashAfter = await this.hashFile(sourceDb);
			if (hashBefore !== hashAfter) {
				throw new Error(
					"The Zotero database changed while it was being copied. Quit Zotero and try again."
				);
			}

			onProgress?.(resume
				? "Resuming the unfinished merge…"
				: "Creating a restore point of the current library…");
			if (!resume || !(await IOUtils.exists(backupPath))) {
				var backedUp = await Zotero.DB.backUpDatabase({
					suffix: `merge-${id}`,
					force: true,
					online: true,
				});
				if (!backedUp) {
					throw new Error("Could not create a database backup; merge cancelled.");
				}
				backupPath = PathUtils.join(
					this.dataDir, `zotero.sqlite.merge-${id}.bak`
				);
			}

			var sourceDbConnection = new Zotero.DBConnection(copyDbPath);
			var source;
			try {
				source = await this._readMergeSource(sourceDbConnection);
			}
			finally {
				await sourceDbConnection.closeDatabase(true);
			}

			onProgress?.(`Merging ${source.items.length} items and ${source.collections.length} collections…`);
			var idRows = await Zotero.DB.columnQueryAsync("SELECT itemID FROM items WHERE libraryID=1");
			var existingItemIDs = new Set((idRows || []).map(Number));
			if (resume?.aliases?.length) {
				await this._appendIdentity(resume.aliases, id);
			}
			var result = await this._applyMergeSource(
				source, staging, onProgress, existingItemIDs, skipExactDuplicates, sourcePath,
				resume,
				async checkpoint => {
					await this._writeMergeCheckpoint(id, {
						source: sourcePath,
						sourceHash: hashBefore,
						backup: backupPath,
						createdAt: resume?.createdAt || new Date().toISOString(),
						status: "items",
						skipExactDuplicates,
						...checkpoint,
					});
				}
			);
			var duplicateReport = null;
			if (result.duplicates.length) {
				await Zotero.File.createDirectoryIfMissingAsync(this.identityDir);
				duplicateReport = PathUtils.join(this.identityDir, `duplicates-${id}.json`);
				await Zotero.File.putContentsAsync(duplicateReport, JSON.stringify({
					version: 1,
					session: id,
					source: sourcePath,
					createdAt: new Date().toISOString(),
					duplicates: result.duplicates,
				}, null, 2));
			}
			try {
				await this._appendIdentity(result.aliases, id);
			}
			catch (e) {
				Zotero.logError(e);
				result.warnings++;
			}

			await this._removeMergeCheckpoint(id);
			await this._writeResult({
				ok: true,
				mode: "merge",
				source: sourcePath,
				sourceHash: hashBefore,
				backup: backupPath,
				finishedAt: new Date().toISOString(),
				counts: {
					items: result.items,
					collections: result.collections,
					attachments: result.attachments,
					notes: result.notes,
					annotations: result.annotations,
					savedSearches: result.savedSearches,
					duplicates: result.duplicates.length,
					skippedItems: result.skippedItems,
					skippedNotes: result.skippedNotes,
					skippedAttachments: result.skippedAttachments,
					missingAttachments: result.missingAttachments,
					skippedAnnotations: result.skippedAnnotations,
				},
				duplicateReport,
				warnings: result.warnings,
			});
			return { ...result, backup: backupPath, duplicateReport };
		}
		catch (e) {
			await this._writeResult({
				ok: false,
				mode: "merge",
				source: sourcePath,
				error: e.message || String(e),
				finishedAt: new Date().toISOString(),
			});
			throw e;
		}
		finally {
			await IOUtils.remove(staging, { recursive: true, ignoreAbsent: true });
		}
	},

	_readMergeSource: async function (db) {
		var q = sql => db.queryAsync(sql.trim());
		var items = await q(`
			SELECT i.itemID, i.key, i.libraryID, i.dateAdded, i.dateModified, it.typeName
			FROM items i
			JOIN itemTypes it ON it.itemTypeID = i.itemTypeID
			WHERE i.itemID NOT IN (SELECT itemID FROM deletedItems)
			  AND i.itemID NOT IN (SELECT itemID FROM feedItems)
			  AND it.typeName NOT IN ('attachment', 'annotation', 'note')
			ORDER BY i.itemID
		`);
		var fields = await q(`
			SELECT id.itemID, f.fieldName, v.value
			FROM itemData id
			JOIN fields f ON f.fieldID = id.fieldID
			JOIN itemDataValues v ON v.valueID = id.valueID
		`);
		var creators = await q(`
			SELECT ic.itemID, ic.orderIndex, ct.creatorType, c.firstName, c.lastName, c.fieldMode
			FROM itemCreators ic
			JOIN creators c ON c.creatorID = ic.creatorID
			JOIN creatorTypes ct ON ct.creatorTypeID = ic.creatorTypeID
			ORDER BY ic.itemID, ic.orderIndex
		`);
		var tags = await q(`
			SELECT it.itemID, t.name, it.type
			FROM itemTags it
			JOIN tags t ON t.tagID = it.tagID
			ORDER BY it.itemID
		`);
		var collections = await q(`
			SELECT collectionID, collectionName, parentCollectionID, libraryID
			FROM collections
			ORDER BY collectionID
		`);
		var collectionItems = await q(`
			SELECT collectionID, itemID FROM collectionItems
		`);
		var notes = await q(`
			SELECT n.itemID, n.parentItemID, n.note, n.title
			FROM itemNotes n
			JOIN items i ON i.itemID = n.itemID
			WHERE n.itemID NOT IN (SELECT itemID FROM deletedItems)
		`);
		var attachments = await q(`
			SELECT ia.itemID, ia.parentItemID, ia.path, ia.contentType, ia.linkMode,
				i.key, i.dateAdded, i.dateModified,
				(SELECT v.value FROM itemData d
					JOIN fields f ON f.fieldID = d.fieldID
					JOIN itemDataValues v ON v.valueID = d.valueID
					WHERE d.itemID = i.itemID AND f.fieldName = 'title' LIMIT 1) AS title
			FROM itemAttachments ia
			JOIN items i ON i.itemID = ia.itemID
			WHERE ia.itemID NOT IN (SELECT itemID FROM deletedItems)
			  AND ia.parentItemID IS NOT NULL
		`);
		var annotations = await q(`
			SELECT a.itemID, a.parentItemID, a.type, a.text, a.comment, a.color,
				a.pageLabel, a.sortIndex, a.position
			FROM itemAnnotations a
			JOIN items i ON i.itemID = a.itemID
			WHERE a.itemID NOT IN (SELECT itemID FROM deletedItems)
		`);
		var savedSearches = await q(`
			SELECT savedSearchID, savedSearchName AS name FROM savedSearches
		`);
		var savedSearchConditions = await q(`
			SELECT savedSearchID, condition, operator, value
			FROM savedSearchConditions
			ORDER BY savedSearchID, searchConditionID
		`);
		var groups = await q(`SELECT groupID, libraryID, name FROM groups`);
		var relations = await q(`
			SELECT r.itemID, p.predicate, r.object
			FROM itemRelations r
			JOIN relationPredicates p ON p.predicateID = r.predicateID
		`);

		var fieldsByItem = new Map();
		for (let row of fields) {
			if (!fieldsByItem.has(row.itemID)) fieldsByItem.set(row.itemID, []);
			fieldsByItem.get(row.itemID).push({ name: row.fieldName, value: row.value });
		}
		var creatorsByItem = new Map();
		for (let row of creators) {
			if (!creatorsByItem.has(row.itemID)) creatorsByItem.set(row.itemID, []);
			creatorsByItem.get(row.itemID).push({
				creatorType: row.creatorType,
				firstName: row.firstName ?? "",
				lastName: row.lastName ?? "",
				fieldMode: Number(row.fieldMode) || 0,
			});
		}
		var tagsByItem = new Map();
		for (let row of tags) {
			if (!tagsByItem.has(row.itemID)) tagsByItem.set(row.itemID, []);
			tagsByItem.get(row.itemID).push({ tag: row.name, type: Number(row.type) || 0 });
		}
		var collectionItemsByItem = new Map();
		for (let row of collectionItems) {
			if (!collectionItemsByItem.has(row.itemID)) collectionItemsByItem.set(row.itemID, []);
			collectionItemsByItem.get(row.itemID).push(row.collectionID);
		}

		var itemIDByKey = new Map(items.map(row => [row.key, row.itemID]));
		var groupNames = new Map(groups.map(row => [row.libraryID, row.name]));
		var groupIDs = new Map(groups.map(row => [row.libraryID, row.groupID]));

		return {
			items,
			fieldsByItem,
			creatorsByItem,
			tagsByItem,
			collectionItemsByItem,
			collections: collections.map(row => ({
				collectionID: row.collectionID,
				name: row.collectionName,
				parentID: row.parentCollectionID,
				libraryID: row.libraryID,
			})),
			notes,
			attachments,
			annotations,
			savedSearches,
			savedSearchConditions,
			groupNames,
			groupIDs,
			relations,
			itemIDByKey,
		};
	},

	_applyMergeSource: async function (source, staging, onProgress, existingItemIDs = null,
			skipExactDuplicates = false, sourcePath = null, resumeState = null, onCheckpoint = null) {
		var root;
		var itemMap = new Map();
		var collectionMap = new Map();
		var groupRoots = new Map();
		var notesCollectionID = 0;
		var warnings = 0;
		var collectionCount = 0;
		var aliases = [];
		var duplicates = [];
		var skippedSourceIDs = new Set();
		var importedItems = 0;
		var skippedItems = 0;
		var skippedNotes = 0;
		var importedAttachments = 0;
		var skippedAttachments = 0;
		var missingAttachments = 0;
		var importedAnnotations = 0;
		var skippedAnnotations = 0;
		var importedSearches = 0;

		var state;
		if (!resumeState) {
			state = await Zotero.DB.executeTransaction(async () => {
			root = new Zotero.Collection();
			root.libraryID = 1;
			root.name = `Imported from Zotero — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
			await root.save();
			collectionCount++;

			var collectionsByLibrary = new Map();
			for (let collection of source.collections) {
				if (!collectionsByLibrary.has(collection.libraryID)) {
					collectionsByLibrary.set(collection.libraryID, []);
				}
				collectionsByLibrary.get(collection.libraryID).push(collection);
			}
			var childrenByParent = new Map();
			for (let collection of source.collections) {
				if (!collection.parentID) continue;
				if (!childrenByParent.has(collection.parentID)) childrenByParent.set(collection.parentID, []);
				childrenByParent.get(collection.parentID).push(collection);
			}

			var ensureGroupRoot = async (libraryID) => {
				if (groupRoots.has(libraryID)) return groupRoots.get(libraryID);
				let collection = new Zotero.Collection();
				collection.libraryID = 1;
				collection.name = `Group: ${source.groupNames.get(libraryID) || libraryID}`;
				collection.parentID = root.id;
				await collection.save();
				groupRoots.set(libraryID, collection);
				collectionCount++;
				return collection;
			};

			var createCollection = async (sourceCollection, parentID) => {
				if (collectionMap.has(sourceCollection.collectionID)) return;
				let collection = new Zotero.Collection();
				collection.libraryID = 1;
				collection.name = sourceCollection.name;
				collection.parentID = parentID;
				await collection.save();
				collectionMap.set(sourceCollection.collectionID, collection.id);
				collectionCount++;
				for (let child of childrenByParent.get(sourceCollection.collectionID) || []) {
					await createCollection(child, collection.id);
				}
			};

			for (let [libraryID, list] of collectionsByLibrary) {
				let parentID;
				if (libraryID === 1) {
					parentID = root.id;
				}
				else {
					let groupRoot = await ensureGroupRoot(libraryID);
					parentID = groupRoot.id;
				}
				for (let collection of list) {
					if (collection.parentID) continue;
					await createCollection(collection, parentID);
				}
			}

			onProgress?.(`Collections: ${collectionCount} created; importing items…`);
			var itemsDone = 0;
			for (let row of source.items) {
				if (!Zotero.ItemTypes.getID(row.typeName)) {
					warnings++;
					continue;
				}
				let data = this._citationDataForSourceItem(source, row);
				let match = null;
				if (existingItemIDs?.size) {
					try {
						match = await this.findCitationMatches(
							data,
							{ allowedItemIDs: existingItemIDs }
						);
					}
					catch (e) {
						Zotero.logError(e);
						warnings++;
					}
				}
				if (match?.item) {
					for (let candidate of [match.item]) {
						duplicates.push({
							sourceKey: row.key,
							destKey: candidate.key,
							title: data.title || "",
							by: match.by,
							ambiguous: false,
							skipped: !!(skipExactDuplicates
								&& ["DOI", "ISBN", "PMID"].includes(match.by)),
						});
					}
					if (skipExactDuplicates && ["DOI", "ISBN", "PMID"].includes(match.by)) {
						itemMap.set(row.itemID, match.item);
						skippedSourceIDs.add(row.itemID);
						aliases.push({
							sourceLibraryID: row.libraryID,
							sourceGroupID: source.groupIDs.get(row.libraryID) || null,
							sourceKey: row.key,
							destKey: match.item.key,
						});
						skippedItems++;
						if (itemsDone + skippedItems === source.items.length) {
							onProgress?.(`Items: ${itemsDone}/${source.items.length}`);
						}
						continue;
					}
				}
				else if (match?.ambiguous?.length) {
					for (let candidate of match.ambiguous) {
						duplicates.push({
							sourceKey: row.key,
							destKey: candidate.key,
							title: data.title || "",
							by: match.by,
							ambiguous: true,
							skipped: false,
						});
					}
				}
				let item = new Zotero.Item(row.typeName);
				item.libraryID = 1;
				// Keep the source key when it is free so Writer documents that
				// cite this item keep resolving without an alias. The key must be
				// set before any field, which marks primary data as loaded.
				if (row.key) {
					let taken = await Zotero.DB.valueQueryAsync(
						"SELECT itemID FROM items WHERE libraryID=1 AND key=?", row.key
					);
					if (!taken) {
						// Assign the identifier directly: setField('key') marks
						// the object identified before any field is loaded and
						// makes the following setField() calls throw.
						item._key = row.key;
					}
				}
				for (let field of source.fieldsByItem.get(row.itemID) || []) {
					try {
						item.setField(field.name, field.value);
					}
					catch (e) {
						warnings++;
					}
				}
				let creators = source.creatorsByItem.get(row.itemID);
				if (creators?.length) {
					try {
						item.setCreators(creators);
					}
					catch (e) {
						warnings++;
					}
				}
				let tags = source.tagsByItem.get(row.itemID);
				if (tags?.length) {
					try {
						item.setTags(tags);
					}
					catch (e) {
						warnings++;
					}
				}
				for (let [property, value] of [["dateAdded", row.dateAdded], ["dateModified", row.dateModified]]) {
					let date = new Date(String(value).replace(" ", "T") + "Z");
					if (!isNaN(date.getTime())) item[property] = date.toISOString();
				}
				await item.save();
				importedItems++;
				itemMap.set(row.itemID, item);
				aliases.push({
					sourceLibraryID: row.libraryID,
					sourceGroupID: source.groupIDs.get(row.libraryID) || null,
					sourceKey: row.key,
					destKey: item.key,
				});
				itemsDone++;
				if (itemsDone % 25 === 0
						|| itemsDone + skippedItems === source.items.length) {
					onProgress?.(`Items: ${itemsDone}/${source.items.length}`);
				}
			}

			for (let [itemID, collectionIDs] of source.collectionItemsByItem) {
				let item = itemMap.get(itemID);
				if (!item) continue;
				let mapped = [...new Set(collectionIDs.map(id => collectionMap.get(id)).filter(Boolean))];
				if (!mapped.length) continue;
				item.setCollections([...new Set([...item.getCollections(), ...mapped])]);
				await item.save();
			}

			for (let row of source.items) {
				if (row.libraryID === 1) continue;
				if (source.collectionItemsByItem.has(row.itemID)) continue;
				let item = itemMap.get(row.itemID);
				if (!item) continue;
				let groupRoot = await ensureGroupRoot(row.libraryID);
				item.setCollections([...new Set([...item.getCollections(), groupRoot.id])]);
				await item.save();
			}

			for (let relation of source.relations) {
				if (relation.predicate !== "dc:relation") continue;
				if (skippedSourceIDs.has(relation.itemID)) continue;
				let item = itemMap.get(relation.itemID);
				let targetKey = String(relation.object).split("/items/").pop();
				let targetID = source.itemIDByKey.get(targetKey);
				let target = targetID ? itemMap.get(targetID) : null;
				if (!item || !target) continue;
				item.addRelatedItem(target);
				await item.save();
			}

			let standaloneNotes = source.notes.filter(
				note => !note.parentItemID || !itemMap.has(note.parentItemID)
			);
			if (standaloneNotes.length) {
				let collection = new Zotero.Collection();
				collection.libraryID = 1;
				collection.name = "Imported notes";
				collection.parentID = root.id;
				await collection.save();
				notesCollectionID = collection.id;
				collectionCount++;
			}

			return { itemMap, notesCollectionID };
			});
			itemMap = state.itemMap;
			notesCollectionID = state.notesCollectionID;
			if (onCheckpoint) {
				await onCheckpoint({
					items: Object.fromEntries(
						source.items
							.map(row => [row.key, itemMap.get(row.itemID)?.key])
							.filter(([, key]) => key)
					),
					skippedKeys: source.items
						.filter(row => skippedSourceIDs.has(row.itemID))
						.map(row => row.key),
					notesCollectionID,
					collections: collectionCount,
					itemsImported: importedItems,
					skippedItems,
					aliases,
					duplicates,
				});
			}
		}
		else {
			itemMap = new Map();
			for (let row of source.items) {
				let destKey = resumeState.items?.[row.key];
				if (!destKey) continue;
				let item = await Zotero.Items.getByLibraryAndKeyAsync(1, destKey);
				if (item) itemMap.set(row.itemID, item);
			}
			notesCollectionID = resumeState.notesCollectionID || 0;
			collectionCount = resumeState.collections || 0;
			importedItems = resumeState.itemsImported || itemMap.size;
			skippedItems = resumeState.skippedItems || 0;
			skippedSourceIDs = new Set(
				source.items
					.filter(row => (resumeState.skippedKeys || []).includes(row.key))
					.map(row => row.itemID)
			);
			duplicates = resumeState.duplicates || [];
			aliases = [];
		}

		var notesCount = 0;
		var processedNoteIDs = new Set(
			Array.isArray(resumeState?.notes) ? resumeState.notes : []
		);
		// Checkpoints written before notes were recorded only have the title guard, which
		// cannot tell "already imported" from "another note with the same title". A fresh
		// merge has no earlier children at all, so it must never guess.
		var legacyNoteResume = !!(resumeState && !Array.isArray(resumeState.notes));
		for (let note of source.notes) {
			if (note.parentItemID && skippedSourceIDs.has(note.parentItemID)) {
				skippedNotes++;
				continue;
			}
			if (processedNoteIDs.has(note.itemID)) {
				continue;
			}
			let parent = note.parentItemID ? itemMap.get(note.parentItemID) : null;
			let title = note.title || (parent?.getField("title") || "Note");
			if (legacyNoteResume && parent && this._hasChildAttachment(parent, title, "text/html")) {
				continue;
			}
			let html = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>`
				+ title.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))
				+ `</title></head><body>\n${note.note || ""}\n</body></html>`;
			let file = PathUtils.join(staging, `note-${note.itemID}.html`);
			await IOUtils.writeUTF8(file, html);
			try {
				await Zotero.Attachments.importFromFile({
					file,
					parentItemID: parent ? parent.id : undefined,
					collections: parent ? undefined : [notesCollectionID],
					title,
					contentType: "text/html",
					charset: "UTF-8",
				});
				notesCount++;
				processedNoteIDs.add(note.itemID);
				// Record every note as it lands, and wait for the write: a checkpoint that
				// lags or races would make a resume import the same note twice.
				await onCheckpoint?.({ status: "notes", notes: [...processedNoteIDs] });
			}
			catch (e) {
				Zotero.logError(e);
				warnings++;
			}
			finally {
				await IOUtils.remove(file, { ignoreAbsent: true });
			}
			onProgress?.(`Notes: ${notesCount}/${source.notes.length}`);
		}
		var processedAttachments = 0;
		var attachmentMap = new Map();
		var processedAttachmentIDs = new Set();
		var resumedAttachmentMap = new Map();
		if (resumeState?.attachments && typeof resumeState.attachments === "object") {
			for (let [sourceID, destID] of Object.entries(resumeState.attachments)) {
				resumedAttachmentMap.set(Number(sourceID), destID);
				processedAttachmentIDs.add(Number(sourceID));
			}
		}
		var legacyAttachmentResume = !!(resumeState && !resumeState.attachments);
		for (let attachment of source.attachments) {
			processedAttachments++;
			if (skippedSourceIDs.has(attachment.parentItemID)) {
				skippedAttachments++;
			}
			else if (processedAttachmentIDs.has(attachment.itemID)) {
				// Copied by the interrupted pass; map it so annotations can follow.
				if (resumedAttachmentMap.has(attachment.itemID)) {
					attachmentMap.set(attachment.itemID, resumedAttachmentMap.get(attachment.itemID));
				}
				skippedAttachments++;
			}
			else {
				let parent = itemMap.get(attachment.parentItemID);
				let path = attachment.path;
				let filePath = null;
				if (parent && path && sourcePath) {
					if (path.startsWith("storage:")) {
						filePath = PathUtils.join(
							sourcePath, "storage", attachment.key, path.slice("storage:".length)
						);
					}
					else if (path.startsWith("/")) {
						filePath = path;
					}
				}
				if (!parent || !filePath || !(await IOUtils.exists(filePath))) {
					missingAttachments++;
				}
				else {
					let existingAttachment = this._findChildAttachment(
						parent,
						attachment.title || PathUtils.filename(filePath),
						attachment.contentType
					);
					if (existingAttachment && legacyAttachmentResume) {
						// Old checkpoint: the attachment may predate this run. Map it so its
						// annotations can still follow, and count it as already there.
						attachmentMap.set(attachment.itemID, existingAttachment.id);
						skippedAttachments++;
					}
					else {
						try {
							let options = {
								file: filePath,
								parentItemID: parent.id,
							};
							if (attachment.title) options.title = attachment.title;
							if (attachment.contentType) options.contentType = attachment.contentType;
							let importedAttachment = await Zotero.Attachments.importFromFile(options);
							attachmentMap.set(attachment.itemID, importedAttachment.id);
							processedAttachmentIDs.add(attachment.itemID);
							resumedAttachmentMap.set(attachment.itemID, importedAttachment.id);
							importedAttachments++;
							// Same rule as notes: one record per file, awaited, or a resume
							// duplicates it.
							await onCheckpoint?.({
								status: "attachments",
								attachments: Object.fromEntries(resumedAttachmentMap),
							});
						}
						catch (e) {
							Zotero.logError(e);
							warnings++;
						}
					}
				}
			}
			if (processedAttachments % 10 === 0
					|| processedAttachments === source.attachments.length) {
				onProgress?.(`Attachments: ${processedAttachments}/${source.attachments.length}`);
			}
		}

		var annotationTypes = ["", "highlight", "note", "image", "ink", "underline", "text"];
		for (let annotation of source.annotations) {
			let parentID = attachmentMap.get(annotation.parentItemID);
			let type = annotationTypes[annotation.type];
			let parent = parentID && Zotero.Items.get(parentID);
			if (!parentID || !type || !parent?.attachmentReaderType) {
				skippedAnnotations++;
				continue;
			}
			if (await this._hasAnnotation(
				parentID, type, annotation.text, annotation.position
			)) {
				continue;
			}
			try {
				let item = new Zotero.Item("annotation");
				item.libraryID = 1;
				item.parentID = parentID;
				item.annotationType = type;
				if (annotation.text) item.annotationText = annotation.text;
				if (annotation.comment) item.annotationComment = annotation.comment;
				if (annotation.color) item.annotationColor = annotation.color;
				if (annotation.pageLabel) item.annotationPageLabel = annotation.pageLabel;
				if (annotation.sortIndex) item.annotationSortIndex = annotation.sortIndex;
				if (annotation.position) item.annotationPosition = annotation.position;
				await item.saveTx();
				importedAnnotations++;
			}
			catch (e) {
				Zotero.logError(e);
				warnings++;
			}
		}

		var conditionsBySearch = new Map();
		for (let condition of source.savedSearchConditions) {
			if (!conditionsBySearch.has(condition.savedSearchID)) {
				conditionsBySearch.set(condition.savedSearchID, []);
			}
			conditionsBySearch.get(condition.savedSearchID).push(condition);
		}
		let existingSearches = await Zotero.Searches.getAll(1);
		for (let saved of source.savedSearches) {
			if (existingSearches.some(search => search.name === saved.name)) {
				continue;
			}
			try {
				let search = new Zotero.Search();
				search.libraryID = 1;
				search.name = saved.name;
				for (let condition of conditionsBySearch.get(saved.savedSearchID) || []) {
					search.addCondition(condition.condition, condition.operator, condition.value);
				}
				await search.saveTx();
				importedSearches++;
			}
			catch (e) {
				Zotero.logError(e);
				warnings++;
			}
		}

		return {
			items: importedItems,
			collections: collectionCount,
			notes: notesCount,
			skippedItems,
			skippedNotes,
			attachments: importedAttachments,
			skippedAttachments,
			missingAttachments,
			annotations: importedAnnotations,
			skippedAnnotations,
			savedSearches: importedSearches,
			warnings,
			aliases,
			duplicates,
		};
	},

	_queue: async function (request) {
		if (await IOUtils.exists(this.requestPath)) {
			throw new Error("An import is already staged. Restart CiteWell or cancel it first.");
		}
		await Zotero.File.putContentsAsync(this.requestPath, JSON.stringify(request, null, 2));
	},

	/**
	 * Called from Zotero.init() before the database is opened.
	 *
	 * A restore request wins over an import request; the pane never queues both.
	 */
	applyPending: async function () {
		if (await IOUtils.exists(this.restorePath)) {
			return this._applyRestorePending();
		}

		var request;
		try {
			if (!(await IOUtils.exists(this.requestPath))) return false;
			request = JSON.parse(await Zotero.File.getContentsAsync(this.requestPath));
		}
		catch (e) {
			Zotero.logError(e);
			await this._writeResult({ ok: false, error: `Could not read the import request: ${e}` });
			return false;
		}

		try {
			if (request.version !== 1) throw new Error("Unsupported import request version");
			if (!/^[0-9a-z-]+$/.test(request.id || "")) {
				throw new Error("The import request has an invalid id");
			}
			if (request.dataDir !== this.dataDir) {
				throw new Error(
					`The import was staged for ${request.dataDir}, but CiteWell is using ${this.dataDir}.`
				);
			}
			var expectedRoot = PathUtils.normalize(PathUtils.join(this.dataDir, ".import"));
			if (!(await IOUtils.exists(request.staging))) {
				throw new Error("The staged import is missing");
			}
			if (!PathUtils.normalize(request.staging).startsWith(expectedRoot + "/")) {
				throw new Error("The staged import is outside CiteWell's data directory");
			}

			var mode = request.mode === "replace" ? "replace" : "adopt";
			var state = await this._stateAtPath(PathUtils.join(this.dataDir, "zotero.sqlite"));
			if (mode !== "replace" && !state.empty) {
				throw new Error(
					"CiteWell's library changed after the import was staged. The import was cancelled."
				);
			}
			var sourceSchema = request.counts?.schemaVersion;
			if (sourceSchema && state.schemaVersion && sourceSchema > state.schemaVersion) {
				throw new Error(
					`The source library uses a newer database schema (${sourceSchema}) than this `
					+ `CiteWell build (${state.schemaVersion}). Update CiteWell before importing.`
				);
			}

			var backup = PathUtils.join(this.dataDir, ".import-backup", request.id);
			var identityText = await this._readIdentityText();
			await this._runSidecar([
				"apply",
				"--staging",
				request.staging,
				"--data-dir",
				this.dataDir,
				"--backup",
				backup,
			]);
			await this._copyIdentityInto(backup, identityText);
			await this._writeBackupManifest(backup, {
				version: 1,
				kind: mode,
				id: request.id,
				createdAt: new Date().toISOString(),
				source: request.source,
				sourceCounts: request.counts,
				replacedCounts: state,
			});
			// The newly installed library came from Zotero, so it has no
			// CiteWell identity chain; the old one stays with the backup.
			await IOUtils.remove(this.identityPath, { ignoreAbsent: true });
			this._identityKeys = null;
			this._identityGroups = null;

			await IOUtils.remove(this.requestPath, { ignoreAbsent: true });
			await IOUtils.remove(request.staging, { recursive: true, ignoreAbsent: true });
			await this._writeResult({
				ok: true,
				mode,
				id: request.id,
				source: request.source,
				counts: request.counts,
				previous: request.previous || state,
				sourceHash: request.sourceHash,
				backup,
				finishedAt: new Date().toISOString(),
			});
			Zotero.debug(`Imported Zotero library from ${request.source} (${mode})`);
			return true;
		}
		catch (e) {
			Zotero.logError(e);
			await this._writeResult({
				ok: false,
				id: request?.id || null,
				source: request?.source || null,
				staging: request?.staging || null,
				error: String(e.message || e),
				finishedAt: new Date().toISOString(),
			});
			await IOUtils.remove(this.requestPath, { ignoreAbsent: true });
			return false;
		}
	},

	_applyRestorePending: async function () {
		var request;
		try {
			request = JSON.parse(await Zotero.File.getContentsAsync(this.restorePath));
		}
		catch (e) {
			Zotero.logError(e);
			await this._writeResult({ ok: false, error: `Could not read the restore request: ${e}` });
			return false;
		}

		if (request?.mode === "database") {
			return this._applyDatabaseRestore(request);
		}

		try {
			if (request.version !== 1) throw new Error("Unsupported restore request version");
			if (request.dataDir !== this.dataDir) {
				throw new Error(
					`The restore was staged for ${request.dataDir}, but CiteWell is using ${this.dataDir}.`
				);
			}
			var backupRoot = PathUtils.normalize(PathUtils.join(this.dataDir, ".import-backup"));
			if (!(await IOUtils.exists(request.backup))) {
				throw new Error("The restore point is missing");
			}
			if (!PathUtils.normalize(request.backup).startsWith(backupRoot + "/")) {
				throw new Error("The restore point is outside CiteWell's data directory");
			}
			if (!(await IOUtils.exists(PathUtils.join(request.backup, "zotero.sqlite")))) {
				throw new Error("The restore point has no database");
			}
			if (!(await IOUtils.exists(PathUtils.join(request.backup, "storage")))) {
				// An older request, or one staged against a database-only point:
				// swap the database alone instead of installing an empty storage.
				return this._applyDatabaseRestore({
					version: 1,
					mode: "database",
					backup: PathUtils.join(request.backup, "zotero.sqlite"),
					dataDir: request.dataDir,
					createdAt: request.createdAt,
				});
			}
			// Old restore points may have no storage directory; the helper
			// requires one, and an empty directory is the correct empty state.
			await Zotero.File.createDirectoryIfMissingAsync(
				PathUtils.join(request.backup, "storage")
			);

			var current = await this._stateAtPath(PathUtils.join(this.dataDir, "zotero.sqlite"));
			var currentIdentity = await this._readIdentityText();
			let restoredIdentity = null;
			try {
				restoredIdentity = await Zotero.File.getContentsAsync(
					PathUtils.join(request.backup, "identity", this.IDENTITY_FILENAME)
				);
			}
			catch (e) {}
			var newId = `restore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			var newBackup = PathUtils.join(backupRoot, newId);
			await this._runSidecar([
				"apply",
				"--staging",
				request.backup,
				"--data-dir",
				this.dataDir,
				"--backup",
				newBackup,
			]);
			await this._copyIdentityInto(newBackup, currentIdentity);
			await this._writeBackupManifest(newBackup, {
				version: 1,
				kind: "restore-safety",
				id: newId,
				createdAt: new Date().toISOString(),
				restoredFrom: request.backup,
				replacedCounts: current,
			});
			// Old restore points may not carry an identity snapshot; keep the
			// current chain rather than deleting mappings that may still be
			// needed by documents.
			if (restoredIdentity !== null) {
				await this._writeIdentityText(restoredIdentity);
			}

			// The selected restore point was consumed; its database and storage
			// are now the active library. Remove the leftovers so it is not
			// offered again as a half-empty backup.
			await IOUtils.remove(request.backup, { recursive: true, ignoreAbsent: true });
			await IOUtils.remove(this.restorePath, { ignoreAbsent: true });
			await this._writeResult({
				ok: true,
				mode: "restore",
				restoredFrom: request.backup,
				backup: newBackup,
				counts: current,
				finishedAt: new Date().toISOString(),
			});
			Zotero.debug(`Restored library from ${request.backup}`);
			return true;
		}
		catch (e) {
			Zotero.logError(e);
			await this._writeResult({
				ok: false,
				mode: "restore",
				restoredFrom: request?.backup || null,
				error: String(e.message || e),
				finishedAt: new Date().toISOString(),
			});
			await IOUtils.remove(this.restorePath, { ignoreAbsent: true });
			return false;
		}
	},

	/**
	 * Swap a database snapshot in, before the next database open.
	 *
	 * Attachments and the search index stay where they are; only the database
	 * moves. The current database is kept as a database-only restore point, and
	 * the merge session that owned the snapshot is forgotten so a fresh merge of
	 * the changed source is no longer refused.
	 */
	_applyDatabaseRestore: async function (request) {
		var staging = null;
		try {
			if (request.version !== 1) throw new Error("Unsupported restore request version");
			if (request.dataDir !== this.dataDir) {
				throw new Error(
					`The restore was staged for ${request.dataDir}, but CiteWell is using ${this.dataDir}.`
				);
			}
			var snapshot = this._databaseSnapshotPath(request.backup);
			if (!(await IOUtils.exists(snapshot))) {
				throw new Error("The restore point is missing");
			}
			var dbPath = PathUtils.join(this.dataDir, "zotero.sqlite");
			var current = await this._stateAtPath(dbPath);
			var newId = `restore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			var newBackup = PathUtils.join(this.dataDir, ".import-backup", newId);
			staging = PathUtils.join(this.dataDir, ".import", newId);
			// `.import` may not exist yet, and makeDirectory is the one helper that
			// creates the ancestors.
			await IOUtils.makeDirectory(staging, { createAncestors: true, ignoreExisting: true });
			await IOUtils.copy(snapshot, PathUtils.join(staging, "zotero.sqlite"));
			await this._runSidecar([
				"apply",
				"--staging",
				staging,
				"--data-dir",
				this.dataDir,
				"--backup",
				newBackup,
				"--database-only",
			]);
			await this._writeBackupManifest(newBackup, {
				version: 1,
				kind: "restore-safety",
				databaseOnly: true,
				id: newId,
				createdAt: new Date().toISOString(),
				restoredFrom: snapshot,
				replacedCounts: current,
			});
			await this._removeMergeCheckpointsForBackup(snapshot);
			await IOUtils.remove(this.restorePath, { ignoreAbsent: true });
			await this._writeResult({
				ok: true,
				mode: "restore",
				databaseOnly: true,
				restoredFrom: snapshot,
				backup: newBackup,
				counts: current,
				finishedAt: new Date().toISOString(),
			});
			Zotero.debug(`Restored the library database from ${snapshot}`);
			return true;
		}
		catch (e) {
			Zotero.logError(e);
			// A sidecar killed between moving the old database aside and removing
			// its marker leaves the marker behind. Finish that swap now: otherwise
			// a later apply would restore the pre-merge database on top of this one.
			try {
				await this._runSidecar(["recover", "--data-dir", this.dataDir]);
			}
			catch (recoveryError) {
				Zotero.logError(recoveryError);
			}
			await this._writeResult({
				ok: false,
				mode: "restore",
				databaseOnly: true,
				restoredFrom: request?.backup || null,
				error: String(e.message || e),
				finishedAt: new Date().toISOString(),
			});
			await IOUtils.remove(this.restorePath, { ignoreAbsent: true });
			return false;
		}
		finally {
			if (staging) {
				await IOUtils.remove(staging, { recursive: true, ignoreAbsent: true });
			}
		}
	},

	_writeBackupManifest: async function (backup, manifest) {
		try {
			await Zotero.File.putContentsAsync(
				PathUtils.join(backup, "backup.json"),
				JSON.stringify(manifest, null, 2)
			);
		}
		catch (e) {
			Zotero.logError(e);
		}
	},

	/**
	 * Restore points created by replace, adopt and restore.
	 */
	listBackups: async function () {
		var root = PathUtils.join(this.dataDir, ".import-backup");
		var backups = [];
		if (!(await IOUtils.exists(root))) return backups;

		for (let child of await IOUtils.getChildren(root)) {
			let stat;
			try {
				stat = await IOUtils.stat(child);
			}
			catch {
				continue;
			}
			if (stat.type !== "directory") continue;
			let db = PathUtils.join(child, "zotero.sqlite");
			if (!(await IOUtils.exists(db))) continue;

			let manifest = null;
			try {
				manifest = JSON.parse(
					await Zotero.File.getContentsAsync(PathUtils.join(child, "backup.json"))
				);
			}
			catch {
				// A backup written before manifests existed, or one interrupted
				// before its manifest was written.
			}
			backups.push({
				id: PathUtils.filename(child),
				path: child,
				manifest,
				// The sidecar always gives a full restore point a storage directory,
				// even an empty one; a point without it holds a database only. The
				// property, not the manifest, decides: a crash between the sidecar
				// and the manifest write must not turn a database point into a full
				// one that would swap the attachment tree out.
				databaseOnly: !(await IOUtils.exists(PathUtils.join(child, "storage"))),
				dbSize: (await IOUtils.stat(db)).size,
				storageSize: await this._treeSize(PathUtils.join(child, "storage")),
				createdAt: manifest?.createdAt || stat.lastModified,
			});
		}

		backups.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
		return backups;
	},

	hasPendingRestore: async function () {
		return IOUtils.exists(this.restorePath);
	},

	/**
	 * Queue a restore of one of the backups. The apply hook swaps it in before
	 * the next database open and keeps the current library as a new restore point.
	 */
	queueRestore: async function (backupPath) {
		if (await IOUtils.exists(this.requestPath)) {
			throw new Error("An import is staged; restart or cancel it before restoring.");
		}
		if (await IOUtils.exists(this.restorePath)) {
			throw new Error("A restore is already staged.");
		}
		var root = PathUtils.normalize(PathUtils.join(this.dataDir, ".import-backup"));
		if (!(await IOUtils.exists(backupPath))) {
			throw new Error("That restore point does not exist.");
		}
		if (!PathUtils.normalize(backupPath).startsWith(root + "/")) {
			throw new Error("That is not a CiteWell restore point.");
		}
		if (!(await IOUtils.exists(PathUtils.join(backupPath, "zotero.sqlite")))) {
			throw new Error("That restore point has no database.");
		}
		if (!(await IOUtils.exists(PathUtils.join(backupPath, "storage")))) {
			throw new Error(
				"That restore point holds only a database; restore it with Restore database."
			);
		}
		await Zotero.File.putContentsAsync(
			this.restorePath,
			JSON.stringify({
				version: 1,
				backup: backupPath,
				dataDir: this.dataDir,
				createdAt: new Date().toISOString(),
			}, null, 2)
		);
	},

	cancelRestore: async function () {
		await IOUtils.remove(this.restorePath, { ignoreAbsent: true });
	},

	/**
	 * Append source-to-destination item identities to the sidecar log (D40).
	 *
	 * The log is append-only: a later merge or dedup may add a new link, but
	 * an existing link is never rewritten, so chains remain auditable and a
	 * rollback can still resolve the old keys.
	 */
	_appendIdentity: async function (entries, session) {
		if (!entries?.length) return;
		await Zotero.File.createDirectoryIfMissingAsync(this.identityDir);
		var existing = "";
		if (await IOUtils.exists(this.identityPath)) {
			existing = await Zotero.File.getContentsAsync(this.identityPath);
		}
		var createdAt = new Date().toISOString();
		var lines = entries.map(entry => JSON.stringify({
			v: 1,
			session,
			createdAt,
			sourceLibraryID: entry.sourceLibraryID,
			sourceGroupID: entry.sourceGroupID || null,
			sourceKey: entry.sourceKey,
			destKey: entry.destKey,
		}));
		if (existing && !existing.endsWith("\n")) existing += "\n";
		await Zotero.File.putContentsAsync(
			this.identityPath,
			existing + lines.join("\n") + "\n"
		);
		this._identityKeys = null;
		this._identityGroups = null;
	},

	_loadIdentity: async function () {
		if (this._identityKeys) return;
		this._identityKeys = new Map();
		this._identityGroups = new Map();
		if (!(await IOUtils.exists(this.identityPath))) return;
		var text = await Zotero.File.getContentsAsync(this.identityPath);
		for (let line of text.split("\n")) {
			if (!line.trim()) continue;
			let entry;
			try {
				entry = JSON.parse(line);
			}
			catch (e) {
				Zotero.logError(e);
				continue;
			}
			if (!entry?.sourceKey || !entry?.destKey) continue;
			if (entry.sourceGroupID) {
				this._identityGroups.set(
					`${entry.sourceGroupID}/${entry.sourceKey}`,
					entry.destKey
				);
			}
			else {
				this._identityKeys.set(entry.sourceKey, entry.destKey);
			}
		}
	},

	_resolveIdentityKey: function (key, groupID) {
		var seen = new Set();
		for (let i = 0; i < 32; i++) {
			let id = groupID ? `${groupID}/${key}` : key;
			if (seen.has(id)) return null;
			seen.add(id);
			let next = groupID
				? this._identityGroups.get(id)
				: this._identityKeys.get(id);
			if (!next || next === key) break;
			key = next;
			groupID = null;
		}
		return key;
	},

	/**
	 * Resolve citation URIs through the alias chain. The integration calls
	 * this only after an exact URI lookup has failed.
	 *
	 * @param {String[]} uris
	 * @return {Promise<Zotero.Item|false>}
	 */
	getItemForURIs: async function (uris) {
		await this._loadIdentity();
		for (let uri of uris || []) {
			let match = /\/items\/([A-Za-z0-9]+)/.exec(uri);
			if (!match) continue;
			let groupMatch = /\/groups\/(\d+)\/items\//.exec(uri);
			let key = this._resolveIdentityKey(
				match[1],
				groupMatch ? groupMatch[1] : null
			);
			if (!key) continue;
			let item = await Zotero.Items.getByLibraryAndKeyAsync(1, key);
			if (item && !item.deleted) return item;
			// The alias target may itself have been merged into a master item.
			// Follow Zotero's dc:replaces relation from the trashed target.
			if (item?.deleted) {
				let targetURI = Zotero.URI.getItemURI(item);
				let replacer = await Zotero.Relations.getByPredicateAndObject(
					'item', Zotero.Relations.replacedItemPredicate, targetURI
				);
				if (replacer.length && !replacer[0].deleted) return replacer[0];
			}
		}
		return false;
	},

	/**
	 * Group existing library items that Zotero's duplicate detector puts in
	 * the same set. This is a review aid only: it never changes an item.
	 *
	 * @return {Promise<{groups: Object[], itemCount: Number}>}
	 */
	findLibraryDuplicates: async function () {
		var duplicates = new Zotero.Duplicates(1);
		await duplicates._findDuplicates();
		var ids = duplicates._sets.findAll(true) || [];
		var seen = new Set();
		var groups = [];
		for (let id of ids) {
			id = Number(id);
			if (seen.has(id)) continue;
			let setIDs = (duplicates.getSetItemsByItemID(id) || [])
				.map(Number)
				.filter(itemID => !seen.has(itemID));
			if (setIDs.length < 2) continue;
			let items = [];
			for (let itemID of setIDs) {
				seen.add(itemID);
				let item = Zotero.Items.get(itemID);
				if (!item || item.deleted) continue;
				let field = (name) => {
					try {
						return item.getField(name) || null;
					}
					catch (e) {
						return null;
					}
				};
				items.push({
					id: itemID,
					key: item.key,
					itemType: Zotero.ItemTypes.getName(item.itemTypeID),
					title: field("title"),
					date: field("date"),
					DOI: field("DOI"),
					ISBN: field("ISBN"),
				});
			}
			if (items.length > 1) groups.push({ items });
		}
		return {
			groups,
			itemCount: groups.reduce((total, group) => total + group.items.length, 0),
		};
	},

	writeLibraryDuplicateReport: async function (result) {
		await Zotero.File.createDirectoryIfMissingAsync(this.identityDir);
		var path = PathUtils.join(
			this.identityDir,
			`library-duplicates-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
		);
		await Zotero.File.putContentsAsync(path, JSON.stringify({
			version: 1,
			createdAt: new Date().toISOString(),
			itemCount: result.itemCount,
			groups: result.groups,
		}, null, 2));
		return path;
	},

	/**
	 * Find a library item for a citation's embedded CSL data.
	 *
	 * DOI/ISBN/PMID are exact matches; a normalized title (optionally with
	 * the citation year) is the fallback. Anything with more than one match is
	 * reported as ambiguous and is never changed automatically.
	 *
	 * @param {Object} itemData CSL item data embedded in a citation
	 * @return {Promise<{item: Zotero.Item|null, ambiguous: Zotero.Item[], by: String|null}>}
	 */
	findCitationMatches: async function (itemData, { allowedItemIDs = null } = {}) {
		if (!itemData) return { item: null, ambiguous: [], by: null };
		var query = async (field, value) => {
			if (!value) return [];
			let ids = await Zotero.DB.columnQueryAsync(
				`SELECT DISTINCT i.itemID FROM items i
				 JOIN itemData d ON d.itemID = i.itemID
				 JOIN fields f ON f.fieldID = d.fieldID
				 JOIN itemDataValues v ON v.valueID = d.valueID
				 WHERE i.libraryID = 1
				 AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
				 AND f.fieldName = ? AND LOWER(v.value) = LOWER(?)`,
				[field, String(value).trim()]
			);
			if (allowedItemIDs) {
				ids = ids.filter(id => allowedItemIDs.has(Number(id)));
			}
			return (ids || []).map(id => Zotero.Items.get(id)).filter(Boolean);
		};

		var doi = itemData.DOI && String(itemData.DOI)
			.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
		var isbn = itemData.ISBN && String(itemData.ISBN).replace(/[^0-9Xx]/g, "");
		var pmid = itemData.PMID && String(itemData.PMID).trim();

		for (let [field, value, by] of [
			["DOI", doi, "DOI"],
			["ISBN", isbn, "ISBN"],
			["PMID", pmid, "PMID"],
		]) {
			if (!value) continue;
			let matches = await query(field, value);
			if (matches.length === 1) return { item: matches[0], ambiguous: [], by };
			if (matches.length > 1) return { item: null, ambiguous: matches, by };
		}

		var title = itemData.title && String(itemData.title)
			.replace(/\s+/g, " ").trim().toLowerCase();
		if (title) {
			let matches = await query("title", title);
			let year = itemData.issued?.["date-parts"]?.[0]?.[0];
			if (year) {
				matches = matches.filter(item =>
					String(item.getField("date") || "").includes(String(year))
				);
			}
			if (matches.length === 1) return { item: matches[0], ambiguous: [], by: "title" };
			if (matches.length > 1) return { item: null, ambiguous: matches, by: "title" };
		}
		return { item: null, ambiguous: [], by: null };
	},

	/**
	 * Import one embedded citation as a library item, keeping the source key
	 * when it is free so the document URI starts resolving exactly.
	 */
	importCitationItem: async function (itemData, uris) {
		var key = this._citationURIKey(uris);
		var item = new Zotero.Item();
		item.libraryID = 1;
		if (key) {
			let taken = await Zotero.DB.valueQueryAsync(
				"SELECT itemID FROM items WHERE libraryID=1 AND key=?", key
			);
			if (!taken) item._key = key;
		}
		Zotero.Utilities.Item.itemFromCSLJSON(item, itemData);
		await item.saveTx();
		return item;
	},

	_citationDataForSourceItem: function (source, row) {
		let fields = new Map(
			(source.fieldsByItem.get(row.itemID) || []).map(field => [field.name, field.value])
		);
		let date = fields.get("date");
		let year = date && String(date).match(/\d{4}/)?.[0];
		return {
			DOI: fields.get("DOI"),
			ISBN: fields.get("ISBN"),
			PMID: fields.get("PMID"),
			title: fields.get("title"),
			issued: year ? { "date-parts": [[year]] } : null,
		};
	},

	_citationDataForItem: function (item) {
		let field = (name) => {
			try {
				return item.getField(name) || null;
			}
			catch (e) {
				return null;
			}
		};
		let date = field("date");
		let year = date && String(date).match(/\d{4}/)?.[0];
		return {
			DOI: field("DOI"),
			ISBN: field("ISBN"),
			PMID: field("PMID"),
			title: field("title"),
			issued: year ? { "date-parts": [[year]] } : null,
		};
	},

	_citationURIKey: function (uris) {
		for (let uri of uris || []) {
			let match = /\/items\/([A-Za-z0-9]+)/.exec(uri);
			if (match) return match[1];
		}
		return null;
	},

	_citationURIKeyAndGroup: function (uris) {
		for (let uri of uris || []) {
			let match = /\/items\/([A-Za-z0-9]+)/.exec(uri);
			if (!match) continue;
			let group = /\/groups\/(\d+)\/items\//.exec(uri);
			return { key: match[1], groupID: group ? group[1] : null };
		}
		return null;
	},

	/**
	 * Record that an old document URI now belongs to a library item.
	 */
	recordCitationAlias: async function (uris, item) {
		var parsed = this._citationURIKeyAndGroup(uris);
		if (!parsed || !item) return false;
		await this._appendIdentity([{
			sourceLibraryID: parsed.groupID ? null : 1,
			sourceGroupID: parsed.groupID,
			sourceKey: parsed.key,
			destKey: item.key,
		}], `document-relink-${Date.now()}`);
		return true;
	},

	_checkpointPath: function (id) {
		return PathUtils.join(this.mergeSessionsDir, `${id}.json`);
	},

	_findIncompleteMerge: async function (sourcePath, sourceHash) {
		if (!(await IOUtils.exists(this.mergeSessionsDir))) return null;
		var source = String(sourcePath).replace(/\/+$/, "");
		var found = [];
		for (let path of await IOUtils.getChildren(this.mergeSessionsDir)) {
			let data;
			try {
				data = JSON.parse(await Zotero.File.getContentsAsync(path));
			}
			catch (e) {
				continue;
			}
			if (data.status === "done" || data.sourceHash !== sourceHash) continue;
			if (String(data.source || "").replace(/\/+$/, "") !== source) continue;
			found.push(data);
		}
		found.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
		return found[0] || null;
	},

	/**
	 * An interrupted merge of the same source whose checkpoint no longer matches
	 * the source's current hash, newest first.
	 *
	 * `_findIncompleteMerge` only returns a checkpoint that can be resumed. This
	 * finds the ones that cannot, so a retry is refused instead of silently
	 * merging the whole source again on top of the partial result.
	 */
	_findStaleMerge: async function (sourcePath, sourceHash) {
		if (!(await IOUtils.exists(this.mergeSessionsDir))) return null;
		var source = String(sourcePath).replace(/\/+$/, "");
		var found = [];
		for (let path of await IOUtils.getChildren(this.mergeSessionsDir)) {
			let data;
			try {
				data = JSON.parse(await Zotero.File.getContentsAsync(path));
			}
			catch (e) {
				continue;
			}
			if (!data || data.status === "done") continue;
			if (!data.sourceHash || data.sourceHash === sourceHash) continue;
			if (String(data.source || "").replace(/\/+$/, "") !== source) continue;
			found.push(data);
		}
		found.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
		return found[0] || null;
	},

	_staleMergeError: function (checkpoint, currentHash) {
		var when = checkpoint.createdAt
			? new Date(checkpoint.createdAt).toLocaleString()
			: checkpoint.id;
		var error = new Error(
			`A merge of this Zotero library was interrupted on ${when}, and the library `
				+ "has changed since then. Merging it again would duplicate what was already "
				+ "imported. Restore CiteWell to its state before that merge, then merge again."
				+ (checkpoint.backup ? ` Restore point: ${checkpoint.backup}` : "")
		);
		error.staleMerge = {
			id: checkpoint.id,
			source: checkpoint.source,
			sourceHash: checkpoint.sourceHash,
			currentHash,
			backup: checkpoint.backup || null,
			createdAt: checkpoint.createdAt || null,
			status: checkpoint.status || null,
			itemsImported: checkpoint.itemsImported || 0,
			collections: checkpoint.collections || 0,
		};
		return error;
	},

	/**
	 * Resolve a database snapshot that may be restored on its own.
	 *
	 * Two shapes qualify: a merge backup beside the active database
	 * (`zotero.sqlite.<session>.bak`) and a database-only restore point inside
	 * `.import-backup/`. A full restore point directory goes through
	 * `queueRestore()` instead, because it also owns an attachment tree.
	 */
	_databaseSnapshotPath: function (path, dataDir = this.dataDir) {
		var root = PathUtils.normalize(String(dataDir)).replace(/\/+$/, "");
		var normalized = PathUtils.normalize(String(path));
		if (!normalized.startsWith(root + "/")) {
			throw new Error("That is not a CiteWell restore point.");
		}
		var relative = normalized.slice(root.length + 1);
		if (!/^zotero\.sqlite\.[A-Za-z0-9._-]+\.bak$/.test(relative)
				&& !/^\.import-backup\/[^/]+\/zotero\.sqlite$/.test(relative)) {
			throw new Error("That is not a CiteWell database snapshot.");
		}
		return normalized;
	},

	/**
	 * Stage a database-only restore. It runs before the next database open and
	 * keeps the current database as a restore point; attachments stay in place.
	 */
	queueDatabaseRestore: async function (snapshotPath) {
		if (await IOUtils.exists(this.requestPath)) {
			throw new Error("An import is staged; restart or cancel it before restoring.");
		}
		if (await IOUtils.exists(this.restorePath)) {
			throw new Error("A restore is already staged.");
		}
		var snapshot = this._databaseSnapshotPath(snapshotPath);
		if (!(await IOUtils.exists(snapshot))) {
			throw new Error("That restore point does not exist.");
		}
		await Zotero.File.putContentsAsync(
			this.restorePath,
			JSON.stringify({
				version: 1,
				mode: "database",
				backup: snapshot,
				dataDir: this.dataDir,
				createdAt: new Date().toISOString(),
			}, null, 2)
		);
	},

	/**
	 * Forget the merge sessions whose restore point is the snapshot being
	 * restored: their partial import is gone, so a fresh merge may proceed.
	 */
	_removeMergeCheckpointsForBackup: async function (snapshotPath) {
		if (!(await IOUtils.exists(this.mergeSessionsDir))) return 0;
		var target = PathUtils.normalize(String(snapshotPath));
		var removed = 0;
		for (let path of await IOUtils.getChildren(this.mergeSessionsDir)) {
			let data;
			try {
				data = JSON.parse(await Zotero.File.getContentsAsync(path));
			}
			catch (e) {
				continue;
			}
			if (!data?.backup) continue;
			let backup;
			try {
				backup = PathUtils.normalize(String(data.backup));
			}
			catch (e) {
				continue;
			}
			if (backup !== target) continue;
			await IOUtils.remove(path, { ignoreAbsent: true });
			removed++;
		}
		return removed;
	},

	_writeMergeCheckpoint: async function (id, data) {
		await Zotero.File.createDirectoryIfMissingAsync(this.mergeSessionsDir);
		// putContentsAsync writes through OS.File.writeAtomic, so a crash leaves either the
		// previous checkpoint or the new one; a half-written file would be skipped by
		// _findIncompleteMerge and silently start a second full merge.
		await Zotero.File.putContentsAsync(
			this._checkpointPath(id),
			JSON.stringify({ version: 1, id, ...data }, null, 2)
		);
	},

	_removeMergeCheckpoint: async function (id) {
		await IOUtils.remove(this._checkpointPath(id), { ignoreAbsent: true });
	},

	_findChildAttachment: function (parent, title, contentType) {
		if (!parent || !title) return null;
		for (let id of parent.getAttachments()) {
			let item = Zotero.Items.get(id);
			if (!item) continue;
			let itemTitle;
			try {
				itemTitle = item.getField("title");
			}
			catch (e) {
				continue;
			}
			if (itemTitle === title
					&& (!contentType || item.attachmentContentType === contentType)) {
				return item;
			}
		}
		return null;
	},

	_hasChildAttachment: function (parent, title, contentType) {
		return !!this._findChildAttachment(parent, title, contentType);
	},

	_hasAnnotation: async function (parentID, type, text, position) {
		let rows = await Zotero.DB.queryAsync(
			"SELECT itemID FROM itemAnnotations WHERE parentItemID=? AND type=?",
			[parentID, Zotero.Annotations[`ANNOTATION_TYPE_${type.toUpperCase()}`]]
		);
		for (let row of rows || []) {
			let item = Zotero.Items.get(row.itemID);
			if (!item) continue;
			if ((item.annotationText || "") === (text || "")
					&& (item.annotationPosition || "") === (position || "")) {
				return true;
			}
		}
		return false;
	},

	_readIdentityText: async function () {
		try {
			return await Zotero.File.getContentsAsync(this.identityPath);
		}
		catch (e) {
			return null;
		}
	},

	_writeIdentityText: async function (text) {
		if (text === null || text === undefined) return;
		await Zotero.File.createDirectoryIfMissingAsync(this.identityDir);
		await Zotero.File.putContentsAsync(this.identityPath, text);
		this._identityKeys = null;
		this._identityGroups = null;
	},

	_copyIdentityInto: async function (directory, text) {
		if (text === null || text === undefined) return;
		let dir = PathUtils.join(directory, "identity");
		await Zotero.File.createDirectoryIfMissingAsync(dir);
		await Zotero.File.putContentsAsync(
			PathUtils.join(dir, this.IDENTITY_FILENAME),
			text
		);
	},

	getLocations: function () {
		var dataDir = this.dataDir;
		return [
			{ label: "Library", path: dataDir },
			{ label: "Database", path: PathUtils.join(dataDir, "zotero.sqlite") },
			{ label: "Attachments", path: PathUtils.join(dataDir, "storage") },
			{ label: "Search index", path: PathUtils.join(dataDir, "fulltext.sqlite") },
			{ label: "Settings and profile", path: this.profileDir },
			{ label: "Agent token", path: PathUtils.join(dataDir, "agent-token") },
			{ label: "Agent audit log", path: PathUtils.join(dataDir, "agent-actions.log") },
			{ label: "Logs", path: PathUtils.join(dataDir, "logs") },
			{ label: "Import staging", path: PathUtils.join(dataDir, ".import") },
			{ label: "Import backups", path: PathUtils.join(dataDir, ".import-backup") },
		];
	},

	hasPendingRequest: async function () {
		return IOUtils.exists(this.requestPath);
	},

	readResult: async function () {
		if (!(await IOUtils.exists(this.resultPath))) return null;
		try {
			return JSON.parse(await Zotero.File.getContentsAsync(this.resultPath));
		}
		catch (e) {
			Zotero.logError(e);
			return null;
		}
	},

	_writeResult: async function (result) {
		try {
			await Zotero.File.putContentsAsync(this.resultPath, JSON.stringify(result, null, 2));
		}
		catch (e) {
			Zotero.logError(e);
		}
	},

	/**
	 * Drop a staged request and its staging directory. Never touches the source.
	 */
	cancel: async function () {
		if (await IOUtils.exists(this.requestPath)) {
			var request = null;
			try {
				request = JSON.parse(await Zotero.File.getContentsAsync(this.requestPath));
			}
			catch {}
			await IOUtils.remove(this.requestPath, { ignoreAbsent: true });
			if (request?.staging) {
				await IOUtils.remove(request.staging, { recursive: true, ignoreAbsent: true });
			}
		}
	},

	getSidecarPath: async function () {
		var override = Services.env.get("CITEWELL_IMPORT_BIN");
		if (override) {
			if (await IOUtils.exists(override)) return override;
			throw new Error(`CITEWELL_IMPORT_BIN does not exist: ${override}`);
		}

		var appDir = Services.dirsvc.get("XREExeF", Ci.nsIFile).parent.path;
		// In a source build the app lives at app/staging/Zotero_linux-x86_64,
		// so three parents up is the repository root. In the AppImage the bundle
		// carries the helper next to the executable.
		var repoDir = appDir;
		for (var i = 0; i < 3; i++) {
			repoDir = PathUtils.parent(repoDir);
		}
		var candidates = [
			PathUtils.join(appDir, "citewell-import"),
			PathUtils.join(repoDir, "tools", "target", "release", "citewell-import"),
			PathUtils.join(repoDir, "tools", "target", "debug", "citewell-import"),
		];
		for (var candidate of candidates) {
			if (await IOUtils.exists(candidate)) return candidate;
		}
		throw new Error(
			"The citewell-import helper was not found. Build it with "
			+ "`cargo build -p citewell-import` or rebuild the AppImage."
		);
	},

	_runSidecar: async function (args, onProgress = null) {
		var command = await this.getSidecarPath();
		Zotero.debug(`Running ${command} ${args.join(" ")}`);
		var proc = await Subprocess.call({
			command,
			arguments: args,
			stderr: "pipe",
		});

		var stdout = "";
		var stderr = "";
		var buffer = "";
		var read = async (stream, append) => {
			var chunk;
			while ((chunk = await stream.readString())) {
				append(chunk);
				if (onProgress && stream === proc.stdout) {
					buffer += chunk;
					var lines = buffer.split(/\r?\n/);
					buffer = lines.pop();
					for (var line of lines) {
						if (line) onProgress(line);
					}
				}
			}
		};
		await Promise.all([
			read(proc.stdout, (chunk) => {
				stdout += chunk;
			}),
			read(proc.stderr, (chunk) => {
				stderr += chunk;
			}),
		]);
		if (buffer && onProgress) onProgress(buffer);

		var { exitCode } = await proc.wait();
		if (exitCode !== 0) {
			throw new Error(stderr.trim() || stdout.trim() || `citewell-import exited ${exitCode}`);
		}
		return stdout;
	},

	formatBytes: function (bytes) {
		if (!bytes) return "0 B";
		var units = ["B", "KB", "MB", "GB", "TB"];
		var index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		var value = bytes / Math.pow(1024, index);
		return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
	},

	_treeSize: async function (path) {
		var total = 0;
		var visit = async (dir) => {
			var entries;
			try {
				entries = await IOUtils.getChildren(dir);
			}
			catch {
				return;
			}
			for (let entry of entries) {
				try {
					var stat = await IOUtils.stat(entry);
					if (stat.type === "directory") {
						await visit(entry);
					}
					else {
						total += stat.size || 0;
					}
				}
				catch {}
			}
		};
		await visit(path);
		return total;
	},
};
