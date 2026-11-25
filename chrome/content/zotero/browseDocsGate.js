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
	// One description per step so the numbering is a real list, not wrapped prose.
	document.getElementById("step1").textContent = ftl(
		"docs-gate-step1", "1. Open the document in Firefox."
	);
	document.getElementById("step2").textContent = ftl(
		"docs-gate-step2", "2. Install Zotero’s official Connector once, if it isn’t there."
	);
	// Zotero's connector only asks port 23119. CiteWell answers there when it could claim
	// the port, so the promise in step 3 is true only then; otherwise the connector is
	// talking to whatever else owns the port, and the step says what to do about it.
	let connectorPort = Zotero.Server && Zotero.Server.connectorPort;
	document.getElementById("step3").textContent = connectorPort
		? ftl(
			"docs-gate-step3",
			"3. Sign in to Google there. Zotero’s Connector talks to this app, so citations "
				+ "use your CiteWell library."
		)
		: ftl(
			"docs-gate-step3-busy",
			"3. Sign in to Google there. Another app has Zotero’s port, usually a running "
				+ "Zotero, so the Connector reaches that app instead. Close Zotero and restart "
				+ "CiteWell to use your CiteWell library."
		);
	let connectorLink = document.getElementById("get-connector");
	connectorLink.textContent = ftl("docs-gate-get-connector", "Get Zotero Connector");
	connectorLink.addEventListener("click", (event) => {
		event.preventDefault();
		// The connectors page, not the main download: the latter can land people on the
		// Zotero application instead of the browser extension.
		Zotero.launchURL("https://www.zotero.org/download/connectors");
	});
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
