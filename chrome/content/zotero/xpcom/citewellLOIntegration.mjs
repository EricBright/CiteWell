"use strict";
/*
    CiteWell LibreOffice transport.

    Copyright © 2026 Eric Bright.
    Licensed under the GNU Affero General Public License, version 3 or later.

    The app owns the listening socket.  The Python UNO shim connects, sends a
    token-bearing hello, and then serves document commands.  Menu clicks arrive
    as transaction-0 events; everything else is request/response.
*/

const { Zotero } = ChromeUtils.importESModule("chrome://zotero/content/zotero.mjs");

const PROTOCOL = 1;
const SERVER_PORT = 23121;
const COMPAT_PORT = 19877;
const MAX_FRAME = 8 * 1024 * 1024;
const TOKEN_FILENAME = "lo-token";

let _server = null;
let _compatServer = null;
let _token = null;
let _connection = null;
let _dialogTestCount = 0;

function log(message) {
	Zotero.debug("CiteWellLO: " + message);
}

async function ensureToken() {
	if (_token) return _token;
	const path = Zotero.DataDirectory.dir + "/" + TOKEN_FILENAME;
	try {
		const existing = (await Zotero.File.getContentsAsync(path)).trim();
		if (existing) {
			_token = existing;
			return _token;
		}
	}
	catch (e) {
		// Missing token is the normal first-run case.
	}
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	_token = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
	await Zotero.File.putContentsAsync(path, _token);
	try {
		await IOUtils.setPermissions(path, 0o600);
	}
	catch (e) {
		Zotero.logError(e);
	}
	return _token;
}

class Connection {
	constructor(transport) {
		this.transport = transport;
		this.transactions = new Map();
		this.nextTransaction = 1;
		this.closed = false;
		this.header = [];
		this.frame = null;
		this.remaining = null;

		const Cc = Components.classes;
		const Ci = Components.interfaces;
		this.input = transport.openInputStream(0, 0, 0);
		this.output = transport.openOutputStream(0, 0, 0);
		this.binaryIn = Cc["@mozilla.org/binaryinputstream;1"]
			.createInstance(Ci.nsIBinaryInputStream);
		this.binaryIn.setInputStream(this.input);
		this.binaryOut = Cc["@mozilla.org/binaryoutputstream;1"]
			.createInstance(Ci.nsIBinaryOutputStream);
		this.binaryOut.setOutputStream(this.output);

		this.pump = Cc["@mozilla.org/network/input-stream-pump;1"]
			.createInstance(Ci.nsIInputStreamPump);
		this.pump.init(this.input, -1, -1, false, null);
		this.pump.asyncRead(this, null);
	}

	onStartRequest() {}

	onStopRequest() {
		this.closed = true;
		for (const { reject } of this.transactions.values()) {
			reject(new Error("CiteWell closed the LibreOffice connection."));
		}
		this.transactions.clear();
		try {
			this.input.close();
		}
		catch (e) {}
		try {
			this.output.close();
		}
		catch (e) {}
	}

	onDataAvailable(request, stream, offset, count) {
		try {
			const bytes = this.binaryIn.readByteArray(count);
			let index = 0;
			while (index < bytes.length) {
				if (this.remaining === null) {
					while (index < bytes.length && this.header.length < 8) {
						this.header.push(bytes[index++]);
					}
					if (this.header.length < 8) return;
					const view = new DataView(Uint8Array.from(this.header).buffer);
					const transaction = view.getUint32(0);
					const length = view.getUint32(4);
					if (length > MAX_FRAME) {
						this.fail(new Error("CiteWellLO: frame exceeds the size limit"));
						return;
					}
					this.frame = { transaction, bytes: [], remaining: length };
					this.remaining = length;
					this.header = [];
					if (length === 0) {
						this.deliver();
					}
				}
				else {
					const take = Math.min(this.remaining, bytes.length - index);
					for (let i = 0; i < take; i++) {
						this.frame.bytes.push(bytes[index + i]);
					}
					index += take;
					this.remaining -= take;
					if (this.remaining === 0) {
						this.deliver();
					}
				}
			}
		}
		catch (e) {
			this.fail(e);
		}
	}

