/** Simple callback queue to schedule function calls with delay */
export default class CallbackQueue {
  /**
   * Add callback to animation queue.
   * @param {function} callback Callback to execute.
   * @param {object} [params] Parameters.
   * @param {number} [params.delay] Delay before calling callback.
   * @param {number} [params.block] Delay before calling next callback.
   * @param {boolean} [params.skipQueue] If true, skip queue.
   */
  static add(callback, params = {}) {
    if (CallbackQueue.isClosed) {
      return;
    }

    if (typeof callback !== 'function') {
      return;
    }

    params.delay = params.delay || 0;
    params.block = params.block || 0;
    params.skipQueue = params.skipQueue ?? false;

    if (CallbackQueue.isSkippable || params.skipQueue) {
      callback();
      return;
    }

    CallbackQueue.queued.push({ callback, params });
  }

  /**
   * Clear all queued callbacks.
   */
  static clearQueued() {
    CallbackQueue.queued = [];
  }

  /**
   * Clear all scheduled callbacks.
   */
  static clearScheduled() {
    // Clone scheduled, because more might be scheduled after call
    [...CallbackQueue.scheduled].forEach((scheduledId) => {
      window.clearTimeout(scheduledId);

      CallbackQueue.scheduled = CallbackQueue.scheduled
        .filter((id) => id !== scheduledId );
    });
  }

  /**
   * Schedule all items currently in queue.
   */
  static scheduleQueued() {
    if (CallbackQueue.respectsDelay) {
      // Compute absolute delay for each animation
      CallbackQueue.queued = CallbackQueue.queued
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
      CallbackQueue.queued = CallbackQueue.queued.map((queueItem) => {
        queueItem.params.delay = 0;
        queueItem.params.block = 0;

        return queueItem;
      });
    }

    CallbackQueue.queued.forEach((queueItem) => {
      const scheduledId = window.setTimeout(() => {
        queueItem.callback();
      }, queueItem.params.delay);

      CallbackQueue.scheduled.push(scheduledId);
    });

    CallbackQueue.queued = [];
  }

  /**
   * Open queue for new callbacks.
   */
  static open() {
    CallbackQueue.isClosed = false;
  }

  /**
   * Close queue for new callbacks. They will be ignored.
   */
  static close() {
    CallbackQueue.isClosed = true;
  }

  /**
   * Set whether subsequent
   * @param {boolean} isSkippable If true, callback will be called immediately.
   */
  static setSkippable(isSkippable) {
    if (typeof isSkippable !== 'boolean') {
      return;
    }

    CallbackQueue.isSkippable = isSkippable;
  }

  /**
   * Set whether callbacks' delay is respected to schedule at different times.
   * @param {boolean} respectsDelay If false, callbacks scheduled for same time.
   */
  static setRespectsDelay(respectsDelay) {
    if (typeof respectsDelay !== 'boolean') {
      return;
    }

    CallbackQueue.respectsDelay = respectsDelay;
  }
}

/** @constant {object[]} queued Callback items for queue. */
CallbackQueue.queued = [];

/** @constant {number[]} scheduled Timeout ids of scheduled callbacks. */
CallbackQueue.scheduled = [];

/** @constant {boolean} isClosed True if queue is closed for new callbacks. */
CallbackQueue.isClosed = false;

/** @constant {boolean} isSkippable True if queue can be skipped currently. */
CallbackQueue.isSkippable = true;

/** @constant {boolean} respectsDelay True if delay should be respected. */
CallbackQueue.respectsDelay = true;
