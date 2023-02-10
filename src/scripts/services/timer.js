import Util from './util';

export default class Timer {
  /**
   * Timer.
   *
   * @class
   * @param {object} [params={}] Parameters.
   * @param {string} [params.mode='timer'] Mode: timer|stopwatch.
   * @param {number} [params.interval=1000] Tick interval.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onStateChanged] Timer state changed.
   * @param {function} [callbacks.onExpired] Timer has expired.
   * @param {function} [callbacks.onTick] Timer has completed an interval.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      mode: 'timer',
      interval: 1000
    }, params);

    this.callbacks = Util.extend({
      onStateChanged: () => {},
      onExpired: () => {},
      onTick: () => {}
    }, callbacks);

    this.mode = (this.params.mode === 'stopwatch') ?
      Timer.FORWARD :
      Timer.BACKWARD;

    // Sanitize to 50ms at least
    this.params.interval = Math.max(50, this.params.interval);
    this.state = Timer.STATE_ENDED;
    this.timeMs = 0;
  }

  /**
   * Set current state.
   *
   * @param {number} state Current state.
   */
  setState(state) {
    this.state = state;
    this.callbacks.onStateChanged(state, this.getTime());
  }

  /**
   * Start.
   *
   * @param {number} [defaultTime] Time to start with.
   */
  start(defaultTime) {
    if (this.state !== Timer.STATE_ENDED) {
      return;
    }

    this.startTime = new Date();

    if (defaultTime) {
      this.setTime(defaultTime);
    }

    this.setState(Timer.STATE_PLAYING);

    this.timeout = setTimeout(() => {
      this.update();
    }, this.params.interval);
  }

  /**
   * Pause.
   */
  pause() {
    if (this.state !== Timer.STATE_PLAYING) {
      return;
    }

    this.setState(Timer.STATE_PAUSED);
    this.startTime = this.getTime();
  }

  /**
   * Resume.
   */
  resume() {
    if (this.state !== Timer.STATE_PAUSED) {
      return;
    }

    this.setState(Timer.STATE_PLAYING);

    this.timeout = setTimeout(() => {
      this.update();
    }, this.params.interval);
  }

  /**
   * Stop.
   */
  stop() {
    clearTimeout(this.timeout);
    this.setState(Timer.STATE_ENDED);
  }

  /**
   * Reset.
   */
  reset() {
    this.stop();
    this.setTime(0);
  }

  /**
   * Set time.
   *
   * @param {number} timeMs time in ms.
   */
  setTime(timeMs) {
    this.timeMs = timeMs;
  }

  /**
   * Get time.
   *
   * @returns {number} Time in ms.
   */
  getTime() {
    return Math.max(0, this.timeMs);
  }

  /**
   * Update timer.
   */
  update() {
    if (this.state === Timer.STATE_PLAYING) {
      const elapsed = new Date().getTime() - this.startTime;
      const newTime = this.getTime() + elapsed * this.mode;
      this.setTime(newTime);
      this.callbacks.onTick(newTime);
    }

    if (this.mode === Timer.BACKWARD && this.getTime() <= 0) {
      this.stop();
      this.callbacks.onExpired(0);
      return;
    }

    this.startTime = new Date();

    this.timeout = setTimeout(() => {
      this.update();
    }, this.params.interval);
  }
}

/** @constant {number} STATE_ENDED State ended (or not started) */
Timer.STATE_ENDED = 0;

/** @constant {number} STATE_PLAYING State playing */
Timer.STATE_PLAYING = 1;

/** @constant {number} STATE_PAUSED State paused */
Timer.STATE_PAUSED = 2;

/** @constant {number} FORWARD Timer running forward */
Timer.FORWARD = 1;

/** @constant {number} BACKWARD Timer running backward */
Timer.BACKWARD = -1;
