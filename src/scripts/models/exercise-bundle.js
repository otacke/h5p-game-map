import Timer from '@services/timer.js';
import Util from '@services/util.js';
import Exercise from '@models/exercise.js';


/** @constant {number} MS_IN_S Milliseconds in a second. */
const MS_IN_S = 1000;

export default class ExerciseBundle {

  /**
   * @class ExerciseBundle
   * @param {object} [params] Parameters.
   * @param {object} [params.dictionary] Dictionary.
   * @param {object} [params.globals] Globals.
   * @param {object} [params.jukebox] Jukebox.
   * @param {object} [params.time] Time left for user.
   * @param {object} [params.previousState] Previous state.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onStateChanged] Callback when state changed.
   * @param {function} [callbacks.onScoreChanged] Callback when score changed.
   * @param {function} [callbacks.onTimerTicked] Callback when timer ticked.
   * @param {function} [callbacks.onTimeoutWarning] Callback when timeout warning.
   * @param {function} [callbacks.onTimeout] Callback when timeout.
   * @param {function} [callbacks.onContinued] Callback when continued.
   * @param {function} [callbacks.onInitialized] Callback when initialized.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.params.state = this.params.state ?? this.params.globals.get('states').unstarted;

    this.callbacks = Util.extend({
      onStateChanged: () => {},
      onScoreChanged: () => {},
      onTimerTicked: () => {},
      onTimeoutWarning: () => {},
      onTimeout: () => {},
      onContinued: () => {},
      onInitialized: () => {}
    }, callbacks);

    this.exercises = [];

    this.setState(this.params.globals.get('states').unstarted);

    for (const exerciseIndex in params.contentsList) {
      const previousState = this.params.previousState?.instances?.[exerciseIndex];

      const contentType = params.contentsList[exerciseIndex].contentType;
      this.exercises.push(
        new Exercise(
          {
            contentType: contentType,
            isInitial: this.params.isInitial,
            dictionary: this.params.dictionary,
            globals: this.params.globals,
            jukebox: this.params.jukebox,
            previousState: previousState
          },
          {
            onInitialized: (params) => {
              window.setTimeout(() => {
                this.callbacks.onInitialized(params);
              }, 0);
            },
            onScored: () => {
              this.handleScored();
            }
          }
        )
      );
    }

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise-bundle');
    this.exercises.forEach((exercise) => {
      this.dom.appendChild(exercise.getDOM());
    });

    const lastExercise = this.exercises[this.exercises.length - 1];
    this.continueButtonInstance = lastExercise.getInstance();
    if (
      this.continueButtonInstance.registerDomElements &&
      this.continueButtonInstance.addButton &&
      this.continueButtonInstance.hasButton
    ) {
      this.continueButtonInstance.addButton(
        'game-map-continue',
        this.params.dictionary.get('l10n.continue'),
        () => {
          this.callbacks.onContinued();
        },
        false
      );
    }
    else {
      delete this.continueButtonInstance;

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
  }

  /**
   * Get bundle DOM.
   * @returns {HTMLElement} Bundle DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get all subContentIds from xAPI data.
   * @param {object[]} [xAPIData] xAPI data.
   * @returns {string[]} SubContentIds.
   */
  getSubContentIds(xAPIData) {
    const subContentIds = [];

    this.exercises.forEach((exercise) => {
      subContentIds.push(exercise.getSubContentIds(xAPIData));
    });

    return subContentIds;
  }

