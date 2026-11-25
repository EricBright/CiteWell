"use strict";

// docs/ui.md rule 3: the Browse toolbar is the one custom-styled control, so its
// enabled and disabled text colours are checked from the stylesheet. The harness
// cannot sample rendered pixels; the colours are what the pixels are drawn from.
const SCSS = "scss/components/_browseTab.scss";

function channel(value) {
	value /= 255;
	return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
	let v = hex.replace("#", "");
	return 0.2126 * channel(parseInt(v.slice(0, 2), 16))
		+ 0.7152 * channel(parseInt(v.slice(2, 4), 16))
		+ 0.0722 * channel(parseInt(v.slice(4, 6), 16));
}

function contrast(first, second) {
	let a = luminance(first);
	let b = luminance(second);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function repoRoot() {
	return PathUtils.parent(PathUtils.parent(PathUtils.parent(
		Services.dirsvc.get("XREExeF", Ci.nsIFile).parent.path
	)));
}

describe("UI contrast", function () {
	it("should keep the Browse toolbar states at least 3:1 apart", async function () {
		let scss = await Zotero.File.getContentsAsync(`${repoRoot()}/${SCSS}`);
		let pairs = [...scss.matchAll(
			/light-dark\(color,\s*(#[0-9a-fA-F]{6}),\s*(#[0-9a-fA-F]{6})\)/g
		)].map(match => [match[1].toLowerCase(), match[2].toLowerCase()]);

		assert.isAtLeast(pairs.length, 2, "the enabled and disabled pairs must both exist");
		assert.equal(pairs.length % 2, 0, "pairs come in enabled/disabled order");
		// Each enabled pair is followed by its disabled pair, for light then dark.
		for (let i = 0; i < pairs.length; i += 2) {
			let enabled = pairs[i];
			let disabled = pairs[i + 1];
			let light = contrast(enabled[0], disabled[0]);
			let dark = contrast(enabled[1], disabled[1]);
			assert.isAtLeast(light, 3, `light theme states are ${light.toFixed(2)}:1 apart`);
			assert.isAtLeast(dark, 3, `dark theme states are ${dark.toFixed(2)}:1 apart`);
		}
	});
});
