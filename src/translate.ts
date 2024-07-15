/**
 * Interface for translation functions.
 */
export interface Translate {
	/**
	 * Returns the translated text of the given textKey in the given language.
	 *
	 * @param language Target language into which the text should be translated.
	 * @param textKey Key of the text in the i18n json files that should be translated.
	 * @param Context Context object that should be used for substitutions in the translation.
	 *
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld": "Hallo Welt!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translateTo('de', 'helloworld');
	 *
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld-parameter": "Hallo {who}!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translateTo('de', 'helloworld-parameter', { who: 'Welt' });
	 */
	translateTo(language: ioBroker.Languages, textKey: string, context?: Record<string, string>): Promise<string>;

	/**
	 * Returns the translated text of the given textKey in the system language.
	 *
	 * @param textKey Key of the text in the i18n json files that should be translated.
	 * @param context Context object that should be used for substitutions in the translation.
	 *
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld": "Hallo Welt!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translate('helloworld');
	 *
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld-parameter": "Hallo {who}!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translate('helloworld-parameter', { who: 'Welt' });
	 */
	translate(textKey: string, context?: Record<string, string>): Promise<string>;

	/**
	 * Returns an object containing all translations of the given textKey.
	 *
	 * @param textKey Key of the text in the i18n json files that should be translated.
	 * @param context Context object that should be used for substitutions in the translation.
	 *
	 * @example
	 * // ./admin/i18n/en/translations.json:
	 * // {
	 * //     "helloworld": "Hello World!"
	 * // }
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld": "Hallo Welt!"
	 * // }
	 * // returns {
	 * //     en: 'Hello World!',
	 * //     de: 'Hallo Welt!'
	 * // }
	 * await getTranslatedObject('helloworld');
	 *
	 * @example
	 * // ./admin/i18n/en/translations.json:
	 * // {
	 * //     "helloname-parameter": "Hello, {who}!"
	 * // }
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloname-parameter": "Hallo, {who}!"
	 * // }
	 * // returns {
	 * //     en: 'Hello, Jane Doe!',
	 * //     de: 'Hallo, Jane Doe!'
	 * // }
	 * await getTranslatedObject('helloname-parameter', { who: 'Jane Doe' });
	 */
	getTranslatedObject(textKey: string, context?: Record<string, string>): Promise<ioBroker.Translated>;
}
