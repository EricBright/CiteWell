"use strict";

// Shipped copy, not code comments and not data formats (docs/ui.md, D54).
// The test runtime can run under a translation (it resolves to en-GB on this
// machine), so the scan reads the en-US source files, which are the copy this
// project owns and the build copies. Preference panes are content, not locale,
// and are read through chrome:// as shipped.
const SUPPORTED_LOCALES = [
	"en-US", "en-GB", "de", "fr-FR", "es-ES", "ja-JP", "zh-CN", "zh-TW",
];
const LOCALE_FILES = [
	"chrome/locale/en-US/zotero/zotero.ftl",
	"chrome/locale/en-US/zotero/zotero.properties",
	"chrome/locale/en-US/zotero/mozilla/updates.properties",
];

function repoRoot() {
	let appDir = Services.dirsvc.get("XREExeF", Ci.nsIFile).parent.path;
	let root = PathUtils.parent(PathUtils.parent(PathUtils.parent(appDir)));
	return root;
}

async function readLocale(relative) {
	// A source build keeps chrome/ under the repository root; an installed app
	// has no source tree, and the copy scan is a development check.
	let root = repoRoot();
	return Zotero.File.getContentsAsync(`${root}/${relative}`);
}
const EM_DASH = "\u2014";

function offenders(text) {
	let found = [];
	let lines = text.split("\n");
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		// A comment is not read by the person using the app.
		if (line.trimStart().startsWith("#")) continue;
		if (line.includes(EM_DASH)) {
			found.push(`${i + 1}: ${line.trim()}`);
		}
	}
	return found;
}

