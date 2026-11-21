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
	RESULT_FILENAME: "library-import-result.json",
	APPLY_MARKER: ".import-apply-in-progress",

	get dataDir() {
		return Zotero.DataDirectory.dir;
	},

	get profileDir() {
		return Zotero.Profile.dir;
	},

	get requestPath() {
		return PathUtils.join(this.profileDir, this.REQUEST_FILENAME);
	},

	get resultPath() {
		return PathUtils.join(this.profileDir, this.RESULT_FILENAME);
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
		var collections = await value("SELECT COUNT(*) FROM collections");
		var savedSearches = await value("SELECT COUNT(*) FROM savedSearches");
		var schemaVersion = await value("SELECT version FROM version WHERE schema='userdata'");
		var dbPath = Zotero.DataDirectory.getDatabase();
		var info = {
			path: this.dataDir,
			dbPath,
			items,
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
			return { empty: true, schemaVersion: null };
		}
		var db = new Zotero.DBConnection(dbPath);
		try {
			var items = Number(await db.valueQueryAsync("SELECT COUNT(*) FROM items"));
			var collections = Number(await db.valueQueryAsync("SELECT COUNT(*) FROM collections"));
			var savedSearches = Number(await db.valueQueryAsync("SELECT COUNT(*) FROM savedSearches"));
			var schema = await db.valueQueryAsync("SELECT version FROM version WHERE schema='userdata'");
			return {
				empty: items === 0 && collections === 0 && savedSearches === 0,
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
	stage: async function (sourcePath, { counts = null, onProgress = null } = {}) {
		var current = await this.getCurrentLibraryInfo();
		if (!current.empty) {
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
				source: sourcePath,
				staging,
				dataDir: this.dataDir,
				createdAt: new Date().toISOString(),
				sourceHash: hashBefore,
				counts: counts || await this.inspect(sourcePath),
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

	_queue: async function (request) {
		if (await IOUtils.exists(this.requestPath)) {
			throw new Error("An import is already staged. Restart CiteWell or cancel it first.");
		}
		await Zotero.File.putContentsAsync(this.requestPath, JSON.stringify(request, null, 2));
	},

	/**
	 * Called from Zotero.init() before the database is opened.
	 */
	applyPending: async function () {
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
			var expectedRoot = PathUtils.join(this.dataDir, ".import");
			if (!PathUtils.normalize(request.staging).startsWith(expectedRoot + "/")) {
				throw new Error("The staged import is outside CiteWell's data directory");
			}
			if (!(await IOUtils.exists(request.staging))) {
				throw new Error("The staged import is missing");
			}

			var state = await this._stateAtPath(PathUtils.join(this.dataDir, "zotero.sqlite"));
			if (!state.empty) {
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
			await this._runSidecar([
				"apply",
				"--staging",
				request.staging,
				"--data-dir",
				this.dataDir,
				"--backup",
				backup,
			]);

			await IOUtils.remove(this.requestPath, { ignoreAbsent: true });
			await IOUtils.remove(request.staging, { recursive: true, ignoreAbsent: true });
			await this._writeResult({
				ok: true,
				id: request.id,
				source: request.source,
				counts: request.counts,
				sourceHash: request.sourceHash,
				backup,
				finishedAt: new Date().toISOString(),
			});
			Zotero.debug(`Imported Zotero library from ${request.source}`);
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