  /**
   * Reset exercises.
   * @param {object} params Parameters.
   */
  reset(params = {}) {
    let timeLimit;
    let state;

    if (params.isInitial) {
      timeLimit = this.params.previousState?.remainingTime;
      if (typeof timeLimit !== 'number') {
        timeLimit = (this.params.time?.timeLimit ?? -1) * MS_IN_S;
      }

      this.isCompleted = this.params.previousState?.isCompleted ?? false;

      state = this.params.previousState?.state ?? this.params.state;
    }
    else {
      timeLimit = (this.params.time?.timeLimit ?? -1) * MS_IN_S;
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

      this.timeLeft = timeLimit;
    }

    if (!params.isInitial) {
      this.timer?.reset();
      this.timer?.setTime(this.timeLeft);
    }

    if (this.continueButtonInstance) {
      this.continueButtonInstance.hideButton('game-map-continue');
    }
    else {
      this.continueButton?.classList.add('display-none');
      this.continueButton?.setAttribute('disabled', 'disabled');
    }

    this.setState(state);

    this.hasPlayedTimeoutWarning = false;

    this.wasViewed = false;

    this.isShowingSolutions = false;

    this.exercises.forEach((exercise) => {
      exercise.reset(params);
    });
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
   * Determine whether bundle is reachable.
   * @returns {boolean} True, if path is reachable. Else false.
   */
  isReachable() {
    return this.isReachableState;
  }

  /**
   * Get score of all exercises.
   * @returns {number} Score.
   */
  getScore() {
    let score = 0;

    this.exercises.forEach((exercise) => {
      score += exercise.getScore();
    });

    return score;
  }

  /**
   * Get maximum score of all exercises.
   * @returns {number} Score.
   */
  getMaxScore() {
    let maxScore = 0;

    this.exercises.forEach((exercise) => {
      maxScore += exercise.getMaxScore();
    });

    return maxScore;
  }

  /**
   * Determine whether some answer was given in any exercise.
   * @returns {boolean} True, if some answer was given.
   */
  getAnswerGiven() {
    return this.exercises.some((exercise) => exercise.getAnswerGiven());
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
      this.timeLeft <= this.params.time?.timeoutWarning * MS_IN_S
    );
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    const remainingTime = Math.min(
      this.timeLeft, // TODO: Fix state for new structure!
      (this.params.time?.timeLimit || 0) * MS_IN_S + this.params.animDuration
    );

    const instances = this.exercises.map((exercise) => {
      return exercise.getCurrentState();
    });

    return {
      id: this.params.id,
      state: this.state,
      remainingTime: remainingTime,
      isCompleted: this.isCompleted,
      instances: instances
    };
  }

  /**
   * Start time etc. (on opening exercise).
   */
  start() {
    if (this.isCompleted && this.isAttached) {
      return; // Exercise already completed
    }

    if (!this.isAttached) {
      this.exercises.forEach((exercise) => {
        exercise.attachInstance();
        this.isAttached = true;

        if (!exercise.isTask()) {
          exercise.toggleCompleted(true);
          exercise.toggleSuccess(true);
        }
      });
    }

    this.isCompleted = this.exercises.every((exercise) => exercise.wasCompleted());

    // Some content types build/initialize DOM when attaching
    if (this.isShowingSolutions) {
      this.showSolutions();
    }
    else if (!this.isCompleted) {
      const remainingTime = Math.min(
        this.timeLeft,
        (this.params.time?.timeLimit || 0) * MS_IN_S + this.params.animDuration
      );
      this.timer?.start(remainingTime);
    }

    this.setState('opened');

    window.requestAnimationFrame(() => {
      this.params.globals.get('resize')();
    });
  }

  /**
   * Stop timer.
   */
  stop() {
    this.timer?.stop();
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
      this.hasTask = this.hasTask ?? this.exercises.some((exercise) => exercise.isTask());

      newState = this.hasTask ? states.opened : states.cleared;
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

  /**
   * Handle exercise scored.
   */
  handleScored() {
    const roaming = this.params.globals.get('params').behaviour.map.roaming;
    this.isCompleted = this.exercises.every((exercise) => exercise.wasCompleted());
    const allExercisesSuccessful = this.exercises.every((exercise) => exercise.wasSuccessful());

    // Completed state
    if (allExercisesSuccessful) {
      this.setState(this.params.globals.get('states').cleared);
    }
    else if (this.isCompleted) {
      this.setState(this.params.globals.get('states').completed);
    }

    // Stop timer and allow continue
    if (
      roaming === 'free' ||
      roaming === 'complete' && this.isCompleted ||
      roaming === 'success' && allExercisesSuccessful
    ) {
      this.stop();

      if (this.continueButtonInstance) {
        this.continueButtonInstance.showButton('game-map-continue');
      }
      else {
        this.continueButton.classList.remove('display-none');
        this.continueButton.removeAttribute('disabled');
      }
    }

    this.callbacks.onScoreChanged({
      score: this.getScore(),
      maxScore: this.getMaxScore()
    });
  }
}
