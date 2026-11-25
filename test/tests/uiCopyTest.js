"use strict";

// Shipped copy, not code comments and not data formats (docs/ui.md, D54).
// The test runtime serves a cached locale package through chrome://, so the
// scan reads the source files the build copies. Preference panes are content,
// not locale, and are read through chrome:// as shipped.
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

	it("should keep every Docs gate step on one numbered line", async function () {
		let text = await readLocale(LOCALE_FILES[0]);
		for (let n of [1, 2, 3]) {
			let match = text.match(new RegExp(`^docs-gate-step${n} = (.+)$`, "m"));
			assert.ok(match, `docs-gate-step${n} is missing`);
			assert.match(match[1], new RegExp(`^${n}\\. `), `step ${n} is not numbered`);
			assert.notInclude(match[1], EM_DASH, `step ${n} uses an em dash`);
		}
	});
});
