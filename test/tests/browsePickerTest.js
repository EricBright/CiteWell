"use strict";

// The Browse tab's 2b item picker. The dialog is opened non-modally here; the app
// opens it modally, which a test cannot do without blocking itself.
const PICKER_URL = "chrome://zotero/content/browseItemSelector.xhtml";

async function waitFor(check, message, timeout = 5000) {
	let start = Date.now();
	while (Date.now() - start < timeout) {
		if (check()) return;
		await Zotero.Promise.delay(25);
	}
	throw new Error(message);
}

let pickerCount = 0;

function openPicker(args) {
	// A unique name, or Gecko reuses a window that is still closing.
	let win = window.openDialog(
		PICKER_URL,
		`citewell-browse-picker-test-${++pickerCount}`,
		"chrome,centerscreen,resizable",
		args
	);
	return win;
}

async function loaded(win) {
	// openDialog returns before the URL loads; readyState belongs to about:blank.
	await waitFor(() => win.document?.getElementById?.("pattern"), "the picker did not load");
}

async function checkBox(win, index) {
	let boxes = win.document.querySelectorAll("#items checkbox");
	assert.isAbove(boxes.length, index, "the row must exist");
	boxes[index].checked = true;
	boxes[index].dispatchEvent(new win.Event("change", { bubbles: true }));
}

describe("Browse item picker", function () {
	it("should focus the filter and keep Save disabled until something is checked", async function () {
		let args = { items: { A: "Alpha", B: "Beta" }, target: "Example", result: null };
		let win = openPicker(args);
		try {
			await loaded(win);
			win.focus();
			await Zotero.Promise.delay(100);
			assert.equal(win.document.activeElement, win.document.getElementById("pattern"));
			assert.isTrue(win.document.getElementById("save").disabled);
			assert.equal(win.document.getElementById("count").textContent, "0 of 2 selected");

			await checkBox(win, 0);
			assert.isFalse(win.document.getElementById("save").disabled);
			assert.equal(win.document.getElementById("count").textContent, "1 of 2 selected");
		}
		finally {
			if (!win.closed) win.close();
		}
	});

	it("should hide filtered rows but never a checked one", async function () {
		let args = {
			items: { A: "Alpha", B: "Beta", C: { title: "Gamma", checked: true } },
			target: "Example",
			result: null,
		};
		let win = openPicker(args);
		try {
			await loaded(win);
			let pattern = win.document.getElementById("pattern");
			pattern.value = "alp";
			pattern.dispatchEvent(new win.Event("input", { bubbles: true }));

			let boxes = win.document.querySelectorAll("#items checkbox");
			assert.isFalse(boxes[0].hidden, "Alpha matches the filter");
			assert.isTrue(boxes[1].hidden, "Beta does not match");
			assert.isFalse(boxes[2].hidden, "a checked row stays visible");
		}
		finally {
			if (!win.closed) win.close();
		}
	});

	it("should cancel with Escape and leave no result", async function () {
		let args = { items: { A: "Alpha" }, target: "Example", result: null };
		let win = openPicker(args);
		try {
			await loaded(win);
			win.document.dispatchEvent(new win.KeyboardEvent("keydown", {
				key: "Escape",
				bubbles: true,
				cancelable: true,
			}));
			await waitFor(() => win.closed, "the picker must close");
			assert.isNull(args.result, "Escape must answer the caller with null");
		}
		finally {
			if (!win.closed) win.close();
		}
	});

	it("should save the checked rows", async function () {
		let args = { items: { A: "Alpha", B: "Beta" }, target: "Example", result: null };
		let win = openPicker(args);
		try {
			await loaded(win);
			await checkBox(win, 1);
			win.document.getElementById("save").doCommand();
			await waitFor(() => win.closed, "the picker must close after Save");
			assert.deepEqual(args.result, { B: "Beta" });
		}
		finally {
			if (!win.closed) win.close();
		}
	});

	it("should not save when Enter is pressed in the filter", async function () {
		// A pre-checked row plus a filter and Enter would commit silently. Save stays
		// reachable by Tab or the platform default button instead (D55).
		let args = {
			items: { A: { title: "Alpha", checked: true } },
			target: "Example",
			result: null,
		};
		let win = openPicker(args);
		try {
			await loaded(win);
			let pattern = win.document.getElementById("pattern");
			pattern.dispatchEvent(new win.KeyboardEvent("keydown", {
				key: "Enter",
				bubbles: true,
				cancelable: true,
			}));
			await Zotero.Promise.delay(50);
			assert.isFalse(win.closed, "Enter in the filter must not close the picker");
			assert.isNull(args.result, "Enter in the filter must not answer the caller");
			assert.isFalse(win.document.getElementById("save").disabled);
		}
		finally {
			if (!win.closed) win.close();
		}
	});
});
