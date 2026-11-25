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
 * Google Docs gate dialog (D47).
 *
 * Docs citation support lives in Zotero's official connector inside Firefox; the
 * in-app browser cannot run extensions. This dialog hands the URL to Firefox, or
 * lets a reader continue knowing citations will not work.
 */
"use strict";

var { Zotero } = ChromeUtils.importESModule("chrome://zotero/content/zotero.mjs");

var _args = null;
var _finished = false;

function ftl(key, fallback) {
	try {
		let result = Zotero.ftl.formatValueSync(key);
		if (result && result.value) {
			return result.value;
		}
	}
	catch (e) {
		Zotero.logError(e);
	}
	return fallback;
}

function load() {
	_args = window.arguments[0];
	document.title = ftl("docs-gate-title", "Google Docs needs Firefox");

	document.getElementById("title").textContent = ftl(
		"docs-gate-title", "Google Docs needs Firefox"
	);
	document.getElementById("body").textContent = ftl(
		"docs-gate-body",
		"Citations in Google Docs come from Zotero’s official connector, which runs inside "
			+ "Firefox. CiteWell’s built-in browser can’t run browser extensions."
	);
	document.getElementById("steps").textContent = ftl(
		"docs-gate-steps",
		"1. Open the document in Firefox.\n2. Install Zotero Connector once, if it isn’t there.\n"
			+ "3. Sign in to Google there — saves go to CiteWell automatically."
	);
	document.getElementById("open-firefox").setAttribute(
		"label", ftl("docs-gate-open", "Open in browser")
	);
	let urlField = document.getElementById("url");
	urlField.value = (_args && _args.url) || "";
	urlField.addEventListener("focus", () => urlField.select());
	document.getElementById("cancel").setAttribute(
		"label", ftl("docs-gate-cancel", "Cancel")
	);
	document.getElementById("continue").textContent = ftl(
		"docs-gate-continue", "Continue anyway (citations won’t work)"
	);
	document.getElementById("continue").addEventListener("click", (event) => {
		event.preventDefault();
		finish("continue");
	});

	window.addEventListener("keydown", (event) => {
		if (event.key == "Escape") {
			event.preventDefault();
			cancel();
		}
	});
	window.addEventListener("beforeunload", () => {
		if (!_finished) {
			_finished = true;
			_args.result = null;
		}
	});
}

function openInFirefox() {
	finish("browser");
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
