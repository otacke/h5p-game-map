import Util from '@services/util.js';

export default class FocusTrap {

  /**
   * Simple focus trap.
   * @class
   * @param {object} [params] Parameters.
   * @param {HTMLElement} params.trapElement Element to be made a trap.
   * @param {HTMLElement} [params.initialFocus] Element to get initial focus.
   */
  constructor(params = {}) {
    this.handleKeydownEvent = this.handleKeydownEvent.bind(this);

    this.attachTo(params);
  }

  /**
   * Attach focus trap.
   * @param {object} [params] Parameters.
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
  async activate() {
    if (!this.params.trapElement) {
      return;
    }

    if (this.isActivated) {
      return;
    }

    this.isActivated = true;

    this.observer = await Util.callOnceVisible(
      this.params.trapElement,
      () => {
        this.handleVisible();
      },
      { root: document.documentElement }
    );
  }

  /**
   * Deactivate.
   */
  deactivate() {
    if (!this.isActivated) {
      return;
    }

    this.observer?.unobserve(this.params.trapElement);
    this.observer?.disconnect();

    this.params.trapElement
      .removeEventListener('keydown', this.handleKeydownEvent, true);
    this.isActivated = false;
  }

  /**
   * Update list of focusable elements.
   */
  updateFocusableElements() {
    if (!this.params.trapElement) {
      return;
    }

    this.focusableElements = this.getFocusableElements(this.params.trapElement);
  }

  /**
   * Get focusable elements within container.
   * @param {HTMLElement} container Container to look in.
   * @returns {HTMLElement[]|undefined} Focusable elements within container.
   */
  getFocusableElements(container) {
    if (!container) {
      return;
    }

    const focusableElementsSelector = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'video',
      'audio',
      '*[tabindex="0"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableElementsSelector))
      .filter((element) => {

        return (
          element.disabled !== true &&
          element.getAttribute('tabindex') !== '-1' &&
          this.isElementVisible(element)
        );
      });
  }

  /**
   * Check whether HTML element is child of trap.
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

    // Workaround for H5P.Video that may use iframes inside content type instance
    const iframes = [... this.params.trapElement.querySelectorAll('iframe')];
    if (iframes) {
      iframes.forEach((iframe) => {
        iframe.setAttribute('tabindex', '0');
        iframe.addEventListener('blur', this.handleKeydownEvent, true);
      });
    }

    const { focusElement, needsScrollIntoView } = this.determineFocusElement();

    this.currentFocusElement = focusElement;
    this.currentFocusElement?.focus({
      preventScroll: (needsScrollIntoView === undefined) // Likely cross origin, best effort
    });
  }

  /**
   * Determine the focus element inside the modal.
   * @returns {{ focusElement: HTMLElement|null, needsScrollIntoView: boolean|undefined }} Focus element and scroll information.
   */
  determineFocusElement() {
    let focusElement = (this.params.initialFocus && this.isChild(this.params.initialFocus)) ?
      this.params.initialFocus :
      this.focusableElements?.[0];

    /*
     * WCAG preference
     * 1. First actionable element but not close button
     * 2. First non-actionalbe element
     * 3. Fallback to close button
     */
    if (!focusElement) {
      focusElement = this.params.fallbackContainer?.firstChild;
      this.makeElementFocusableTemporarily(focusElement);
    }
    else if (focusElement === this.params.closeElement && this.focusableElements.length > 1) {
      focusElement = this.focusableElements[1];
    }

    if (!focusElement) {
      focusElement = this.params.closeElement; // Last resort
    }

    // WCAG: If focus element needs to be scrolled into view, prefer first element
    let needsScrollIntoView;
    try {
      needsScrollIntoView = this.needsScrollIntoView(focusElement);
    }
    catch (error) {
      // Likely cross-origin iframe, so we can't determine.
    }

    if (needsScrollIntoView) {
      focusElement = this.params.fallbackContainer.firstChild;
      this.makeElementFocusableTemporarily(focusElement);
    }

    return { focusElement, needsScrollIntoView };
  }

  /**
   * Make fallback element focusable temporarily.
   *
   * Advisable to set tabindex -1 and focus on static element instead of
   * focusing the close button and not announcing anything. Also advisable if
   * the first actionable element is outside of the visible area.
   * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialogmodal/
   * @param {HTMLElement} element Element to make focusable temporarily.
   */
  makeElementFocusableTemporarily(element) {
    if (!element) {
      return;
    }

    const oldTabIndex = element.getAttribute('tabindex');
    element.setAttribute('tabindex', '-1');
    element.addEventListener('blur', () => {
      element.setAttribute('tabindex', oldTabIndex);
    }, { once: true });
  }

  /**
   * Get absolute bounding rectangle of element taking nested iframes into account.
   * @param {HTMLElement} element Element to get bounding rect for.
   * @returns {DOMRect} Absolute bounding rect.
   * @throws {Error} If cross-origin iframe is detected.
   */
  getAbsoluteBoundingRect(element) {
    let rect = element.getBoundingClientRect();
    let win = window;

    while (true) {
      try {
        if (!win.frameElement) break; // reached top-level
        const iframeRect = win.frameElement.getBoundingClientRect();
        rect = {
          top: rect.top + iframeRect.top,
          bottom: rect.bottom + iframeRect.top,
          left: rect.left + iframeRect.left,
          right: rect.right + iframeRect.left
        };
        win = win.parent;
      }
      catch (error) {
        throw new Error('Cross-origin iframe detected');
      }
    }

    return rect;
  }

  /**
   * Determine whether element would need to be scrolled into view.
   * @param {HTMLElement} element Element to check.
   * @returns {boolean} True if element needs to be scrolled into view, false otherwise.
   * @throws {Error} If cross-origin iframe is detected.
   */
  needsScrollIntoView(element) {
    if (!element) {
      return false;
    }

    let rect;
    try {
      rect = this.getAbsoluteBoundingRect(element);
    }
    catch (error) {
      throw error;
    }

    const { innerHeight, innerWidth } = window.top;

    return (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth);
  }

  /**
   * Handle keyboard event.
   * @param {KeyboardEvent|FocusEvent} event Keyboard event or focus event.
   */
  handleKeydownEvent(event) {
    // Some previously available elements may have an updated tabindex
    this.updateFocusableElements();

    if (!this.focusableElements.length) {
      return; // No focusable elements
    }

    if (event.key !== 'Tab' && event.type !== 'blur') {
      return; // we only care about the tab key
    }

    this.currentFocusElement = (event.type !== 'blur') ?
      document.activeElement :
      event.target;

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

  /**
   * Check whether element is visible.
   * @param {HTMLElement} element Element to check.
   * @returns {boolean} True, if element is visible, false otherwise.
   */
  isElementVisible(element) {
    if (!element) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    return element.parentElement ? this.isElementVisible(element.parentElement) : true;
  }
}
