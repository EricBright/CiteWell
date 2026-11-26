"use strict";

describe("Self-updater", function () {
	describe("restart arguments", function () {
		var originalMarker;

		beforeEach(function () {
			originalMarker = Services.env.get("CITEWELL_NO_INTEGRATION");
			Services.env.set("CITEWELL_NO_INTEGRATION", "");
		});

		afterEach(function () {
			Services.env.set("CITEWELL_NO_INTEGRATION", originalMarker || "");
		});

		it("should keep the profile, the library and no-remote", function () {
			// The test runner itself starts the app with -datadir.
			var args = Zotero.getUpdateRestartArgs();
			assert.deepEqual(
				args.slice(0, 2),
				["-profile", Services.dirsvc.get("ProfD", Ci.nsIFile).path]
			);
			assert.deepEqual(args.slice(2, 4), ["-datadir", Zotero.DataDirectory.dir]);
			assert.equal(args[4], "-no-remote");
			// Nothing else is copied from this process's command line by default: the
			// restart is a fresh launch, not a resume of a particular debug session.
			assert.notInclude(args, "--no-integration");
		});

		it("should not invent a data directory the original launch did not have", function () {
			// The launcher installs attention integration whenever it sees an explicit
			// -datadir. A restart that added one would install it for someone who
			// launched without a data directory and never asked for integration.
			var original = Zotero.forceDataDir;
			try {
				Zotero.forceDataDir = false;
				var args = Zotero.getUpdateRestartArgs();
				assert.notInclude(args, "-datadir");
				assert.equal(args[0], "-profile");
				assert.equal(args[1], Services.dirsvc.get("ProfD", Ci.nsIFile).path);
				assert.equal(args[2], "-no-remote");
			}
			finally {
				Zotero.forceDataDir = original;
			}
		});

		it("should pass on an explicit --no-integration", function () {
			// The launcher strips the flag before starting the app and records the
			// decision in the environment. Without this, a restart would install the
			// systemd integration the user declined.
			Services.env.set("CITEWELL_NO_INTEGRATION", "1");
			assert.include(Zotero.getUpdateRestartArgs(), "--no-integration");
		});

		it("should ignore any other value of the marker", function () {
			Services.env.set("CITEWELL_NO_INTEGRATION", "0");
			assert.notInclude(Zotero.getUpdateRestartArgs(), "--no-integration");
		});
	});
});
