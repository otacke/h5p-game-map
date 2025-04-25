import H5PUtil from '@services/h5p-util.js';
import Util from '@services/util.js';

export default class Exercise {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [params.contentType] Content type parameters
   * @param {object} [params.globals] Globals.
   * @param {object} [params.previousState] Previous state.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onInitialized] Callback when instance initialized.
   * @param {function} [callbacks.onScored] Callback when scored.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      animDuration: 0
    }, params);

    this.callbacks = Util.extend({
      onInitialized: () => {},
      onScored: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise-instance-wrapper');

    this.instanceWrapper = document.createElement('div');
    this.instanceWrapper.classList.add('h5p-game-map-exercise-instance');
    this.dom.append(this.instanceWrapper);

    this.initializeInstance(this.params.previousState);
  }

  /**
   * Get DOM with H5P exercise.
   * @returns {HTMLElement} DOM with H5P exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Initialize H5P instance.
   * @param {object} [previousState] Previous state.
   */
  initializeInstance(previousState = {}) {
    this.toggleCompleted(previousState?.completed ?? false);
    this.toggleSuccess(previousState?.successful ?? false);

    if (this.instance === null || this.instance) {
      return; // Only once, please
    }

    const machineName = this.params.contentType?.library?.split?.(' ')[0];

    if (machineName === 'H5P.Video') {
      const sources = this.params.contentType.params.sources;
      const hasSources = sources?.length > 0;
      const isVideoFormat = hasSources && ['video/mp4', 'video/webm', 'video/ogg'].includes(sources[0].mime);

      this.params.contentType.params.visuals.fit = isVideoFormat || false;
    }

    if (machineName === 'H5P.Audio') {
      this.params.contentType.params.fitToWrapper = (this.params.contentType.params.playerMode === 'full');
    }

    if (machineName === 'H5P.ImageHotspotQuestion') {
      this.params.contentType.params.imageHotspotQuestion.hotspotSettings.showFeedbackAsPopup = false;
    }

    if (!this.instance) {
      this.instance = H5P.newRunnable(
        this.params.contentType,
        this.params.globals.get('contentId'),
        undefined,
        true,
        { previousState: previousState.instanceState ?? {} }
      );
    }

    if (!this.instance) {
      return;
    }

    if (this.instance.libraryInfo.machineName === 'H5P.InteractiveVideo') {
      this.runInteractiveVideoWorkaround(this.instance);
    }

    // Resize parent when children resize
    this.bubbleUp(
      this.instance, 'resize', this.params.globals.get('mainInstance')
    );

    // Resize children to fit inside parent
    this.bubbleDown(
      this.params.globals.get('mainInstance'), 'resize', [this.instance]
    );

    this.isTaskState = H5PUtil.isInstanceTask(this.instance);

    if (this.isTaskState) {
      this.instance.on('xAPI', (event) => {
        this.trackXAPI(event);
      });
    }

    this.callbacks.onInitialized({ isTask: this.isTask() });
  }

  /**
   * Get Id.
   * @returns {string|null} Exercise Id or `null` if never instantiated.
   */
  getId() {
    return this.params.contentType.subContentId ?? null;
  }

  /**
   * Get H5P instance.
   * @returns {H5P.ContentType} H5P instance.
   */
  getInstance() {
    return this.instance;
  }

  /**
   * Determine whether exercise is a task.
   * @returns {boolean} True, if exercise is a task. Else false.
   */
  isTask() {
    return this.isTaskState ?? false;
  }

  /**
   * Get current state.
   * @returns {object|null} Current state to be retrieved later.
   */
  getCurrentState() {
    const instanceState = this.instance?.getCurrentState?.();
    return {
      completed: this.wasCompleted(),
      successful: this.wasSuccessful(),
      ...(instanceState && { instanceState: instanceState })
    };
  }

  /**
   * Get xAPI data from exercises.
   * @returns {object|undefined} XAPI data objects used to build report or undefined.
   */
  getXAPIData() {
    if (!this.instance?.getXAPIData) {
      return;
    }

    let xAPIData;

    try {
      xAPIData = this.instance.getXAPIData();
    }
    catch (error) {
      console.warn('Could not get xAPI data from content type:', error);
      /*
       * Guard against content types that crash when calling getXAPIData, e.g. Memory Game
       * see https://h5ptechnology.atlassian.net/browse/HFP-4202
       */
      return;
    }

    return xAPIData;
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    if (!this.isAttached) {
      this.attachInstance();
    }

    this.instance?.showSolutions?.();
    this.isShowingSolutions = true;
  }

  /**
   * Determine whether some answer was given.
   * @returns {boolean} True, if some answer was given.
   */
  getAnswerGiven() {
    return this.instance?.getAnswerGiven?.() ?? false;
  }

  /**
   * Get score of instance.
   * @returns {number} Score of instance or 0.
   */
  getScore() {
    /*
     * Does not work for H5P.MultiChoice and H5P.MultiMediaChoice if no answer
     * option is correct.
     * In both, `getAnswerGiven` should not try to derive the state from the
     * DOM, but rather from the user actually having given an answer.
     * Should be fixed in those two.
     * Cmp. https://h5ptechnology.atlassian.net/issues/HFP-3682
     */
    const score = this.instance?.getScore?.();

    return (typeof score === 'number') ? score : 0;
  }

  /**
   * Get max score of instance.
   * @returns {number} Maximum score of instance or 0.
   */
  getMaxScore() {
    const maxScore = this.instance?.getMaxScore?.();

    return (typeof maxScore === 'number') ? maxScore : 0;
  }

  /**
   * Make it easy to bubble events from child to parent.
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
        // If not attached yet, some contents can fail (e. g. CP).
        if (this.isAttached) {
          target.trigger(eventName, event);
        }
      });
    });
  }

  /**
   * Track scoring of contents.
   * @param {Event} event Event.
   */
  trackXAPI(event) {
    if (!this.isAttached) {
      return; // Guard to make robust against content types firing xAPI events when not attached
    }

    if (!event || event.getScore() === null) {
      return; // Not relevant
    }

    const isEventFromInstance = new RegExp(this.instance.subContentId)
      .test(event.getVerifiedStatementValue(['object', 'id']));

    if (!isEventFromInstance) {
      return; // Not an event from the instance directly
    }

    this.toggleCompleted(true);

    // Handle content type's potential success flag deviating from achieving max score
    if (
      event.getScore() >= this.instance.getMaxScore() ||
      event.getVerifiedStatementValue(['result', 'success'])
    ) {
      this.toggleSuccess(true);
    }

    this.callbacks.onScored();
  }

  /**
   * Attach instance to DOM.
   */
  attachInstance() {
    if (this.isAttached) {
      return; // Already attached. Listeners would go missing on re-attaching.
    }

    this.instance.attach(H5P.jQuery(this.instanceWrapper));

    if (this.instance?.libraryInfo.machineName === 'H5P.Audio') {
      if (!!window.chrome) {
        this.instance.audio.style.height = '54px';
      }
    }

    this.isAttached = true;
  }

  /**
   * Determine whether exercise was completed.
   * @returns {boolean} True, if exercise was completed. Else false.
   */
  wasCompleted() {
    return this.completedState ?? false;
  }

  /**
   * Toggle completion state.
   * @param {boolean} [state] State to toggle to.
   * @returns {boolean} New state.
   */
  toggleCompleted(state) {
    if (typeof state !== 'boolean') {
      state = !this.completedState;
    }

    this.completedState = state;

    return this.completedState;
  }

  /**
   * Determine whether exercise was completed successfully.
   * @returns {boolean} True, if exercise was completed successfully. Else false.
   */
  wasSuccessful() {
    return this.successfulState ?? false;
  }

  /**
   * Toggle success state.
   * @param {boolean} [state] State to toggle to.
   * @returns {boolean} New state.
   */
  toggleSuccess(state) {
    if (typeof state !== 'boolean') {
      state = !this.successfulState;
    }

    this.successfulState = state;

    return this.successfulState;
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    this.score = 0;
    this.toggleCompleted(params.isInitial && (this.params.previousState?.completed ?? false));
    this.toggleSuccess(params.isInitial && (this.params.previousState?.successful ?? false));

    /*
     * If not attached yet, some contents can fail (e. g. CP), but contents
     * that are not attached never had a previous state change, so okay
     */
    if (!this.isAttached) {
      this.attachInstance();
    }

    if (!params.isInitial && this.instance) {
      if (typeof this.instance.resetTask === 'function') {
        this.instance.resetTask();
        delete this.instance.activityStartTime;
      }
      else {
        delete this.instance;
        this.initializeInstance();
        this.isAttached = false;
      }
    }
  }

  /**
   * Get all subContentIds from xAPI data.
   * @param {object[]} [xAPIData] xAPI data.
   * @returns {string[]} SubContentIds.
   */
  getSubContentIds(xAPIData) {
    if (!this.instance?.getXAPIData) {
      return [];
    }

    let subContentIds = [];

    xAPIData = xAPIData ?? [this.getXAPIData()].filter((data) => data !== undefined);

    xAPIData.forEach((entry) => {
      if (entry.statement?.object?.id) {
        const queryString = entry.statement.object.id.split('?')[1]; // xAPI Spec requires this to be a IRI.
        const queryParams = new URLSearchParams(queryString);
        const subContentId = queryParams.get('subContentId');
        if (subContentId) {
          subContentIds.push(subContentId);
        }
      }

      if (Array.isArray(entry.children)) {
        subContentIds = [...subContentIds, ...this.getSubContentIds(entry.children)];
      }
    });

    return subContentIds;
  }

  handleOpened() {
    if (this.instance?.libraryInfo.machineName === 'H5P.InteractiveVideo') {
      this.runInteractiveVideoWorkaround(this.instance);
    }
  }

  /**
   * Workaround for H5P Interactive Video.
   * If the YouTube handler is used and a previously opened stage is opened again - thus
   * the video instance is re-attached, the YouTube player by Google does send events anymore and
   * therefore Interactive Video does not work properly.
   * This workaround forces the YouTube player to be recreated and the video to be seeked to the
   * previous position.
   * @param {H5P.InteractiveVideo} interactiveVideoInstance Instance of H5P Interactive Video.
   */
  runInteractiveVideoWorkaround(interactiveVideoInstance) {
    const videoInstance = interactiveVideoInstance?.video;
    if (videoInstance?.getHandlerName?.() !== 'YouTube') {
      return; // No YouTube video used.
    }

    const currentTime = videoInstance.getCurrentTime();
    videoInstance.once('loaded', () => {
      if (typeof currentTime === 'number' && currentTime > 0) {
        /*
          * This seems to cause the YouTube player to play without a call to play, so
          * we pause it immediately afterwards. This causes the video to be stuck on the
          * buffering spinner. The alternative would be to wait for the next state change
          * indicating that the video is playing (but was not triggered by the user) and
          * then pause the video, but that leads the video to play slightly. Feels worse.
          */
        interactiveVideoInstance.seek(currentTime);
        videoInstance.pause();
      }
    });
    videoInstance.resetPlayback();
  }
}
