"use strict";

function _interopDefault(mod) {
	return mod && mod.__esModule ? mod.default : mod;
}
var VirtualizedTable = _interopDefault(require("components/virtualized-table"));
var React = _interopDefault(require("react"));
var h = React.createElement;
var ReactDOM = _interopDefault(require("react-dom"));
var tree;
var engines;
const columns = [{
	dataKey: "visible",
	type: "checkbox",
	fixedWidth: true,
	width: 28,
}, {
	dataKey: "name",
	label: "zotero.preferences.locate.name",
}, {
	dataKey: "description",
	label: "zotero.preferences.locate.description",
}];
function init() {
	engines = Zotero.LocateManager.getEngines();
	const domEl = document.querySelector("#locateManager-tree");
	return new Promise((resolve) => {
		ReactDOM.createRoot(domEl).render(h(VirtualizedTable, {
			getRowCount: () => engines.length,
			id: "locateManager-table",
			ref: (ref) => {
				tree = ref;
				resolve();
			},
			renderItem: VirtualizedTable.makeRowRenderer(getRowData),
			showHeader: true,
			multiSelect: true,
			columns: columns,
			onColumnSort: null,
			disableFontSizeScaling: true,
			getRowString: index => getRowData(index).name,
			onSelectionChange: handleSelectionChange,
			onActivate: handleActivate,
		}));
	});
}
function getRowData(index) {
	var data = {};
	columns.forEach((column) => {
		if (column.dataKey == "visible") {
			var value = !engines[index].hidden;
		}
		else {
			value = engines[index][column.dataKey];
		}
		data[column.dataKey] = value;
	});
	return data;
}

/**
 * Refreshes the list of locate engines in the locate pane
 * @param {String} name of locate engine to select
 */
function updateTree() {
	if (!tree) return;
	tree.forceUpdate(tree.invalidate);
}
function handleSelectionChange(selection) {
	document.getElementById("locateManager-delete").disabled = selection.count == 0;
}
function handleActivate(event, indices) {
	// Ignore Enter, only run on dblclick
	if (event.key) return;
	indices.forEach(index => engines[index].hidden = !engines[index].hidden);
	updateTree();
}

/**
 * Adds a new Locate Engine to the locate pane
 */
/*
function addLocateEngine() {
	// alert(Zotero.LocateManager.activeLocateEngines.join(" || "));
	var textbox = document.getElementById('locate-add-textbox');
	Zotero.LocateManager.addLocateEngine(textbox.value);

	refreshLocateEnginesList();
}
*/

function toggleLocateEngines() {
	if (!tree) return;
	const numSelected = tree.selection.count;
	const numVisible = engines.filter((_, index) => tree.selection.isSelected(index)).reduce(
		(acc, engine) => acc + (engine.hidden ? 0 : 1),
		0,
	);

	// Make all visible, unless all selected are already visible
	var hideAll = numVisible == numSelected;
	engines.forEach((engine, index) => {
		if (tree.selection.isSelected(index)) {
			engine.hidden = hideAll;
		}
	});
	updateTree();
}

/**
 * Deletes selected Locate Engines from the locate pane
 *
 * TODO: Limit to custom engines?
 */
function deleteLocateEngine() {
	engines.forEach((engine, index) => {
		if (tree.selection.isSelected(index)) {
			Zotero.LocateManager.removeEngine(engine);
		}
	});
	tree.selection.clearSelection();
	engines = Zotero.LocateManager.getEngines();
	updateTree();
}

/**
 * Restores Default Locate Engines
 */
async function restoreDefaultLocateEngines() {
	await Zotero.LocateManager.restoreDefaultEngines();
	engines = Zotero.LocateManager.getEngines();
	updateTree();
}
