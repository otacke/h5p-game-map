import Globals from '@services/globals';
import Util from '@services/util';

export default class Exercise {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onStateChanged] Callback when state changed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.callbacks = Util.extend({
      onStateChanged: () => {}
    }, callbacks);

    this.setState(Exercise.STATE['unstarted']);

    this.instance;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise-instance-container');

    this.initializeInstance();

    // TODO: Is this sufficient for YouTube Videos if not, add exceptions
    window.requestIdleCallback(() => {
      this.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          this.observer.unobserve(this.dom);

          this.handleViewed();
        }
      }, {
        root: document.documentElement,
        threshold: 0
      });
      this.observer.observe(this.dom);
    });
  }

  /**
   * Get DOM with H5P exercise.
   *
   * @returns {HTMLElement} DOM with H5P exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Initialize H5P instance.
   */
  initializeInstance() {
    if (this.instance === null || this.instance) {
      return; // Only once, please
    }

    if (!this.instance) {
      this.instance = H5P.newRunnable(
        this.params.contentType,
        Globals.get('contentId'),
        undefined,
        true,
        { previousState: this.params.previousState }
      );
    }

    if (this.instance) {
      // Resize parent when children resize
      this.bubbleUp(this.instance, 'resize', Globals.get('mainInstance'));

      // Resize children to fit inside parent
      this.bubbleDown(Globals.get('mainInstance'), 'resize', [this.instance]);

      if (this.isInstanceTask(this.instance)) {
        this.instance.on('xAPI', (event) => {
          this.trackXAPI(event);
        });
      }
    }
  }

  /**
   * Make it easy to bubble events from child to parent.
   *
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Make it easy to bubble events from parent to children.
   *
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets) {
    origin.on(eventName, (event) => {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach((target) => {
        target.trigger(eventName, event);
      });
    });
  }

  /**
   * Determine whether an H5P instance is a task.
   *
   * @param {H5P.ContentType} instance Instance.
   * @returns {boolean} True, if instance is a task.
   */
  isInstanceTask(instance = {}) {
    if (!instance) {
      return false;
    }

    if (instance.isTask) {
      return instance.isTask; // Content will determine if it's task on its own
    }

    // Check for maxScore > 0 as indicator for being a task
    const hasGetMaxScore = (typeof instance.getMaxScore === 'function');
    if (hasGetMaxScore) {
      return instance.getMaxScore() > 0;
    }

    return false;
  }

  /**
   * Track scoring of contents.
   *
   * @param {Event} event Event.
   */
  trackXAPI(event) {
    if (!event || event.getScore() === null) {
      return; // Not relevant
    }

    if (event.getScore() < this.instance.getMaxScore()) {
      this.setState(Exercise.STATE['completed']);
    }
    else {
      this.setState(Exercise.STATE['cleared']);
    }
  }

  /**
   * Set exercise state.
   *
   * @param {number} state State constant.
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.force] If true, will set state unconditionally.
   */
  setState(state, params = {}) {
    if (typeof state !== 'number') {
      return;
    }

    let newState;

    if (params.force) {
      newState = Exercise.STATE[state];
    }
    else if (state === Exercise.STATE['unstarted']) {
      newState = Exercise.STATE['unstarted'];
    }
    else if (state === Exercise.STATE['opened']) {
      newState = (this.isInstanceTask(this.instance)) ?
        Exercise.STATE['opened'] :
        Exercise.STATE['cleared'];
    }
    else if (state === Exercise.STATE['completed']) {
      newState = Exercise.STATE['completed'];
    }
    else if (state === Exercise.STATE['cleared']) {
      newState = Exercise.STATE['cleared'];
    }

    if (!this.state || this.state !== newState) {
      this.state = newState;

      this.callbacks.onStateChanged(this.state);
    }
  }

  /**
   * Handle viewed.
   */
  handleViewed() {
    this.instance.attach(H5P.jQuery(this.dom));
    this.setState(Exercise.STATE['opened']);

    window.requestAnimationFrame(() => {
      Globals.get('resize')();
    });
  }

  /**
   * Reset exercise.
   */
  reset() {
    this.setState(Exercise.STATE('unstarted'));
    this.instance?.resetTask?.();

    // TODO: Is it necessary to check the visibility state via observer?
  }
}

/** @constant {object} Exercise.STATE Current state */
Exercise.STATE = { unstarted: 1, opened: 2, completed: 3, cleared: 4 };
