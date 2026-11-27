Zotero.Locale = {
	/**
	 * Keep this up to date with app/assets/multilocale.txt,
	 * scripts/dictionaries/build-dictionaries, and possibly chrome.manifest
	 *
	 * Names from https://addons.mozilla.org/en-US/firefox/language-tools/
	 */
	availableLocales: Object.freeze({
		'en-US': 'English',
		'en-GB': 'English (UK)',
		'de': 'Deutsch',
		'fr-FR': 'Français',
		'es-ES': 'Español',
		'ja-JP': '日本語',
		'zh-CN': '中文 (简体)',
		'zh-TW': '正體中文 (繁體)',
	}),

	defaultScriptDirection(locale) {
		switch (locale.split('-')[0]) {
			case 'ar':
			case 'fa':
			case 'he':
				return 'rtl';
			default:
				return 'ltr';
		}
	}
}
