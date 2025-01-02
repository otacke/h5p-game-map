import Timer from '@services/timer.js';
import './timer-display.scss';

/** Class representing a timer on screen */
export default class TimerDisplay {
  /**
   * @class
   */
  constructor() {
    this.handleNotifyingEnded = this.handleNotifyingEnded.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-overlay-dialog-headline-timer');

    this.hide();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   */
  show() {
    if ((this.dom.innerText || '') === '') {
      return;
    }

    this.dom.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');

    this.handleNotifyingEnded();
  }

  /**
   * Set time.
   * @param {number} timeMs Time in milliseconds.
   */
  setTime(timeMs) {
    if (timeMs === null || timeMs === '') {
      this.dom.innerText = '';
      this.hide();
      return;
    }

    const timecode = Timer.toTimecode(timeMs);
    if (!timecode) {
      return;
    }

    this.dom.innerText = timecode;

    this.show();
  }

  /**
   * Set timeout warning.
   * @param {boolean} state If true, set warning state. Else hide.
   */
  setTimeoutWarning(state = false) {
    if (!this.isTimeoutwarning && state) {
      this.notify(); // Only notify if not yet notified.
    }
    this.isTimeoutwarning = state;

    this.dom.classList.toggle('timeout-warning', state);
  }

  /**
   * Notify about timeout warning.
   */
  notify() {
    this.dom.addEventListener(
      'animationend', this.handleNotifyingEnded
    );

    this.dom.classList.add('notify-animation');
  }

  /**
   * Handle notification ended.
   */
  handleNotifyingEnded() {
    this.dom.removeEventListener(
      'animationend', this.handleNotifyingEnded
    );
    this.dom.classList.remove('notify-animation');
  }
}
