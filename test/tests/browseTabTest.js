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

			// The address bar must be a rendering HTML input — bare XUL <textbox> attaches
			// but does not draw on this platform (regression caught in the AppImage).
			let urlbar = container.querySelector(".browse-urlbar");
			assert.isNotNull(urlbar, "address bar element should exist");
			assert.equal(urlbar.localName, "input", "address bar must be an HTML input");
			assert.equal(urlbar.namespaceURI, "http://www.w3.org/1999/xhtml");
			assert.equal(doc.activeElement, urlbar, "address bar should take focus on open");

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

		it("should offer a + button in the tab bar that opens another browse tab", async function () {
			Zotero_BrowseTab.open();
			let button;
			while (!button) {
				await Zotero.Promise.delay(10);
				button = doc.querySelector("#tab-bar-container .tab-add");
			}
			assert.isNotNull(button, "+ button should render in the tab strip");
			assert.ok(button.getAttribute("aria-label"), "+ button should be labeled");

			button.click();
			const count = () => Zotero_Tabs._tabs.filter((t) => t.type === "browse").length;
			await waitForCallback(() => count() >= 2, 100, 10);
			assert.equal(count(), 2, "clicking + should open a second browse tab");
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

		it("should focus and select the address bar text", function () {
			let id = Zotero_BrowseTab.open();
			let urlbar = doc.getElementById(id).querySelector(".browse-urlbar");
			urlbar.value = "https://example.com/x";

			assert.isTrue(Zotero_BrowseTab.focusURLBar(id));
			assert.equal(doc.activeElement, urlbar);
			assert.equal(urlbar.selectionStart, 0);
			assert.equal(urlbar.selectionEnd, urlbar.value.length);
		});

		it("should reuse the selected browse tab from focusOrOpen", function () {
			let id = Zotero_BrowseTab.open();
			assert.equal(Zotero_BrowseTab.focusOrOpen(), id, "should not open a second tab");
			assert.equal(Zotero_Tabs.selectedID, id);
		});

		it("should open a browse tab from focusOrOpen when the library is selected", function () {
			Zotero_Tabs.select("zotero-pane");
			let id = Zotero_BrowseTab.focusOrOpen();
			assert.isTrue(Zotero_BrowseTab.isOpen(id));
			assert.equal(Zotero_Tabs.selectedID, id);
			assert.equal(doc.activeElement, doc.getElementById(id).querySelector(".browse-urlbar"));
		});

		it("should not navigate when the address bar input is rejected", function () {
			let id = Zotero_BrowseTab.open();
			assert.isFalse(Zotero_BrowseTab.navigate(id, "javascript:alert(1)"));
			assert.isFalse(Zotero_BrowseTab.navigate(id, "hello world"));
			assert.isTrue(Zotero_BrowseTab.isOpen(id), "tab stays open after rejection");
		});
	});

	describe("Google Docs gate", function () {
		const DOCS_URL = "https://docs.google.com/document/d/abc123/edit";

		it("should recognise only document URLs as Docs", function () {
			assert.isTrue(Zotero_BrowseTab.isDocsURL(DOCS_URL));
			assert.equal(Zotero_BrowseTab.docsURLKey(DOCS_URL), "abc123");
			assert.equal(
				Zotero_BrowseTab.docsURLKey(DOCS_URL + "?tab=t.0#heading=h.1"),
				"abc123",
				"query and fragment must not change the document key"
			);
			assert.isFalse(Zotero_BrowseTab.isDocsURL("https://docs.google.com/"));
			assert.isFalse(Zotero_BrowseTab.isDocsURL("https://drive.google.com/document/d/x"));
		});

		it("should hand the URL to Firefox and not load it", function () {
			let id = Zotero_BrowseTab.open();
			let browser = Zotero_BrowseTab.getBrowser(id);
			let original = Zotero_BrowseTab._showDocsGate;
			let launch = sinon.stub(Zotero, "launchURL");
			Zotero_BrowseTab._showDocsGate = () => "browser";
			try {
				assert.isTrue(Zotero_BrowseTab.navigate(id, DOCS_URL));
				sinon.assert.calledWith(launch, DOCS_URL);
				assert.notEqual(browser.currentURI && browser.currentURI.spec, DOCS_URL);
			}
			finally {
				Zotero_BrowseTab._showDocsGate = original;
				launch.restore();
			}
		});

		it("should stay put when the gate is cancelled", function () {
			let id = Zotero_BrowseTab.open();
			let browser = Zotero_BrowseTab.getBrowser(id);
			let original = Zotero_BrowseTab._showDocsGate;
			let asked = null;
			Zotero_BrowseTab._showDocsGate = (url) => {
				asked = url;
				return null;
			};
			try {
				assert.isTrue(Zotero_BrowseTab.navigate(id, DOCS_URL));
				assert.equal(asked, DOCS_URL);
				assert.notEqual(browser.currentURI && browser.currentURI.spec, DOCS_URL);
			}
			finally {
				Zotero_BrowseTab._showDocsGate = original;
			}
		});

		it("should not gate the same document twice after continuing", function () {
			let id = Zotero_BrowseTab.open();
			let browser = Zotero_BrowseTab.getBrowser(id);
			let original = Zotero_BrowseTab._showDocsGate;
			let asked = 0;
			let loadURI = sinon.stub(browser, "loadURI");
			Zotero_BrowseTab._showDocsGate = () => {
				asked++;
				return "continue";
			};
			try {
				Zotero_BrowseTab.navigate(id, DOCS_URL);
				Zotero_BrowseTab.navigate(id, DOCS_URL + "?tab=t.0");
				assert.equal(asked, 1, "the same document must not re-open the gate");
			}
			finally {
				Zotero_BrowseTab._showDocsGate = original;
				loadURI.restore();
			}
		});

		it("should load the document when the user chooses to continue", function () {
			let id = Zotero_BrowseTab.open();
			let browser = Zotero_BrowseTab.getBrowser(id);
			let original = Zotero_BrowseTab._showDocsGate;
			let loadURI = sinon.stub(browser, "loadURI");
			Zotero_BrowseTab._showDocsGate = () => "continue";
			try {
				assert.isTrue(Zotero_BrowseTab.navigate(id, DOCS_URL));
				sinon.assert.calledOnce(loadURI);
				assert.equal(loadURI.firstCall.args[0].spec, DOCS_URL);
			}
			finally {
				Zotero_BrowseTab._showDocsGate = original;
				loadURI.restore();
			}
		});
	});

	describe("Save bridge", function () {
		const PORT = 16215;
		let httpd, baseURL, pdfURL;
		let dummyTranslator, provider;
		let multiTranslator, multiProvider;

		function saveButton(id) {
			return doc.getElementById(id).querySelector(".browse-save");
		}

		before(async function () {
			dummyTranslator = buildDummyTranslator('web', `
				function detectWeb() {
					return "book";
				}

				function doWeb() {
					var item = new Zotero.Item("book");
					item.title = document.title;
					item.complete();
				}
			`);

			multiTranslator = buildDummyTranslator('web', `
				function detectWeb() {
					return "multiple";
				}

				function doWeb() {
					Zotero.selectItems({ a: "Alpha", b: "Beta" }, function (selected) {
						if (!selected) return;
						for (let key in selected) {
							var item = new Zotero.Item("book");
							item.title = selected[key];
							item.complete();
						}
					});
				}
			`);

			multiProvider = Zotero.Translators.makeTranslatorProvider({
				get(translatorID) {
					return translatorID == multiTranslator.translatorID ? multiTranslator : false;
				},

				async getAllForType(type) {
					return type == 'web' ? [multiTranslator] : [];
				}
			});

			provider = Zotero.Translators.makeTranslatorProvider({
				get(translatorID) {
					return translatorID == dummyTranslator.translatorID ? dummyTranslator : false;
				},

				async getAllForType(type) {
					return type == 'web' ? [dummyTranslator] : [];
				}
			});

			var { HttpServer } = ChromeUtils.importESModule(
				"chrome://remote/content/server/httpd.sys.mjs"
			);
			httpd = new HttpServer();
			httpd.start(PORT);
			httpd.registerPathHandler("/save", {
				handle(request, response) {
					response.setHeader("Content-Type", "text/html; charset=utf-8");
					response.write(
						"<!DOCTYPE html><html><head><title>Browse Save Test</title></head>"
						+ "<body><h1>Save</h1></body></html>"
					);
				}
			});
			const pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
				+ "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
				+ "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\n"
				+ "trailer<</Root 1 0 R>>\n%%EOF\n";
			httpd.registerPathHandler("/paper", {
				handle(request, response) {
					response.setHeader("Content-Type", "application/pdf");
					response.write(pdf);
				}
			});
			httpd.registerPathHandler("/paper.pdf", {
				handle(request, response) {
					response.setHeader("Content-Type", "application/pdf");
					response.write(pdf);
				}
			});
			baseURL = `http://127.0.0.1:${PORT}/save`;
			pdfURL = `http://127.0.0.1:${PORT}/paper.pdf`;
		});

		after(async function () {
			await new Promise(resolve => httpd.stop(resolve));
		});

		it("should put Go beside the address bar and Save behind a divider", function () {
			let id = Zotero_BrowseTab.open();
			let container = doc.getElementById(id);
			let urlbar = container.querySelector(".browse-urlbar");
			let go = container.querySelector(".browse-go");
			let divider = container.querySelector(".browse-divider");
			let save = container.querySelector(".browse-save");
			assert.isNotNull(go, "Go button should exist");
			assert.isNotNull(divider, "divider should exist");
			assert.equal(go.previousElementSibling, urlbar, "Go should hug the address bar");
			assert.equal(go.nextElementSibling, divider);
			assert.equal(divider.nextElementSibling, save, "Save should sit past the divider");
			assert.equal(go.getAttribute("aria-label"), "Go");
			assert.isTrue(go.disabled, "Go starts disabled with an empty address bar");
		});

		it("should enable Go only while the address bar has text", function () {
			let id = Zotero_BrowseTab.open();
			let urlbar = doc.getElementById(id).querySelector(".browse-urlbar");
			let go = doc.getElementById(id).querySelector(".browse-go");
			assert.isTrue(go.disabled);
			urlbar.value = baseURL;
			urlbar.dispatchEvent(new win.Event("input", { bubbles: true }));
			assert.isFalse(go.disabled, "typing should enable Go");
			urlbar.value = "   ";
			urlbar.dispatchEvent(new win.Event("input", { bubbles: true }));
			assert.isTrue(go.disabled, "whitespace-only input should disable Go");
		});

		it("should navigate when Go is clicked", async function () {
			let id = Zotero_BrowseTab.open();
			let container = doc.getElementById(id);
			let urlbar = container.querySelector(".browse-urlbar");
			urlbar.value = baseURL;
			urlbar.dispatchEvent(new win.Event("input", { bubbles: true }));
			container.querySelector(".browse-go").click();
			let browser = Zotero_BrowseTab.getBrowser(id);
			await waitForCallback(
				() => browser.currentURI && browser.currentURI.spec === baseURL,
				100, 10
			);
			assert.equal(browser.currentURI.spec, baseURL);
		});

		it("should render a disabled Save button on a blank tab", function () {
			let id = Zotero_BrowseTab.open();
			let button = saveButton(id);
			assert.isNotNull(button, "Save button should exist in the toolbar");
			assert.isTrue(button.disabled, "Save starts disabled until a page is detected");
			assert.ok(button.getAttribute("tooltiptext"), "Save button should be labeled");
		});

		it("should detect a translator on load and enable Save", async function () {
			let id = Zotero_BrowseTab.open();
			Zotero_BrowseTab.setTranslatorProvider(id, provider);
			assert.isTrue(Zotero_BrowseTab.navigate(id, baseURL));

			let button = saveButton(id);
			await waitForCallback(() => !button.disabled, 100, 10);
			assert.isTrue(button.classList.contains("available"));
			assert.include(button.getAttribute("tooltiptext"), "Dummy Translator");
		});

		it("should save the page into the user library", async function () {
			let id = Zotero_BrowseTab.open();
			Zotero_BrowseTab.setTranslatorProvider(id, provider);
			Zotero_BrowseTab.navigate(id, baseURL);
			let button = saveButton(id);
			await waitForCallback(() => !button.disabled, 100, 10);

			button.click();
			await waitForCallback(() => button.classList.contains("saved"), 100, 10);

			let items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID, true);
			assert.isTrue(
				items.some(item => item.getField("title") === "Browse Save Test"),
				"saved item should be in the user library"
			);
		});

		it("should save only the items chosen in the picker", async function () {
			let id = Zotero_BrowseTab.open();
			Zotero_BrowseTab.setTranslatorProvider(id, multiProvider);
			Zotero_BrowseTab.navigate(id, baseURL);
			let button = saveButton(id);
			await waitForCallback(() => !button.disabled, 100, 10);

			let original = Zotero_BrowseTab._selectItemsInteractive;
			Zotero_BrowseTab._selectItemsInteractive = () => ({ a: "Alpha" });
			try {
				button.click();
				await waitForCallback(() => button.classList.contains("saved"), 100, 10);
			}
			finally {
				Zotero_BrowseTab._selectItemsInteractive = original;
			}

			let items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID, true);
			let titles = items.map(item => item.getField("title"));
			assert.include(titles, "Alpha", "checked item should be saved");
			assert.notInclude(titles, "Beta", "unchecked item should not be saved");
		});

		it("should cancel cleanly when the picker is dismissed", async function () {
			let id = Zotero_BrowseTab.open();
			Zotero_BrowseTab.setTranslatorProvider(id, multiProvider);
			Zotero_BrowseTab.navigate(id, baseURL);
			let button = saveButton(id);
			await waitForCallback(() => !button.disabled, 100, 10);

			let original = Zotero_BrowseTab._selectItemsInteractive;
			Zotero_BrowseTab._selectItemsInteractive = () => null;
			try {
				button.click();
				await waitForCallback(() => button.classList.contains("available"), 100, 10);
			}
			finally {
				Zotero_BrowseTab._selectItemsInteractive = original;
			}

			let items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID, true);
			let titles = items.map(item => item.getField("title"));
			assert.notInclude(titles, "Beta", "a cancelled picker must save nothing");
		});

		it("should not hang when the picker throws", async function () {
			let id = Zotero_BrowseTab.open();
			Zotero_BrowseTab.setTranslatorProvider(id, multiProvider);
			Zotero_BrowseTab.navigate(id, baseURL);
			let button = saveButton(id);
			await waitForCallback(() => !button.disabled, 100, 10);

			let original = Zotero_BrowseTab._selectItemsInteractive;
			Zotero_BrowseTab._selectItemsInteractive = () => {
				throw new Error("picker failed");
			};
			try {
				button.click();
				await waitForCallback(() => button.classList.contains("available"), 100, 10);
			}
			finally {
				Zotero_BrowseTab._selectItemsInteractive = original;
			}

			assert.isFalse(button.classList.contains("saving"), "save must not stay stuck");
		});

		it("should capture a PDF URL as an attachment instead of loading it", async function () {
			let id = Zotero_BrowseTab.open();
			assert.isTrue(Zotero_BrowseTab.navigate(id, pdfURL));
			let button = saveButton(id);
			await waitForCallback(() => button.classList.contains("pdf"), 100, 10);
			assert.isFalse(button.disabled, "Save should be enabled for a PDF");

			button.click();
			await waitForCallback(() => button.classList.contains("saved"), 100, 20);

			let items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID, true);
			let pdfs = items.filter(
				item => item.isAttachment() && item.attachmentContentType === "application/pdf"
			);
			assert.isTrue(pdfs.length > 0, "a PDF attachment should be saved");
			assert.isTrue(pdfs.some(item => item.getField("title") === "paper"));
		});

		it("should capture a PDF that has no .pdf suffix", async function () {
			let id = Zotero_BrowseTab.open();
			assert.isTrue(Zotero_BrowseTab.navigate(id, `http://127.0.0.1:${PORT}/paper`));
			let button = saveButton(id);
			await waitForCallback(() => button.classList.contains("pdf"), 100, 10);
			assert.isFalse(button.disabled);

			button.click();
			await waitForCallback(() => button.classList.contains("saved"), 100, 20);
			let items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID, true);
			assert.isTrue(items.some(
				item => item.isAttachment() && item.attachmentContentType === "application/pdf"
			));
		});

		it("should drop the translator and disable Save when leaving the page", async function () {
			let id = Zotero_BrowseTab.open();
			Zotero_BrowseTab.setTranslatorProvider(id, provider);
			Zotero_BrowseTab.navigate(id, baseURL);
			let button = saveButton(id);
			await waitForCallback(() => !button.disabled, 100, 10);

			let browser = Zotero_BrowseTab.getBrowser(id);
			browser.loadURI(Services.io.newURI("about:blank"), {
				triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
			});
			await waitForCallback(() => button.disabled, 100, 10);
			assert.isTrue(button.classList.contains("none"));
		});

		it("should tear down cleanly while detection is in flight", async function () {
			let id = Zotero_BrowseTab.open();
			Zotero_BrowseTab.setTranslatorProvider(id, provider);
			Zotero_BrowseTab.navigate(id, baseURL);
			Zotero_Tabs.close(id);
			await Zotero.Promise.delay(300);
			assert.isFalse(Zotero_BrowseTab.isOpen(id));
		});
	});
});
