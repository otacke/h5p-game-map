import he from 'he';

/** Class for utility functions */
export default class Util {
  /**
   * Extend an object just like JQuery's extend.
   * @param {object} target Target.
   * @param {...object} sources Sources.
   * @returns {object} Merged objects.
   */
  static extend(target, ...sources) {
    sources.forEach((source) => {
      for (let key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          if (key === '__proto__' || key === 'constructor') {
            continue; // Prevent prototype pollution
          }

          if (source[key] === undefined) {
            continue;
          }

          if (
            typeof target[key] === 'object' && !Array.isArray(target[key]) &&
            typeof source[key] === 'object' && !Array.isArray(source[key])
          ) {
            this.extend(target[key], source[key]);
          }
          else if (Array.isArray(source[key])) {
            target[key] = source[key].slice();
          }
          else {
            target[key] = source[key];
          }
        }
      }
    });
    return target;
  }

  /**
   * Format language tag (RFC 5646). Assuming "language-coutry". No validation.
   * Cmp. https://tools.ietf.org/html/rfc5646
   * @param {string} languageCode Language tag.
   * @returns {string} Formatted language tag.
   */
  static formatLanguageCode(languageCode) {
    if (typeof languageCode !== 'string') {
      return languageCode;
    }

    /*
     * RFC 5646 states that language tags are case insensitive, but
     * recommendations may be followed to improve human interpretation
     */
    const segments = languageCode.split('-');
    segments[0] = segments[0].toLowerCase(); // ISO 639 recommendation
    if (segments.length > 1) {
      segments[1] = segments[1].toUpperCase(); // ISO 3166-1 recommendation
    }
    languageCode = segments.join('-');

    return languageCode;
  }

  /**
   * Determine whether a device supports touch events
   * @returns {boolean} True, if device supports touch events, else false.
   */
  static supportsTouch() {
    return (
      ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
    );
  }

  /**
   * Check whether a HTML widget is filled with text.
   * @param {string} html HTML string.
   * @returns {boolean} True, if widget is filled, else false.
   */
  static isHTMLWidgetFilled(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    return wrapper.firstChild?.innerText?.length > 0;
  }

  /**
   * Add mixins to a class, useful for splitting files.
   * @param {object} [master] Master class to add mixins to.
   * @param {object[]|object} [mixins] Mixins to be added to master.
   */
  static addMixins(master = {}, mixins = []) {
    if (!master.prototype) {
      return;
    }

    if (!Array.isArray(mixins)) {
      mixins = [mixins];
    }

    const masterPrototype = master.prototype;

    mixins.forEach((mixin) => {
      const mixinPrototype = mixin.prototype;
      Object.getOwnPropertyNames(mixinPrototype).forEach((property) => {
        if (property === 'constructor') {
          return; // Don't need constructor
        }

        if (Object.getOwnPropertyNames(masterPrototype).includes(property)) {
          return; // property already present, do not override
        }

        masterPrototype[property] = mixinPrototype[property];
      });
    });
  }

  /**
   * HTML decode and strip HTML.
   * @param {string|object} html html.
   * @returns {string} html value.
   */
  static purifyHTML(html) {
    if (typeof html !== 'string') {
      return '';
    }

    let text = he.decode(html);
    const div = document.createElement('div');
    div.innerHTML = text;
    text = div.textContent || div.innerText || '';

    return text;
  }

  /**
   * Call callback function once dom element gets visible in viewport.
   * @async
   * @param {HTMLElement} dom DOM element to wait for.
   * @param {function} callback Function to call once DOM element is visible.
   * @param {object} [options] IntersectionObserver options.
   * @returns {IntersectionObserver} Promise for IntersectionObserver.
   */
  static async callOnceVisible(dom, callback, options = {}) {
    if (typeof dom !== 'object' || typeof callback !== 'function') {
      return; // Invalid arguments
    }

    options.threshold = options.threshold || 0;

    return await new Promise((resolve) => {
      // iOS is behind ... Again ...
      const idleCallback = window.requestIdleCallback ?
        window.requestIdleCallback :
        window.requestAnimationFrame;

      idleCallback(() => {
        // Get started once visible and ready
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            observer.unobserve(dom);
            observer.disconnect();

            callback();
          }
        }, {
          ...(options.root && { root: options.root }),
          threshold: options.threshold,
        });
        observer.observe(dom);

        resolve(observer);
      });
    });
  }

  /**
   * Project a value from one range to another.
   * @param {number} value Value to project.
   * @param {number} start1 Start of range 1.
   * @param {number} stop1 End of range 1.
   * @param {number} start2 Start of range 2.
   * @param {number} stop2 End of range 2.
   * @returns {number} Projected value.
   */
  static project(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }
}