	fail(error) {
		Zotero.logError(error);
		this.transport.close(Components.results.NS_ERROR_FAILURE);
	}

	deliver() {
		const { transaction, bytes } = this.frame;
		this.frame = null;
		this.remaining = null;
		let text;
		let payload;
		try {
			text = new TextDecoder().decode(Uint8Array.from(bytes));
			if (text.startsWith("ERR:")) {
				const pending = this.transactions.get(transaction);
				if (pending) {
					this.transactions.delete(transaction);
					pending.reject(new Error(text.slice(4)));
				}
				else {
					Zotero.logError(new Error("CiteWellLO: " + text.slice(4)));
				}
				return;
			}
			payload = JSON.parse(text);
		}
		catch (e) {
			this.fail(e);
			return;
		}
		this.handle(transaction, payload).catch(e => Zotero.logError(e));
	}

	async handle(transaction, payload) {
		if (transaction === 0) {
			await handleEvent(this, payload);
			return;
		}
		const pending = this.transactions.get(transaction);
		if (!pending) return;
		this.transactions.delete(transaction);
		pending.resolve(payload);
	}

	send(transaction, payload) {
		if (this.closed) throw new Error("The LibreOffice connection is closed.");
		const bytes = new TextEncoder().encode(JSON.stringify(payload));
		this.binaryOut.write32(transaction);
		this.binaryOut.write32(bytes.length);
		this.binaryOut.writeByteArray(Array.from(bytes), bytes.length);
		this.binaryOut.flush();
	}

	sendCommand(command, args) {
		const transaction = this.nextTransaction++;
		if (this.nextTransaction > 0x7fffffff) this.nextTransaction = 1;
		const promise = new Promise((resolve, reject) => {
			this.transactions.set(transaction, { resolve, reject });
		});
		this.send(transaction, [command, args]);
		return promise;
	}

	sendEvent(payload) {
		this.send(0, payload);
	}
}

/**
 * A transaction-0 message from the shim.  Menu commands run through the normal
 * integration session; "m0test" is the transport/field smoke test.
 */
async function handleEvent(connection, payload) {
	const command = payload && payload.command;
	if (!command) return;
	if (command === "done") return;
	if (command === "hello") {
		const ok = payload.protocol === PROTOCOL && payload.token === _token;
		connection.sendEvent({
			command: "helloResult",
			ok,
			protocol: PROTOCOL,
			app: Zotero.version,
			error: ok ? undefined : (payload.protocol !== PROTOCOL
				? "The CiteWell LibreOffice extension does not match this CiteWell build."
				: "CiteWell rejected the LibreOffice extension token.")
		});
		if (!ok) {
			setTimeout(() => {
				try {
					connection.transport.close(Components.results.NS_OK);
				}
				catch (e) {}
			}, 100);
		}
		return;
	}
	if (command === "m0test") {
		await runM0Test(connection);
		return;
	}
	if ((command === "m1insert" || command === "m1cancel")
			&& Services.env.get("CITEWELL_M1_TEST") === "1") {
		await runDialogTest(connection, command === "m1insert");
		return;
	}
	if ((command === "m2multi" || command === "m2style")
			&& Services.env.get("CITEWELL_M1_TEST") === "1") {
		await runM2Test(connection, command);
		return;
	}
	if (command === "m4note" && Services.env.get("CITEWELL_M1_TEST") === "1") {
		await runM4Note(connection);
		return;
	}
	if (command === "m4bib" && Services.env.get("CITEWELL_M1_TEST") === "1") {
		await runM4Bibliography(connection);
		return;
	}
	try {
		await Zotero.Integration.execCommand("LibreOffice", command, null);
	}
	catch (e) {
		Zotero.logError(e);
	}
	connection.sendEvent({ command: "done" });
}

