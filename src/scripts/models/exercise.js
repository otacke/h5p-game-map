import Globals from '@services/globals';

export default class Exercise {

  constructor(params = {}) {
    this.params = params;

    this.instance;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise-instance-container');

    this.initializeInstance();

    // TODO: Is this sufficient for YouTube Videos if not, add exceptions
    window.requestIdleCallback(() => {
      this.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          this.observer.unobserve(this.dom);

          this.instance.attach(H5P.jQuery(this.dom));
          window.requestAnimationFrame(() => {
            Globals.get('resize')();
          });
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
    }

    // TODO Determine other things such as maxScore, etc.
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
}
