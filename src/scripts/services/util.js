/** Class for utility functions */
export default class Util {
  /**
   * Extend an array just like JQuery's extend.
   *
   * @returns {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          if (typeof arguments[0][key] === 'object' && typeof arguments[i][key] === 'object') {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * Format language tag (RFC 5646). Assuming "language-coutry". No validation.
   * Cmp. https://tools.ietf.org/html/rfc5646
   *
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
   * Retrieves value and unit of a CSS length string.
   * Will interpret a number without a unit as px.
   *
   * @param {string} [cssLength=''] Length string.
   * @returns {null|object} Null if string cannot be parsed or value + unit.
   */
  static parseCSSLengthProperty(cssLength = '') {
    if (typeof cssLength !== 'string') {
      return null;
    }

    // Cmp. https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units
    const regex = /((?:\d*\.)*\d+)(?:\s)*(cm|mm|Q|in|pc|pt|px|em|ex|ch|rem|lh|rlh|vw|vh|vmin|vmax|vb|vi|svw|svh|lvw|lvh|dvw|dvh)?/;
    const match = cssLength.match(regex);

    if (!match) {
      return null;
    }

    return {
      value: parseFloat(match[1]),
      unit: match[2] || 'px'
    };
  }

  /**
   * Compute display limits.
   *
   * @param {HTMLElement} [container = {}] Container.
   * @returns {object|null} Height and width in px, fallback screen size.
   */
  static computeDisplayLimits(container) {
    container = (typeof container === 'object') ? container : {};

    let topWindow = Util.getTopWindow();

    // iOS doesn't change screen dimensions on rotation
    let screenSize = (Util.isIOS() && Util.getOrientation() === 'landscape') ?
      { height: screen.width, width: screen.height } :
      { height: screen.height, width: screen.width };

    topWindow = topWindow || {
      innerHeight: screenSize.height,
      innerWidth: screenSize.width
    };

    // Smallest value of viewport and container wins
    return {
      height: Math.min(topWindow.innerHeight, screenSize.height),
      width: Math.min(
        topWindow.innerWidth, screenSize.width, container.offsetWidth ||
        Infinity
      )
    };
  }

  /**
   * Detect whether user is running iOS.
   *
   * @returns {boolean} True, if user is running iOS.
   */
  static isIOS() {
    return (
      ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    );
  }

  /**
   * Get device orientation.
   *
   * @returns {string} 'portrait' or 'landscape'.
   */
  static getOrientation() {
    if (screen.orientation && screen.orientation.type) {
      if (screen.orientation.type.includes('portrait')) {
        return 'portrait';
      }
      else if (screen.orientation.type.includes('landscape')) {
        return 'landscape';
      }
    }

    // Unreliable, as not clear what device's natural orientation is
    if (typeof window.orientation === 'number') {
      if (window.orientation === 0 || window.orientation === 180) {
        return 'portrait';
      }
      else if (
        window.orientation === 90 ||
        window.orientation === -90 ||
        window.orientation === 270
      ) {
        return 'landscape';
      }
    }

    return 'landscape'; // Assume default
  }

  /**
   * Get top DOM Window object.
   *
   * @param {Window} [startWindow=window] Window to start looking from.
   * @returns {Window|null} Top window.
   */
  static getTopWindow(startWindow) {
    let sameOrigin;
    startWindow = startWindow || window;

    // H5P iframe may be on different domain than iframe content
    try {
      sameOrigin = startWindow.parent.location.host === window.location.host;
    }
    catch (error) {
      sameOrigin = null;
    }

    if (!sameOrigin) {
      return null;
    }

    if (startWindow.parent === startWindow || !startWindow.parent) {
      return startWindow;
    }

    return this.getTopWindow(startWindow.parent);
  }

  /**
   * Determine whether a device supports touch events
   *
   * @returns {boolean} True, if device supports touch events, else false.
   */
  static supportsTouch() {
    return (
      ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
    );
  }

  /**
   * Check whether a HTML widget is filled with text.
   *
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
   *
   * @param {object} [master={}] Master class to add mixins to.
   * @param {object[]|object} [mixins=[]] Mixins to be added to master.
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
}
