import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
import Util from '@services/util';
import FocusTrap from '@services/focus-trap';
import './exercise-screen.scss';

/** Class representing an exercise screen */
export default class ExerciseScreen {

  /**
   * Exercise holding H5P content.
   *
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onClosed] Callback when exercise closed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClosed: () => {},
      onOpenAnimationEnded: () => {},
      onCloseAnimationEnded: () => {}
    }, callbacks);

    this.handleAnimationEnded = this.handleAnimationEnded.bind(this);
    this.handleOpenAnimationEnded = this.handleOpenAnimationEnded.bind(this);
    this.handleCloseAnimationEnded = this.handleCloseAnimationEnded.bind(this);

    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise');
    this.dom.classList.add('transparent');
    this.dom.setAttribute('role', 'dialog');
    this.dom.setAttribute('aria-modal', 'true');

    // Container for H5P content, can be CSS-transformed
    this.contentContainer = document.createElement('div');
    this.contentContainer.classList.add(
      'h5p-game-map-exercise-content-container'
    );
    this.contentContainer.classList.add('transparent');
    this.dom.append(this.contentContainer);

    this.content = document.createElement('div');
    this.content.classList.add('h5p-game-map-exercise-content');
    this.contentContainer.append(this.content);

    // Close button
    this.buttonClose = document.createElement('button');
    this.buttonClose.classList.add('h5p-game-map-exercise-button-close');
    this.buttonClose.setAttribute('aria-label', Dictionary.get('a11y.close'));
    this.buttonClose.addEventListener('click', () => {
      this.callbacks.onClosed();
    });
    this.contentContainer.append(this.buttonClose);

    // Headline
    const headline = document.createElement('div');
    headline.classList.add('h5p-game-map-exercise-headline');
    this.content.append(headline);

    this.headlineText = document.createElement('div');
    this.headlineText.classList.add('h5p-game-map-exercise-headline-text');
    headline.append(this.headlineText);

    this.headlineTimer = document.createElement('div');
    this.headlineTimer.classList.add('h5p-game-map-exercise-headline-timer');
    this.headlineTimer.classList.add('display-none');
    headline.append(this.headlineTimer);

    // H5P instance
    this.h5pInstance = document.createElement('div');
    this.h5pInstance.classList.add('h5p-game-map-exercise-instance-container');
    this.content.append(this.h5pInstance);

    this.focusTrap = new FocusTrap({
      trapElement: this.dom,
      closeElement: this.buttonClose,
      fallbackContainer: this.h5pInstance
    });
  }

  /**
   * Get DOM for exercise.
   *
   * @returns {HTMLElement} DOM for exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');

    // Wait to allow DOM to progress
    window.requestAnimationFrame(() => {
      this.dom.classList.remove('transparent');

      if (!Globals.get('params').visual.misc.useAnimation) {
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

      document.addEventListener('click', this.handleGlobalClick);
      document.addEventListener('keydown', this.handleKeyDown);
    });

    // H5P content needs time to attach
    window.setTimeout(() => {
      this.contentContainer.classList.remove('transparent');
    }, 100);
  }

  /**
   * Hide.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.animate = false] If true, animate.
   * @param {function} [callback] Callback when animation done.
   */
  hide(params = {}, callback) {
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('keydown', this.handleKeyDown);

    if (params.animate) {
      this.dom.classList.add('transparent');

      if (Globals.get('params').visual.misc.useAnimation) {
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
      this.dom.classList.add('display-none');
      this.dom.classList.add('transparent');

      if (typeof callback === 'function') {
        callback();
      }
    }

    this.focusTrap.deactivate();
  }

  /**
   * Animate
   *
   * @param {string} animationName Animation name.
   * @param {function} callback Callback when animation ended.
   */
  animate(animationName, callback) {
    if (typeof animationName !== 'string' || this.isAnimating) {
      return;
    }

    if (!Globals.get('params').visual.misc.useAnimation) {
      return; // Animation deactivated by author or user preference
    }

    this.isAnimating = true;

    // Cannot make this work with this.handleAnimationEnded.bind(this, callback)
    this.animationEndedCallback = callback;

    this.contentContainer.addEventListener(
      'animationend', this.handleAnimationEnded
    );

    this.contentContainer.classList.add('animate');
    this.contentContainer.classList.add(`animate-${animationName}`);
  }

  /**
   * Handle animation ended.
   */
  handleAnimationEnded() {
    this.contentContainer.classList.remove('animate');
    this.contentContainer.className = this.contentContainer.className
      .replace(/animate-w*/g, '');

    this.contentContainer.removeEventListener(
      'animationend', this.handleAnimationEnded
    );

    this.isAnimating = false;

    if (typeof this.animationEndedCallback === 'function') {
      this.animationEndedCallback();
      this.animationEndedCallback = null;
    }
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
    this.dom.classList.add('display-none');

    this.callbacks.onCloseAnimationEnded();
  }

  /**
   * Set H5P DOM.
   *
   * @param {HTMLElement} h5pDOM DOM of H5P instance.
   */
  setH5PContent(h5pDOM) {
    this.h5pInstance.innerHTML = '';
    this.h5pInstance.appendChild(h5pDOM);
  }

  /**
   * Set headline text.
   *
   * @param {string} text Headline text to set.
   */
  setTitle(text) {
    this.headlineText.innerText = text;
    this.dom.setAttribute(
      'aria-label',
      Dictionary.get('a11y.exerciseLabel').replace(/@stagelabel/, text)
    );
  }

  /**
   * Set time.
   *
   * @param {number} timeMs Time to display on timer.
   */
  setTime(timeMs) {
    if (timeMs === null || timeMs === '') {
      this.headlineTimer.innerText = '';
      this.headlineTimer.classList.add('display-none');
      return;
    }

    if (typeof timeMs !== 'number') {
      return;
    }

    const date = new Date(0);
    date.setSeconds(Math.round(Math.max(0, timeMs / 1000)));

    this.headlineTimer.innerText = date
      .toISOString()
      .split('T')[1]
      .split('.')[0]
      .replace(/^[0:]+/, '');

    this.headlineTimer.classList.remove('display-none');
  }

  /**
   * Get computed size.
   *
   * @returns {object} Size with width and height.
   */
  getSize() {
    const rect = this.dom.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  /**
   * Handle global click event.
   *
   * @param {Event} event Click event.
   */
  handleGlobalClick(event) {
    if (
      !this.content.contains(event.target) &&
      event.target.isConnected // H5P content may have removed element already
    ) {
      this.callbacks.onClosed();
    }
  }

  /**
   * Handle key down.
   *
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.callbacks.onClosed();
    }
  }
}
