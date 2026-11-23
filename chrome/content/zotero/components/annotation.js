/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2021 Corporation for Digital Scholarship
                     Vienna, Virginia, USA
                     https://digitalscholar.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

"use strict";

function _interopDefault(mod) {
	return mod && mod.__esModule ? mod.default : mod;
}
var _import0 = require("react");
const React = _interopDefault(_import0);
var h = React.createElement;
const {
	memo,
} = _import0;
var ReactDOM = _interopDefault(require("react-dom"));
var PropTypes = _interopDefault(require("prop-types"));
var cx = _interopDefault(require("classnames"));
// This is a quick reimplementation of the annotation for use in the conflict resolution window.
// We'll want to replace this with a single component shared between the PDF reader and the rest
// of the codebase.
function AnnotationBox({
	data,
}) {
	var textStyle = {
		borderLeft: "2px solid " + data.color,
	};
	return h(
		"div",
		{
			className: "AnnotationBox",
		},
		h("div", {
			className: "title",
		}, Zotero.getString("itemTypes.annotation")),
		h(
			"div",
			{
				className: "container",
			},
			h("div", {
				className: "header",
			}, h("div", null, Zotero.Cite.getLocatorString("page"), " ", data.pageLabel)),
			data.text !== undefined
				? h("div", {
					className: "text",
					style: textStyle,
				}, data.text)
				: "",
			data.type == "image"
				// TODO: Localize
				// TODO: Render from PDF based on position, if file is the same? Or don't
				// worry about it?
				? h("div", {
					className: "image-placeholder",
				}, "[image not shown]")
				: "",
			data.comment !== undefined
				? h("div", {
					className: "comment",
				}, data.comment)
				: "",
		),
	);
}
Zotero.AnnotationBox = /*#__PURE__*/ memo(AnnotationBox);
Zotero.AnnotationBox.render = (root, props) => {
	root.render(h(AnnotationBox, props));
};
