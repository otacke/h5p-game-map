import Timer from '@services/timer.js';
import H5PUtil from '@services/h5p-util.js';
import Util from '@services/util.js';

export default class Exercise {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onStateChanged] Callback when state changed.
   * @param {function} [callbacks.onScoreChanged] Callback when score changed.
   * @param {function} [callbacks.onTimerTicked] Callback when timer ticked.
   * @param {function} [callbacks.onTimeoutWarning] Callback when timer warned.
   * @param {function} [callbacks.onTimeout] Callback when time ran out.
   * @param {function} [callbacks.onContinued] Callback when user clicked continue.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      animDuration: 0
    }, params);

    this.params.state = this.params.state ??
      this.params.globals.get('states').unstarted;

    this.callbacks = Util.extend({
      onStateChanged: () => {},
      onScoreChanged: () => {},
      onTimerTicked: () => {},
      onTimeoutWarning: () => {},
      onTimeout: () => {},
      onContinued: () => {}
    }, callbacks);

    this.setState(this.params.globals.get('states').unstarted);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise-instance-wrapper');

    this.instanceWrapper = document.createElement('div');
    this.instanceWrapper.classList.add('h5p-game-map-exercise-instance');
    this.dom.append(this.instanceWrapper);

    this.initializeInstance();
  }

  /**
   * Get DOM with H5P exercise.
   * @returns {HTMLElement} DOM with H5P exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get state.
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
    const exercisesState =
      this.params.globals.get('extras').previousState?.content?.exercises ?? [];

    this.previousState = exercisesState
      .find((item) => item.exercise?.id === this.getId());
    this.previousState = this.previousState?.exercise || {};

    if (!this.instance) {
      this.instance = H5P.newRunnable(
        this.params.contentType,
        this.params.globals.get('contentId'),
        undefined,
        true,
        { previousState: this.previousState?.instanceState }
      );
    }

    if (!this.instance) {
      return;
    }

    // Resize parent when children resize
    this.bubbleUp(
      this.instance, 'resize', this.params.globals.get('mainInstance')
    );

    // Resize children to fit inside parent
    this.bubbleDown(
      this.params.globals.get('mainInstance'), 'resize', [this.instance]
    );

    if (H5PUtil.isInstanceTask(this.instance)) {
      this.instance.on('xAPI', (event) => {
        this.trackXAPI(event);
      });
    }
  }

  /**
   * Get Id.
   * @returns {string} Exercise Id.
   */
  getId() {
    return this.params.id;
  }

  /**
   * Get current state.
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    const remainingTime = Math.min(
      this.timeLeft,
      (this.params.time?.timeLimit || 0) * 1000 + this.params.animDuration
    );

    return {
      state: this.state,
      id: this.params.id,
      remainingTime: remainingTime,
      isCompleted: this.isCompleted,
      instanceState: this.instance?.getCurrentState?.()
    };
  }

  /**
   * Get xAPI data from exercises.
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
   * Get remaining time.
   * @returns {number} Remaining time in ms.
   */
  getRemainingTime() {
    return this.timeLeft;
  }

  /**
   * Determine whether exercise is in timeout warning state.
   * @returns {boolean} True, if exercise is in timeout warning state.
   */
  isTimeoutWarning() {
    return (
      typeof this.params.time.timeoutWarning === 'number' &&
      this.timeLeft <= this.params.time?.timeoutWarning * 1000
    );
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
    const isEventFromInstance = new RegExp(this.instance.subContentId)
      .test(event.getVerifiedStatementValue(['object', 'id']));

    if (!isEventFromInstance) {
      return; // Not an event from the instance directly
    }

    if (!event || event.getScore() === null) {
      return; // Not relevant
    }

    if (!this.isAttached) {
      return; // Guard to make robust against content types firing xAPI events when not attached
    }

    const isCompletedEnough =
      this.params.globals.get('params').behaviour.map.roaming !== 'success';

    this.score = event.getScore();

    if (
      this.score >= this.instance.getMaxScore() ||
      event.getVerifiedStatementValue(['result', 'success'])
    ) {
      this.setState(this.params.globals.get('states').cleared);
      this.params.jukebox.stopGroup('default');
      this.params.jukebox.play('checkExerciseFullScore');

      this.stop();
      this.isCompleted = true;
    }
    else {
      this.setState(this.params.globals.get('states').completed);
      this.params.jukebox.stopGroup('default');
      this.params.jukebox.play('checkExerciseNotFullScore');

      if (isCompletedEnough) {
        this.stop();
        this.isCompleted = true;
      }
    }

    this.callbacks.onScoreChanged({
      score: this.score,
      maxScore: this.instance.getMaxScore()
    });

    if (this.extendsH5PQuestion) {
      this.instance.showButton('game-map-continue');
    }
    else {
      this.continueButton.classList.remove('display-none');
      this.continueButton.removeAttribute('disabled');
    }
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
    else {
      const remainingTime = Math.min(
        this.timeLeft,
        (this.params.time?.timeLimit || 0) * 1000 + this.params.animDuration
      );
      this.timer?.start(remainingTime);
    }

    this.setState('opened');

    window.requestAnimationFrame(() => {
      this.params.globals.get('resize')();
    });
  }

  /**
   * Set exercise state.
   * @param {number|string} state State constant.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.force] If true, will set state unconditionally.
   */
  setState(state, params = {}) {
    const states = this.params.globals.get('states');

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
    else if (state === states.unstarted) {
      newState = states.unstarted;
    }
    else if (state === states.opened) {
      newState = (H5PUtil.isInstanceTask(this.instance)) ?
        states.opened :
        states.cleared;
    }
    else if (state === states.completed) {
      newState = states.completed;
    }
    else if (state === states.cleared) {
      newState = states.cleared;
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

    this.instance.attach(H5P.jQuery(this.instanceWrapper));

    if (this.instance?.libraryInfo.machineName === 'H5P.Audio') {
      if (!!window.chrome) {
        this.instance.audio.style.height = '54px';
      }
    }

    // If using H5P.Question, use its button functions.
    if (
      this.instance.registerDomElements &&
      this.instance.addButton && this.instance.hasButton
    ) {
      this.extendsH5PQuestion = true;

      this.instance.addButton(
        'game-map-continue',
        this.params.dictionary.get('l10n.continue'),
        () => {
          this.callbacks.onContinued();
        },
        false
      );
    }
    else {
      this.continueButton = document.createElement('button');
      this.continueButton.classList.add(
        'h5p-joubelui-button',
        'h5p-game-map-exercise-instance-continue-button',
        'display-none'
      );
      this.continueButton.setAttribute('disabled', 'disabled');
      this.continueButton.innerText =
        this.params.dictionary.get('l10n.continue');
      this.continueButton.addEventListener('click', () => {
        this.callbacks.onContinued();
      });

      this.dom.append(this.continueButton);
    }

    this.isAttached = true;
  }

  /**
   * Set path reachable or unreachable.
   * @param {boolean} state If true, path is reachable. Else not.
   */
  setReachable(state) {
    if (typeof state !== 'boolean') {
      return;
    }

    this.isReachableState = state;
  }

  /**
   * @returns {boolean} True, if path is reachable. Else false.
   */
  isReachable() {
    return this.isReachableState;
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    this.score = 0;
    this.setReachable(true);

    if (this.extendsH5PQuestion) {
      this.instance.hideButton('game-map-continue');
    }
    else {
      this.continueButton?.classList.add('display-none');
      this.continueButton?.setAttribute('disabled', 'disabled');
    }

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
      state = this.params.globals.get('states').unstarted;
    }

    if (timeLimit > -1) {
      this.timer = this.timer ?? new Timer(
        { interval: 500 },
        {
          onExpired: () => {
            this.handleTimeout();
          },
          onTick: () => {
            this.timeLeft = this.timer.getTime();
            const isTimeoutWarning = this.isTimeoutWarning();

            this.callbacks.onTimerTicked(
              this.timeLeft,
              { timeoutWarning: isTimeoutWarning }
            );

            if (!this.hasPlayedTimeoutWarning && isTimeoutWarning) {
              this.handleTimeoutWarning();
            }
          }
        }
      );

      this.timeLeft = this.params.animDuration + timeLimit;
    }

    if (!params.isInitial) {
      this.timer?.reset();
      this.timer?.setTime(this.timeLeft);
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

    if (!params.isInitial && this.instance) {
      if (typeof this.instance.resetTask === 'function') {
        this.instance.resetTask();
      }
      else {
        delete this.instance;
        this.initializeInstance();
        this.isAttached = false;
      }
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
    if (!this.hasPlayedTimeoutWarning && this.isTimeoutWarning()) {
      this.hasPlayedTimeoutWarning = true;
      this.callbacks.onTimeoutWarning();
    }
  }
}
