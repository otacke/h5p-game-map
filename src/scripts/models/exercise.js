import Globals from '@services/globals';
import Util from '@services/util';

export default class Exercise {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onStateChanged] Callback when state changed.
   * @param {function} [callbacks.onScoreChanged] Callback when score changed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.callbacks = Util.extend({
      onStateChanged: () => {},
      onScoreChanged: () => {}
    }, callbacks);

    this.setState(Globals.get('states')['unstarted']);

    this.instance;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise-instance-container');

    this.initializeInstance();
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
   * Get score of instance.
   *
   * @returns {number} Score of instance or 0.
   */
  getScore() {
    const score = this.instance?.getScore?.();

    return (typeof score === 'number') ? score : 0;
  }

  /**
   * Get max score of instance.
   *
   * @returns {number} Maximum score of instance or 0.
   */
  getMaxScore() {
    const maxScore = this.instance?.getMaxScore?.();

    return (typeof maxScore === 'number') ? maxScore : 0;
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
      return true;
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

    this.score = event.getScore();

    if (this.score  < this.instance.getMaxScore()) {
      this.setState(Globals.get('states')['completed']);
    }
    else {
      this.setState(Globals.get('states')['cleared']);
    }

    this.callbacks.onScoreChanged(this.score);
  }

  /**
   * Set exercise state.
   *
   * @param {number|string} state State constant.
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.force] If true, will set state unconditionally.
   */
  setState(state, params = {}) {
    const states = Globals.get('states');

    if (typeof state === 'string') {
      state = Object.entries(states)
        .find((entry) => entry[0] === state)[1];
    }

    if (typeof state !== 'number') {
      return;
    }

    let newState;

    if (params.force) {
      newState = states[state];
    }
    else if (state === states['unstarted']) {
      newState = states['unstarted'];
    }
    else if (state === states['opened']) {
      newState = (this.isInstanceTask(this.instance)) ?
        states['opened'] :
        states['cleared'];
    }
    else if (state === states['completed']) {
      newState = states['completed'];
    }
    else if (state === states['cleared']) {
      newState = states['cleared'];
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
    this.setState('opened');

    window.requestAnimationFrame(() => {
      Globals.get('resize')();
    });
  }

  /**
   * Reset exercise.
   */
  reset() {
    this.score = 0;
    this.setState(Globals.get('states')['unstarted']);
    this.instance?.resetTask?.();

    // TODO: Is this sufficient for YouTube Videos if not, add exceptions
    window.requestIdleCallback(() => {
      this.observer = this.observer || new IntersectionObserver((entries) => {
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
}
