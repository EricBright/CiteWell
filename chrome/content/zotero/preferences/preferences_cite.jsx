/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2006–2013 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org
    
    This file is part of Zotero.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

"use strict";

var { FilePicker } = ChromeUtils.importESModule('chrome://zotero/content/modules/filePicker.mjs');
var { Subprocess } = ChromeUtils.importESModule('resource://gre/modules/Subprocess.sys.mjs');

var React = require('react');
var ReactDOM = require('react-dom');
var VirtualizedTable = require('components/virtualized-table');
var { makeRowRenderer } = VirtualizedTable;

Zotero_Preferences.Cite = {
	styles: [],
	wordPluginResourcePaths: {
		libreOffice: 'zotero-libreoffice-integration',
		macWord: 'zotero-macword-integration',
		winWord: 'zotero-winword-integration'
	},

	init: async function () {
		// Init word plugin sections
		let wordPlugins = [];
		if (Zotero.isWin) {
			wordPlugins.push('winWord');
		}
		else if (Zotero.isMac) {
			wordPlugins.push('macWord');
		}
		let wordProcessors = document.getElementById('wordProcessors');
		if (wordProcessors) wordProcessors.hidden = !wordPlugins.length;
		await Zotero.Promise.delay();
		for (let wordPlugin of wordPlugins) {
			// This is the weirdest indirect code, but let's not fix what's not broken
			try {
				const { Installer } = ChromeUtils.importESModule(`resource://${this.wordPluginResourcePaths[wordPlugin]}/installer.mjs`);
				(new Installer(true)).showPreferences(document);
			}
			catch (e) {
				Zotero.logError(e);
			}
		}
		await this.refreshStylesList();
		await this.refreshSystemIntegration();
		document.querySelector('#zotero-prefpane-cite').addEventListener('showing', () => {
			this._tree.invalidate();
		});
	},
	
	
	_integrationManifest: function () {
		var configHome = Services.env.get("XDG_CONFIG_HOME");
		if (!configHome) {
			configHome = PathUtils.join(
				Services.dirsvc.get("Home", Ci.nsIFile).path,
				".config"
			);
		}
		return PathUtils.join(configHome, "citewell", "integration.txt");
	},

	refreshSystemIntegration: async function () {
		var section = document.getElementById("citewell-system-integration");
		if (!section) return;
		var appimage = Services.env.get("APPIMAGE");
		var status = document.getElementById("citewell-integration-status");
		var paths = document.getElementById("citewell-integration-paths");
		var repair = document.getElementById("citewell-integration-repair");
		var remove = document.getElementById("citewell-integration-remove");
		if (!appimage) {
			section.hidden = true;
			return;
		}
		section.hidden = false;
		var manifest = this._integrationManifest();
		var installed = await IOUtils.exists(manifest);
		status.textContent = installed
			? "User-level activation integration is installed."
			: "User-level activation integration is not installed.";
		paths.textContent = installed ? "Manifest: " + manifest : "";
		if (repair) repair.disabled = false;
		if (remove) remove.disabled = !installed;
	},

	repairSystemIntegration: async function () {
		var appimage = Services.env.get("APPIMAGE");
		if (!appimage) return;
		if (!Services.prompt.confirm(
			null,
			"Repair system integration",
			"Install or refresh CiteWell's user-level systemd unit and D-Bus activation file?\n\n"
			+ "Only files under your user configuration and data directories are written. "
			+ "No system-wide files, library data, or LibreOffice profile are changed."
		)) return;
		var buttons = ["citewell-integration-repair", "citewell-integration-remove"]
			.map(id => document.getElementById(id));
		buttons.forEach(button => { if (button) button.disabled = true; });
		try {
			await Zotero.Utilities.Internal.subprocess(appimage, [
				"--install-integration",
				"-datadir",
				Zotero.DataDirectory.dir,
			]);
			await this.refreshSystemIntegration();
			document.getElementById("citewell-integration-status").textContent
				= "User-level activation integration is installed.";
		}
		catch (e) {
			Zotero.logError(e);
			Services.prompt.alert(null, "System integration", "Could not repair the integration: " + e);
		}
		finally {
			buttons.forEach(button => { if (button) button.disabled = false; });
			await this.refreshSystemIntegration();
		}
	},

	removeSystemIntegration: async function () {
		var appimage = Services.env.get("APPIMAGE");
		if (!appimage) return;
		var manifest = this._integrationManifest();
		var details = "";
		if (await IOUtils.exists(manifest)) {
			details = "\n\n" + (await IOUtils.readUTF8(manifest));
		}
		if (!Services.prompt.confirm(
			null,
			"Remove system integration",
			"Remove the CiteWell user-level activation integration?\n\n"
			+ details
			+ "\nOnly the files listed above are removed. Your library, preferences, and "
			+ "LibreOffice profile are not touched."
		)) return;
		try {
			await Zotero.Utilities.Internal.subprocess(appimage, ["--remove-integration"]);
			await this.refreshSystemIntegration();
		}
		catch (e) {
			Zotero.logError(e);
			Services.prompt.alert(null, "System integration", "Could not remove the integration: " + e);
		}
	},

	/**
	 * Locate the CiteWell-owned OXT. In an AppImage it sits next to the app;
	 * in a source tree it is under extensions/.
	 */
	_getLibreOfficeExtension: async function () {
		var appDir = Services.dirsvc.get("XREExeF", Ci.nsIFile).parent.path;
		var repoDir = appDir;
		for (var i = 0; i < 3; i++) {
			repoDir = PathUtils.parent(repoDir);
		}
		var candidates = [
			PathUtils.join(appDir, "integration", "libreoffice", "CiteWell_LibreOffice_Integration.oxt"),
			PathUtils.join(repoDir, "extensions", "citewell-libreoffice", "build", "CiteWell_LibreOffice_Integration.oxt"),
		];
		for (var candidate of candidates) {
			if (await IOUtils.exists(candidate)) return candidate;
		}
		throw new Error("The extension is missing from this build. Reinstall CiteWell.");
	},

	_run: async function (command, args) {
		var proc = await Subprocess.call({
			command,
			arguments: args,
			stderr: "pipe",
		});
		var stdout = "";
		var stderr = "";
		var read = async (stream, append) => {
			var chunk;
			while ((chunk = await stream.readString())) append(chunk);
		};
		await Promise.all([
			read(proc.stdout, chunk => { stdout += chunk; }),
			read(proc.stderr, chunk => { stderr += chunk; }),
		]);
		var { exitCode } = await proc.wait();
		return { exitCode, stdout, stderr };
	},

	_isLibreOfficeRunning: async function (flatpak) {
		if (!flatpak) return false;
		try {
			var result = await this._run(flatpak, ["ps"]);
			return result.exitCode === 0
				&& /org\.libreoffice\.LibreOffice/.test(result.stdout);
		}
		catch (e) {
			return false;
		}
	},

	// Add only the CiteWell OXT. This action must never remove, replace or
	// repair another extension or LibreOffice's deployment registry.
	installLibreOffice: async function () {
		var status = document.getElementById("citewell-lo-status");
		var button = document.getElementById("citewell-lo-install");
		var message = "Install the CiteWell extension for LibreOffice? "
			+ "Restart LibreOffice afterward.";
		if (!Services.prompt.confirm(null, "Install CiteWell extension", message)) return;

		button.disabled = true;
		status.textContent = "Preparing…";
		try {
			var oxt = await this._getLibreOfficeExtension();
			var cacheDir = PathUtils.join(
				Services.dirsvc.get("Home", Ci.nsIFile).path,
				".cache", "citewell", "lo-extension"
			);
			await IOUtils.makeDirectory(cacheDir, { createAncestors: true, ignoreExisting: true });
			var visible = PathUtils.join(cacheDir, `CiteWell_LibreOffice_Integration-${Date.now()}.oxt`);
			await IOUtils.copy(oxt, visible);

			var flatpak = null;
			try {
				flatpak = await Subprocess.pathSearch("flatpak");
			}
			catch (e) {
			}
			var command = null;
			var prefix = [];
			if (flatpak) {
				var info = await this._run(flatpak, ["info", "org.libreoffice.LibreOffice"]);
				if (info.exitCode === 0) {
					if (await this._isLibreOfficeRunning(flatpak)) {
						throw new Error("Close LibreOffice completely, then try again.");
					}
					command = flatpak;
					prefix = [
						"run", "--command=/app/libreoffice/program/unopkg",
						"org.libreoffice.LibreOffice"
					];
				}
			}
			if (!command) {
				var native = [
					"/usr/bin/unopkg",
					"/usr/lib/libreoffice/program/unopkg",
					"/usr/lib64/libreoffice/program/unopkg",
				];
				for (var candidate of native) {
					if (await IOUtils.exists(candidate)) {
						command = candidate;
						break;
					}
				}
				if (!command) {
					throw new Error("LibreOffice was not found. Install LibreOffice, then try again.");
				}
			}
			var install = () => this._run(command, prefix.concat(["add", "-f", visible]));
			status.textContent = "Installing…";
			var result = await install();
			if (result.exitCode !== 0) {
				var detail = `${result.stdout}\n${result.stderr}`.trim();
				Zotero.logError(new Error(`unopkg failed (${result.exitCode}): ${detail}`));
				if (/enabling: components\.xml|another instance|lock/i.test(detail)) {
					throw new Error("Close LibreOffice completely, then try again.");
				}
				if (/Error binding package|NOT_EXISTING/i.test(detail)) {
					throw new Error(
						"LibreOffice has a stale CiteWell extension entry. "
						+ "Open Tools → Extension Manager, remove the CiteWell entry, "
						+ "then try again. Your other extensions will not be changed."
					);
				}
				throw new Error("LibreOffice could not install the extension.");
			}
			status.textContent = "Installed. Restart LibreOffice.";
			button.disabled = false;
		}
		catch (e) {
			Zotero.logError(e);
			status.textContent = e.message || "Could not install the extension.";
			button.disabled = false;
		}
	},

	/**
	 * Refreshes the list of styles in the styles pane
	 * @param {String} cslID Style to select
	 * @return {Promise}
	 */
	refreshStylesList: async function (cslID) {
		Zotero.debug("Refreshing styles list");
		
		await Zotero.Styles.init();
		this.styles = Zotero.Styles.getVisible()
			.map((style) => {
				var updated = Zotero.Date.sqlToDate(style.updated, true);
				return {
					title: style.title,
					updated: updated ? updated.toLocaleDateString() : "",
					remove: {
						iconKey: "minus-circle",
						onClick: async (index, event) => {
							// if the clicks happened via keyboard, refocus the next row's button
							if (event.type == "keydown" && document.activeElement == event.target) {
								this._tabIntoIcon = true;
							}
							let cslID = Zotero.Styles.getVisible()[index].styleID;
							this.deleteStyle([cslID]);
						},
						isFocusable: true,
						ariaLabel: Zotero.getString("general.remove")
					}
				};
			});
		
		if (!this._tree) {
			const columns = [
				{
					dataKey: "title",
					label: "zotero.preferences.cite.styles.styleManager.title",
				},
				{
					dataKey: "updated",
					label: "zotero.preferences.cite.styles.styleManager.updated",
					fixedWidth: true,
					width: 100
				},
				{
					dataKey: "remove",
					label: Zotero.getString("preferences-styleManager-remove"),
					htmlLabel: ' ',
					fixedWidth: true,
					width: 24,
					type: "button"
				}
			];
			var handleKeyDown = (event) => {
				if (event.key == 'Delete' || Zotero.isMac && event.key == 'Backspace') {
					Zotero_Preferences.Cite.deleteStyle();
					return false;
				}
			};

			await new Promise((resolve) => {
				ReactDOM.createRoot(document.getElementById("styleManager")).render(
					<VirtualizedTable
						getRowCount={() => this.styles.length}
						id="styleManager-table"
						ref={(ref) => {
							this._tree = ref;
							resolve();
						}}
						renderItem={makeRowRenderer(index => this.styles[index])}
						showHeader={true}
						multiSelect={false}
						columns={columns}
						staticColumns={true}
						disableFontSizeScaling={true}
						onKeyDown={handleKeyDown}
						getRowString={index => this.styles[index].title}
					/>
				);
			});

			// Fix style manager showing partially blank until scrolled
			setTimeout(() => {
				this._tree.invalidate();
				// Pre-select first item if nothing is selected
				if (this._tree.selection.selected.size == 0) {
					this._tree.selection.select(0);
				}
			});
		}
		else {
			this._tree.invalidate();
		}
		if (cslID) {
			var styles = Zotero.Styles.getVisible();
			var index = styles.findIndex(style => style.styleID == cslID);
			if (index != -1) {
				this._tree.selection.select(index);
			}
		}
		else if ([...this._tree.selection.selected].some(i => i >= this.styles.length)) {
			this._tree.selection.select(this.styles.length - 1);
		}
		if (this._tabIntoIcon) {
			document.querySelector("#styleManager-table .row.selected .icon-action").focus();
			this._tabIntoIcon = false;
		}
	},
	
	
	openStylesPage: function () {
		// Open in CiteWell's own viewer, not the external browser. The app
		// registers a handler for application/vnd.citationstyles.style+xml, so a
		// style clicked on this page installs directly instead of downloading.
		Zotero.openInViewer("https://www.zotero.org/styles/");
	},
	
	
	/**
	 * Adds a new style to the style pane
	 **/
	addStyle: async function () {
		var fp = new FilePicker();
		fp.init(window, Zotero.getString("zotero.preferences.styles.addStyle"), fp.modeOpen);
		
		fp.appendFilter("CSL Style", "*.csl");
		
		var rv = await fp.show();
		if (rv == fp.returnOK || rv == fp.returnReplace) {
			try {
				await Zotero.Styles.install(
					{
						file: Zotero.File.pathToFile(fp.file)
					},
					fp.file,
					true
				);
			}
			catch (e) {
				(new Zotero.Exception.Alert("styles.install.unexpectedError",
					fp.file, "styles.install.title", e)).present()
			}
		}
	},
	
	
	/**
	 * Deletes selected styles from the styles pane
	 * @param {Array} cslIDs Array of CSL IDs to delete
	 **/
	deleteStyle: async function (cslIDs = []) {
		// get selected cslIDs
		var styles = Zotero.Styles.getVisible();
		// if style ids are not provided, get them from the selection
		if (cslIDs.length == 0) {
			for (let index of this._tree.selection.selected.keys()) {
				cslIDs.push(styles[index].styleID);
			}
		}
		
		if(cslIDs.length == 0) {
			return;
		} else if(cslIDs.length == 1) {
			var selectedStyle = Zotero.Styles.get(cslIDs[0])
			var text = Zotero.getString('styles.deleteStyle', selectedStyle.title);
		} else {
			var text = Zotero.getString('styles.deleteStyles');
		}
		
		var ps = Services.prompt;
		if(ps.confirm(null, '', text)) {
			// delete if requested
			if(cslIDs.length == 1) {
				await selectedStyle.remove();
			} else {
				for(var i=0; i<cslIDs.length; i++) {
					await Zotero.Styles.get(cslIDs[i]).remove();
				}
			}
			
			await this.refreshStylesList();
		}
	},
	
	resetStyles: async function () {
		var ps = Services.prompt;
		
		var buttonFlags = (ps.BUTTON_POS_0) * (ps.BUTTON_TITLE_IS_STRING)
			+ (ps.BUTTON_POS_1) * (ps.BUTTON_TITLE_CANCEL);
		
		var index = ps.confirmEx(null,
			Zotero.getString('general.warning'),
			Zotero.getString('zotero.preferences.advanced.resetStyles.changesLost'),
			buttonFlags,
			Zotero.getString('zotero.preferences.advanced.resetStyles'),
			null, null, null, {});
		
		if (index == 0) {
			let button = document.getElementById('reset-styles-button');
			button.disabled = true;
			try {
				await Zotero.Schema.resetStyles()
				if (Zotero_Preferences.Export) {
					Zotero_Preferences.Export.populateQuickCopyList();
				}
			}
			finally {
				button.disabled = false;
			}
			this.refreshStylesList();
		}
	},
	
	/**
	 * Shows an error if import fails
	 **/
	styleImportError: function () {
		alert(Zotero.getString('styles.installError', "This"));
	}
}
