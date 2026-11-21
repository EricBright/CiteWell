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
 * PDF.js is not part of CiteWell (D30). These no-op methods keep imports and
 * legacy callers from starting a PDF worker; no PDF page is rendered or mined.
 */
Zotero.PDFWorker = {
	async getFullText() {
		return { text: '', extractedPages: 0, totalPages: 0 };
	},

	async getStructuredDocumentText() {
		return null;
	},

	async getRecognizerData() {
		return null;
	},

	async hasAnnotations() {
		return false;
	},

	async renderAttachmentAnnotations() {
		return [];
	},

	async processCitaviAnnotations() {
		return null;
	},

	async processMendeleyAnnotations() {
		return null;
	},

	async import() {
		return false;
	},

	async export() {
		return false;
	},

	async rotatePages() {
		return false;
	},

	async deletePages() {
		return false;
	},
};
