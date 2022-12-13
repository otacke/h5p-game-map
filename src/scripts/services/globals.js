export default class Globals {

  /**
   * Set value for key.
   *
   * @param {string} key Key.
   * @param {object|string|number|boolean|function|undefined|null} value Value.
   */
  static set(key, value) {
    if (typeof key !== 'string') {
      return;
    }

    Globals.keys[key] = value;
  }

  /**
   * Get value for key.
   *
   * @param {string} key Key.
   * @returns {object|string|number|boolean|function|undefined|null} Value.
   */
  static get(key) {
    if (typeof key !== 'string') {
      return;
    }

    return Globals.keys[key];
  }
}

Globals.keys = {};
