import Globals from '@services/globals';
import Jukebox from '@services/jukebox';
import Timer from '@services/timer';
import Util from '@services/util';

export default class Exercise {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onStateChanged] Callback when state changed.
   * @param {function} [callbacks.onScoreChanged] Callback when score changed.
   * @param {function} [callbacks.onTimerTicked] Callback when timer ticked.
   * @param {function} [callbacks.onTimeoutWarning] Callback when timer warned.
   * @param {function} [callbacks.onTimeout] Callback when time ran out.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      state: Globals.get('states')['unstarted'],
      animDuration: 0
    }, params);

    this.callbacks = Util.extend({
      onStateChanged: () => {},
      onScoreChanged: () => {},
      onTimerTicked: () => {},
      onTimeoutWarning: () => {},
      onTimeout: () => {}
    }, callbacks);

    this.setState(Globals.get('states')['unstarted']);

    this.instance;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise-instance');

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
   * Get state.
   *
   * @returns {number} State.
   */
  getState() {
    return this.state;
  }

  /**
   * Initialize H5P instance.
   */
  initializeInstance() {
    if (this.instance === null || this.instance) {
      return; // Only once, please
    }

    const machineName = this.params.contentType?.library?.split?.(' ')[0];

    if (machineName === 'H5P.Video') {
      this.params.contentType.params.visuals.fit = (
        this.params.contentType.params.sources.length && (
          this.params.contentType.params.sources[0].mime === 'video/mp4' ||
          this.params.contentType.params.sources[0].mime === 'video/webm' ||
          this.params.contentType.params.sources[0].mime === 'video/ogg'
        )
      );
    }

    if (machineName === 'H5P.Audio') {
      if (this.params.contentType.params.playerMode === 'full') {
        this.params.contentType.params.fitToWrapper = true;
      }
    }

    // Get previous instance state
    const exercisesState = Globals.get('extras').previousState?.content?.
      exercises ?? [];

    this.previousState = exercisesState
      .find((item) => item.exercise?.id === this.getId());
    this.previousState = this.previousState?.exercise || {};

    if (!this.instance) {
      this.instance = H5P.newRunnable(
        this.params.contentType,
        Globals.get('contentId'),
        undefined,
        true,
        { previousState: this.previousState?.instanceState }
      );
    }

    if (!this.instance) {
      return;
    }

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

  /**
   * Get Id.
   *
   * @returns {string} Exercise Id.
   */
  getId() {
    return this.params.id;
  }

  /**
   * Get current state.
   *
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    return {
      state: this.state,
      id: this.params.id,
      remainingTime: this.remainingTime,
      isCompleted: this.isCompleted,
      instanceState: this.instance?.getCurrentState?.()
    };
  }

  /**
   * Get xAPI data from exercises.
   *
   * @returns {object[]} XAPI data objects used to build report.
   */
  getXAPIData() {
    return this.instance.getXAPIData?.();
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
   *
   * @returns {boolean} True, if some answer was given.
   */
  getAnswerGiven() {
    return this.instance?.getAnswerGiven?.() ?? false;
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
   * Get remaining time.
   *
   * @returns {number} Remaining time in ms.
   */
  getRemainingTime() {
    return this.remainingTime;
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
        // If not attached yet, some contents can fail (e. g. CP).
        if (this.isAttached) {
          target.trigger(eventName, event);
        }
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
    if (hasGetMaxScore && instance.getMaxScore() > 0) {
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
    const isEventFromInstance = new RegExp(this.instance.subContentId)
      .test(event.getVerifiedStatementValue(['object', 'id']));

    if (!isEventFromInstance) {
      return; // Not an event from the instance directly
    }

    if (!event || event.getScore() === null) {
      return; // Not relevant
    }

    const isCompletedEnough =
      Globals.get('params').behaviour.map.roaming !== 'success';

    this.score = event.getScore();

    if (this.score < this.instance.getMaxScore()) {
      this.setState(Globals.get('states')['completed']);
      Jukebox.stopGroup('default');
      Jukebox.play('checkExerciseNotFullScore');

      if (isCompletedEnough) {
        this.stop();
        this.isCompleted = true;
      }
    }
    else {
      this.setState(Globals.get('states')['cleared']);
      Jukebox.stopGroup('default');
      Jukebox.play('checkExerciseFullScore');

      this.stop();
      this.isCompleted = true;
    }

    this.callbacks.onScoreChanged({
      score: this.score,
      maxScore: this.instance.getMaxScore()
    });
  }

  /**
   * Stop.
   */
  stop() {
    this.timer?.stop();
  }

  /**
   * Start.
   */
  start() {
    if (this.isCompleted && this.isAttached) {
      return; // Exercise already completed
    }

    this.attachInstance();

    // Some content types build/initialize DOM when attaching
    if (this.isShowingSolutions) {
      this.showSolutions();
    }

    this.setState('opened');

    this.timer?.start(this.remainingTime);

    window.requestAnimationFrame(() => {
      Globals.get('resize')();
    });
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
   * Attach instance to DOM.
   */
  attachInstance() {
    if (this.isAttached) {
      return; // Already attached. Listeners would go missing on re-attaching.
    }

    this.instance.attach(H5P.jQuery(this.dom));

    if (this.instance?.libraryInfo.machineName === 'H5P.Audio') {
      if (!!window.chrome) {
        this.instance.audio.style.height = '54px';
      }
    }

    this.isAttached = true;
  }

  /**
   * Reset.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    this.score = 0;

    let timeLimit;
    let state;

    if (params.isInitial) {
      timeLimit = this.previousState?.remainingTime;
      if (typeof timeLimit !== 'number') {
        timeLimit = (this.params.time?.timeLimit ?? -1) * 1000;
      }

      this.isCompleted = this.previousState.isCompleted ?? false;

      state = this.previousState.state ?? this.params.state;
    }
    else {
      timeLimit = (this.params.time?.timeLimit ?? -1) * 1000;
      this.isCompleted = false;
      state = Globals.get('states')['unstarted'];
    }

    if (timeLimit > -1) {
      this.timer = this.timer ?? new Timer(
        { interval: 500 },
        {
          onExpired: () => {
            this.handleTimeout();
          },
          ...(this.params.time.timeoutWarning && {
            onTick: () => {
              this.handleTimeoutWarning();
            }
          })
        }
      );

      this.remainingTime = this.params.animDuration + timeLimit;
    }

    if (!params.isInitial) {
      this.timer?.reset();
      this.timer?.setTime(this.remainingTime);
    }

    this.setState(state);

    this.hasPlayedTimeoutWarning = false;

    /*
     * If not attached yet, some contents can fail (e. g. CP), but contents
     * that are not attached never had a previous state change, so okay
     */
    if (!this.isAttached) {
      this.attachInstance();
    }

    if (!params.isInitial) {
      this.instance?.resetTask?.();
    }

    this.wasViewed = false;

    this.isShowingSolutions = false;
  }

  /**
   * Handle timeout.
   */
  handleTimeout() {
    this.callbacks.onTimeout();
  }

  /**
   * Handle timeout warning.
   */
  handleTimeoutWarning() {
    this.remainingTime = this.timer.getTime();

    this.callbacks.onTimerTicked(this.remainingTime);

    if (
      this.remainingTime <= this.params.time?.timeoutWarning * 1000 &&
      !this.hasPlayedTimeoutWarning
    ) {
      this.hasPlayedTimeoutWarning = true;
      this.callbacks.onTimeoutWarning();
    }
  }
}