async function waitForIntegrationWindow(timeout = 15000) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const win = Zotero.Integration.currentWindow;
		if (win && !win.closed) return win;
		await Zotero.Promise.delay(200);
	}
	return null;
}

async function runDialogTest(connection, insert) {
	const promise = Zotero.Integration.execCommand("LibreOffice", "addEditCitation", null);
	setTimeout(async () => {
		try {
			const win = await waitForIntegrationWindow();
			if (!win) {
				log("dialog test: no citation window");
				return;
			}
			if (insert) {
				const items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID);
				const item = items.find(candidate => candidate.isRegularItem() && !candidate.deleted);
				if (!item) throw new Error("dialog test: no regular item in the library");
				const io = win.arguments[0].wrappedJSObject;
				const locator = _dialogTestCount++ === 0 ? "" : "42";
				io.citation.citationItems = [{ id: item.id, locator, label: "page" }];
				io.accept();
				log("dialog test: accepted item " + item.id);
			}
			else {
				win.close();
				log("dialog test: closed the dialog");
			}
		}
		catch (e) {
			Zotero.logError(e);
		}
	}, 2500);
	try {
		await promise;
	}
	finally {
		connection.sendEvent({ command: "done" });
	}
}

async function runM2Test(connection, command) {
	const integrationCommand = command === "m2style" ? "setDocPrefs" : "addEditCitation";
	const promise = Zotero.Integration.execCommand("LibreOffice", integrationCommand, null);
	setTimeout(async () => {
		try {
			const win = await waitForIntegrationWindow();
			if (!win) {
				log("m2 test: no dialog window");
				return;
			}
			if (command === "m2multi") {
				const items = (await Zotero.Items.getAll(Zotero.Libraries.userLibraryID))
					.filter(item => item.isRegularItem() && !item.deleted);
				if (items.length < 2) throw new Error("m2 test: need two regular items");
				const io = win.arguments[0].wrappedJSObject;
				io.citation.citationItems = [
					{ id: items[0].id, locator: "", label: "page" },
					{ id: items[1].id, locator: "5", label: "page" }
				];
				io.accept();
				log("m2 test: accepted two items");
			}
			else {
				const configurator = win.document.querySelector("#style-configurator");
				configurator.style = "http://www.zotero.org/styles/chicago-author-date";
				win.document.querySelector("dialog").acceptDialog();
				log("m2 test: switched to Chicago author-date");
			}
		}
		catch (e) {
			Zotero.logError(e);
		}
	}, 3000);
	try {
		await promise;
	}
	finally {
		connection.sendEvent({ command: "done" });
	}
}

async function runM4Bibliography(connection) {
	try {
		await Zotero.Integration.execCommand("LibreOffice", "addEditBibliography", null);
	}
	finally {
		connection.sendEvent({ command: "done" });
	}
}

async function runM4Note(connection) {
	const promise = Zotero.Integration.execCommand("LibreOffice", "addNote", null);
	setTimeout(async () => {
		try {
			const win = await waitForIntegrationWindow();
			if (!win) {
				log("m4 note test: no dialog window");
				return;
			}
			const items = (await Zotero.Items.getAll(Zotero.Libraries.userLibraryID))
				.filter(item => item.isRegularItem() && !item.deleted);
			const io = win.arguments[0].wrappedJSObject;
			io.citation.citationItems = [{ id: items[0].id, locator: "", label: "page" }];
			io.accept();
			log("m4 note test: accepted item " + items[0].id);
		}
		catch (e) {
			Zotero.logError(e);
		}
	}, 3000);
	try {
		await promise;
	}
	finally {
		connection.sendEvent({ command: "done" });
	}
}

