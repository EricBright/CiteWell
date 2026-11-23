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

/* global Zotero_Preferences */

var { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");

Zotero_Preferences.Library = {
	_candidates: [],
	_selected: null,
	_inspected: null,
	_current: null,
	_busy: false,
	_checkSerial: 0,
	_pendingImport: false,
	_pendingRestore: false,
	_initialized: false,

	init: async function () {
		if (this._initialized) return;
		this._initialized = true;

		await this._refreshCurrent();
		this._renderLocations();
		if (Zotero_Preferences.Locate) {
			Zotero_Preferences.Locate.init();
		}
		if (Zotero_Preferences.Files) {
			await Zotero_Preferences.Files.init();
		}
	},

	uninit: function () {
		this._initialized = false;
	},

	_refreshAnnotationExport: async function () {
		let count = 0;
		try {
			count = await Zotero.Notes.countAnnotatedAttachments();
		}
		catch (e) {
			Zotero.logError(e);
			this._el("library-annotations-status").textContent
				= `Could not count annotations: ${e.message || e}`;
			this._el("library-annotations-export").disabled = true;
			return;
		}
		this._el("library-annotations-export").disabled = !count;
		this._el("library-annotations-status").textContent = count
			? `${count} attachment${count === 1 ? "" : "s"} with stored annotations.`
			: "No stored PDF annotations remain.";
	},

	exportAnnotations: async function () {
		let count = 0;
		try {
			count = await Zotero.Notes.countAnnotatedAttachments();
		}
		catch (e) {
			this._setStatus(`Could not count annotations: ${e.message || e}`, true);
			return;
		}
		if (!count) return;

		let message = `Export annotations for ${count} attachment${count === 1 ? "" : "s"} `
			+ "to annotations.md? Existing sidecars are skipped.";
		if (!Services.prompt.confirm(null, "Export annotations", message)) {
			return;
		}
		this._el("library-annotations-export").disabled = true;
		this._el("library-annotations-status").textContent = "Exporting…";
		try {
			let result = await Zotero.Notes.exportAnnotationSidecars({
				onProgress: ({ index, total, title }) => {
					this._el("library-annotations-status").textContent
						= `Exporting ${index + 1} of ${total}: ${title}`;
				}
			});
			this._el("library-annotations-status").textContent
				= `${result.written} written; ${result.skipped} existing skipped; `
				+ `${result.failed.length} failed.`;
			if (result.failed.length) {
				this._setStatus(`Annotation export failures: ${result.failed[0].error}`, true);
			}
		}
		catch (e) {
			Zotero.logError(e);
			this._setStatus(`Annotation export failed: ${e.message || e}`, true);
		}
		finally {
			await this._refreshAnnotationExport();
		}
	},

	_refreshNoteMigration: async function () {
		let count = 0;
		try {
			count = await Zotero.Notes.countLegacyNotes();
		}
		catch (e) {
			Zotero.logError(e);
			this._el("library-notes-status").textContent
				= `Could not count legacy notes: ${e.message || e}`;
			this._el("library-notes-migrate").disabled = true;
			return;
		}
		this._el("library-notes-migrate").disabled = !count;
		if (count) {
			this._el("library-notes-status").textContent
				= `${count} legacy note${count === 1 ? "" : "s"} still stored in the database.`;
		}
		else {
			this._el("library-notes-status").textContent
				= "No legacy database notes remain.";
		}
	},

	migrateNotes: async function () {
		let count = 0;
		try {
			count = await Zotero.Notes.countLegacyNotes();
		}
		catch (e) {
			this._setStatus(`Could not count legacy notes: ${e.message || e}`, true);
			return;
		}
		if (!count) return;

		let message = `${count} note${count === 1 ? "" : "s"} will be converted to Markdown `
			+ `file${count === 1 ? "" : "s"}. The database is backed up first. Each old note `
			+ `moves to Trash only after its file is verified. Continue?`;
		if (!Services.prompt.confirm(null, "Migrate notes", message)) {
			return;
		}

		this._el("library-notes-migrate").disabled = true;
		this._el("library-notes-progress").hidden = false;
		this._el("library-notes-progress").value = 0;
		this._el("library-notes-progress").max = count;
		this._el("library-notes-status").textContent = "Starting…";

		try {
			let result = await Zotero.Notes.migrateLegacyNotes({
				onProgress: ({ index, total, title }) => {
					this._el("library-notes-progress").value = index;
					this._el("library-notes-progress").max = total;
					this._el("library-notes-status").textContent
						= `Converting ${index + 1} of ${total}: ${title}`;
				}
			});
			this._el("library-notes-progress").value = result.migrated;
			let failed = result.failed.length;
			this._el("library-notes-status").textContent
				= `${result.migrated} converted; ${failed} failed`
				+ (result.backup ? "; database backed up." : "; backup skipped in test mode.");
			if (failed) {
				let details = result.failed.slice(0, 3)
					.map(item => `${item.title || item.key}: ${item.error}`)
					.join(" · ");
				this._setStatus(`Migration failures — ${details}`, true);
			}
		}
		catch (e) {
			Zotero.logError(e);
			this._setStatus(`Note migration failed: ${e.message || e}`, true);
		}
		finally {
			this._el("library-notes-progress").hidden = true;
			await this._refreshNoteMigration();
		}
	},

	_el: function (id) {
		return document.getElementById(id);
	},

	_refreshCurrent: async function () {
		try {
			this._current = await Zotero.LibraryImport.getCurrentLibraryInfo();
		}
		catch (e) {
			Zotero.logError(e);
			this._current = { path: Zotero.DataDirectory.dir, empty: false, items: null };
		}

		var currentPath = this._el("library-current-path");
		var currentStatus = this._el("library-current-status");
		var importButton = this._el("library-import");
		var replace = this._el("library-replace");
		var merge = this._el("library-merge");
		if (currentPath) currentPath.textContent = this._current.path;
		if (importButton) importButton.hidden = !this._current.empty;
		if (replace) replace.hidden = this._current.empty;
		if (merge) merge.hidden = this._current.empty;
		if (currentStatus) {
			if (this._current.empty) {
				currentStatus.textContent = "Empty — ready for a first import.";
			}
			else {
				currentStatus.textContent = `${this._plural(this._current.regularItems ?? this._current.items, "item", "items")}, `
					+ `${this._plural(this._current.collections, "collection", "collections")}, `
					+ `${this._plural(this._current.savedSearches, "saved search", "saved searches")}.`;
			}
		}
		var target = this._el("library-import-target");
		if (target) {
			if (this._current.empty) {
				target.textContent = "The CiteWell library is empty. Import will build it from the "
					+ "selected library.";
			}
			else {
				target.textContent = `Adding to the current CiteWell library: `
					+ `${this._plural(this._current.regularItems ?? this._current.items, "item", "items")}, `
					+ `${this._plural(this._current.collections, "collection", "collections")}. `
					+ "Merge adds to it; Replace swaps it for the selected library and keeps the "
					+ "previous one as a restore point.";
			}
		}
		this.updateButtons();
	},

	_renderLocations: function () {
		var container = this._el("library-locations");
		container.textContent = "";

		for (let location of Zotero.LibraryImport.getLocations()) {
			var row = document.createXULElement("hbox");
			row.className = "library-location-row";

			var label = document.createXULElement("label");
			label.className = "library-location-label";
			label.value = location.label;

			var path = document.createXULElement("description");
			path.className = "library-path";
			path.setAttribute("flex", "1");
			path.textContent = location.path;

			var open = document.createXULElement("button");
			open.setAttribute("label", "Open");
			open.addEventListener("command", () => this._reveal(location.path));

			var copy = document.createXULElement("button");
			copy.setAttribute("label", "Copy");
			copy.addEventListener("command", () => this._copy(location.path));

			row.append(label, path, open, copy);
			container.append(row);
		}
	},

	_reveal: async function (path) {
		try {
			await Zotero.File.reveal(path);
		}
		catch (e) {
			this._setStatus(`Could not open ${path}: ${e.message || e}`, true);
		}
	},

	_copy: function (path) {
		try {
			Zotero.Utilities.Internal.copyTextToClipboard(path);
			this._setStatus("Path copied.");
		}
		catch (e) {
			this._setStatus(`Could not copy the path: ${e.message || e}`, true);
		}
	},

	openLibrary: async function () {
		await this._reveal(this._current.path);
	},

	moveLibrary: async function () {
		try {
			await Zotero.DataDirectory.choose(true);
		}
		catch (e) {
			this._setStatus(`Could not move the library: ${e.message || e}`, true);
			return;
		}
		await this._refreshCurrent();
		this._renderLocations();
	},

	rescan: async function () {
		if (this._busy) return;
		this._busy = true;
		this._disable(true);
		this._setStatus("Looking for Zotero libraries…");
		this._el("library-progress").hidden = true;

		try {
			this._candidates = await Zotero.LibraryImport.detectSources();
			this._renderCandidates();
		}
		catch (e) {
			Zotero.logError(e);
			this._setStatus(`Could not search for Zotero libraries: ${e.message || e}`, true);
		}
		finally {
			this._busy = false;
			this._disable(false);
			await this._refreshPending();
		}
	},

	_renderCandidates: function () {
		var group = this._el("library-candidates");
		var warning = this._el("library-candidate-warning");
		var summary = this._el("library-candidate-summary");
		group.textContent = "";
		this._selected = null;
		this._inspected = null;
		this.updateButtons();

		if (!this._candidates.length) {
			summary.textContent = "";
			warning.hidden = false;
			warning.textContent
				= "No Zotero library found automatically. In Zotero, open "
				+ "Edit → Settings → Advanced → Files and Folders → Show Data Directory, "
				+ "then choose that folder below.";
			return;
		}

		warning.hidden = true;
		var selected = this._candidates.find(candidate => candidate.exists && !candidate.missing)
			|| this._candidates[0];

		for (let candidate of this._candidates) {
			var radio = document.createXULElement("radio");
			radio.className = "library-candidate";
			radio.setAttribute("label", candidate.path);
			radio.setAttribute("value", candidate.path);
			radio.setAttribute("tooltiptext", candidate.label);
			radio.addEventListener("command", () => this._select(candidate));
			if (candidate === selected) radio.checked = true;
			group.append(radio);
		}

		summary.textContent = `${this._candidates.length} candidate`
			+ `${this._candidates.length === 1 ? "" : "s"} found.`;
		this._select(selected);
	},

	_select: function (candidate) {
		this._selected = candidate;
		this._inspected = null;
		this.updateButtons();
		this._setStatus("");

		if (candidate.missing) {
			this._el("library-candidate-summary").textContent
				= `${candidate.label} · ${candidate.path}`;
			var warning = this._el("library-candidate-warning");
			warning.hidden = false;
			warning.textContent = "Zotero's settings point here, but the drive is not connected. "
				+ "Connect it, then press Rescan.";
			return;
		}

		this._el("library-candidate-warning").hidden = true;
		this._el("library-candidate-summary").textContent
			= `${candidate.label} · ${this._formatBytes(candidate.dbSize)}`
			+ (candidate.mtime ? ` · last changed ${new Date(candidate.mtime).toLocaleString()}` : "");
		this._check(candidate);
	},

	checkSelected: async function () {
		if (this._selected) await this._check(this._selected);
	},

	_check: async function (candidate) {
		var serial = ++this._checkSerial;
		this._setStatus("Reading a copy of the source database…");
		this._el("library-progress").hidden = true;

		try {
			var info = await Zotero.LibraryImport.inspect(candidate.path);
			if (serial !== this._checkSerial) return;
			this._inspected = info;

			var summary = [
				this._plural(info.regularItems ?? info.items, "item", "items"),
				this._plural(info.collections, "collection", "collections"),
				this._plural(info.notes, "note", "notes"),
				this._plural(info.attachments, "attachment", "attachments"),
				this._plural(info.annotations, "annotation", "annotations"),
			].join(" · ");
			summary += ` · ${this._formatBytes((info.dbSize || 0) + (info.storageSize || 0))}`;
			summary += ` · schema ${info.schemaVersion ?? "unknown"}`;
			this._el("library-candidate-summary").textContent = summary;

			var problems = [];
			if (!info.healthy) {
				problems.push(`the source database failed its integrity check (${info.integrity})`);
			}
			if (info.schemaVersion && this._current?.schemaVersion
					&& info.schemaVersion > this._current.schemaVersion) {
				problems.push(
					`the source uses a newer schema (${info.schemaVersion}) than this CiteWell build `
					+ `(${this._current.schemaVersion})`
				);
			}
			if (info.groups) {
				this._el("library-candidate-warning").hidden = false;
				this._el("library-candidate-warning").textContent
					= `${info.groups} group librar${info.groups === 1 ? "y" : "ies"} will be imported. `
					+ "Group sync is not supported, so group items are placed in group collections.";
			}
			else {
				this._el("library-candidate-warning").hidden = true;
			}

			if (problems.length) {
				this._setStatus(problems.join("; ") + ".", true);
			}
			else if (this._current?.empty) {
				this._setStatus("Ready to import. Nothing has been written yet.");
			}
			else {
				this._setStatus(
					"Ready to merge into the current library, or replace it with a kept backup."
				);
			}
			this.updateButtons();
		}
		catch (e) {
			if (serial !== this._checkSerial) return;
			Zotero.logError(e);
			this._inspected = null;
			this.updateButtons();
			this._el("library-candidate-summary").textContent = "";
			this._setStatus(`Could not read the library: ${e.message || e}`, true);
		}
	},

	chooseFolder: async function () {
		var fp = new FilePicker();
		fp.init(window, "Choose the Zotero data folder", fp.modeGetFolder);
		if (this._selected?.path) fp.displayDirectory = this._selected.path;
		if ((await fp.show()) !== fp.returnOK) return;

		var path = fp.file;
		var candidate = {
			path,
			origin: "chosen",
			label: "You chose this folder",
			exists: true,
			missing: false,
			dbSize: 0,
			mtime: 0,
		};
		this._candidates = [candidate, ...this._candidates.filter(item => item.path !== path)];
		this._renderCandidates();
	},

	importSelected: async function () {
		await this._stageSelected(false);
	},

	mergeSelected: async function () {
		await this._mergeSelected();
	},

	replaceSelected: async function () {
		await this._stageSelected(true);
	},

	_stageSelected: async function (replace) {
		if (this._busy || !this._selected || !this._inspected) return;
		if (replace) {
			if (this._current?.empty) return;
		}
		else if (!this._current?.empty) {
			return;
		}

		var candidate = this._selected;
		var info = this._inspected;
		var text;
		if (replace) {
			text = `Replace the current CiteWell library with\n\n${candidate.path}\n\n`
				+ `Current: ${this._plural(this._current?.items, "item", "items")}, `
				+ `${this._plural(this._current?.collections, "collection", "collections")}, `
				+ `${this._plural(this._current?.savedSearches, "saved search", "saved searches")}.\n\n`
				+ `Zotero: ${this._plural(info.items, "item", "items")}, `
				+ `${this._plural(info.collections, "collection", "collections")}, `
				+ `${this._plural(info.attachments, "attachment", "attachments")} `
				+ `(${this._formatBytes((info.dbSize || 0) + (info.storageSize || 0))}).\n\n`
				+ "The current library will be kept as a restore point. Zotero is not modified.";
		}
		else {
			text = `Import the Zotero library at\n\n${candidate.path}\n\n`
				+ `${this._plural(info.items, "item", "items")}, `
				+ `${this._plural(info.collections, "collection", "collections")}, `
				+ `${this._plural(info.attachments, "attachment", "attachments")} `
				+ `(${this._formatBytes((info.dbSize || 0) + (info.storageSize || 0))}).\n\n`
				+ "CiteWell will copy the library, restart once, and leave Zotero untouched.";
		}
		var ps = Services.prompt;
		if (ps.confirmEx(window, replace ? "Replace current library" : "Import Zotero library",
			text, ps.STD_YES_NO_BUTTONS, null, null, null, null, {}) !== 0) {
			return;
		}

		this._busy = true;
		this._disable(true);
		this._el("library-progress").hidden = false;
		this._setStatus(replace ? "Copying the replacement library…" : "Copying the library…");

		try {
			await Zotero.LibraryImport.stage(candidate.path, {
				counts: info,
				replace,
				onProgress: line => this._onProgress(line),
			});
			this._el("library-progress").hidden = true;
			this._setStatus(
				(replace ? "Replacement" : "Import") + " staged. CiteWell must restart to finish."
			);
			await this._refreshPending();
			this._askRestart();
		}
		catch (e) {
			Zotero.logError(e);
			this._el("library-progress").hidden = true;
			this._setStatus(
				`${replace ? "Replacement" : "Import"} failed: ${e.message || e}`,
				true
			);
		}
		finally {
			this._busy = false;
			this._disable(false);
			await this._refreshPending();
		}
	},

	_onProgress: function (line) {
		var match = line.match(/^progress files=(\d+) bytes=(\d+)$/);
		if (!match) return;
		this._setStatus(
			`Copying attachments: ${Number(match[1]).toLocaleString()} files, `
			+ `${this._formatBytes(Number(match[2]))}…`
		);
	},

	_mergeSelected: async function () {
		if (this._busy || !this._selected || !this._inspected || this._current?.empty) return;
		var candidate = this._selected;
		var info = this._inspected;
		var text = `Merge the Zotero library at\n\n${candidate.path}\n\n`
			+ `CiteWell: ${this._plural(this._current?.regularItems ?? this._current?.items, "item", "items")}, `
			+ `${this._plural(this._current?.collections, "collection", "collections")}.\n\n`
			+ `Zotero: ${this._plural(info.regularItems ?? info.items, "item", "items")}, `
			+ `${this._plural(info.collections, "collection", "collections")}, `
			+ `${this._plural(info.notes, "note", "notes")}.\n\n`
			+ "Items, collections and notes will be added to the current library. "
			+ `${this._plural(info.attachments, "attachment", "attachments")} and `
			+ `${this._plural(info.annotations, "annotation", "annotations")} are not imported yet. `
			+ "A database backup is kept; Zotero is not modified.";
		var ps = Services.prompt;
		if (ps.confirmEx(window, "Merge Zotero library", text,
			ps.STD_YES_NO_BUTTONS, null, null, null, null, {}) !== 0) {
			return;
		}

		this._busy = true;
		this._disable(true);
		this._el("library-progress").hidden = false;
		this._setStatus("Merging the selected library…");

		var progressWin = new Zotero.ProgressWindow({ closeOnClick: false });
		progressWin.changeHeadline("Merging Zotero library");
		var progressRow = new progressWin.ItemProgress("document", "Preparing the source copy…");
		progressWin.show();

		var report = (line) => {
			if (/^progress files=/.test(line)) {
				this._onProgress(line);
				return;
			}
			progressRow.setText(line);
			this._setStatus(line);
		};

		try {
			var result = await Zotero.LibraryImport.merge(candidate.path, {
				onProgress: report,
			});
			this._el("library-progress").hidden = true;
			var summary = `Merged ${this._plural(result.items, "item", "items")}, `
				+ `${this._plural(result.collections, "collection", "collections")} and `
				+ `${this._plural(result.notes, "note", "notes")} into the current library.`;
			this._setStatus(summary, false, true);
			progressRow.setProgress(100);
			progressRow.setText(summary);
			progressWin.startCloseTimer(6000);

			await this._refreshCurrent();
			await this._showLastResult();

			var main = Zotero.getMainWindow();
			if (main?.ZoteroPane) {
				try {
					var collectionsView = main.ZoteroPane.collectionsView;
					if (collectionsView?.refresh) await collectionsView.refresh();
					var itemsView = main.ZoteroPane.itemsView;
					if (itemsView?.refresh) await itemsView.refresh();
				}
				catch (e) {
					// The merge is already committed; a view refresh failure must not report it as failed.
					Zotero.logError(e);
				}
			}
		}
		catch (e) {
			Zotero.logError(e);
			this._el("library-progress").hidden = true;
			progressRow.setError();
			progressRow.setText(`Merge failed: ${e.message || e}`);
			progressWin.startCloseTimer(8000);
			this._setStatus(`Merge failed: ${e.message || e}`, true);
		}
		finally {
			this._busy = false;
			this._disable(false);
			await this._refreshCurrent();
		}
	},

	_askRestart: function () {
		var ps = Services.prompt;
		var flags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING
			+ ps.BUTTON_POS_1 * ps.BUTTON_TITLE_IS_STRING;
		var index = ps.confirmEx(
			window,
			"Restart CiteWell",
			"The operation is staged. CiteWell will finish it before opening the library on the "
				+ "next start.\n\nDo not change the current library before restarting.",
			flags,
			"Restart now",
			"Later",
			null,
			null,
			{}
		);
		if (index === 0) {
			Zotero.Utilities.Internal.quit(true);
		}
	},

	_refreshPending: async function () {
		this._pendingImport = await Zotero.LibraryImport.hasPendingRequest();
		this._pendingRestore = await Zotero.LibraryImport.hasPendingRestore();
		this._el("library-cancel").hidden = !this._pendingImport;
		this._el("library-cancel-restore").hidden = !this._pendingRestore;
		if (this._pendingImport) {
			this._setStatus("An import is staged and will finish the next time CiteWell starts.");
		}
		else if (this._pendingRestore) {
			this._setStatus("A restore is staged and will finish the next time CiteWell starts.");
		}
		this.updateButtons();
	},

	updateButtons: function () {
		var healthy = !!this._inspected?.healthy && !!this._selected?.exists;
		var pending = this._pendingImport || this._pendingRestore || this._busy;
		var adopt = healthy && !!this._current?.empty && !pending;
		var replace = healthy && !this._current?.empty && !pending;
		var importButton = this._el("library-import");
		var replaceButton = this._el("library-replace");
		var mergeButton = this._el("library-merge");
		if (importButton) importButton.disabled = !adopt;
		if (replaceButton) replaceButton.disabled = !replace;
		if (mergeButton) mergeButton.disabled = !(healthy && !this._current?.empty && !pending);
	},

	cancelImport: async function () {
		if (!(await Zotero.LibraryImport.hasPendingRequest())) return;
		var ps = Services.prompt;
		if (ps.confirmEx(window, "Cancel staged import",
			"Discard the staged copy? Zotero and the current CiteWell library are not affected.",
			ps.STD_YES_NO_BUTTONS, null, null, null, null, {}) !== 0) {
			return;
		}

		await Zotero.LibraryImport.cancel();
		await this._refreshPending();
		this._setStatus("Staged import cancelled.");
		await this._refreshCurrent();
	},

	_renderRestorePoints: async function () {
		var container = this._el("library-restore-points");
		container.textContent = "";

		var backups;
		try {
			backups = await Zotero.LibraryImport.listBackups();
		}
		catch (e) {
			Zotero.logError(e);
			var error = document.createXULElement("description");
			error.className = "library-error";
			error.textContent = `Could not read restore points: ${e.message || e}`;
			container.append(error);
			return;
		}

		if (!backups.length) {
			var empty = document.createXULElement("description");
			empty.className = "library-muted";
			empty.textContent = "No restore points yet.";
			container.append(empty);
			return;
		}

		for (let backup of backups) {
			let row = document.createXULElement("hbox");
			row.className = "library-location-row";
			row.setAttribute("tooltiptext", backup.path);

			let label = document.createXULElement("label");
			label.className = "library-restore-label";
			label.setAttribute("flex", "1");

			let kind = backup.manifest?.kind;
			let text = backup.createdAt
				? new Date(backup.createdAt).toLocaleString()
				: backup.id;
			if (kind === "replace") text += " · before a replace";
			else if (kind === "adopt") text += " · before the first import";
			else if (kind === "restore-safety") text += " · before a restore";
			else text += " · restore point";

			let counts = backup.manifest?.replacedCounts;
			if (counts) {
				text += ` · ${this._plural(counts.items, "item", "items")}, `
					+ `${this._plural(counts.collections, "collection", "collections")}`;
			}
			else {
				text += " · contents not recorded";
			}
			text += ` · ${this._formatBytes((backup.dbSize || 0) + (backup.storageSize || 0))}`;
			label.value = text;

			let restore = document.createXULElement("button");
			restore.setAttribute("label", "Restore…");
			restore.disabled = this._busy || this._pendingImport || this._pendingRestore;
			restore.addEventListener("command", () => this._restorePoint(backup));

			row.append(label, restore);
			container.append(row);
		}
	},

	_restorePoint: async function (backup) {
		if (this._busy || this._pendingImport || this._pendingRestore) return;
		var ps = Services.prompt;
		var when = backup.createdAt ? new Date(backup.createdAt).toLocaleString() : backup.id;

		this._setStatus("Checking the restore point…");
		var info;
		try {
			info = await Zotero.LibraryImport.inspect(backup.path);
		}
		catch (e) {
			Zotero.logError(e);
			this._setStatus(`Could not read the restore point: ${e.message || e}`, true);
			return;
		}
		if (!info.healthy) {
			this._setStatus(
				`That restore point failed its integrity check (${info.integrity}); restore cancelled.`,
				true
			);
			return;
		}
		if (!info.items && !info.collections) {
			this._setStatus(
				"That restore point is empty; restoring it would not recover anything. Restore cancelled.",
				true
			);
			return;
		}

		var current = this._current || { items: 0, collections: 0, empty: true };
		var text = `Restore the library from ${when}?\n\n`
			+ `Restore point: ${this._plural(info.items, "item", "items")}, `
			+ `${this._plural(info.collections, "collection", "collections")}, `
			+ `${this._plural(info.notes, "note", "notes")} `
			+ `(${this._formatBytes((info.dbSize || 0) + (info.storageSize || 0))}).\n\n`
			+ `Current library: ${current.empty
				? "empty"
				: `${this._plural(current.items, "item", "items")}, `
					+ `${this._plural(current.collections, "collection", "collections")}`}.\n\n`
			+ "The current library will be kept as a new restore point. "
			+ "CiteWell will restart, and Zotero is never affected.";
		if (ps.confirmEx(window, "Restore library", text, ps.STD_YES_NO_BUTTONS,
			null, null, null, null, {}) !== 0) {
			this._setStatus("");
			return;
		}

		try {
			await Zotero.LibraryImport.queueRestore(backup.path);
			await this._refreshPending();
			await this._renderRestorePoints();
			this._setStatus("Restore staged. CiteWell must restart to finish.");
			this._askRestart();
		}
		catch (e) {
			Zotero.logError(e);
			this._setStatus(`Could not stage the restore: ${e.message || e}`, true);
		}
	},

	openBackups: async function () {
		var path = Zotero.LibraryImport.getLocations()
			.find(location => location.label === "Import backups").path;
		try {
			await Zotero.File.createDirectoryIfMissingAsync(path);
			await Zotero.File.reveal(path);
		}
		catch (e) {
			this._setStatus(`Could not open the backup folder: ${e.message || e}`, true);
		}
	},

	cancelRestore: async function () {
		if (!(await Zotero.LibraryImport.hasPendingRestore())) return;
		var ps = Services.prompt;
		if (ps.confirmEx(window, "Cancel staged restore",
			"Discard the staged restore? The current library is not affected.",
			ps.STD_YES_NO_BUTTONS, null, null, null, null, {}) !== 0) {
			return;
		}
		await Zotero.LibraryImport.cancelRestore();
		await this._refreshPending();
		await this._renderRestorePoints();
		this._setStatus("Staged restore cancelled.");
	},

	_showLastResult: async function () {
		var result = await Zotero.LibraryImport.readResult();
		var element = this._el("library-last-result");
		if (!result) {
			element.textContent = "No import has run yet.";
			return;
		}

		if (!result.ok) {
			element.textContent = `Last operation failed`
				+ (result.finishedAt ? ` on ${new Date(result.finishedAt).toLocaleString()}` : "")
				+ `: ${result.error}`;
			return;
		}

		var when = result.finishedAt ? ` on ${new Date(result.finishedAt).toLocaleString()}` : "";
		if (result.mode === "restore") {
			element.textContent = `Restored a library${when}. `
				+ `The previous library was kept at ${result.backup}.`;
			return;
		}

		var counts = result.counts || {};
		var verb = result.mode === "replace" ? "Replaced the current library with"
			: result.mode === "merge" ? "Merged into the current library:"
			: "Imported";
		element.textContent = `${verb} ${this._plural(counts.items, "item", "items")}, `
			+ `${this._plural(counts.collections, "collection", "collections")} and `
			+ `${this._plural(counts.attachments, "attachment", "attachments")}${when}. `
			+ `Source fingerprint unchanged. Restore point: ${result.backup}`;
	},

	_count: function (value) {
		return value === null || value === undefined ? "?" : Number(value).toLocaleString();
	},

	_plural: function (value, one, many) {
		return `${this._count(value)} ${Number(value) === 1 ? one : many}`;
	},

	_formatBytes: function (bytes) {
		return Zotero.LibraryImport.formatBytes(bytes);
	},

	_setStatus: function (text, isError = false, isSuccess = false) {
		var element = this._el("library-import-status");
		if (!element) return;
		element.textContent = text || "";
		element.className = "library-status"
			+ (isError ? " library-error" : isSuccess ? " library-success" : "");
	},

	_disable: function (disabled) {
		for (var id of [
			"library-open",
			"library-move",
			"library-rescan",
			"library-choose",
			"library-check",
			"library-replace",
			"library-merge",
		]) {
			var element = this._el(id);
			if (element) element.disabled = disabled;
		}
		if (disabled) {
			var importButton = this._el("library-import");
			var replaceButton = this._el("library-replace");
			var mergeButton = this._el("library-merge");
			if (importButton) importButton.disabled = true;
			if (replaceButton) replaceButton.disabled = true;
			if (mergeButton) mergeButton.disabled = true;
		}
	},
};

Zotero_Preferences.Notes = {
	init: async function () {
		await Zotero_Preferences.Library._refreshNoteMigration();
		await Zotero_Preferences.Library._refreshAnnotationExport();
	},

	migrateNotes: function () {
		return Zotero_Preferences.Library.migrateNotes();
	},

	exportAnnotations: function () {
		return Zotero_Preferences.Library.exportAnnotations();
	}
};

Zotero_Preferences.ImportExport = {
	init: async function () {
		await Zotero_Preferences.Library._refreshCurrent();
		await Zotero_Preferences.Library.rescan();
		await Zotero_Preferences.Library._showLastResult();
		await Zotero_Preferences.Library._renderRestorePoints();
		await Zotero_Preferences.Library._refreshPending();
		if (Zotero_Preferences.Export) {
			await Zotero_Preferences.Export.init();
		}
	}
};
