describe("Browse Tab", function () {
	var win, doc, Zotero_Tabs, Zotero_BrowseTab;

	before(async function () {
		win = await loadZoteroPane();
		doc = win.document;
		Zotero_Tabs = win.Zotero_Tabs;
		Zotero_BrowseTab = win.Zotero_BrowseTab;
	});

	after(function () {
		Zotero_Tabs.closeAll();
		win.close();
	});

	beforeEach(function () {
		Zotero_Tabs.closeAll();
	});

	describe("URL normalization", function () {
		it("should accept an explicit https URL unchanged", function () {
			assert.equal(
				Zotero_BrowseTab.normalizeURL("https://example.com/x?a=1"),
				"https://example.com/x?a=1"
			);
		});

		it("should accept an explicit http URL", function () {
			assert.equal(
				Zotero_BrowseTab.normalizeURL("http://example.org/"),
				"http://example.org/"
			);
		});

		it("should add https to a bare domain", function () {
			assert.equal(
				Zotero_BrowseTab.normalizeURL("example.com"),
				"https://example.com/"
			);
		});

		it("should treat host:port input as a destination, not a scheme", function () {
			assert.equal(
				Zotero_BrowseTab.normalizeURL("localhost:8080"),
				"https://localhost:8080/"
			);
			assert.equal(
				Zotero_BrowseTab.normalizeURL("127.0.0.1:8080"),
				"https://127.0.0.1:8080/"
			);
			assert.equal(
				Zotero_BrowseTab.normalizeURL("example.com:8443/path"),
				"https://example.com:8443/path"
			);
		});

		it("should reject non-web schemes", function () {
			let rejected = [
				"javascript:alert(1)",
				"file:///etc/passwd",
				"chrome://zotero/content/zoteroPane.xhtml",
				"resource://gre/gre.resources",
				"data:text/html,<b>x</b>",
				"view-source:https://example.com",
			];
			for (let input of rejected) {
				assert.isNull(
					Zotero_BrowseTab.normalizeURL(input),
					input + " must not be navigable"
				);
			}
		});

		it("should reject anything containing whitespace (no implicit search)", function () {
			assert.isNull(Zotero_BrowseTab.normalizeURL("hello world"));
			assert.isNull(Zotero_BrowseTab.normalizeURL("exa\tmple.com"));
			assert.isNull(Zotero_BrowseTab.normalizeURL("  "));
			assert.isNull(Zotero_BrowseTab.normalizeURL(""));
			assert.isNull(Zotero_BrowseTab.normalizeURL(undefined));
		});
	});

	describe("Tab lifecycle", function () {
		it("should open a browse tab with a remote content browser", function () {
			let id = Zotero_BrowseTab.open();
			assert.ok(id, "open() should return a tab id");

			let container = doc.getElementById(id);
			assert.isNotNull(container, "tab container should be in the deck");

			let browser = Zotero_BrowseTab.getBrowser(id);
			assert.isNotNull(browser, "tab should expose its browser");
			assert.equal(browser.parentNode, container.querySelector(".browse-tab"));
			assert.equal(browser.getAttribute("type"), "content");
			assert.isTrue(browser.hasAttribute("maychangeremoteness"));

			assert.equal(Zotero_Tabs.selectedID, id, "new tab should be selected");
			assert.isTrue(Zotero_BrowseTab.isOpen(id));
		});

		it("should show the tab in the tab bar with the webpage icon", async function () {
			let id = Zotero_BrowseTab.open();
			let tab;
			while (!tab) {
				await Zotero.Promise.delay(10);
				tab = doc.querySelector(`#tab-bar-container .tab[data-id="${id}"]`);
			}
			let icon = tab.querySelector("[data-item-type]");
			assert.isNotNull(icon, "tab should render an item-type icon");
			assert.equal(icon.getAttribute("data-item-type"), "webpage");
		});

		it("should keep independent state per tab", function () {
			let first = Zotero_BrowseTab.open();
			let second = Zotero_BrowseTab.open();
			assert.notEqual(first, second);
			assert.isTrue(Zotero_BrowseTab.isOpen(first));
			assert.isTrue(Zotero_BrowseTab.isOpen(second));
			assert.notEqual(
				Zotero_BrowseTab.getBrowser(first),
				Zotero_BrowseTab.getBrowser(second)
			);
		});

		it("should close cleanly and forget the tab's state", async function () {
			let id = Zotero_BrowseTab.open();
			Zotero_Tabs.close(id);

			await waitForCallback(() => !doc.getElementById(id), 100, 10);
			assert.isFalse(Zotero_BrowseTab.isOpen(id), "state should be torn down");
			assert.isNull(Zotero_BrowseTab.getBrowser(id));
		});

		it("should clear every browse tab's state via closeAll", function () {
			let first = Zotero_BrowseTab.open();
			let second = Zotero_BrowseTab.open();
			Zotero_Tabs.closeAll();
			assert.isFalse(Zotero_BrowseTab.isOpen(first));
			assert.isFalse(Zotero_BrowseTab.isOpen(second));
			assert.isNull(Zotero_BrowseTab.getBrowser(second));
		});

		it("should not navigate when the address bar input is rejected", function () {
			let id = Zotero_BrowseTab.open();
			assert.isFalse(Zotero_BrowseTab.navigate(id, "javascript:alert(1)"));
			assert.isFalse(Zotero_BrowseTab.navigate(id, "hello world"));
			assert.isTrue(Zotero_BrowseTab.isOpen(id), "tab stays open after rejection");
		});
	});
});
