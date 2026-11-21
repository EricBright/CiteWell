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

/**
 * `/agent/v1` — the authenticated bridge that lets a local agent do work in the running app.
 *
 * The local API is a data CRUD surface. This endpoint is for actions that need the app itself:
 * creating validated items, adding notes, selecting and opening items, and (in Phase 2) running
 * translators and importing files. It calls the same Zotero APIs the UI calls, so notifier events
 * and validation behave exactly as they do for a click.
 *
 * See docs/agent.md for the protocol, token model and verb list.
 */

const AGENT_API_VERSION = 1;
const AGENT_TOKEN_FILENAME = "agent-token";
const AGENT_AUDIT_FILENAME = "agent-actions.log";
const AGENT_MAX_SEARCH_RESULTS = 100;

Zotero.Server.Agent = {
	_token: null,

	get tokenPath() {
		return PathUtils.join(Zotero.DataDirectory.dir, AGENT_TOKEN_FILENAME);
	},

	get auditPath() {
		return PathUtils.join(Zotero.DataDirectory.dir, AGENT_AUDIT_FILENAME);
	},

	/**
	 * Create the token file on startup so the CLI can read it before its first request.
	 */
	init: async function () {
		if (!Zotero.Prefs.get('agent.enabled')) {
			return;
		}
		await this.getToken();
	},

	/**
	 * Read the token, creating it with mode 0600 on first use.
	 */
	getToken: async function () {
		if (this._token) {
			return this._token;
		}
		if (await IOUtils.exists(this.tokenPath)) {
			let token = (await Zotero.File.getContentsAsync(this.tokenPath)).trim();
			if (token) {
				this._token = token;
				return token;
			}
		}
		return this.rotateToken();
	},

	/**
	 * Replace the token. Existing agents stop working until they read the new file.
	 */
	rotateToken: async function () {
		let bytes = new Uint8Array(32);
		crypto.getRandomValues(bytes);
		let token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
		await Zotero.File.putContentsAsync(this.tokenPath, token);
		try {
			await IOUtils.setPermissions(this.tokenPath, 0o600);
		}
		catch (e) {
			Zotero.logError(e);
		}
		this._token = token;
		return token;
	},

	/**
	 * Append one audit line. Never write note text or field values.
	 */
	audit: async function (method, outcome, detail = null) {
		try {
			let line = JSON.stringify({
				time: new Date().toISOString(),
				method,
				outcome,
				detail,
			}) + "\n";
			let existing = "";
			if (await IOUtils.exists(this.auditPath)) {
				existing = await Zotero.File.getContentsAsync(this.auditPath);
			}
			await Zotero.File.putContentsAsync(this.auditPath, existing + line);
		}
		catch (e) {
			Zotero.logError(e);
		}
	},

	/**
	 * Check the bearer token and the custom header that forces a CORS preflight.
	 */
	_checkAuth: async function (headers) {
		if (headers['x-citewell-agent'] !== '1') {
			throw new AgentError(400, 'X-CiteWell-Agent: 1 is required');
		}
		let authorization = headers['authorization'] || '';
		let token = authorization.replace(/^Bearer\s+/i, '');
		let expected = await this.getToken();
		if (!token || token !== expected) {
			throw new AgentError(401, 'Invalid or missing agent token');
		}
	},

	/**
	 * Main dispatch. Returns a JSON-serializable result or throws AgentError.
	 */
	dispatch: async function (method, params) {
		params = params || {};
		switch (method) {
			case 'ping':
				return {
					version: AGENT_API_VERSION,
					app: Zotero.appName,
					appVersion: Zotero.version,
					dataDir: Zotero.DataDirectory.dir,
					capabilities: [
						'ping', 'search', 'item.get', 'item.create', 'item.update', 'item.addNote',
						'item.attachFile', 'item.attachURL', 'translate.save',
						'annotation.list', 'export.note',
						'collection.list', 'collection.create', 'collection.addItems',
						'ui.status', 'ui.select', 'ui.open', 'ui.notify'
					],
				};

			case 'search':
				return this._search(params);

			case 'item.get':
				return this._getItem(params);

			case 'item.create':
				return this._createItem(params);

			case 'item.update':
				return this._updateItem(params);

			case 'item.addNote':
				return this._addNote(params);

			case 'item.attachFile':
				return this._attachFile(params);

			case 'item.attachURL':
				return this._attachURL(params);

			case 'translate.save':
				return this._translateSave(params);

			case 'annotation.list':
				return this._listAnnotations(params);

			case 'export.note':
				return this._exportNote(params);

			case 'collection.list':
				return this._listCollections();

			case 'collection.create':
				return this._createCollection(params);

			case 'collection.addItems':
				return this._addToCollection(params);

			case 'ui.status':
				return this._uiStatus();

			case 'ui.select':
				return this._uiSelect(params);

			case 'ui.open':
				return this._uiOpen(params);

			case 'ui.notify':
				return this._uiNotify(params);

			default:
				throw new AgentError(404, `Unknown method: ${method}`);
		}
	},

	_search: async function ({ query, limit = 25, libraryID = 1 }) {
		if (!query || typeof query !== 'string') {
			throw new AgentError(400, 'query is required');
		}
		limit = Math.max(1, Math.min(parseInt(limit) || 25, AGENT_MAX_SEARCH_RESULTS));
		let search = new Zotero.Search();
		search.libraryID = libraryID;
		search.addCondition('quicksearch', 'contains', query);
		let ids = await search.search();
		ids = ids.slice(0, limit);
		let items = Zotero.Items.get(ids).filter(item => !item.deleted);
		return {
			total: ids.length,
			items: items.map(item => this._summary(item)),
		};
	},

	_getItem: function ({ key }) {
		let item = this._requireItem(key);
		let data = item.toJSON();
		data.notes = item.getNotes().map(id => Zotero.Items.get(id).key);
		data.attachments = item.getAttachments().map(id => Zotero.Items.get(id).key);
		return { item: data };
	},

	_createItem: async function ({ itemType, fields = {}, creators = [], tags = [], collections = [] }) {
		if (!itemType || typeof itemType != 'string') {
			throw new AgentError(400, 'itemType is required');
		}
		if (!Zotero.ItemTypes.getID(itemType)) {
			throw new AgentError(400, `Unknown item type: ${itemType}`);
		}
		let item = new Zotero.Item(itemType);
		item.libraryID = 1;
		this._applyFields(item, fields);
		this._applyCreators(item, creators);
		this._applyTags(item, tags);
		let collectionIDs = await this._resolveCollections(collections);
		if (collectionIDs.length) {
			item.setCollections(collectionIDs);
		}
		await item.saveTx();
		return {
			key: item.key,
			item: this._summary(item),
		};
	},

	_updateItem: async function ({ key, fields = {}, creators, tags }) {
		let item = this._requireItem(key);
		this._applyFields(item, fields);
		if (creators !== undefined) this._applyCreators(item, creators);
		if (tags !== undefined) {
			item.setTags([]);
			this._applyTags(item, tags);
		}
		await item.saveTx();
		return { key: item.key, item: this._summary(item) };
	},

	_addNote: async function ({ key, text, format = 'markdown' }) {
		if (!text || typeof text != 'string') {
			throw new AgentError(400, 'text is required');
		}
		if (format != 'markdown') {
			throw new AgentError(400, "format must be 'markdown'; HTML notes are retired (D29)");
		}
		let parent = this._requireItem(key);
		let note = await Zotero.Notes.createMarkdownAttachment({
			parentItemID: parent.id,
			text,
		});
		return { key: note.key, parentKey: parent.key, format: 'markdown' };
	},

	_attachFile: async function ({ key, path, title, move = false }) {
		if (!path || typeof path != 'string') {
			throw new AgentError(400, 'path is required');
		}
		let parent = this._requireParent(key);
		let file = Zotero.File.pathToFile(path);
		if (!file.exists()) {
			throw new AgentError(404, `File not found: ${path}`);
		}
		let attachment = await Zotero.Attachments.importFromFile({
			file: path,
			parentItemID: parent.id,
			title: title || undefined,
			moveFile: !!move,
		});
		return {
			key: attachment.key,
			parentKey: parent.key,
			title: attachment.getField('title'),
		};
	},

	_attachURL: async function ({ key, url, title }) {
		if (!url || typeof url != 'string') {
			throw new AgentError(400, 'url is required');
		}
		let parent = this._requireParent(key);
		let attachment = await Zotero.Attachments.linkFromURL({
			url,
			parentItemID: parent.id,
			title: title || undefined,
		});
		return {
			key: attachment.key,
			parentKey: parent.key,
			title: attachment.getField('title'),
		};
	},

	_translateSave: async function ({ identifier, type, collections = [], saveAttachments = true }) {
		if (!identifier || typeof identifier != 'string') {
			throw new AgentError(400, 'identifier is required');
		}
		identifier = identifier.trim();
		let collectionIDs = await this._resolveCollections(collections);
		let collectionsParam = collectionIDs.length ? collectionIDs : false;

		if (type == 'url' || /^https?:\/\//i.test(identifier)) {
			return this._translateURL(identifier, collectionsParam, saveAttachments);
		}

		let identifiers = Zotero.Utilities.extractIdentifiers(identifier);
		if (!identifiers.length && type) {
			let value = identifier;
			if (type == 'doi') {
				value = Zotero.Utilities.cleanDOI(value);
				if (value) identifiers = [{ DOI: value }];
			}
			else if (type == 'isbn') {
				value = Zotero.Utilities.cleanISBN(value);
				if (value) identifiers = [{ ISBN: value }];
			}
			else if (type == 'pmid') {
				value = value.replace(/^pmid:\s*/i, '');
				if (/^\d+$/.test(value)) identifiers = [{ PMID: value }];
			}
		}
		if (!identifiers.length) {
			throw new AgentError(400, 'No DOI, ISBN or PMID found in identifier');
		}

		let created = [];
		for (let itemIdentifier of identifiers) {
			let translate = new Zotero.Translate.Search();
			translate.setIdentifier(itemIdentifier);
			let translators = await translate.getTranslators();
			if (!translators.length) {
				throw new AgentError(404, `No translator found for ${JSON.stringify(itemIdentifier)}`);
			}
			translate.setTranslator(translators);
			let items = await translate.translate({
				libraryID: 1,
				collections: collectionsParam,
				saveAttachments: !!saveAttachments,
			});
			created.push(...items);
		}
		return {
			count: created.length,
			items: created.map(item => this._summary(item)),
		};
	},

	_translateURL: async function (url, collections, saveAttachments) {
		const { HiddenBrowser } = ChromeUtils.importESModule(
			"chrome://zotero/content/HiddenBrowser.mjs"
		);
		let browser = new HiddenBrowser({ blockRemoteResources: false });
		try {
			await browser.load(url);
			let document = await browser.getDocument();
			let translate = new Zotero.Translate.Web();
			translate.setDocument(document);
			let translators = await translate.getTranslators();
			if (!translators.length) {
				throw new AgentError(404, `No web translator found for ${url}`);
			}
			translate.setTranslator(translators);
			let items = await translate.translate({
				libraryID: 1,
				collections,
				saveAttachments: !!saveAttachments,
			});
			return {
				count: items.length,
				items: items.map(item => this._summary(item)),
			};
		}
		finally {
			browser.destroy();
		}
	},

	_requireParent: function (key) {
		let item = this._requireItem(key);
		if (item.isAttachment() || item.isNote()) {
			throw new AgentError(400, 'Attachments and notes cannot have child attachments');
		}
		return item;
	},

	_listAnnotations: async function ({ key }) {
		let attachment = this._requireAttachment(key);
		let ids = attachment.getAnnotations(false, true);
		let items = await Zotero.Items.getAsync(ids);
		let annotations = [];
		for (let annotation of items) {
			await annotation.loadDataType('annotation');
			annotations.push({
				key: annotation.key,
				type: annotation.annotationType,
				text: annotation.annotationText || '',
				comment: annotation.annotationComment || '',
				color: annotation.annotationColor,
				pageLabel: annotation.annotationPageLabel || '',
				position: annotation.annotationPosition,
			});
		}
		return { annotations };
	},

	_createAnnotation: async function ({
		key,
		type = 'highlight',
		text = '',
		comment = '',
		color = null,
		pageLabel = '',
		position,
		sortIndex = '00001|000000|00000',
	}) {
		let attachment = this._requireAttachment(key);
		if (!['highlight', 'underline', 'note', 'text'].includes(type)) {
			throw new AgentError(400, `Unsupported annotation type: ${type}`);
		}
		if (!position || typeof position != 'object') {
			throw new AgentError(400, 'position is required');
		}
		if (typeof position.pageIndex != 'number' || !Array.isArray(position.rects)) {
			throw new AgentError(400, 'position must contain pageIndex and rects');
		}
		let json = {
			key: Zotero.DataObjectUtilities.generateKey(),
			type,
			authorName: '',
			text,
			comment,
			color: color || Zotero.Annotations.DEFAULT_COLOR,
			pageLabel,
			sortIndex,
			position,
		};
		let annotation = await Zotero.Annotations.saveFromJSON(attachment, json);
		return {
			key: annotation.key,
			parentKey: attachment.key,
			type: annotation.annotationType,
		};
	},

	_exportNote: async function ({ key }) {
		let note = this._requireItem(key);
		if (Zotero.Notes.isMarkdownAttachment(note)) {
			return {
				key: note.key,
				filename: note.getField('title') || note.key,
				markdown: await Zotero.Notes.getMarkdownAttachmentText(note),
			};
		}
		if (!note.isNote()) {
			throw new AgentError(400, 'key must refer to a note item or Markdown attachment');
		}
		await Zotero.Translators.init();
		let translator = Zotero.Translators.get(Zotero.Translators.TRANSLATOR_ID_NOTE_MARKDOWN);
		if (!translator) {
			throw new AgentError(500, 'Note Markdown translator is not available');
		}
		let translation = new Zotero.Translate.Export();
		let markdown = '';
		translation.setItems([note]);
		translation.setTranslator(translator);
		translation.setHandler('done', (obj, worked) => {
			if (worked) {
				markdown = obj.string.replace(/\r\n/g, '\n');
			}
		});
		await translation.translate();
		if (!markdown) {
			throw new AgentError(500, 'Note export did not return Markdown');
		}
		return {
			key: note.key,
			filename: Zotero.Utilities.Item.noteToTitle(note.getNote()) || note.key,
			markdown,
		};
	},

	_requireAttachment: function (key) {
		let item = this._requireItem(key);
		if (!item.isAttachment() || !item.isFileAttachment() || !item.attachmentReaderType) {
			throw new AgentError(400, 'key must refer to a PDF, EPUB or snapshot attachment');
		}
		return item;
	},

	_listCollections: function () {
		let collections = Zotero.Collections.getByLibrary(1);
		return {
			collections: collections.map(collection => ({
				key: collection.key,
				name: collection.name,
				parentKey: collection.parentKey || null,
			})),
		};
	},

	_createCollection: async function ({ name, parentKey }) {
		if (!name || typeof name != 'string') {
			throw new AgentError(400, 'name is required');
		}
		let collection = new Zotero.Collection();
		collection.libraryID = 1;
		collection.name = name;
		if (parentKey) {
			let parent = Zotero.Collections.getByLibraryAndKey(1, parentKey);
			if (!parent) throw new AgentError(404, `Unknown collection: ${parentKey}`);
			collection.parentID = parent.id;
		}
		await collection.saveTx();
		return { key: collection.key, name: collection.name };
	},

	_addToCollection: async function ({ collectionKey, itemKeys }) {
		let collection = Zotero.Collections.getByLibraryAndKey(1, collectionKey);
		if (!collection) throw new AgentError(404, `Unknown collection: ${collectionKey}`);
		if (!Array.isArray(itemKeys) || !itemKeys.length) {
			throw new AgentError(400, 'itemKeys must be a non-empty array');
		}
		let ids = itemKeys.map(key => this._requireItem(key).id);
		await Zotero.DB.executeTransaction(async () => {
			await collection.addItems(ids);
		});
		return { collectionKey: collection.key, added: itemKeys.length };
	},

	_uiStatus: function () {
		let pane = Zotero.getActiveZoteroPane();
		if (!pane) {
			return { windowOpen: false, selected: [] };
		}
		return {
			windowOpen: true,
			selected: pane.getSelectedItems().map(item => this._summary(item)),
		};
	},

	_uiSelect: async function ({ keys }) {
		if (!Array.isArray(keys) || !keys.length) {
			throw new AgentError(400, 'keys must be a non-empty array');
		}
		let pane = await this._mainPane();
		let items = keys.map(key => this._requireItem(key));
		await pane.selectItems(items.map(item => item.id));
		return { selected: items.map(item => item.key) };
	},

	_uiOpen: async function ({ key }) {
		let item = this._requireItem(key);
		let pane = await this._mainPane();
		await pane.viewItems([item]);
		return { opened: item.key };
	},

	_uiNotify: function ({ text }) {
		if (!text || typeof text != 'string') {
			throw new AgentError(400, 'text is required');
		}
		let progressWindow = new Zotero.ProgressWindow();
		progressWindow.changeHeadline('CiteWell');
		progressWindow.addDescription(text);
		progressWindow.show();
		progressWindow.startCloseTimer(4000);
		return { shown: true };
	},

	_mainPane: async function () {
		let pane = Zotero.getActiveZoteroPane();
		if (!pane) {
			Zotero.openMainWindow();
			for (let i = 0; i < 50 && !Zotero.getActiveZoteroPane(); i++) {
				await Zotero.Promise.delay(100);
			}
			pane = Zotero.getActiveZoteroPane();
		}
		if (!pane) {
			throw new AgentError(409, 'No main window is available');
		}
		return pane;
	},

	_requireItem: function (key) {
		if (!key || typeof key != 'string') {
			throw new AgentError(400, 'key is required');
		}
		let item = Zotero.Items.getByLibraryAndKey(1, key);
		if (!item) {
			throw new AgentError(404, `Unknown item: ${key}`);
		}
		return item;
	},

	_summary: function (item) {
		return {
			key: item.key,
			version: item.version,
			itemType: item.itemType,
			title: item.getField('title'),
			date: item.getField('date') || '',
			creators: item.getCreators().map(creator => creator.lastName
				? (creator.firstName ? `${creator.lastName}, ${creator.firstName}` : creator.lastName)
				: creator.name),
		};
	},

	_applyFields: function (item, fields) {
		for (let [field, value] of Object.entries(fields)) {
			if (field == 'key' || field == 'version' || field == 'itemType') {
				continue;
			}
			if (!Zotero.ItemFields.isValidForType(field, item.itemTypeID)) {
				throw new AgentError(400, `Field '${field}' is not valid for ${item.itemType}`);
			}
			item.setField(field, value);
		}
	},

	_applyCreators: function (item, creators) {
		if (!Array.isArray(creators)) {
			throw new AgentError(400, 'creators must be an array');
		}
		item.setCreators([]);
		creators.forEach((creator, index) => {
			let value = {
				creatorType: creator.creatorType || 'author',
			};
			if (creator.name) {
				value.name = creator.name;
			}
			else {
				value.firstName = creator.firstName || '';
				value.lastName = creator.lastName || '';
			}
			item.setCreator(index, value);
		});
	},

	_applyTags: function (item, tags) {
		if (!Array.isArray(tags)) {
			throw new AgentError(400, 'tags must be an array');
		}
		for (let tag of tags) {
			if (typeof tag == 'string') {
				item.addTag(tag);
			}
			else if (tag && tag.name) {
				item.addTag(tag.name, tag.type || 0);
			}
		}
	},

	_resolveCollections: async function (collections) {
		if (!Array.isArray(collections)) {
			throw new AgentError(400, 'collections must be an array');
		}
		return collections.map(collectionKey => {
			let collection = Zotero.Collections.getByLibraryAndKey(1, collectionKey);
			if (!collection) {
				throw new AgentError(404, `Unknown collection: ${collectionKey}`);
			}
			return collection.id;
		});
	},
};

