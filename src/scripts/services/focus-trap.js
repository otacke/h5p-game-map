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
    this.handleKeydownEvent = this.handleKeydownEvent.bind(this);

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

    this.params.trapElement.removeEventListener('keydown', this.handleKeydownEvent, true);
    this.isActivated = false;
  }

  /**
   * Update list of focusable elements.
   */
  updateFocusableElements() {
    if (!this.params.trapElement) {
      return;
    }

    const focusableElementsString = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'video',
      'audio',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    this.focusableElements = []
      .slice
      .call(this.params.trapElement.querySelectorAll(focusableElementsString))
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

    this.params.trapElement.addEventListener(
      'keydown', this.handleKeydownEvent, true
    );

    if (this.params.initialFocus && this.isChild(this.params.initialFocus)) {
      this.currentFocusElement = this.params.initialFocus;
    }

    if (!this.currentFocusElement && this.focusableElements.length) {
      this.currentFocusElement = this.focusableElements[0];
    }

    if (this.currentFocusElement) {
      this.currentFocusElement.focus();
    }
  }

  /**
   * Handle keyboard event.
   *
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydownEvent(event) {
    // Some previously available elements may have an updated tabindex
    this.updateFocusableElements();

    if (!this.focusableElements.length) {
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    event.preventDefault();

    const index = this.focusableElements.findIndex((element) => {
      return element === this.currentFocusElement;
    });

    const length = this.focusableElements.length;

    const newIndex = (event.shiftKey) ?
      (index + length - 1) % length :
      (index + 1) % length;

    this.currentFocusElement = this.focusableElements[newIndex];
    this.currentFocusElement.focus();
  }
}