describe("UI copy", function () {
	it("should carry no em dash in the shipped locale strings", async function () {
		for (let relative of LOCALE_FILES) {
			let text = await readLocale(relative);
			assert.lengthOf(
				offenders(text), 0,
				`${relative}\n${offenders(text).join("\n")}`
			);
		}
	});

	it("should carry no em dash in preference pane copy", async function () {
		await Zotero.PreferencePanes.loadBuiltInPanes();
		let panes = Zotero.PreferencePanes.builtInPanes;
		assert.isAbove(panes.length, 0, "no preference panes were loaded");
		for (let pane of panes) {
			let text = await Zotero.File.getContentsFromURLAsync(pane.src);
			assert.lengthOf(
				offenders(text),
				0,
				`${pane.src}\n${offenders(text).join("\n")}`
			);
		}
	});

	it("should keep the Docs handoff generic and the reason specific", async function () {
		let text = await readLocale(LOCALE_FILES[0]);
		let open = text.match(/^docs-gate-open = (.+)$/m);
		assert.ok(open, "docs-gate-open is missing");
		assert.notInclude(open[1], "Firefox", "the button opens whatever browser is configured");
		assert.include(open[1].toLowerCase(), "browser");
		let title = text.match(/^docs-gate-title = (.+)$/m);
		assert.ok(title, "docs-gate-title is missing");
		assert.include(title[1], "Firefox", "the reason names Firefox because it is specific");
	});

	it("should send the Docs gate to the Connector page", async function () {
		let text = await Zotero.File.getContentsAsync(
			`${repoRoot()}/chrome/content/zotero/browseDocsGate.js`
		);
		assert.include(text, "https://www.zotero.org/download/connectors");
		assert.notInclude(text, "https://www.zotero.org/download\"");
	});

	it("should keep every Docs gate step on one numbered line", async function () {
		let text = await readLocale(LOCALE_FILES[0]);
		for (let n of [1, 2, 3]) {
			let match = text.match(new RegExp(`^docs-gate-step${n} = (.+)$`, "m"));
			assert.ok(match, `docs-gate-step${n} is missing`);
			assert.match(match[1], new RegExp(`^${n}\\. `), `step ${n} is not numbered`);
			assert.notInclude(match[1], EM_DASH, `step ${n} uses an em dash`);
		}
	});

	it("should keep the empty library to one welcome line", async function () {
		// The removed instructions named a connector that no longer exists and
		// linked to Zotero's Quick Start Guide. Guidance lives in the Help menu.
		let copy = await readLocale("chrome/locale/en-US/zotero/zotero.properties");
		assert.notInclude(copy, "pane.items.intro.text2");
		assert.notInclude(copy, "pane.items.intro.text3");
		let source = await readLocale("chrome/content/zotero/collectionViewItemTree.js");
		assert.notInclude(source, "pane.items.intro.text2");
		assert.notInclude(source, "pane.items.intro.text3");
		assert.include(source, "pane.items.intro.text1");
	});

	it("should send Help to CiteWell's own page", async function () {
		// Zotero's support site would answer for a different product.
		assert.equal(Zotero.HELP_URL, "https://github.com/EricBright/CiteWell");
		let source = await readLocale("chrome/content/zotero/standalone/standalone.js");
		assert.include(source, "Zotero.HELP_URL");
	});

	it("should send problem reports to CiteWell's tracker", async function () {
		assert.equal(
			Zotero.REPORT_PROBLEM_URL,
			"https://github.com/EricBright/CiteWell/issues/new"
		);
		let pane = await readLocale("chrome/content/zotero/zoteroPane.xhtml");
		assert.include(pane, 'data-l10n-id="report-problem-menuitem"');
		assert.notInclude(pane, "&helpReportErrors.label;");
		let fluent = await readLocale(LOCALE_FILES[0]);
		assert.include(fluent, "report-problem-menuitem");
		let source = await readLocale("chrome/content/zotero/zoteroPane.js");
		assert.include(source, "Zotero.REPORT_PROBLEM_URL");
		let copy = await readLocale("chrome/locale/en-US/zotero/zotero.properties");
		assert.include(copy, "reportProblem.copyFailed");
		// The inherited wizard posted the log to repo.zotero.org; no reachable path
		// may still open it.
		assert.notInclude(source, "errorReport.xhtml");
	});

	it("should keep the local API beside agent access", async function () {
		let agent = await readLocale(
			"chrome/content/zotero/preferences/preferences_agent.xhtml"
		);
		assert.include(agent, 'id="zotero-prefpane-agent-enable-local-api"');
		assert.include(agent, 'id="zotero-prefpane-agent-local-api-clear"');
		let advanced = await readLocale(
			"chrome/content/zotero/preferences/preferences_advanced.xhtml"
		);
		assert.notInclude(advanced, "enable-local-api");
		assert.notInclude(advanced, "httpServer.localAPI.enabled");
	});

	it("should keep the connector explanation in Settings", async function () {
		assert.equal(
			Zotero.CONNECTORS_URL,
			"https://www.zotero.org/download/connectors"
		);
		let manifest = JSON.parse(await readLocale("resource/settings/panes.json"));
		let section = (manifest.sections || []).find(
			entry => entry.id === "browser-connector"
		);
		assert.ok(section, "the connector section is missing from the catalog");
		assert.equal(section.paneId, "zotero-prefpane-integrations");
		let itemIDs = (section.items || []).map(item => item.id);
		assert.include(itemIDs, "browser-connector-body1");
		assert.include(itemIDs, "browser-connector-download");
		let pane = await readLocale(
			"chrome/content/zotero/preferences/preferences_integrations.xhtml"
		);
		assert.notInclude(pane, "connector-download");
		assert.notInclude(pane, "zotero-prefpane-integrations-connector");
		let advanced = await readLocale(
			"chrome/content/zotero/preferences/preferences_advanced.xhtml"
		);
		assert.notInclude(advanced, "connector-download");
		let menu = await readLocale("chrome/content/zotero/zoteroPane.xhtml");
		assert.notInclude(menu, "installConnector");
		let prompt = await readLocale(
			"chrome/content/zotero/xpcom/server/server_connector.js"
		);
		assert.notInclude(prompt, "CONNECTORS_URL");
		assert.include(prompt, "openPreferences('zotero-prefpane-integrations')");
		for (let locale of SUPPORTED_LOCALES) {
			let properties = await readLocale(
				`chrome/locale/${locale}/zotero/zotero.properties`
			);
			assert.notInclude(
				properties, "connector.section.",
				`${locale} still carries the old connector strings`
			);
			let fluent = await readLocale(
				`chrome/locale/${locale}/zotero/preferences.ftl`
			);
			for (let key of [
				"browser-connector-title",
				"browser-connector-body1",
				"browser-connector-body2",
				"browser-connector-download",
			]) {
				assert.include(fluent, key, `${locale} is missing ${key}`);
			}
		}
	});

	it("should send help to CiteWell's own community", async function () {
		assert.equal(
			Zotero.DISCUSSIONS_URL,
			"https://github.com/EricBright/CiteWell/discussions"
		);
		let pane = await readLocale("chrome/content/zotero/zoteroPane.xhtml");
		assert.include(pane, 'id="discussions"');
		assert.notInclude(pane, "troubleShooting");
		assert.notInclude(pane, "feedbackPage");
		assert.notInclude(pane, "post-upgrade-container");
		let advanced = await readLocale(
			"chrome/content/zotero/preferences/preferences_advanced.js"
		);
		assert.notInclude(advanced, "zotero_data");
		let wizard = await readLocale("chrome/content/zotero/import/importWizard.xhtml");
		assert.notInclude(wizard, "mendeley_import");
	});

	it("should not link Mendeley import to Zotero help", async function () {
		for (let locale of SUPPORTED_LOCALES) {
			let fluent = await readLocale(`chrome/locale/${locale}/zotero/zotero.ftl`);
			let line = fluent.split("\n").find(
				candidate => candidate.trimStart().startsWith("import-mendeley-encrypted")
			);
			if (!line) continue;
			assert.notInclude(line, "Zotero", `${locale}: Mendeley error`);
			assert.include(fluent, "ask-question-menuitem", `${locale}: no question label`);
		}
	});

	it("should not call the app Zotero in any supported locale", async function () {
		// The strings name the application itself, not an upstream service or an
		// inherited identifier. Zotero here is the previous product's name.
		let keys = [
			"general.operationInProgress",
			"pane.items.attach.link.uri.unrecognized",
			"startupError.databaseInUse",
			"startupError.zoteroVersionIsOlder",
			"db.integrityCheck.failed",
			"db.integrityCheck.repairAttempt",
			"db.integrityCheck.errorsFixed",
			"db.integrityCheck.errorsNotFixed",
			"db.integrityCheck.reportInForums",
			"report.title.default",
			"lookup.failure.description",
			"lookup.failureToID.description",
			"styles.editor.warning.noItems",
			"styles.preview.instructions",
			"styles.validationWarning",
			"standalone.rootWarning",
			"proxies.recognized.message",
			"standalone.addonInstallationFailed.body",
			"upgrade.nonupgradeableDB1",
			"upgrade.nonupgradeableDB2",
			"upgrade.failed",
			"upgrade.dbUpdateRequired",
			"upgrade.integrityCheckFailed",
			"upgrade.couldNotMigrate",
			"ingester.scrapeErrorDescription.previousError",
		];
		let entities = [
			["csledit.dtd", "styles.editor"],
			["cslpreview.dtd", "styles.preview"],
			["preferences.dtd", "zotero.preferences.title"],
		];
		for (let locale of SUPPORTED_LOCALES) {
			let properties = await readLocale(
				`chrome/locale/${locale}/zotero/zotero.properties`
			);
			for (let key of keys) {
				let line = properties.split("\n").find(
					candidate => candidate.trimStart().startsWith(key + " ")
						|| candidate.trimStart().startsWith(key + "=")
				);
				if (!line) continue;
				assert.notInclude(line, "Zotero", `${locale}: ${key}`);
			}
			for (let [file, entity] of entities) {
				let text = await readLocale(`chrome/locale/${locale}/zotero/${file}`);
				let match = text.match(
					new RegExp(`<!ENTITY\\s+${entity}\\s+"([^"]*)"`)
				);
				if (!match) continue;
				assert.notInclude(match[1], "Zotero", `${locale}: ${file}:${entity}`);
			}
		}
	});

	it("should not call the word-processor format Zotero", async function () {
		for (let locale of SUPPORTED_LOCALES) {
			let properties = await readLocale(
				`chrome/locale/${locale}/zotero/zotero.properties`
			);
			let leftovers = properties.split("\n").filter(
				line => line.trimStart().startsWith("integration.") && line.includes("Zotero")
			);
			assert.lengthOf(leftovers, 0, `${locale}: ${leftovers.join(" | ")}`);
			let fluent = await readLocale(
				`chrome/locale/${locale}/zotero/integration.ftl`
			);
			assert.notInclude(fluent, "Zotero", `${locale}: integration.ftl`);
		}
	});

	it("should ship only the maintained locales", function () {
		assert.sameMembers(
			Services.locale.availableLocales,
			SUPPORTED_LOCALES
		);
		assert.sameMembers(
			Object.keys(Zotero.Locale.availableLocales),
			SUPPORTED_LOCALES
		);
		assert.include(SUPPORTED_LOCALES, Zotero.locale);
	});

	it("should translate the problem-report copy in every supported locale", async function () {
		let keys = [
			"reportProblem.copied",
			"reportProblem.copiedHint",
			"reportProblem.copyFailed",
			"reportProblem.copyFailedHint",
		];
		for (let locale of SUPPORTED_LOCALES) {
			let properties = await readLocale(
				`chrome/locale/${locale}/zotero/zotero.properties`
			);
			for (let key of keys) {
				assert.include(properties, key, `${locale} is missing ${key}`);
			}
			let fluent = await readLocale(`chrome/locale/${locale}/zotero/zotero.ftl`);
			assert.include(
				fluent, "report-problem-menuitem",
				`${locale} is missing the Report a Problem label`
			);
		}
	});

	it("should offer a Browse action on an empty library", async function () {
		let tree = await readLocale("chrome/content/zotero/collectionViewItemTree.js");
		assert.include(tree, "Browse the web");
		assert.include(tree, '"open-browse"');
		let itemTree = await readLocale("chrome/content/zotero/itemTree.js");
		assert.include(itemTree, '"open-browse"');
	});
});

