import { animate } from '@services/animate.js';
import FocusTrap from '@services/focus-trap.js';
import Util from '@services/util.js';
import Slider from '@components/slider/slider.js';
import './settings-dialog.scss';

// TODO: This essentially duplicates the functionality of the exercise dialog. Create a base class for dialogs?

/** @constant {number} CONTENT_ATTACH_DELAY_MS Delay before content is attached. */
const CONTENT_ATTACH_DELAY_MS = 100;

/** @constant {number} OFFSET_MIN_REM Minimum offset for screen in rem. */
const OFFSET_MIN_REM = 2;

/** @constant {number} OFFSET_MAX_REM Maximum offset for screen in rem. */
const OFFSET_MAX_REM = 4;

/** @constant {number} MAPSIZE_MIN_PX Minimum mapsize for projection in px. */
const MAPSIZE_MIN_PX = 480;

/** @constant {number} MAPSIZE_MAX_PX Maximum mapsize for projection in px. */
const MAPSIZE_MAX_PX = 640;

/** Class representing an settings screen */
export default class SettingsDialog {

  /**
   * Settings for user.
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClosed] Callback when settings closed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClosed: () => {},
      onOpenAnimationEnded: () => {},
      onCloseAnimationEnded: () => {},
      onValueChanged: () => {}
    }, callbacks);

    this.handleOpenAnimationEnded = this.handleOpenAnimationEnded.bind(this);
    this.handleCloseAnimationEnded = this.handleCloseAnimationEnded.bind(this);

    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-settings-dialog');
    this.dom.classList.add('transparent');
    this.dom.setAttribute('role', 'dialog');
    this.dom.setAttribute('aria-modal', 'true');
    this.dom.setAttribute('aria-label', this.params.dictionary.get('l10n.settings'));

    // Container for H5P content, can be CSS-transformed
    this.contentContainer = document.createElement('div');
    this.contentContainer.classList.add(
      'h5p-game-map-settings-content-container'
    );
    this.contentContainer.classList.add('transparent');
    this.contentContainer.classList.add('offscreen');
    this.dom.append(this.contentContainer);

    this.content = document.createElement('div');
    this.content.classList.add('h5p-game-map-settings-content');
    this.contentContainer.append(this.content);

    // Close button
    this.buttonClose = document.createElement('button');
    this.buttonClose.classList.add('h5p-game-map-settings-button-close');
    this.buttonClose.setAttribute(
      'aria-label', this.params.dictionary.get('a11y.close')
    );
    this.buttonClose.addEventListener('click', () => {
      this.callbacks.onClosed();
    });
    this.contentContainer.append(this.buttonClose);

    // Headline
    const headline = document.createElement('div');
    headline.classList.add('h5p-game-map-settings-headline');
    this.content.append(headline);

    const headlineText = document.createElement('div');
    headlineText.classList.add('h5p-game-map-settings-headline-text');
    headlineText.innerText = this.params.dictionary.get('l10n.settings');
    headline.append(headlineText);

    // Content
    const settingsWrapperDOM = document.createElement('div');
    settingsWrapperDOM.classList.add('h5p-game-map-settings-wrapper');
    this.content.append(settingsWrapperDOM);

    const settingsContainerDOM = document.createElement('div');
    settingsContainerDOM.classList.add('h5p-game-map-settings-container');
    settingsWrapperDOM.append(settingsContainerDOM);

    // Volume Music
    const volumeMusicLabel = document.createElement('span');
    volumeMusicLabel.classList.add('h5p-game-map-settings-label');
    volumeMusicLabel.innerText = this.params.dictionary.get('l10n.volumeMusic');
    settingsContainerDOM.append(volumeMusicLabel);

    const volumeMusicSlider = new Slider(
      {
        ariaLabel: this.params.dictionary.get('l10n.volumeMusic'),
        value: this.params.values.volumeMusic
      },
      {
        onSeeked: (value) => {
          this.callbacks.onValueChanged('volumeMusic', value);
        }
      }
    );
    settingsContainerDOM.append(volumeMusicSlider.getDOM());

    // Volume SFX
    const volumeSFXLabel = document.createElement('span');
    volumeSFXLabel.classList.add('h5p-game-map-settings-label');
    volumeSFXLabel.innerText = this.params.dictionary.get('l10n.volumeSFX');
    settingsContainerDOM.append(volumeSFXLabel);

    const volumeSFXSlider = new Slider(
      {
        ariaLabel: this.params.dictionary.get('l10n.volumeSFX'),
        value: this.params.values.volumeSFX
      },
      {
        onSeeked: (value) => {
          this.callbacks.onValueChanged('volumeSFX', value);
        }
      }
    );
    settingsContainerDOM.append(volumeSFXSlider.getDOM());

    this.focusTrap = new FocusTrap({
      trapElement: this.dom,
      closeElement: this.buttonClose,
      fallbackContainer: this.settingsDOM
    });
  }

  /**
   * Get DOM for settings.
   * @returns {HTMLElement} DOM for settings.
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
   * Set offset to screen border.
   * @param {number} mapWidth Map width in px.
   */
  setScreenOffset(mapWidth) {
    const project = (value, lo1, hi1, lo2, hi2) => {
      return lo2 + (hi2 - lo2) * (value - lo1) / (hi1 - lo1);
    };

    const size = project(
      Math.max(MAPSIZE_MIN_PX, Math.min(mapWidth, MAPSIZE_MAX_PX)),
      MAPSIZE_MIN_PX, MAPSIZE_MAX_PX,
      OFFSET_MIN_REM, OFFSET_MAX_REM
    );

    this.dom.style.setProperty('--settings-screen-offset', `${size}rem`);
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
