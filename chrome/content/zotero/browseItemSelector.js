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
 * Item picker for the Browse tab (D47 Phase 2b).
 *
 * window.arguments[0] is `{ items, target, result }`:
 *  - items: the id -> title map a web translator passed to Zotero.selectItems();
 *    a value may also be `{ title, checked }` (the connector's shape), in which case
 *    its `checked` flag is the initial state;
 *  - target: human-readable save target, shown in the intro;
 *  - result: set here. `{ id: value }` on Save, `null` on Cancel, Esc or window close.
 *
 * The dialog always writes a result exactly once, so the caller's translation can never
 * be left suspended waiting for a picker that will not answer.
 */
"use strict";

// A chrome dialog window does not inherit the app's Zotero global.
var { Zotero } = ChromeUtils.importESModule("chrome://zotero/content/zotero.mjs");

var _args = null;
var _entries = [];
var _finished = false;

function ftl(key, fallback, args) {
	try {
		let result = args
			? Zotero.ftl.formatValueSync(key, args)
			: Zotero.ftl.formatValueSync(key);
		if (result && result.value) {
			return result.value;
		}
	}
	catch (e) {
		Zotero.logError(e);
	}
	return fallback;
}

function itemTitleValue(value) {
	if (typeof value == "string") {
		return value;
	}
	if (value && typeof value == "object" && typeof value.title == "string") {
		return value.title;
	}
	return "";
}

function load() {
	_args = window.arguments[0];
	document.title = ftl("browse-picker-title", "Save to CiteWell");

	let intro = document.getElementById("intro");
	intro.textContent = ftl("browse-picker-intro", "Choose which items to save")
		+ (_args.target ? ": " + _args.target : "");

	document.getElementById("pattern").setAttribute(
		"placeholder", ftl("browse-picker-filter", "Filter items")
	);
	document.getElementById("select-all").setAttribute(
		"label", ftl("browse-picker-select-all", "Select All")
	);
	document.getElementById("deselect-all").setAttribute(
		"label", ftl("browse-picker-deselect-all", "Deselect All")
	);
	document.getElementById("cancel").setAttribute(
		"label", ftl("browse-picker-cancel", "Cancel")
	);
	document.getElementById("save").setAttribute(
		"label", ftl("browse-picker-save", "Save")
	);

	buildRows();
	updateCount();

	document.getElementById("pattern").addEventListener("input", applyFilter);
	window.addEventListener("keydown", (event) => {
		if (event.key == "Escape") {
			event.preventDefault();
			cancel();
		}
	});
	window.addEventListener("beforeunload", () => {
		// Window-manager close has no command: answer the caller rather than leave it
		// hanging on a picker that no longer exists.
		if (!_finished) {
			_finished = true;
			_args.result = null;
		}
	});

	document.getElementById("pattern").focus();
}

function buildRows() {
	let container = document.getElementById("items");
	let keys = Object.keys(_args.items || {});
	for (let key of keys) {
		let value = _args.items[key];
		let entry = {
			key,
			value,
			title: itemTitleValue(value) || key,
			checked: !!(value && typeof value == "object" && value.checked),
		};
		let checkbox = document.createXULElement("checkbox");
		checkbox.setAttribute("label", entry.title);
		checkbox.checked = entry.checked;
		checkbox.addEventListener("change", () => {
			entry.checked = checkbox.checked;
			updateCount();
		});
		entry.checkbox = checkbox;
		_entries.push(entry);
		container.appendChild(checkbox);
	}
}

function visible(entry) {
	let pattern = document.getElementById("pattern").value.trim().toLowerCase();
	if (!pattern) {
		return true;
	}
	return entry.title.toLowerCase().includes(pattern);
}

function applyFilter() {
	for (let entry of _entries) {
		// Keep checked rows visible even when filtered out, so a stray filter cannot hide
		// a selection the user is about to save.
		entry.checkbox.hidden = !visible(entry) && !entry.checkbox.checked;
	}
	updateCount();
}

function setAll(state) {
	let pattern = document.getElementById("pattern").value.trim();
	for (let entry of _entries) {
		if (pattern && !visible(entry)) {
			continue;
		}
		entry.checkbox.checked = state;
		entry.checked = state;
	}
	applyFilter();
}

function updateCount() {
	let selected = _entries.filter(entry => entry.checkbox.checked).length;
	document.getElementById("count").textContent = ftl(
		"browse-picker-count",
		selected + " of " + _entries.length + " selected",
		{ selected, total: _entries.length }
	);
	document.getElementById("save").disabled = !selected;
}

function ok() {
	let result = {};
	let selected = 0;
	for (let entry of _entries) {
		if (entry.checkbox.checked) {
			result[entry.key] = entry.value;
			selected++;
		}
	}
	finish(selected ? result : null);
}

function cancel() {
	finish(null);
}

function finish(result) {
	if (_finished) {
		return;
	}
	_finished = true;
	_args.result = result;
	window.close();
}
