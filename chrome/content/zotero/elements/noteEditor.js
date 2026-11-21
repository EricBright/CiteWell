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

{
	/**
	 * Read-only view for legacy itemNotes rows.
	 *
	 * CiteWell notes are Markdown file attachments (D29); this element keeps
	 * trashed or restored legacy notes readable without shipping ProseMirror,
	 * the note-editor bundle, or an editing surface.
	 */
	class NoteEditor extends XULElement {
		constructor() {
			super();
			this._mode = 'view';
			this._item = null;
			this._parentItem = null;
			this._destroyed = false;
			this._initialized = false;
			this._editorInstance = null;
			this._initPromise = Promise.resolve();
			this._onInitCallback = null;
			this._returnHandler = null;
			this._navigateHandler = null;
			this._notitle = false;
			this.displayButton = false;
			this._tabID = null;
			this.viewMode = 'library';

			this.content = MozXULElement.parseXULToFragment(`
				<vbox flex="1" style="overflow: auto; padding: 1em;">
					<description id="legacy-note-warning" class="library-muted"
						value="Read-only legacy note. Notes are now Markdown file attachments."/>
					<description id="legacy-note-title" style="font-weight: bold; font-size: 1.15em; margin: 0.5em 0;"/>
					<description id="legacy-note-body" style="white-space: pre-wrap;"/>
					<box id="links-container" hidden="true"/>
				</vbox>
			`);
		}

		connectedCallback() {
			if (this._initialized) {
				return;
			}
			this._initialized = true;
			this.append(document.importNode(this.content, true));
			this.notitle = !!this.getAttribute('notitle');
			this.refresh();
		}

		disconnectedCallback() {
			this._destroyed = true;
			if (this._editorInstance) {
				Zotero.Notes.unregisterEditorInstance(this._editorInstance);
				this._editorInstance = null;
			}
			this.replaceChildren();
		}

		destroy() {
			this._destroyed = true;
		}

		_id(id) {
			return this.querySelector(`#${id}`);
		}

		get mode() {
			return this._mode;
		}

		set mode(val) {
			this._mode = val;
			this.refresh();
		}

		get item() {
			return this._item;
		}

		set item(val) {
			if (!val) {
				this._item = null;
				this._editorInstance = null;
				this.refresh();
				return;
			}
			this._item = val;
			if (this._mode == 'edit') {
				this._mode = 'view';
			}
			this._editorInstance = {
				itemID: val.id,
				_item: val,
				viewMode: this.viewMode,
				tabID: this._tabID,
				_initPromise: Promise.resolve(),
				focus() {},
				focusToolbar() {},
				uninit() {},
				saveSync() {},
				notify() {},
				applyIncrementalUpdate() {},
				setToggleContextPaneButtonMode() {},
				_showInLibrary(ids) {
					Zotero.getMainWindow()?.ZoteroPane.selectItems(ids, true);
				},
			};
			Zotero.Notes.registerEditorInstance(this._editorInstance);
			this.refresh();
		}

		get tabID() {
			return this._tabID;
		}

		set tabID(val) {
			this._tabID = val;
			if (this._editorInstance) {
				this._editorInstance.tabID = val;
			}
		}

		get parentItem() {
			return this._parentItem;
		}

		set parentItem(val) {
			this._parentItem = val;
		}

		set notitle(val) {
			this._notitle = !!val;
		}

		set navigateHandler(val) {
			this._navigateHandler = val;
		}

		set returnHandler(val) {
			this._returnHandler = val;
		}

		refresh() {
			if (!this._initialized) {
				return;
			}
			let title = '';
			let text = '';
			if (this._item) {
				title = this._item.getNoteTitle?.() || this._item.getField?.('title') || '';
				let note = this._item.getNote?.() || '';
				try {
					let doc = new DOMParser().parseFromString(note, 'text/html');
					text = doc.body.textContent || '';
				}
				catch (e) {
					Zotero.logError(e);
					text = note;
				}
			}
			let titleNode = this._id('legacy-note-title');
			let bodyNode = this._id('legacy-note-body');
			if (titleNode) titleNode.textContent = title;
			if (bodyNode) bodyNode.textContent = text;
		}

		async save() {}

		saveSync() {
			// Read-only: nothing to write.
		}

		getCurrentInstance() {
			return null;
		}

		onInit(callback) {
			if (callback) {
				callback();
			}
		}

		async notify() {
			this.refresh();
		}

		async navigate() {}

		async focus() {}
		async focusFirst() {}
		async focusToolbar() {}
		async navigate() {}

		renderCustomHead(callback) {
			if (callback) {
				callback({ doc: document, append: () => {} });
			}
		}

		setBottomPlaceholderHeight() {}
		setContextPaneOpen() {}
		setToggleContextPaneButtonMode() {}
	}

	customElements.define("note-editor", NoteEditor);
}