// D63: support and help go to CiteWell's own pages, never to Zotero's support
// site. The pane registry is data, so the copy scan above cannot see it.
describe("Support links", function () {
	const REPO = "https://github.com/EricBright/CiteWell";
	const HELP_PANES = [
		"zotero-prefpane-general",
		"zotero-prefpane-account",
		"zotero-prefpane-cite",
		"zotero-prefpane-advanced",
		"zotero-subpane-reset-sync",
	];

	it("should keep every settings help link on CiteWell's pages", async function () {
		let text = await readLocale("resource/settings/panes.json");
		let panes = JSON.parse(text).panes;
		let withHelp = panes.filter(pane => pane.helpURL).map(pane => pane.id);
		for (let id of HELP_PANES) {
			assert.include(withHelp, id, `${id} lost its help link`);
		}
		for (let pane of panes) {
			if (!pane.helpURL) continue;
			assert.notInclude(
				pane.helpURL, "zotero.org",
				`${pane.id} points at Zotero's site`
			);
			assert.match(
				pane.helpURL, /^https:\/\/github\.com\/EricBright\/CiteWell(\/|$)/,
				`${pane.id} does not point at CiteWell`
			);
		}
	});

	it("should point the app's help and discussions URLs at CiteWell", async function () {
		let src = await readLocale("chrome/content/zotero/xpcom/zotero.js");
		assert.include(src, `this.HELP_URL = '${REPO}';`);
		assert.include(src, `this.DISCUSSIONS_URL = '${REPO}/discussions';`);
		// The connector page is a named exception (D63), so it stays on zotero.org.
		assert.include(
			src, "this.CONNECTORS_URL = 'https://www.zotero.org/download/connectors';"
		);
	});

	// The settings links were easy to miss because they live in data, and the
	// first sweep missed every link outside Settings. Scan the source, not the
	// rendered UI, so a new link fails here even if no test opens its dialog.
	const ALLOWLIST = new Map([
		["utilities_internal.js", "the OpenURL resolver list is fetched data, not documentation"],
		["server_localAPI.js", "matches are comments that mirror the upstream API reference"],
		["runJS.js", "developer console, not a user surface"],
	]);

	it("should not send anyone from the app to Zotero's support site", async function () {
		let files = [];
		let stack = [`${repoRoot()}/chrome/content`];
		while (stack.length) {
			let dir = stack.pop();
			for (let path of await IOUtils.getChildren(dir)) {
				let stat = await IOUtils.stat(path);
				if (stat.type === "directory") stack.push(path);
				else if (/\.(js|xhtml)$/.test(path)) files.push(path);
			}
		}
		assert.isAbove(files.length, 100, "the source scan found too few files");

		let offenders = [];
		for (let path of files) {
			let name = PathUtils.filename(path);
			if (ALLOWLIST.has(name)) continue;
			let lines = (await Zotero.File.getContentsAsync(path)).split("\n");
			for (let i = 0; i < lines.length; i++) {
				let text = lines[i].trim();
				if (text.startsWith("//") || text.startsWith("*")
						|| text.startsWith("/*") || text.startsWith("<!--")) {
					continue;
				}
				if (lines[i].includes("zotero.org/support")) {
					offenders.push(`${name}:${i + 1}`);
				}
			}
		}
		assert.lengthOf(offenders, 0, `support links remain in ${offenders.join(", ")}`);
	});
});
