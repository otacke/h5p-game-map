import { decode } from 'he';

export default class Dictionary {

  /**
   * Dictionary storage.
   * @class
   */
  constructor() {
    this.translation = {};
  }

  /**
   * Fill dictionary with translations.
   * @param {object} translation Translations.
   */
  fill(translation = {}) {
    this.translation = this.sanitize(translation);
  }

  /**
   * Get translation for a key.
   * @param {string} key Key to look for.
   * @param {object} [base] Base to start looking.
   * @returns {string} Translation.
   */
  get(key, base = this.translation) {
    const splits = key.split(/[./]+/);

    if (splits.length === 1) {
      return base[key];
    }

    key = splits.shift();

    if (typeof base[key] !== 'object') {
      return; // Path doesn't exist
    }

    return this.get(splits.join('.'), base[key]);
  }

  /**
   * Sanitize translations recursively: HTML decode and strip HTML.
   * @param {string|object} translation Translation.
   * @returns {string} Translation value.
   */
  sanitize(translation) {
    if (typeof translation === 'object') {
      for (let key in translation) {
        translation[key] = this.sanitize(translation[key]);
      }
    }
    else if (typeof translation === 'string') {
      translation = decode(translation);
      const div = document.createElement('div');
      div.innerHTML = translation;
      translation = div.textContent || div.innerText || '';
    }
    else {
      // Invalid translation
    }

    return translation;
  }
}
