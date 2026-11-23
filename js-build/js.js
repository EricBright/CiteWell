const globby = require('globby');
const path = require('path');
const fs = require('fs-extra');
const { comparePaths, getSignatures, compareSignatures, getFileSignature, writeSignatures, cleanUp, onSuccess, onError, onProgress } = require('./utils');
const { jsFiles, ignoreMask } = require('./config');

const ROOT = path.resolve(__dirname, '..');

/**
 * Apply the source patches that cannot live in the vendored files.
 * These were previously applied by babel-worker.js; Babel itself is gone.
 */
function applyPatches(sourcefile, contents) {
	if (comparePaths(sourcefile, 'resource/react-virtualized.js')) {
		let transformed = contents
			.replace('scrollDiv = document.createElement("div")', 'scrollDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "div")')
			.replace('document.body.appendChild(scrollDiv)', 'document.documentElement.appendChild(scrollDiv)')
			.replace('document.body.removeChild(scrollDiv)', 'document.documentElement.removeChild(scrollDiv)');
		// React 18: wrap setState in onScroll handler with ReactDOM.flushSync to avoid
		// automatic batching, which causes less frequent re-rendering on scroll.
		let onScrollSetStateChunkRegex = /(_this\.state\.isScrolling\s*\|\|\s*isScrollingChange\(!0\),\s*)(_this\.setState\s*\(\s*\{[^}]*\}\s*\))/;
		if (!onScrollSetStateChunkRegex.test(transformed)) {
			throw new Error('"_this.state.isScrolling || isScrollingChange(!0), _this.setState({" not found in react-virtualized');
		}
		return transformed.replace(onScrollSetStateChunkRegex, (_, p1, p2) => {
			return `${p1}ReactDOM.flushSync(() => ${p2})`;
		});
	}
	if (sourcefile === 'resource/SingleFile/lib/single-file.js') {
		// Use the sandbox's own Set/Map; globalThis.Set misbehaves in the
		// hidden-browser sandbox used by SingleFile.
		return contents.replace('globalThis.Set', 'Set').replace('globalThis.Map', 'Map');
	}
	if (sourcefile === 'resource/vs/language/typescript/tsWorker.js') {
		let transformed = contents.replace('function getTypeOfSymbol(symbol) {', `function getTypeOfSymbol(symbol) {
				  switch (symbol.escapedName) {
					  case "doc":
						  return getGlobalType("Document", 0, true);
					  case "url":
						  return stringType;
					  case "checkOnly":
						  return booleanType;
				  }
			`);
		if (transformed.length === contents.length) {
			throw new Error('Failed to patch tsWorker.js');
		}
		return transformed;
	}
	if (sourcefile === 'resource/monacopilot.mjs') {
		let transformed = contents.replace('from\'@monacopilot/core\'', 'from\'./monacopilot-core.mjs\'');
		if (transformed.length === contents.length) {
			throw new Error('Failed to patch monacopilot.mjs');
		}
		return `
			import { setTimeout, clearTimeout } from "resource://gre/modules/Timer.sys.mjs";
		` + transformed;
	}
	if (sourcefile === 'resource/monacopilot-core.mjs') {
		let transformed = contents.replace('api.mistral.ai', 'codestral.mistral.ai');
		if (transformed.length === contents.length) {
			throw new Error('Failed to patch monacopilot-core.mjs');
		}
		return `
			import { setTimeout, clearTimeout } from "resource://gre/modules/Timer.sys.mjs";
		` + transformed;
	}
	return contents;
}

async function getJS(source, options, signatures) {
	const t1 = Date.now();
	const matchingJSFiles = await globby(source, Object.assign({ cwd: ROOT }, options));
	const totalCount = matchingJSFiles.length;
	const outFiles = [];

	for (let f of matchingJSFiles) {
		f = path.normalize(f);
		const newFileSignature = await getFileSignature(f);
		const dest = path.join('build', f);

		if (f in signatures && compareSignatures(newFileSignature, signatures[f])) {
			try {
				await fs.access(path.join(ROOT, dest), fs.constants.F_OK);
				continue;
			}
			catch (_) {
				// File is missing from build; recreate it below.
			}
		}

		try {
			const contents = await fs.readFile(path.join(ROOT, f), 'utf8');
			const transformed = applyPatches(f, contents);
			await fs.outputFile(path.join(ROOT, dest), transformed);
			onProgress(f, dest, 'js');
			signatures[f] = newFileSignature;
			outFiles.push(dest);
		}
		catch (error) {
			throw new Error(`Failed while processing ${f}: ${error.message}`);
		}
	}

	const t2 = Date.now();
	return {
		action: 'js',
		count: outFiles.length,
		outFiles,
		totalCount,
		processingTime: t2 - t1
	};
}

module.exports = getJS;

if (require.main === module) {
	(async () => {
		try {
			const signatures = await getSignatures();
			onSuccess(await getJS(jsFiles, { ignore: ignoreMask }, signatures));
			onSuccess(await cleanUp(signatures));
			await writeSignatures(signatures);
		}
		catch (err) {
			process.exitCode = 1;
			global.isError = true;
			onError(err);
		}
	})();
}
