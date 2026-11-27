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

"use strict";

Zotero_Preferences.Agent = {
	_enabledCheckbox: null,

	SKILL_URL: "https://raw.githubusercontent.com/EricBright/CiteWell/citewell/SKILL.md",
	SKILL_VIEW_URL: "https://github.com/EricBright/CiteWell/blob/citewell/SKILL.md",

	init: function () {
		this._enabledCheckbox = document.getElementById('agent-enabled');
		this._enabledCheckbox.addEventListener('command', () => this._refresh());
		this._refresh();
	},

	uninit: function () {
	},

	_refresh: async function () {
		let enabled = Zotero.Prefs.get('agent.enabled');
		let tokenField = document.getElementById('agent-token');
		let token = enabled ? await Zotero.Server.Agent.getToken() : '';
		tokenField.value = token;
		tokenField.disabled = !enabled;
		document.getElementById('agent-token-copy').disabled = !enabled;
		document.getElementById('agent-token-rotate').disabled = !enabled;
		document.getElementById('agent-setup-copy').disabled = !enabled;
		let tokenPath = document.getElementById('agent-token-path');
		document.l10n.setAttributes(tokenPath, 'agent-token-path', {
			path: Zotero.Server.Agent.tokenPath
		});
		await document.l10n.translateElements([tokenPath]);
		document.getElementById('agent-audit-path').textContent
			= Zotero.Server.Agent.auditPath;
		document.getElementById('agent-setup').value = this._setupText();
		document.getElementById('agent-skill-url').textContent = this.SKILL_URL;
	},

	_setupText: function () {
		let dataDir = Zotero.DataDirectory.dir;
		return [
			"# 1. Install the CLI from a CiteWell source checkout",
			"cargo install --path tools/cli",
			"",
			"# 2. Point it at this library's data directory",
			`export CITEWELL_DATA_DIR="${dataDir}"`,
			"",
			"# 3. Check the bridge",
			"citewell agent ping",
			"",
			"# 4. For an MCP client, use this command",
			"citewell mcp",
			"",
			"# HTTP equivalent (the CLI reads the token for you)",
			"curl -s http://127.0.0.1:23120/agent/v1 \\",
			'  -H "Authorization: Bearer <token>" \\',
			'  -H "X-CiteWell-Agent: 1" \\',
			'  -H "Content-Type: application/json" \\',
			`  -d '{"method":"ping","params":{}}'`,
		].join("\n");
	},

	copyToken: function () {
		let token = document.getElementById('agent-token').value;
		if (token) {
			Zotero.Utilities.Internal.copyTextToClipboard(token);
		}
	},

	copySetup: function () {
		Zotero.Utilities.Internal.copyTextToClipboard(document.getElementById('agent-setup').value);
	},

	copySkillLink: function () {
		Zotero.Utilities.Internal.copyTextToClipboard(this.SKILL_URL);
	},

	openSkill: function () {
		Zotero.launchURL(this.SKILL_VIEW_URL);
	},

	rotateToken: async function () {
		let confirmed = Zotero.Prompt.confirm({
			title: 'Regenerate agent token?',
			text: 'Agents using the current token will stop working until they read the new one.',
			button0: 'Regenerate',
			button1: 'Cancel',
		});
		if (confirmed != 0) {
			return;
		}
		await Zotero.Server.Agent.rotateToken();
		await this._refresh();
	},

	openAuditLog: async function () {
		let path = Zotero.Server.Agent.auditPath;
		if (!(await IOUtils.exists(path))) {
			await Zotero.File.putContentsAsync(path, '');
		}
		await Zotero.File.reveal(path);
	},
};
