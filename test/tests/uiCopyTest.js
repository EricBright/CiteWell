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

	it("should keep the connector explanation in Settings", async function () {
		assert.equal(
			Zotero.CONNECTORS_URL,
			"https://www.zotero.org/download/connectors"
		);
		let pane = await readLocale(
			"chrome/content/zotero/preferences/preferences_advanced.xhtml"
		);
		assert.include(pane, 'id="zotero-prefpane-advanced-connector"');
		assert.include(pane, 'id="connector-download"');
		let menu = await readLocale("chrome/content/zotero/zoteroPane.xhtml");
		assert.notInclude(menu, "installConnector");
		let prompt = await readLocale(
			"chrome/content/zotero/xpcom/server/server_connector.js"
		);
		assert.notInclude(prompt, "CONNECTORS_URL");
		assert.include(prompt, "zotero-prefpane-advanced");
		for (let locale of SUPPORTED_LOCALES) {
			let properties = await readLocale(
				`chrome/locale/${locale}/zotero/zotero.properties`
			);
			for (let key of [
				"connector.section.title",
				"connector.section.body1",
				"connector.section.body2",
				"connector.section.download",
			]) {
				assert.include(properties, key, `${locale} is missing ${key}`);
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
