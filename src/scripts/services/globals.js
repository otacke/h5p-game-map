export default class Globals {

  /**
   * Storage for globals.
   * @class
   */
  constructor() {
    this.keys = {};
  }

  /**
   * Set value for key.
   * @param {string} key Key.
   * @param {object|string|number|boolean|function|undefined|null} value Value.
   */
  set(key, value) {
    if (typeof key !== 'string') {
      return;
    }

    this.keys[key] = value;
  }

  /**
   * Get value for key.
   * @param {string} key Key.
   * @returns {object|string|number|boolean|function|undefined|null} Value.
   */
  get(key) {
    if (typeof key !== 'string') {
      return;
    }

    return this.keys[key];
  }
}
