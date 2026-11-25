import { Zotero } from "chrome://zotero/content/zotero.mjs";

export const TranslationManager = new (class {
	_registeredRemoteTranslates = new Map();
	
	add(id, remoteTranslate) {
		this._registeredRemoteTranslates.set(id, {
			remoteTranslate,
			translatorProvider: null,
			handlers: {},
		});
	}
	
	remove(id) {
		this._registeredRemoteTranslates.delete(id);
	}
	
	getTranslatorProvider(id) {
		return this._registeredRemoteTranslates.get(id)?.translatorProvider || null;
	}
	
	setTranslatorProvider(id, provider) {
		this._registeredRemoteTranslates.get(id).translatorProvider = provider;
	}
	
	setHandler(id, name, handler) {
		if (this._registeredRemoteTranslates.get(id).handlers[name]) {
			this._registeredRemoteTranslates.get(id).handlers[name] = [
				...this._registeredRemoteTranslates.get(id).handlers[name],
				handler
			];
		}
		else {
			this._registeredRemoteTranslates.get(id).handlers[name] = [handler];
		}
	}
	
	removeHandler(id, name, handler) {
		this._registeredRemoteTranslates.get(id).handlers[name]
			= this._registeredRemoteTranslates.get(id).handlers[name]?.filter(h => h !== handler);
	}

	clearHandlers(id, name) {
		this._registeredRemoteTranslates.get(id).handlers[name] = null;
	}

	async runHandler(id, name, ...args) {
		let registered = this._registeredRemoteTranslates.get(id);
		// A disposed RemoteTranslate can still receive in-flight calls from the page (a
		// detection cancelled by closing the tab, for example). There is no consumer left,
		// so drop them instead of throwing across the actor boundary.
		if (!registered) {
			return null;
		}
		let remoteTranslate = registered.remoteTranslate;
		let handlers = registered.handlers[name];
		let returnValue = null;
		if (handlers) {
			for (let handler of handlers) {
				try {
					// 'select' wants a callback for some reason
					if (name === 'select') {
						let items = args[0];
						returnValue = await new Promise(resolve => handler(remoteTranslate, items, resolve));
					}
					else {
						returnValue = await handler(remoteTranslate, ...args);
					}
				}
				catch (e) {
					Zotero.logError(e);
				}
			}
		}
		return returnValue;
	}
});

export class TranslationParent extends JSWindowActorParent {
	async receiveMessage(message) {
		let { name, data } = message;
		switch (name) {
			case 'Translators:call': {
				let { id, method, args } = data;
				let provider = TranslationManager.getTranslatorProvider(id) || Zotero.Translators;
				return provider[method](...args);
			}
			
			case 'Translate:runHandler': {
				let { id, name, arg } = data;
				return TranslationManager.runHandler(id, name, arg);
			}
		}
	}
}
