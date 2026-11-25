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
 * DNS resolver settings (D50).
 *
 * CiteWell's default is Cloudflare's malware-blocking pair (1.1.1.2 / 1.0.0.2),
 * applied through Gecko's TRR machinery: encrypted DNS-over-HTTPS straight to the
 * pair's own address (`https://1.1.1.2/dns-query`), so no bootstrap round through
 * another resolver is needed and lookups never leave the encrypted channel.
 *
 * - `applyDefaults()` runs once at startup (from `Zotero.init`, right after
 *   `Prefs.init`) so a fresh profile is protected with no first-run prompt.
 * - The settings pane (`preferences_dns`) is the user-facing source of truth;
 *   choosing there calls `apply()` and records the choice in a mirror pref.
 * - Mode constants are taken symbolically from `Ci.nsIDNSService` — the same
 *   symbols the platform's own preferences UI uses — so there are no magic
 *   numbers, and dnsPrefsTest trips if the platform ever renames them.
 */
"use strict";

Zotero.DNS = new function () {
	this.MIRROR_PREF = "extensions.zotero.dns.resolver";
	this.CLOUDFLARE_URI = "https://1.1.1.2/dns-query";

	/**
	 * The recorded resolver: "cloudflare" (default) or "system".
	 * @return {"cloudflare"|"system"}
	 */
	Object.defineProperty(this, "resolver", {
		get: function () {
			return Zotero.Prefs.get(this.MIRROR_PREF, true) === "system"
				? "system"
				: "cloudflare";
		},
	});

	/**
	 * Apply a resolver choice to Gecko's TRR preferences and record it.
	 * Idempotent; the mirror pref is written every time so startup can re-assert
	 * the recorded state (the pane is the source of truth for network.trr.*).
	 *
	 * @param {"cloudflare"|"system"} value
	 */
	this.apply = function (value) {
		value = value === "system" ? "system" : "cloudflare";
		if (value === "system") {
			// Native/system DNS only — TRR off (the platform's own "Default" mode).
			Services.prefs.setIntPref("network.trr.mode", Ci.nsIDNSService.MODE_NATIVEONLY);
		}
		else {
			Services.prefs.setCharPref("network.trr.uri", this.CLOUDFLARE_URI);
			// TRR only: every lookup must answer over the encrypted channel, so the
			// malware-blocking default can never silently degrade to system DNS.
			Services.prefs.setIntPref("network.trr.mode", Ci.nsIDNSService.MODE_TRRONLY);
		}
		Zotero.Prefs.set(this.MIRROR_PREF, value, true);
	};

	/**
	 * Startup hook: enforce the recorded choice, defaulting to Cloudflare when the
	 * mirror pref has never been set (fresh profile).
	 */
	this.applyDefaults = function () {
		this.apply(this.resolver);
	};
};