async function runM0Test(connection) {
	const app = new Application(connection);
	const doc = await app.getActiveDocument();
	const field = await doc.insertField("ReferenceMark", 0);
	const code = JSON.stringify({
		citationItems: [{ id: "http://zotero.org/users/0/items/M0TEST" }],
		properties: { formattedCitation: "(Jillette, 2011)" }
	});
	await field.setCode(code);
	await field.setText("{\\rtf1\\ansi ({\\i Jillette}, 2011)}", true);
	const fields = await doc.getFields("ReferenceMark");
	const documentData = "m0-" + "x".repeat(600);
	await doc.setDocumentData(documentData);
	const readBack = await doc.getDocumentData();
	const problems = [];
	if (fields.length !== 1) problems.push("expected one field, found " + fields.length);
	if (fields[0] && fields[0].getCode() !== code) problems.push("code did not round-trip");
	if (fields[0] && (await fields[0].getText()) !== "(Jillette, 2011)") {
		problems.push("text did not round-trip");
	}
	if (readBack !== documentData) problems.push("document data did not round-trip");
	const ok = problems.length === 0;
	log("m0test " + (ok ? "passed" : "failed: " + problems.join("; ")));
	connection.sendEvent({
		command: "m0testResult",
		ok,
		detail: ok ? "transport and field round-trip" : problems.join("; ")
	});
	connection.sendEvent({ command: "done" });
}

class Application {
	constructor(connection) {
		this.connection = connection;
		this.primaryFieldType = "ReferenceMark";
		this.secondaryFieldType = "Bookmark";
		this.supportedNotes = ["footnote", "endnote"];
		this.supportsImportExport = true;
		this.supportsTextInsertion = true;
		this.outputFormat = "rtf";
		this.processorName = "LibreOffice";
	}

	async getActiveDocument() {
		const response = await this.connection.sendCommand("Application_getActiveDocument", [PROTOCOL]);
		if (!Array.isArray(response) || response[0] !== PROTOCOL) {
			throw new Error("The CiteWell LibreOffice extension is out of date.");
		}
		return new Document(this.connection, response[1]);
	}
}

class Document {
	constructor(connection, id) {
		this.connection = connection;
		this.id = id;
	}

	_send(command, args) {
		return this.connection.sendCommand("Document_" + command, [this.id].concat(args));
	}

	displayAlert(text, icon, buttons) {
		return this._send("displayAlert", [text, icon, buttons]);
	}

	activate() {
		return this._send("activate", []);
	}

	canInsertField(fieldType) {
		return this._send("canInsertField", [fieldType]);
	}

	cursorInField(fieldType) {
		return this._send("cursorInField", [fieldType]).then(result => {
			if (result === null) return null;
			return new Field(this.connection, this.id, result[0], result[1], result[2]);
		});
	}

	getDocumentData() {
		return this._send("getDocumentData", []);
	}

	setDocumentData(data) {
		return this._send("setDocumentData", [data]);
	}

	setBibliographyStyle(firstLineIndent, bodyIndent, lineSpacing, lineSpacingUnit, tabStops, tabStopsUnit) {
		return this._send("setBibliographyStyle", [
			firstLineIndent, bodyIndent, lineSpacing, lineSpacingUnit, tabStops, tabStopsUnit
		]);
	}

	convertPlaceholdersToFields(placeholderIDs, noteType, fieldType) {
		return this._send("convertPlaceholdersToFields", [placeholderIDs, noteType, fieldType])
			.then(result => {
				const fields = [];
				for (let i = 0; result && i < result[0].length; i++) {
					fields.push(new Field(this.connection, this.id, result[0][i], result[1][i], result[2][i]));
				}
				return fields;
			});
	}

	exportDocument(fieldType, importInstructions) {
		return this._send("exportDocument", [fieldType, importInstructions]);
	}

	importDocument() {
		return this._send("importDocument", []);
	}

	insertField(fieldType, noteType) {
		return this._send("insertField", [fieldType, parseInt(noteType) || 0]).then(result => {
			return new Field(this.connection, this.id, result[0], result[1], result[2]);
		});
	}

