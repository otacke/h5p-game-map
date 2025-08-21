import { animate } from '@services/animate.js';
import FocusTrap from '@services/focus-trap.js';
import Util from '@services/util.js';
import TimerDisplay from './timer-display.js';
import './overlay-dialog.scss';

/** @constant {number} CONTENT_ATTACH_DELAY_MS Delay before content is attached. */
const CONTENT_ATTACH_DELAY_MS = 100;

/** Class representing an overlay dialog */
export default class OverlayDialog {

  /**
   * Overlay dialog.
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClosed] Callback when overlay closed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClosed: () => {},
      onOpenAnimationEnded: () => {},
      onCloseAnimationEnded: () => {}
    }, callbacks);

    this.handleOpenAnimationEnded = this.handleOpenAnimationEnded.bind(this);
    this.handleCloseAnimationEnded = this.handleCloseAnimationEnded.bind(this);

    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-overlay-dialog');
    if (this.params.cssMainSelector) {
      this.dom.classList.add(this.params.cssMainSelector);
    }
    this.dom.classList.add('transparent');
    this.dom.setAttribute('role', 'dialog');
    this.dom.setAttribute('aria-modal', 'true');

    // Container for H5P content, can be CSS-transformed
    this.contentContainer = document.createElement('div');
    this.contentContainer.classList.add(
      'h5p-game-map-overlay-dialog-content-container'
    );
    this.contentContainer.classList.add('transparent');
    this.contentContainer.classList.add('offscreen');
    this.dom.append(this.contentContainer);

    this.content = document.createElement('div');
    this.content.classList.add('h5p-game-map-overlay-dialog-content');
    this.contentContainer.append(this.content);

    // Close button
    this.buttonClose = document.createElement('button');
    this.buttonClose.classList.add('h5p-game-map-overlay-dialog-button-close');
    this.buttonClose.setAttribute(
      'aria-label', this.params.dictionary.get('a11y.close')
    );
    this.buttonClose.addEventListener('click', () => {
      this.callbacks.onClosed();
    });
    this.contentContainer.append(this.buttonClose);

    // Headline
    const headline = document.createElement('div');
    headline.classList.add('h5p-game-map-overlay-dialog-headline');
    this.content.append(headline);

    this.headlineText = document.createElement('div');
    this.headlineText.classList.add('h5p-game-map-overlay-dialog-headline-text');
    headline.append(this.headlineText);

    this.timerDisplay = new TimerDisplay();
    headline.append(this.timerDisplay.getDOM());

    // H5P instance
    this.instanceContainer = document.createElement('div');
    this.instanceContainer.classList.add('h5p-game-map-overlay-dialog-instance-container');
    this.content.append(this.instanceContainer);

    this.focusTrap = new FocusTrap({
      trapElement: this.dom,
      closeElement: this.buttonClose,
      fallbackContainer: this.instanceContainer,
      stayAtScrollPosition: true
    });
  }

  /**
   * Get DOM for exercise.
   * @returns {HTMLElement} DOM for exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isShowingSolutions] If true, showing solutions.
   */
  show(params = {}) {
    this.dom.classList.remove('display-none');

    if (params.isShowingSolutions) {
      this.timerDisplay.hide();
    }
    else {
      this.timerDisplay.show();
    }

    // Wait to allow DOM to progress
    window.requestAnimationFrame(() => {
      this.dom.classList.remove('transparent');

      if (!this.params.globals.get('params').visual.misc.useAnimation) {
        this.handleOpenAnimationEnded();
      }
      else {
        this.contentContainer.addEventListener(
          'animationend', this.handleOpenAnimationEnded
        );
      }

      this.animate('bounce-in', () => {
        this.focusTrap.activate();
      });
      this.contentContainer.classList.remove('offscreen');

      document.addEventListener('click', this.handleGlobalClick);
      document.addEventListener('keydown', this.handleKeyDown);
    });

    // H5P content needs time to attach
    window.setTimeout(() => {
      this.contentContainer.classList.remove('transparent');
    }, CONTENT_ATTACH_DELAY_MS);
  }

  /**
   * Hide.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.animate] If true, animate.
   * @param {function} [callback] Callback when animation done.
   */
  hide(params = {}, callback) {
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('keydown', this.handleKeyDown);

    if (params.animate) {
      this.dom.classList.add('transparent');

      if (this.params.globals.get('params').visual.misc.useAnimation) {
        this.animate('bounce-out', () => {
          this.handleCloseAnimationEnded();
          if (typeof callback === 'function') {
            callback();
          }
        });
      }
      else {
        this.handleCloseAnimationEnded();
        if (typeof callback === 'function') {
          callback();
        }
      }
    }
    else {
      this.contentContainer.classList.add('transparent');
      this.contentContainer.classList.add('offscreen');
      this.dom.classList.add('display-none');
      this.dom.classList.add('transparent');

      if (typeof callback === 'function') {
        callback();
      }
    }

    this.focusTrap.deactivate();
  }

  /**
   * Set DOM content.
   * @param {HTMLElement} dom DOM of content.
   */
  setContent(dom) {
    this.instanceContainer.innerHTML = '';
    this.instanceContainer.appendChild(dom);
  }

  /**
   * Set headline text.
   * @param {string} text Headline text to set.
   */
  setTitle(text) {
    text = Util.purifyHTML(text);

    this.headlineText.innerText = text;
    this.dom.setAttribute(
      'aria-label',
      this.params.dictionary
        .get('a11y.exerciseLabel')
        .replace(/@stagelabel/, text)
    );
  }

  /**
   * Set time.
   * @param {number} timeMs Time to display on timer.
   * @param {object} [options] Options.
   * @param {boolean} [options.timeoutWarning] If true, timeout warning state.
   */
  setTime(timeMs, options = {}) {
    this.timerDisplay.setTime(timeMs);
    this.timerDisplay.setTimeoutWarning(options.timeoutWarning);
  }

  /**
   * Get computed size.
   * @returns {object} Size with width and height.
   */
  getSize() {
    const rect = this.dom.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  /**
   * Animate
   * @param {string} animationName Animation name.
   * @param {function} callback Callback when animation ended.
   */
  animate(animationName, callback) {
    if (typeof animationName !== 'string' || this.isAnimating) {
      return;
    }

    if (!this.params.globals.get('params').visual.misc.useAnimation) {
      return; // Animation deactivated by author or user preference
    }

    this.isAnimating = true;

    animate(this.contentContainer, animationName, () => {
      this.isAnimating = false;
      callback();
    });
  }

  /**
   * Handle opening animation ended.
   */
  handleOpenAnimationEnded() {
    this.contentContainer.removeEventListener(
      'animationend', this.handleOpenAnimationEnded
    );

    this.callbacks.onOpenAnimationEnded();
  }

  /**
   * Handle closing animation ended.
   */
  handleCloseAnimationEnded() {
    this.contentContainer.removeEventListener(
      'animationend', this.handleCloseAnimationEnded
    );

    this.contentContainer.classList.add('transparent');
    this.contentContainer.classList.add('offscreen');
    this.dom.classList.add('display-none');

    this.callbacks.onCloseAnimationEnded();
  }

  /**
   * Handle global click event.
   * @param {Event} event Click event.
   */
  handleGlobalClick(event) {
    if (
      this.isAnimating ||
      !event.target.isConnected ||  // H5P content may have removed element already
      this.content.contains(event.target)
    ) {
      return;
    }

    this.callbacks.onClosed();
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.callbacks.onClosed();
    }
  }
}