class AgentError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

Zotero.Server.Agent.Endpoint = function () {};
Zotero.Server.Agent.Endpoint.prototype = {
	supportedMethods: ["POST"],
	supportedDataTypes: ["application/json"],

	init: async function (requestData) {
		let method = null;
		try {
			if (!Zotero.Prefs.get('agent.enabled')) {
				return [403, 'application/json', JSON.stringify({
					ok: false,
					error: { code: 'disabled', message: 'Agent access is disabled in preferences' },
				})];
			}
			await Zotero.Server.Agent._checkAuth(requestData.headers);
			if (!requestData.data || typeof requestData.data != 'object') {
				throw new AgentError(400, 'A JSON body is required');
			}
			method = requestData.data.method;
			if (!method || typeof method != 'string') {
				throw new AgentError(400, 'method is required');
			}
			let result = await Zotero.Server.Agent.dispatch(method, requestData.data.params);
			await Zotero.Server.Agent.audit(method, 'ok', this._auditDetail(method, requestData.data.params));
			return [200, 'application/json', JSON.stringify({ ok: true, result })];
		}
		catch (e) {
			let status = e instanceof AgentError ? e.status : 500;
			let code = e instanceof AgentError ? 'invalid_request' : 'internal_error';
			Zotero.logError(e);
			if (method) {
				await Zotero.Server.Agent.audit(method, 'error', { status });
			}
			return [status, 'application/json', JSON.stringify({
				ok: false,
				error: { code, message: e.message },
			})];
		}
	},

	_auditDetail: function (method, params) {
		if (!params) return null;
		if (params.key) return { key: params.key };
		if (params.keys) return { keys: params.keys };
		if (params.itemType) return { itemType: params.itemType };
		if (params.identifier) return { identifier: params.identifier };
		return null;
	},
};

Zotero.Server.Endpoints["/agent/v1"] = Zotero.Server.Agent.Endpoint;
