const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Compile Sass with the Rust `grass` compiler through `xtask`.
 *
 * The old Node Sass implementation also wrote `.css.map` files. The app does
 * not consume CSS source maps, and grass does not expose them, so only CSS is
 * written. `xtask` removes stale maps for the files it rebuilds.
 */
async function getSass() {
	const t1 = Date.now();
	const result = spawnSync(
		process.env.CARGO || 'cargo',
		['run', '--quiet', '--manifest-path', path.join(ROOT, 'tools/Cargo.toml'), '-p', 'xtask', '--', 'sass'],
		{ cwd: ROOT, encoding: 'utf8' }
	);
	if (result.stdout) {
		process.stdout.write(result.stdout);
	}
	if (result.stderr) {
		process.stderr.write(result.stderr);
	}
	if (result.status !== 0) {
		throw new Error(`xtask sass failed with exit code ${result.status}`);
	}
	const match = result.stdout && result.stdout.match(/sass: (\d+) files/);
	const count = match ? Number(match[1]) : 0;

	return {
		action: 'sass',
		count,
		outFiles: [],
		totalCount: count,
		processingTime: Date.now() - t1
	};
}

module.exports = getSass;

if (require.main === module) {
	(async () => {
		try {
			const result = await getSass();
			console.log(`Sass: ${result.count} files in ${result.processingTime}ms`);
		}
		catch (err) {
			process.exitCode = 1;
			console.error(err.message);
		}
	})();
}
