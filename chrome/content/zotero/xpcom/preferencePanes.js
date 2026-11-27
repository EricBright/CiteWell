/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2022 Corporation for Digital Scholarship
                     Vienna, Virginia, USA
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


/**
 * @namespace Zotero
 */


/**
 * Manages preference panes.
 *
 * @memberof Zotero
 */
Zotero.PreferencePanes = {
	builtInPanes: [],

	builtInPanesPromise: null,

	retired: [],

	simpleSections: [],

	sections: [],

	/**
	 * Load pane structure from the versioned settings manifest. Pane content is
	 * still a custom fragment in Phase 1; later phases can add section metadata
	 * without changing the shell.
	 */
	async loadBuiltInPanes() {
		if (this.builtInPanesPromise) return this.builtInPanesPromise;
		this.builtInPanesPromise = (async () => {
			let manifest = JSON.parse(
				await Zotero.File.getContentsFromURLAsync(
					'resource://zotero/settings/panes.json'
				)
			);
			if (manifest.version !== 1 || !Array.isArray(manifest.panes)) {
				throw new Error('Invalid settings pane manifest');
			}
			let panes = manifest.panes
				.filter(pane => ZOTERO_CONFIG.ONLINE_SYNC || !pane.requiresOnlineSync)
				.sort((a, b) => a.order - b.order)
				.map(pane => {
					if (!pane.id || (!pane.label && !pane.rawLabel)) {
						throw new Error('Invalid settings pane entry');
					}
					if (!pane.content || pane.content.type !== 'custom') {
						throw new Error(
							'Unsupported settings pane content for ' + pane.id
						);
					}
					return {
						id: pane.id,
						label: pane.label,
						rawLabel: pane.rawLabel,
						image: pane.icon,
						parent: pane.parent,
						order: pane.order,
						status: pane.status,
						src: pane.content.src,
						scripts: pane.content.scripts || [],
						stylesheets: pane.content.stylesheets || [],
						defaultXUL: pane.content.defaultXUL !== false,
						helpURL: pane.helpURL,
					};
				});
			this.builtInPanes = Object.freeze(panes);
			this.retired = Object.freeze(manifest.retired || []);
			this.simpleSections = Object.freeze(manifest.simpleSections || []);
			this.sections = Object.freeze(manifest.sections || []);
			return this.builtInPanes;
		})();
		return this.builtInPanesPromise;
	},

	/**
	 * Map a pane id to a pane that exists, following a `retired` entry when the id
	 * was merged into another pane (the DNS pane into Advanced, for example).
	 *
	 * @param {String} id
	 * @return {String|null} a registered pane id, or null when nothing matches
	 */
	resolvePaneID(id) {
		if (!id || !this.builtInPanes) {
			return null;
		}
		if (this.builtInPanes.some(pane => pane.id === id)) {
			return id;
		}
		let retired = this.retired.find(entry => entry.id === id && entry.paneId);
		if (retired && this.builtInPanes.some(pane => pane.id === retired.paneId)) {
			return retired.paneId;
		}
		return null;
	},

	pluginPanes: [],

	/**
	 * Register a pane to be displayed in the preferences. The pane XHTML (`src`)
	 * is loaded as a fragment, not a full document, with XUL as the default
	 * namespace and (X)HTML tags available under `html:`.
	 *
	 * The pane will be unregistered automatically when the registering plugin
	 * shuts down.
	 *
	 * @param {Object} options
	 * @param {string} options.pluginID ID of the plugin registering the pane
	 * @param {string} options.src URI of an XHTML fragment, optionally relative to the plugin's root
	 * @param {string} [options.id] Represents the pane and must be unique. Automatically generated if not provided
	 * @param {string} [options.parent] ID of parent pane (if provided, pane is hidden from the sidebar)
	 * @param {string} [options.label] Displayed as the pane's label in the sidebar.
	 * 		If not provided, the plugin's name is used
	 * @param {string} [options.image] URI of an icon to be displayed in the navigation sidebar, optionally relative to
	 * 		the plugin's root. If not provided, the plugin's icon (from manifest.json) is used.
	 * @param {string[]} [options.scripts] Array of URIs of scripts to load along with the pane, optionally relative to
	 * 		the plugin's root
	 * @param {string[]} [options.stylesheets] Array of URIs of CSS stylesheets to load along with the pane, optionally
	 * 		relative to the plugin's root
	 * @param {string} [options.helpURL] If provided, a help button will be displayed under the pane
	 * 		and the provided URL will open when it is clicked
	 * @return {Promise<string>} Resolves to the ID of the pane if successfully added
	 *
	 * @example
	 * Register a pane with a script and stylesheet:
	 * ```javascript
	 * Zotero.PreferencePanes.register({
	 * 	pluginID: 'my-plugin@my-namespace.com',
	 * 	src: rootURI + 'my-pane.xhtml',
	 * 	id: 'my-plugin-pane',
	 * 	scripts: [rootURI + 'my-pane.js'],
	 * 	stylesheets: [rootURI + 'my-pane.css']
	 * });
	 * ```
	 */
	register: async function (options) {
		if (!options.pluginID || !options.src) {
			throw new Error('pluginID and src must be provided');
		}
		if (options.id && (this.builtInPanes.some(p => p.id === options.id)
				|| this.pluginPanes.some(p => p.id === options.id))) {
			throw new Error(`Pane with ID ${options.id} already registered`);
		}
		
		options.scripts ||= [];
		options.stylesheets ||= [];

		let addPaneOptions = {
			id: options.id || `plugin-pane-${Zotero.Utilities.randomString()}-${options.pluginID}`,
			pluginID: options.pluginID,
			parent: options.parent,
			rawLabel: options.label || (await Zotero.Plugins.getName(options.pluginID)),
			image: options.image && (await Zotero.Plugins.resolveURI(options.pluginID, options.image))
				|| (await Zotero.Plugins.getIconURI(options.pluginID, 24)),
			src: await Zotero.Plugins.resolveURI(options.pluginID, options.src),
			scripts: await Promise.all(options.scripts.map(uri => Zotero.Plugins.resolveURI(options.pluginID, uri))),
			stylesheets: await Promise.all(options.stylesheets.map(uri => Zotero.Plugins.resolveURI(options.pluginID, uri))),
			helpURL: options.helpURL,
			defaultXUL: true,
		};

		this.pluginPanes.push(addPaneOptions);
		Zotero.debug(`Plugin ${addPaneOptions.pluginID} registered preference pane ${addPaneOptions.id} ("${addPaneOptions.rawLabel}")`);
		this._refreshPreferences();
		this._ensureObserverAdded();
		return addPaneOptions.id;
	},

	/**
	 * Called automatically on plugin shutdown.
	 *
	 * @param {string} id - ID of the pane to unregister, as returned by `Zotero.PreferencePanes.register()`
	 */
	unregister: function (id) {
		this.pluginPanes = this.pluginPanes.filter(p => p.id !== id);
		this._refreshPreferences();
	},
	
	_refreshPreferences() {
		for (let win of Services.wm.getEnumerator("zotero:pref")) {
			win.location.reload();
		}
	},
	
	_ensureObserverAdded() {
		if (this._observerAdded) {
			return;
		}
		
		Zotero.Plugins.addObserver({
			shutdown: ({ id: pluginID }) => {
				let beforeLength = this.pluginPanes.length;
				this.pluginPanes = this.pluginPanes.filter(pane => pane.pluginID !== pluginID);
				if (this.pluginPanes.length !== beforeLength) {
					Zotero.debug(`Preference panes registered by plugin ${pluginID} unregistered due to shutdown`);
					this._refreshPreferences();
				}
			}
		});
		this._observerAdded = true;
	}
};
