"use strict";

function _interopDefault(mod) {
	return mod && mod.__esModule ? mod.default : mod;
}
var React = _interopDefault(require("react"));
var h = React.createElement;
var ReactDOM = _interopDefault(require("react-dom"));
var ProgressQueueTable = _interopDefault(require("components/progressQueueTable"));
let _progressQueue;
function _init() {
	var io = window.arguments[0];
	_progressQueue = io.progressQueue;
	document.title = Zotero.getString(_progressQueue.getTitle());
	const domEl = document.querySelector("#tree");
	ReactDOM.createRoot(domEl).render(h(ProgressQueueTable, {
		onActivate: _handleActivate,
		progressQueue: _progressQueue,
	}));
}

/**
 * Focus items in Zotero library when double-clicking them in the Retrieve
 * metadata window.
 * @param {Event} event
 * @param {Number[]} indices to activate
 * @private
 */
async function _handleActivate(event, indices) {
	if (event && event.type === "dblclick") {
		let itemID = _progressQueue.getRows()[indices[0]].id;
		if (!itemID) return;
		let item = await Zotero.Items.getAsync(itemID);
		if (!item) return;
		if (item.parentItemID) itemID = item.parentItemID;
		let win = Services.wm.getMostRecentWindow("navigator:browser");
		if (win) {
			win.ZoteroPane.selectItem(itemID);
			win.focus();
		}
	}
}
