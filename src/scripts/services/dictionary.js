import he from 'he';

export default class Dictionary {

  /**
   * Fill dictionary with translations.
   * @param {object} translation Translations.
   */
  static fill(translation = {}) {
    Dictionary.translation = Dictionary.sanitize(translation);
  }

  /**
   * Get translation for a key.
   * @param {string} key Key to look for.
   * @param {object} [base] Base to start looking.
   * @returns {string} Translation.
   */
  static get(key, base = Dictionary.translation) {
    const splits = key.split(/[./]+/);

    if (splits.length === 1) {
      return base[key];
    }

    key = splits.shift();

    if (typeof base[key] !== 'object') {
      return; // Path doesn't exist
    }

    return Dictionary.get(splits.join('.'), base[key]);
  }

  /**
   * Sanitize translations recursively: HTML decode and strip HTML.
   * @param {string|object} translation Translation.
   * @returns {string} Translation value.
   */
  static sanitize(translation) {
    if (typeof translation === 'object') {
      for (let key in translation) {
        translation[key] = Dictionary.sanitize(translation[key]);
      }
    }
    else if (typeof translation === 'string') {
      translation = he.decode(translation);
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

Dictionary.translation = {};
