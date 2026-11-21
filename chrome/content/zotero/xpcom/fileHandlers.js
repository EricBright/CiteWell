/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2018 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     https://zotero.org
    
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

 

Zotero.FileHandlers = {
	async open(item) {
		let path = await item.getFilePathAsync();
		if (!path) {
			Zotero.warn(`File not found: ${item.attachmentPath}`);
			return false;
		}
		
		Zotero.debug('Opening ' + path);
		
		// CiteWell does not render PDFs or EPUBs (D30). Hand every file to the
		// host's default application; no in-app reader is opened.
		Zotero.debug('Opening with the system handler');
		Zotero.launchFile(path);
		return true;
	},

	_handlersMac: {
		pdf: [
			{
				name: /Preview/,
				fallback: true,
				async open(appPath, { filePath, page }) {
					await Zotero.Utilities.Internal.exec('/usr/bin/open', ['-a', "Preview", filePath]);
					if (page !== undefined) {
						// Go to page using AppleScript
						let args = [
							'-e', 'tell app "Preview" to activate',
							'-e', 'tell app "System Events" to keystroke "g" using {option down, command down}',
							'-e', `tell app "System Events" to keystroke "${page}"`,
							'-e', 'tell app "System Events" to keystroke return'
						];
						await Zotero.Utilities.Internal.exec('/usr/bin/osascript', args);
					}
				},
			},
			{
				name: /Adobe Acrobat/,
				async open(appPath, { filePath, page }) {
					await Zotero.Utilities.Internal.exec('/usr/bin/open', ['-a', appPath, filePath]);
					if (page !== undefined) {
						// Go to page using AppleScript
						let args = [
							'-e', `tell app "${appPath}" to activate`,
							'-e', 'tell app "System Events" to keystroke "n" using {command down, shift down}',
							'-e', `tell app "System Events" to keystroke "${page}"`,
							'-e', 'tell app "System Events" to keystroke return'
						];
						await Zotero.Utilities.Internal.exec('/usr/bin/osascript', args);
					}
				}
			},
			{
				name: /Skim/,
				async open(appPath, { filePath, page }) {
					// Escape double-quotes in path
					var quoteRE = /"/g;
					filePath = filePath.replace(quoteRE, '\\"');
					let args = [
						'-e', `tell app "${appPath}" to activate`,
						'-e', `tell app "${appPath}" to open "${filePath}"`
					];
					if (page !== undefined) {
						let filename = PathUtils.filename(filePath)
							.replace(quoteRE, '\\"');
						args.push('-e', `tell document "${filename}" of application "${appPath}" to go to page ${page}`);
					}
					await Zotero.Utilities.Internal.exec('/usr/bin/osascript', args);
				}
			},
			{
				name: /PDF Expert/,
				async open(appPath, { filePath, page }) {
					await Zotero.Utilities.Internal.exec('/usr/bin/open', ['-a', appPath, filePath]);
					// Go to page using AppleScript (same as Preview)
					let args = [
						'-e', `tell app "${appPath}" to activate`
					];
					if (page !== undefined) {
						args.push(
							'-e', 'tell app "System Events" to keystroke "g" using {option down, command down}',
							'-e', `tell app "System Events" to keystroke "${page}"`,
							'-e', 'tell app "System Events" to keystroke return'
						);
					}
					await Zotero.Utilities.Internal.exec('/usr/bin/osascript', args);
				}
			},
		],
		epub: [
			{
				name: /Calibre/i,
				async open(appPath, { filePath, location }) {
					if (!appPath.endsWith('ebook-viewer.app')) {
						appPath += '/Contents/ebook-viewer.app';
					}
					let args = ['-a', appPath, filePath];
					if (location?.position?.value) {
						args.push('--args', '--open-at=' + location.position.value);
					}
					await Zotero.Utilities.Internal.exec('/usr/bin/open', args);
				}
			},
		]
	},

	_handlersWin: {
		pdf: [
			{
				name: new RegExp(''), // Match any handler
				async open(appPath, { filePath, page }) {
					let args = [filePath];
					if (page !== undefined) {
						// Include flags to open the PDF on a given page in various apps
						//
						// Adobe Acrobat: http://partners.adobe.com/public/developer/en/acrobat/PDFOpenParameters.pdf
						// PDF-XChange: http://help.tracker-software.com/eu/default.aspx?pageid=PDFXView25:command_line_options
						args.unshift('/A', 'page=' + page);
					}
					await Zotero.FileHandlers._checkAndExecWithoutBlocking(appPath, args);
				}
			}
		],
		epub: [
			{
				name: /Calibre/i,
				async open(appPath, { filePath, location }) {
					if (appPath.toLowerCase().endsWith('calibre.exe')) {
						appPath = appPath.slice(0, -11) + 'ebook-viewer.exe';
					}
					let args = [filePath];
					if (location?.position?.value) {
						args.push('--open-at=' + location.position.value);
					}
					await Zotero.FileHandlers._checkAndExecWithoutBlocking(appPath, args);
				}
			}
		]
	},

	_handlersLinux: {
		pdf: [
			{
				name: /evince|okular/i,
				fallback: true,
				async open(appPath, { filePath, page }) {
					if (appPath) {
						switch (appPath.toLowerCase()) {
							case 'okular':
								appPath = '/usr/bin/okular';
								break;

							// It's "Document Viewer" on stock Ubuntu
							case 'document viewer':
							case 'evince':
								appPath = '/usr/bin/evince';
								break;
						}
					}
					else if (await IOUtils.exists('/usr/bin/okular')) {
						appPath = '/usr/bin/okular';
					}
					else if (await IOUtils.exists('/usr/bin/evince')) {
						appPath = '/usr/bin/evince';
					}
					else {
						throw new Error('No PDF reader found');
					}

					// TODO: Try to get default from mimeapps.list, etc., in case system default is okular
					// or evince somewhere other than /usr/bin

					let args = [filePath];
					if (page !== undefined) {
						args.unshift('-p', page);
					}
					await Zotero.FileHandlers._checkAndExecWithoutBlocking(appPath, args);
				}
			}
		],
		epub: [
			{
				name: /calibre/i,
				async open(appPath, { filePath, location }) {
					if (appPath.toLowerCase().endsWith('calibre')) {
						appPath = appPath.slice(0, -7) + 'ebook-viewer';
					}
					let args = [filePath];
					if (location?.position?.value) {
						args.push('--open-at=' + location.position.value);
					}
					await Zotero.FileHandlers._checkAndExecWithoutBlocking(appPath, args);
				}
			}
		]
	},

	_getSystemHandler(mimeType) {
		if (Zotero.isWin) {
			return this._getSystemHandlerWin(mimeType);
		}
		else {
			return this._getSystemHandlerPOSIX(mimeType);
		}
	},
	
	_getSystemHandlerWin(mimeType) {
		// Resolve the default handler via the OS shell, which reflects the
		// user's effective choice regardless of where Windows stores it
		var executable;
		try {
			let extension = Zotero.MIME.getPrimaryExtension(mimeType);
			let mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
			let mimeInfo = mimeService.getFromTypeAndExtension(mimeType, extension);
			executable = mimeInfo.defaultExecutable;
		}
		catch (e) {
			Zotero.debug("Couldn't get default executable for " + mimeType, 2);
			Zotero.debug(e, 2);
			return false;
		}
		// A Microsoft Store app resolves to its DelegateExecute COM server
		// (a DLL), which can't be launched directly -- return false so that
		// the file is opened with the system default via ShellExecute
		if (!executable.path.toLowerCase().endsWith('.exe')) {
			Zotero.debug(`Default handler ${executable.path} isn't directly launchable`);
			return false;
		}
		return executable.path;
	},
	
	_getSystemHandlerPOSIX(mimeType) {
		var handlerService = Cc["@mozilla.org/uriloader/handler-service;1"]
			.getService(Ci.nsIHandlerService);
		var handlers = handlerService.enumerate();
		var handler;
		while (handlers.hasMoreElements()) {
			let handlerInfo = handlers.getNext().QueryInterface(Ci.nsIHandlerInfo);
			if (handlerInfo.type == mimeType) {
				handler = handlerInfo;
				break;
			}
		}
		if (!handler) {
			// We can't get the name of the system default handler unless we add an entry
			Zotero.debug("Default handler not found -- adding default entry");
			let mimeService = Components.classes["@mozilla.org/mime;1"]
				.getService(Components.interfaces.nsIMIMEService);
			let mimeInfo = mimeService.getFromTypeAndExtension(mimeType, "");
			mimeInfo.preferredAction = 4;
			mimeInfo.alwaysAskBeforeHandling = false;
			handlerService.store(mimeInfo);

			// And once we do that, we can get the name (but not the path, unfortunately)
			let handlers = handlerService.enumerate();
			while (handlers.hasMoreElements()) {
				let handlerInfo = handlers.getNext().QueryInterface(Ci.nsIHandlerInfo);
				if (handlerInfo.type == mimeType) {
					handler = handlerInfo;
					break;
				}
			}
		}
		if (handler) {
			Zotero.debug(`Default handler is ${handler.defaultDescription}`);
			return handler.defaultDescription;
		}
		return false;
	},

	/**
	 * Check that a command exists and is executable, and run without waiting
	 * for it to finish
	 */
	async _checkAndExecWithoutBlocking(command, args) {
		// Run the same checks that exec() runs so that we reject if the
		// executable doesn't exist or isn't actually executable
		if (!(await OS.File.exists(command))) {
			throw new Error(`${command} not found`);
		}
		if (!Zotero.File.pathToFile(command).isExecutable()) {
			throw new Error(`${command} is not an executable`);
		}
		
		Zotero.Utilities.Internal.Environment.clearMozillaVariables();
		
		// Do not await
		Zotero.Utilities.Internal.exec(command, args);
	},
};

Zotero.OpenPDF = {
	openToPage: async function (pathOrItem, page, annotationKey) {
		Zotero.warn('Zotero.OpenPDF.openToPage() is deprecated -- use Zotero.FileHandlers.open()');
		if (typeof pathOrItem === 'string') {
			throw new Error('Zotero.OpenPDF.openToPage() requires an item -- update your code!');
		}
		
		await Zotero.FileHandlers.open(pathOrItem, {
			location: {
				annotationID: annotationKey,
				pageIndex: page,
			}
		});
	}
};
