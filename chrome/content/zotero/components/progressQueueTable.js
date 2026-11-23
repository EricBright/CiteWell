"use strict";

function _interopDefault(mod) {
	return mod && mod.__esModule ? mod.default : mod;
}
var _import0 = require("react");
const React = _interopDefault(_import0);
var h = React.createElement;
const {
	memo,
	useCallback,
	useEffect,
	useRef,
} = _import0;
var PropTypes = _interopDefault(require("prop-types"));
var {
	getCSSIcon,
} = require("components/icons");
var _import1 = require("components/virtualized-table");
const VirtualizedTable = _interopDefault(_import1);
const {
	renderCell,
} = _import1;
var {
	nextHTMLID,
	noop,
} = require("./utils");
function getImageByStatus(status) {
	let statusIconName;
	if (status === Zotero.ProgressQueue.ROW_PROCESSING) {
		statusIconName = "refresh";
	}
	else if (status === Zotero.ProgressQueue.ROW_FAILED) {
		statusIconName = "cross";
	}
	else if (status === Zotero.ProgressQueue.ROW_SUCCEEDED) {
		statusIconName = "tick";
	}
	else {
		return document.createElement("span");
	}
	const icon = getCSSIcon(statusIconName);
	icon.classList.add("icon-16");
	return icon;
}
const ProgressQueueTable = ({
	onActivate = noop,
	progressQueue,
}) => {
	const treeRef = useRef(null);
	const htmlID = useRef(nextHTMLID());
	const getRowCount = useCallback(() => progressQueue.getTotal(), [progressQueue]);
	const rowToTreeItem = useCallback((index, selection, oldDiv = null, columns) => {
		let rows = progressQueue.getRows();
		let row = rows[index];
		let div;
		if (oldDiv) {
			div = oldDiv;
			div.innerHTML = "";
		}
		else {
			div = document.createElement("div");
			div.className = "row";
		}
		div.classList.toggle("selected", selection.isSelected(index));
		for (let column of columns) {
			if (column.dataKey === "success") {
				let span = document.createElement("span");
				if (!span.documentGlobal) {
					// If this script was imported from a non-window context, we'll have a global object that looks like
					// a Window and document.createElement() will succeed, but the returned Element object won't have
					// an documentGlobal. Trying to append a child or set its innerHTML will segfault Zotero. For now,
					// let's just abort if we get an invalid Element.
					// TODO: Remove once we're using ES modules
					return div;
				}
				span.className = `cell icon ${column.className}`;
				span.appendChild(getImageByStatus(row.status));
				div.appendChild(span);
			}
			else {
				div.appendChild(renderCell(index, row[column.dataKey], column));
			}
		}
		return div;
	}, [progressQueue]);
	const columns = progressQueue.getColumns();
	const tableColumns = [{
		dataKey: "success",
		fixedWidth: true,
		width: "26",
	}, {
		dataKey: "fileName",
		label: Zotero.getString(columns[0]),
	}, {
		dataKey: "message",
		label: Zotero.getString(columns[1]),
	}];
	const refreshTree = useCallback(() => treeRef.current.invalidate(), []);
	useEffect(() => {
		progressQueue.addListener("rowadded", refreshTree);
		progressQueue.addListener("rowupdated", refreshTree);
		progressQueue.addListener("rowdeleted", refreshTree);
		return () => {
			progressQueue.removeListener("rowadded", refreshTree);
			progressQueue.removeListener("rowupdated", refreshTree);
			progressQueue.removeListener("rowdeleted", refreshTree);
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return h(VirtualizedTable, {
		getRowCount: getRowCount,
		ref: treeRef,
		id: htmlID.current + "-progress-queue-table",
		renderItem: rowToTreeItem,
		showHeader: true,
		columns: tableColumns,
		onActivate: onActivate,
	});
};
ProgressQueueTable.propTypes = {
	onActivate: PropTypes.func,
	progressQueue: PropTypes.object.isRequired,
};
module.exports = /*#__PURE__*/ memo(ProgressQueueTable);
