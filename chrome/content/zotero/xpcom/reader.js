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

"use strict";

/**
 * CiteWell has no PDF or EPUB reader (D30). This small compatibility surface
 * keeps the few surviving callers from loading a renderer or a reader tab.
 * Existing files open through the host application.
 */
Zotero.Reader = {
	_readers: [],

	init() {},

	getByTabID() {
		return null;
	},

	getWindowStates() {
		return [];
	},

	getAllReaders() {
		return [];
	},

	async open() {
		throw new Error('The in-app PDF reader has been removed (D30)');
	},

	async openPreview() {
		throw new Error('The in-app PDF preview has been removed (D30)');
	},

	registerEventListener() {},

	unregisterEventListener() {},

	_dispatchEvent() {},

	flushAllReaderStates() {},
};
