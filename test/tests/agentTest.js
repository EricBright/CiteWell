"use strict";

describe("Agent bridge", function () {
	before(async function () {
		await resetDB({
			thisArg: this,
			skipBundledFiles: true
		});
	});

	it("should answer ping", async function () {
		let result = await Zotero.Server.Agent.dispatch("ping", {});
		assert.equal(result.version, 1);
		assert.equal(result.app, Zotero.appName);
		assert.include(result.capabilities, "item.create");
	});

	it("should reject a request without the agent header or token", async function () {
		let headers = { authorization: "Bearer nope" };
		let response = await Zotero.Server.Agent.Endpoint.prototype.init({
			headers,
			data: { method: "ping" }
		});
		assert.equal(response[0], 400);
	});

	it("should create, find and note an item", async function () {
		let created = await Zotero.Server.Agent.dispatch("item.create", {
			itemType: "book",
			fields: { title: "Agent bridge test", date: "2026" },
			creators: [{ creatorType: "author", firstName: "Ada", lastName: "Lovelace" }],
			tags: ["agent-test"]
		});
		assert.ok(created.key);

		let found = await Zotero.Server.Agent.dispatch("search", {
			query: "Agent bridge test",
			limit: 5
		});
		assert.equal(found.total, 1);
		assert.equal(found.items[0].key, created.key);

		let note = await Zotero.Server.Agent.dispatch("item.addNote", {
			key: created.key,
			text: "A note from the test."
		});
		let item = await Zotero.Server.Agent.dispatch("item.get", { key: created.key });
		assert.include(item.item.attachments, note.key);
		let exported = await Zotero.Server.Agent.dispatch("export.note", { key: note.key });
		assert.equal(exported.markdown, "A note from the test.");
	});

	it("should attach a file and a URL, and reject an unknown identifier", async function () {
		let created = await Zotero.Server.Agent.dispatch("item.create", {
			itemType: "book",
			fields: { title: "Attachment test" }
		});
		let path = OS.Path.join(Zotero.DataDirectory.dir, "agent-test.txt");
		await Zotero.File.putContentsAsync(path, "hello from the agent test");
		let file = await Zotero.Server.Agent.dispatch("item.attachFile", {
			key: created.key,
			path
		});
		assert.ok(file.key);
		assert.equal(file.parentKey, created.key);

		let link = await Zotero.Server.Agent.dispatch("item.attachURL", {
			key: created.key,
			url: "https://example.com/article"
		});
		assert.ok(link.key);
		assert.equal(link.parentKey, created.key);

		let item = await Zotero.Server.Agent.dispatch("item.get", { key: created.key });
		assert.include(item.item.attachments, file.key);
		assert.include(item.item.attachments, link.key);

		let error;
		try {
			await Zotero.Server.Agent.dispatch("translate.save", { identifier: "not an identifier" });
		}
		catch (e) {
			error = e;
		}
		assert.ok(error);
		assert.equal(error.status, 400);
	});

	it("should export a note as Markdown", async function () {
		let created = await Zotero.Server.Agent.dispatch("item.create", {
			itemType: "book",
			fields: { title: "Note export test" }
		});
		let note = await Zotero.Server.Agent.dispatch("item.addNote", {
			key: created.key,
			text: "# Heading\n\nHello **world**"
		});
		let exported = await Zotero.Server.Agent.dispatch("export.note", { key: note.key });
		assert.include(exported.markdown, "# Heading");
		assert.include(exported.markdown, "**world**");
	});

	it("should expose the skill from the Help menu", async function () {
		let win = await loadZoteroPane();
		try {
			assert.ok(win.document.getElementById('menu_agentSkill'));
		}
		finally {
			win.close();
		}
	});

	it("should register and load the preferences pane", async function () {
		let pane = Zotero.PreferencePanes.builtInPanes.find(p => p.id == 'zotero-prefpane-agent');
		assert.ok(pane);
		assert.equal(pane.rawLabel, "Agent access");

		let win = Zotero.Utilities.Internal.openPreferences('zotero-prefpane-agent');
		try {
			let field = null;
			for (let i = 0; i < 50 && !field; i++) {
				await Zotero.Promise.delay(100);
				field = win.document.getElementById('agent-token');
			}
			assert.ok(field, "token field was not rendered");
			assert.equal(field.value, await Zotero.Server.Agent.getToken());

			let skillURL = win.document.getElementById('agent-skill-url');
			assert.ok(skillURL);
			assert.include(skillURL.textContent, 'SKILL.md');
		}
		finally {
			win.close();
		}
	});
});
