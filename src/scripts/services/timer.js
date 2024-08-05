import Util from '@services/util.js';

/**
 * @constant {object} TIMER_STATES Timer states.
 * @property {number} ENDED Ended.
 * @property {number} PLAYING Playing.
 * @property {number} PAUSED Paused.
 */
export const TIMER_STATES = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2
};

/**
 * @constant {object} TIMER_MODES Timer modes.
 * @property {number} FORWARD Forward.
 * @property {number} BACKWARD Backward
 */
export const TIMER_MODES = {
  FORWARD: 1,
  BACKWARD: -1
};

/** @constant {number} DEFAULT_INTERVAL_MS Default interval in milliseconds */
const DEFAULT_INTERVAL_MS = 1000;

/** @constant {number} MS_IN_S Milliseconds in a second */
const MS_IN_S = 1000;

/** @constant {number} MINIMUM_INTERVAL_MS Minimum interval in milliseconds */
const MINIMUM_INTERVAL_MS = 50;

export default class Timer {
  /**
   * Timer.
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.mode] Mode: timer|stopwatch.
   * @param {number} [params.interval] Tick interval.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onStateChanged] Timer state changed.
   * @param {function} [callbacks.onExpired] Timer has expired.
   * @param {function} [callbacks.onTick] Timer has completed an interval.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      mode: 'timer',
      interval: DEFAULT_INTERVAL_MS
    }, params);

    this.callbacks = Util.extend({
      onStateChanged: () => {},
      onExpired: () => {},
      onTick: () => {}
    }, callbacks);

    this.mode = (this.params.mode === 'stopwatch') ?
      TIMER_MODES.FORWARD :
      TIMER_MODES.BACKWARD;

    // Sanitize to 50ms at least
    this.params.interval = Math.max(MINIMUM_INTERVAL_MS, this.params.interval);
    this.state = TIMER_STATES.ENDED;
    this.timeMs = 0;
  }

  /**
   * Set current state.
   * @param {number} state Current state.
   */
  setState(state) {
    this.state = state;
    this.callbacks.onStateChanged(state, this.getTime());
  }

  /**
   * Get current state.
   * @returns {number} Current state.
   */
  getState() {
    return this.state;
  }

  /**
   * Start.
   * @param {number} [defaultTime] Time to start with.
   */
  start(defaultTime) {
    if (this.state !== TIMER_STATES.ENDED) {
      return;
    }

    this.startTime = new Date();

    if (defaultTime) {
      this.setTime(defaultTime);
    }

    this.setState(TIMER_STATES.PLAYING);

    this.timeout = setTimeout(() => {
      this.update();
    }, this.params.interval);
  }

  /**
   * Pause.
   */
  pause() {
    if (this.state !== TIMER_STATES.PLAYING) {
      return;
    }

    this.setState(TIMER_STATES.PAUSED);
    this.startTime = this.getTime();
  }

  /**
   * Resume.
   */
  resume() {
    if (this.state !== TIMER_STATES.PAUSED) {
      return;
    }

    this.setState(TIMER_STATES.PLAYING);

    this.timeout = setTimeout(() => {
      this.update();
    }, this.params.interval);
  }

  /**
   * Stop.
   */
  stop() {
    clearTimeout(this.timeout);
    this.setState(TIMER_STATES.ENDED);
  }

  /**
   * Reset.
   * @param {number} [timeMs] Time in ms.
   */
  reset(timeMs = 0) {
    this.stop();
    this.setTime(timeMs);
  }

  /**
   * Set time.
   * @param {number} timeMs time in ms.
   */
  setTime(timeMs) {
    this.timeMs = timeMs;
  }

  /**
   * Get time.
   * @returns {number} Time in ms.
   */
  getTime() {
    return Math.max(0, this.timeMs);
  }

  /**
   * Update timer.
   */
  update() {
    if (this.state === TIMER_STATES.PLAYING) {
      const elapsed = new Date().getTime() - this.startTime;
      const newTime = this.getTime() + elapsed * this.mode;
      this.setTime(newTime);
      this.callbacks.onTick(newTime);
    }

    if (this.mode === BACKWARD && this.getTime() <= 0) {
      this.stop();
      this.callbacks.onExpired(0);
      return;
    }

    this.startTime = new Date();

    this.timeout = setTimeout(() => {
      this.update();
    }, this.params.interval);
  }

  /**
   * Convert time in ms to timecode.
   * @param {number} timeMs Time in ms.
   * @returns {string|undefined} Timecode.
   */
  static toTimecode(timeMs) {
    if (typeof timeMs !== 'number') {
      return;
    }

    const date = new Date(0);
    date.setSeconds(Math.round(Math.max(0, timeMs / MS_IN_S)));

    return date
      .toISOString()
      .split('T')[1]
      .split('.')[0]
      .replace(/^[0:]+/, '') || '0';
  }
}
