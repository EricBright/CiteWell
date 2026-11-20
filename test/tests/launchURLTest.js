"use strict";

describe("External link launching", function () {
	it("should hand HTTP links to the configured system launcher", async function () {
		let dir = Zotero.DataDirectory.dir;
		let script = OS.Path.join(dir, "fake-open.sh");
		let output = OS.Path.join(dir, "fake-open.out");
		await Zotero.File.putContentsAsync(
			script,
			`#!/bin/sh\nprintf '%s\\n%s' "$1" "\${MOZ_LEGACY_PROFILES-unset}" > "${output}"\n`
		);
		await IOUtils.setPermissions(script, 0o755);
		OS.File.remove(output, { ignoreAbsent: true });

		let pref = Zotero.Prefs.get('fallbackLauncher.unix');
		Zotero.Prefs.set('fallbackLauncher.unix', script);
		try {
			Zotero.launchURL("https://example.com/agent-test");
			for (let i = 0; i < 50; i++) {
				if (await IOUtils.exists(output)) break;
				await Zotero.Promise.delay(100);
			}
			let launched = await Zotero.File.getContentsAsync(output);
			assert.equal(launched, "https://example.com/agent-test\nunset");
		}
		finally {
			Zotero.Prefs.set('fallbackLauncher.unix', pref);
		}
	});
});
