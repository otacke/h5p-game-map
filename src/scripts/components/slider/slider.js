import Util from '@services/util.js';
import './slider.scss';

export default class Slider {

  /**
   * @class Slider
   * @param {object} params Parameters.
   * @param {number} [params.maxValue] Maximum value for slider.
   * @param {string} [params.ariaLabel] Aria label for slider.
   * @param {object} callbacks Callbacks.
   * @param {function} [callbacks.onStarted] Callback when slider started.
   * @param {function} [callbacks.onSeeked] Callback when slider seeked.
   * @param {function} [callbacks.onEnded] Callback when slider ended.
   * @param {function} [callbacks.onFocus] Callback when slider focused.
   * @param {function} [callbacks.onBlur] Callback when slider blurred.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      ariaLabel: 'Slider',
      minValue: 0,
      value: 0,
      maxValue: 100,
    }, params);

    this.callbacks = Util.extend({
      onStarted: () => {},
      onSeeked: () => {},
      onEnded: () => {},
      onFocus: () => {},
      onBlur: () => {},
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('slider-container');

    this.slider = document.createElement('input');
    this.slider.classList.add('slider');
    if (this.params.vertical) {
      this.slider.classList.add('vertical');
    }
    this.slider.setAttribute('type', 'range');
    this.slider.setAttribute('min', '0');
    this.slider.setAttribute('aria-valuemin', '0');
    this.slider.setAttribute('max', `${this.params.maxValue}`);
    this.slider.setAttribute('aria-valuemax', `${this.params.maxValue}`);
    this.slider.setAttribute('step', '1');
    this.slider.setAttribute('aria-label', this.params.ariaLabel);

    ['keydown', 'mousedown', 'touchstart'].forEach((eventType) => {
      this.slider.addEventListener(eventType, (event) => {
        this.handleSliderStarted(event);
      });
    });

    this.slider.addEventListener('input', () => {
      this.handleSliderSeeked(parseFloat(this.slider.value));
    });

    ['keyup', 'mouseup', 'touchend'].forEach((eventType) => {
      this.slider.addEventListener(eventType, (event) => {
        this.handleSliderEnded(event);
      });
    });

    this.slider.addEventListener('focus', () => {
      this.callbacks.onFocus();
    });

    this.slider.addEventListener('blur', () => {
      this.callbacks.onBlur();
    });

    this.dom.append(this.slider);

    this.setValue(this.params.value);
  }

  /**
   * Get slider DOM.
   * @returns {HTMLElement} Slider DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Enable slider.
   */
  enable() {
    this.slider.removeAttribute('disabled');
  }

  /**
   * Disable slider.
   */
  disable() {
    this.slider.setAttribute('disabled', '');
  }

  /**
   * Get value.
   * @returns {number} Value.
   */
  getValue() {
    return parseFloat(this.slider.value);
  }

  /**
   * Set slider to position.
   * @param {number} value Position to set slider to.
   */
  setValue(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      return;
    }

    this.slider.value = Math.max(0, Math.min(value, this.params.maxValue));
    this.slider.setAttribute('aria-valuenow', value);

    const percentage = (value / this.params.maxValue) * 100;

    this.slider.style.background = (!this.params.vertical) ?
      `linear-gradient(to right, var(--color-primary-dark-80) ${percentage}%, var(--color-primary-15) ${percentage}%)` :
      `linear-gradient(to top, var(--color-primary-dark-80) ${percentage}%, var(--color-primary-15) ${percentage}%)`;
  }

  /**
   * Handle keyboard event.
   * @param {KeyboardEvent} event Keyboard event.
   * @returns {boolean} True if key was handled, false otherwise.
   */
  handleKeyboardEvent(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.code)) {
      return false;
    }

    // Speed up slightly when holding down keys (only relevant for left/right keys).
    const delta = Math.max(1, Math.log(this.keydownTime + 1));

    if (event.code === 'ArrowLeft') {
      this.setValue(this.getValue() - delta);
    }
    else if (event.code === 'ArrowRight') {
      this.setValue(this.getValue() + delta);
    }
    else if (event.code === 'Home') {
      this.setValue(0);
    }
    else if (event.code === 'End') {
      this.setValue(this.params.maxValue);
    }

    this.keydownTime ++;

    this.handleSliderSeeked(parseFloat(this.slider.value));
    event.preventDefault();

    return true;
  }

  /**
   * Handle slider started.
   * @param {Event} event Event.
   */
  handleSliderStarted(event) {
    if (event instanceof KeyboardEvent) {
      const wasKeyHandled = this.handleKeyboardEvent(event);
      if (wasKeyHandled) {
        this.callbacks.onStarted();
      }
    }
    else {
      this.callbacks.onStarted();
    }
  }

  /**
   * Handle slider seeked.
   * @param {number} value Value.
   */
  handleSliderSeeked(value) {
    this.callbacks.onSeeked(value);
    this.setValue(value);
  }

  /**
   * Handle slider ended.
   */
  handleSliderEnded() {
    this.keydownTime = 0;
    this.callbacks.onEnded();
  }
}
