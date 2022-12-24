export default class FocusTrap {

  /**
   * Simple focus trap.
   *
   * @class
   * @param {object} [params={}] Parameters.
   * @param {HTMLElement} params.trapElement Element to be made a trap.
   * @param {HTMLElement} [params.initialFocus] Element to get initial focus.
   */
  constructor(params = {}) {
    this.handleBlurEvent = this.handleBlurEvent.bind(this);

    this.attachTo(params);
  }

  /**
   * Attach focus trap.
   *
   * @param {object} [params={}] Parameters.
   * @param {HTMLElement} params.trapElement Element to be made a trap.
   * @param {HTMLElement} [params.initialFocus] Element to get initial focus.
   */
  attachTo(params = {}) {
    this.params = params;
    this.focusableElements = [];
  }

  /**
   * Activate.
   */
  activate() {
    if (!this.params.trapElement) {
      return;
    }

    if (this.isActivated) {
      return;
    }

    this.isActivated = true;

    // TODO: Is this sufficient for YouTube Videos if not, add exceptions
    window.requestIdleCallback(() => {
      this.observer = this.observer || new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          this.observer.unobserve(this.params.trapElement);

          this.handleVisible();
        }
      }, {
        root: document.documentElement,
        threshold: 0
      });
      this.observer.observe(this.params.trapElement);
    });
  }

  /**
   * Deactivate.
   */
  deactivate() {
    if (!this.isActivated) {
      return;
    }

    this.observer.unobserve(this.params.trapElement);

    document.removeEventListener('blur', this.handleBlurEvent, true);
    this.isActivated = false;
  }

  /**
   * Update list of focusable elements.
   */
  updateFocusableElements() {
    if (!this.params.trapElement) {
      return;
    }

    this.focusableElements = []
      .slice.call(this.params.trapElement.querySelectorAll('video, audio, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => {
        return element.getAttribute('disabled') !== 'true' &&
          element.getAttribute('disabled') !== true;
      });
  }

  /**
   * Check whether HTML element is child of trap.
   *
   * @param {HTMLElement} element Element to check.
   * @returns {boolean} True, if element is child.
   */
  isChild(element) {
    if (!this.params.trapElement) {
      return false;
    }

    const parent = element.parentNode;

    if (!parent) {
      return false;
    }

    if (parent === this.params.trapElement) {
      return true;
    }

    return this.isChild(parent);
  }

  /**
   * Handle visible.
   */
  handleVisible() {
    this.updateFocusableElements();

    document.addEventListener('blur', this.handleBlurEvent, true);

    let focusElement;
    if (this.params.initialFocus && this.isChild(this.params.initialFocus)) {
      focusElement = this.params.initialFocus;
    }

    if (!focusElement && this.focusableElements.length) {
      focusElement = this.focusableElements[0];
    }

    if (focusElement) {
      focusElement.focus();
    }
  }

  /**
   * Handle focus event.
   *
   * @param {FocusEvent} event Focus event.
   */
  handleBlurEvent(event) {
    // Some previously available elements may have an updated tabindex
    this.updateFocusableElements();

    if (!this.focusableElements.length || !event.relatedTarget) {
      return;
    }

    if (this.isChild(event.relatedTarget)) {
      this.currentFocusElement = event.relatedTarget;
      return; // Focus is inside overlay
    }

    // Focus was either on first or last overlay element
    if (this.currentFocusElement === this.focusableElements[0]) {
      this.currentFocusElement = this.focusableElements[this.focusableElements.length - 1];
    }
    else {
      this.currentFocusElement = this.focusableElements[0];
    }

    this.currentFocusElement.focus();
  }
}