	getFields(fieldType) {
		return this._send("getFields", [fieldType]).then(result => {
			const fields = [];
			for (let i = 0; i < result[0].length; i++) {
				fields.push(new Field(
					this.connection,
					this.id,
					result[0][i],
					result[1][i],
					result[2][i],
					result[3] ? result[3][i] : -1
				));
			}
			return fields;
		});
	}

	insertText(text) {
		return this._send("insertText", [text]);
	}

	complete() {
		return this._send("complete", []);
	}

	cleanup() {
		return this._send("cleanup", []);
	}
}

class Field {
	constructor(connection, documentID, index, code, noteIndex, adjacent) {
		this.connection = connection;
		this.documentID = documentID;
		this.index = index;
		this._code = code;
		this.noteIndex = noteIndex;
		this.adjacent = adjacent;
	}

	getNoteIndex() {
		return this.noteIndex;
	}

	isAdjacentToNextField() {
		return this.adjacent === 0;
	}

	equals(other) {
		return this.index === other.index;
	}

	_send(command, args) {
		return this.connection.sendCommand(
			"Field_" + command,
			[this.documentID, this.index].concat(args)
		);
	}

	getCode() {
		return this._code;
	}

	async setCode(code) {
		this._code = code;
		await this._send("setCode", [code]);
		// Renaming drops the formatted text; put it back, as the reference
		// integration does.
		const start = code.indexOf("{");
		if (start === -1) return;
		let json;
		try {
			json = JSON.parse(code.substring(start, code.lastIndexOf("}") + 1));
		}
		catch (e) {
			return;
		}
		let text = json.properties && json.properties.formattedCitation;
		if (!text) return;
		let rich = false;
		if (text.includes("\\")) {
			if (text.substr(0, 5) !== "{\\rtf") text = "{\\rtf " + text + "}";
			rich = true;
		}
		await this.setText(text, rich);
	}

	getText() {
		return this._send("getText", []);
	}

	setText(text, isRich) {
		return this._send("setText", [text, !!isRich]);
	}

	removeCode() {
		return this._send("removeCode", []);
	}

	delete() {
		return this._send("delete", []);
	}

	select() {
		return this._send("select", []);
	}

	convert(fieldType, noteType) {
		return this._send("convert", [fieldType, noteType]);
	}
}

function startCompatServer() {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const server = Cc["@mozilla.org/network/server-socket;1"].createInstance(Ci.nsIServerSocket);
	try {
		server.init(COMPAT_PORT, true, -1);
	}
	catch (e) {
		log("compatibility port unavailable: " + e.message);
		return null;
	}
	server.asyncListen({
		onSocketAccepted(socket, transport) {
			// An older shim.  Close the probe; the current shim uses 23121.
			transport.close(Components.results.NS_OK);
		},
		onStopListening() {}
	});
	return server;
}

export var CiteWellLOIntegration = {
	getApplication() {
		if (!_connection) {
			throw new Error("CiteWell is not connected to LibreOffice.");
		}
		return new Application(_connection);
	},

	async init() {
		if (Zotero.test || _server) return;
		_token = await ensureToken();
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const server = Cc["@mozilla.org/network/server-socket;1"].createInstance(Ci.nsIServerSocket);
		try {
			server.init(SERVER_PORT, true, 1);
		}
		catch (e) {
			Zotero.logError(new Error(
				"CiteWell could not listen for LibreOffice on 127.0.0.1:23121: " + e.message
			));
			return;
		}
		server.asyncListen({
			onSocketAccepted(socket, transport) {
				if (_connection) {
					try {
						_connection.transport.close(Components.results.NS_OK);
					}
					catch (e) {}
				}
				log("connection accepted");
				_connection = new Connection(transport);
			},
			onStopListening() {
				log("server stopped");
			}
		});
		_server = server;
		_compatServer = startCompatServer();
		log("listening on 127.0.0.1:" + SERVER_PORT);
	}
};
