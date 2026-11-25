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
 * The DNS settings pane (D50). Thin view over Zotero.DNS: init() reflects the
 * recorded resolver into the radio group, choose() applies a selection.
 */
"use strict";

Zotero_Preferences.DNS = {
	init() {
		let group = document.getElementById("dns-resolver");
		if (group) {
			group.value = Zotero.DNS.resolver;
		}
	},

	uninit() {},

	choose(value) {
		Zotero.DNS.apply(value);
	},
};
