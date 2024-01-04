import { animate } from '@services/animate.js';
import FocusTrap from '@services/focus-trap.js';
import Util from '@services/util.js';
import TimerDisplay from './timer-display.js';
import './exercise-screen.scss';

/** Class representing an exercise screen */
export default class ExerciseScreen {

  /**
   * Exercise holding H5P content.
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClosed] Callback when exercise closed.
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
    this.contentContainer.classList.add('offscreen');
    this.dom.append(this.contentContainer);

    this.content = document.createElement('div');
    this.content.classList.add('h5p-game-map-exercise-content');
    this.contentContainer.append(this.content);

    // Close button
    this.buttonClose = document.createElement('button');
    this.buttonClose.classList.add('h5p-game-map-exercise-button-close');
    this.buttonClose.setAttribute(
      'aria-label', this.params.dictionary.get('a11y.close')
    );
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

    this.timerDisplay = new TimerDisplay();
    headline.append(this.timerDisplay.getDOM());

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
    }, 100);
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
   * Set H5P DOM.
   * @param {HTMLElement} h5pDOM DOM of H5P instance.
   */
  setH5PContent(h5pDOM) {
    this.h5pInstance.innerHTML = '';
    this.h5pInstance.appendChild(h5pDOM);
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
   * Set offset to screen border.
   * @param {number} mapWidth Map width in px.
   */
  setScreenOffset(mapWidth) {
    const project = (value, lo1, hi1, lo2, hi2) => {
      return lo2 + (hi2 - lo2) * (value - lo1) / (hi1 - lo1);
    };

    const size = project(
      Math.max(
        ExerciseScreen.MAPSIZE_MIN_PX,
        Math.min(mapWidth, ExerciseScreen.MAPSIZE_MAX_PX)
      ),
      ExerciseScreen.MAPSIZE_MIN_PX, ExerciseScreen.MAPSIZE_MAX_PX,
      ExerciseScreen.OFFSET_MIN_REM, ExerciseScreen.OFFSET_MAX_REM
    );

    this.dom.style.setProperty('--exercise-screen-offset', `${size}rem`);
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
      !this.content.contains(event.target) &&
      event.target.isConnected // H5P content may have removed element already
    ) {
      this.callbacks.onClosed();
    }
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

/** @constant {number} OFFSET_MIN_REM Minimum offset for screen in rem. */
ExerciseScreen.OFFSET_MIN_REM = 2;

/** @constant {number} OFFSET_MAX_REM Maximum offset for screen in rem. */
ExerciseScreen.OFFSET_MAX_REM = 4;

/** @constant {number} MAPSIZE_MIN_PX Minimum mapsize for projection in px. */
ExerciseScreen.MAPSIZE_MIN_PX = 480;

/** @constant {number} MAPSIZE_MAX_PX Maximum mapsize for projection in px. */
ExerciseScreen.MAPSIZE_MAX_PX = 640;
