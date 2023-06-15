/** Simple callback queue to schedule function calls with delay */
export default class CallbackQueue {

  /**
   * Callback Queue.
   * @class
   */
  constructor() {
    this.queued = []; // Queued Callback items for queue.
    this.scheduled = []; // Timeout ids of scheduled callbacks.
    this.isClosed = false; // True if queue is closed for new callbacks.
    this.isSkippable = true; // True if queue can be skipped currently.
    this.respectsDelay = true; // True if delay should be respected.
  }

  /**
   * Add callback to animation queue.
   * @param {function} callback Callback to execute.
   * @param {object} [params] Parameters.
   * @param {number} [params.delay] Delay before calling callback.
   * @param {number} [params.block] Delay before calling next callback.
   * @param {boolean} [params.skipQueue] If true, skip queue.
   */
  add(callback, params = {}) {
    if (this.isClosed) {
      return;
    }

    if (typeof callback !== 'function') {
      return;
    }

    params.delay = params.delay || 0;
    params.block = params.block || 0;
    params.skipQueue = params.skipQueue ?? false;

    if (this.isSkippable || params.skipQueue) {
      callback();
      return;
    }

    this.queued.push({ callback, params });
  }

  /**
   * Clear all queued callbacks.
   */
  clearQueued() {
    this.queued = [];
  }

  /**
   * Clear all scheduled callbacks.
   */
  clearScheduled() {
    // Clone scheduled, because more might be scheduled after call
    [...this.scheduled].forEach((scheduledId) => {
      window.clearTimeout(scheduledId);

      this.scheduled = this.scheduled
        .filter((id) => id !== scheduledId );
    });
  }

  /**
   * Schedule all items currently in queue.
   */
  scheduleQueued() {
    if (this.respectsDelay) {
      // Compute absolute delay for each animation
      this.queued = this.queued
        .map((queueItem, index, all) => {
          if (index === 0) {
            return queueItem;
          }

          const previousParams = all[index - 1].params;
          queueItem.params.delay += previousParams.delay + previousParams.block;

          return queueItem;
        }, []);
    }
    else {
      this.queued = this.queued.map((queueItem) => {
        queueItem.params.delay = 0;
        queueItem.params.block = 0;

        return queueItem;
      });
    }

    this.queued.forEach((queueItem) => {
      const scheduledId = window.setTimeout(() => {
        queueItem.callback();
      }, queueItem.params.delay);

      this.scheduled.push(scheduledId);
    });

    this.queued = [];
  }

  /**
   * Open queue for new callbacks.
   */
  open() {
    this.isClosed = false;
  }

  /**
   * Close queue for new callbacks. They will be ignored.
   */
  close() {
    this.isClosed = true;
  }

  /**
   * Set whether subsequent
   * @param {boolean} isSkippable If true, callback will be called immediately.
   */
  setSkippable(isSkippable) {
    if (typeof isSkippable !== 'boolean') {
      return;
    }

    this.isSkippable = isSkippable;
  }

  /**
   * Set whether callbacks' delay is respected to schedule at different times.
   * @param {boolean} respectsDelay If false, callbacks scheduled for same time.
   */
  setRespectsDelay(respectsDelay) {
    if (typeof respectsDelay !== 'boolean') {
      return;
    }

    this.respectsDelay = respectsDelay;
  }
}
