import Timer from '@services/timer.js';
import Util from '@services/util.js';
import Exercise from '@models/exercise.js';

/** @constant {number} MS_IN_S Milliseconds in a second. */
const MS_IN_S = 1000;

const XAPI_DEFAULT_DESCRIPTION = 'Game Map Exercise Bundle';

/*
 * Will implement some variables and methods of a real H5P.ContentType instance
 * inorder to be able to use the H5P.XAPIEvent class as usual.
 */
export default class ExerciseBundle extends H5P.EventDispatcher {

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
    super();

    this.params = params;
    this.params.state = this.params.state ?? this.params.globals.get('states').unstarted;

    this.callbacks = Util.extend({
      onStateChanged: () => {},
      onScoreChanged: () => {},
      onTimerTicked: () => {},
      onTimeoutWarning: () => {},
      onTimeout: () => {},
      onContinued: () => {},
      onInitialized: () => {},
    }, callbacks);

    this.exercises = [];

    // Faking H5P.ContentType instance
    this.parent = this.params.globals.get('mainInstance');
    this.contentId = this.parent.contentId;
    this.subContentId = this.params.previousState?.subContentId ?? H5P.createUUID();

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
            previousState: previousState,
          },
          {
            onInitialized: (params) => {
              window.setTimeout(() => {
                params.score = this.getScore();
                params.maxScore = this.getMaxScore();
                this.callbacks.onInitialized(params);
              }, 0);
            },
            onScored: (params = {}) => {
              this.handleScored(params);
            },
          },
        ),
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
      this.continueButtonInstance?.registerDomElements &&
      this.continueButtonInstance?.addButton &&
      this.continueButtonInstance?.hasButton
    ) {
      this.continueButtonInstance.addButton(
        'game-map-continue',
        this.params.dictionary.get('l10n.continue'),
        () => {
          this.callbacks.onContinued();
        },
        false,
      );
    }
    else {
      delete this.continueButtonInstance;

      this.continueButton = document.createElement('button');
      this.continueButton.classList.add(
        'h5p-joubelui-button',
        'h5p-game-map-exercise-instance-continue-button',
        'display-none',
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
   * Get library info based on parent version. Faking H5P.ContentType instance.
   * @returns {object} Library info.
   */
  get libraryInfo() {
    const machineName = 'H5P.GameMapExerciseBundle';
    const { minorVersion, majorVersion } = this.parent.libraryInfo;

    return {
      machineName: machineName,
      majorVersion: majorVersion,
      minorVersion: minorVersion,
      versionedName: `${machineName} ${majorVersion}.${minorVersion}`,
      versionedNameNoSpaces: `${machineName}-${majorVersion}.${minorVersion}`,
    };
  }

  /**
   * Get bundle DOM.
   * @returns {HTMLElement} Bundle DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get title.
   * @returns {string} Title.
   */
  getTitle() {
    return this.params.label;
  }

  /**
   * Get all subContentIds from xAPI data.
   * @param {object[]} [xAPIData] xAPI data.
   * @returns {string[]} SubContentIds.
   */
  getSubContentIds(xAPIData) {
    let subContentIds = [];

    this.exercises.forEach((exercise) => {
      const exerciseIds = exercise.getSubContentIds(xAPIData);
      subContentIds = subContentIds.concat(exerciseIds);
    });

    return subContentIds;
  }

  /**
   * Handle bundle opened.
   */
  handleOpened() {
    this.exercises.forEach((exercise) => {
      exercise.handleOpened();
    });
  }

  /**
   * Reset exercises.
   * @param {object} params Parameters.
   */
  reset(params = {}) {
    let timeLimit;
    let state;
    delete this.activityStartTime;

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
              { timeoutWarning: isTimeoutWarning },
            );

            if (!this.hasPlayedTimeoutWarning && isTimeoutWarning) {
              this.handleTimeoutWarning();
            }
          },
        },
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
   * Show solutions.
   */
  showSolutions() {
    this.exercises.forEach((exercise) => {
      exercise.showSolutions?.();
    });
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
      this.timeLeft,
      (this.params.time?.timeLimit || 0) * MS_IN_S + this.params.animDuration,
    );

    const instances = this.exercises.map((exercise) => {
      return exercise.getCurrentState();
    });

    return {
      id: this.params.id,
      subContentId: this.subContentId,
      state: this.state,
      remainingTime: remainingTime,
      isCompleted: this.isCompleted,
      instances: instances,
    };
  }

  /**
   * Trigger xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   */
  triggerXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEvent(verb);
    this.trigger(xAPIEvent);
  }

  /**
   * Create an xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   * @returns {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);

    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition());

    if (verb === 'completed' || verb === 'answered') {
      xAPIEvent.setScoredResult(
        this.getScore(), // Question Type Contract mixin
        this.getMaxScore(), // Question Type Contract mixin
        this, // setScoredResult will try to find `activityStartTime` on a real instance
        true,
        this.getScore() === this.getMaxScore(),
      );
    }

    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   * @returns {object} XAPI definition.
   */
  getXAPIDefinition() {
    const root = this.params.globals.get('mainInstance');

    const definition = {};

    definition.name = {};
    definition.name[root.languageTag] = this.getTitle();
    // Fallback for h5p-php-reporting, expects en-US
    definition.name['en-US'] = definition.name[root.languageTag];

    definition.description = {};
    definition.description[root.languageTag] = XAPI_DEFAULT_DESCRIPTION;
    // Fallback for h5p-php-reporting, expects en-US
    definition.description['en-US'] = definition.description[root.languageTag];

    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'other';

    return definition;
  }

  /**
   * Get xAPI data.
   * @returns {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    const xAPIEvent = this.createXAPIEvent('completed');

    // Not a valid xAPI value (!), but H5P uses it for reporting
    xAPIEvent.data.statement.object.definition.interactionType = 'compound';

    const children = this.exercises
      .map((exercise) => exercise?.getXAPIData?.())
      .filter((data) => !!data);

    return {
      statement: xAPIEvent.data.statement,
      children: children,
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
        (this.params.time?.timeLimit || 0) * MS_IN_S + this.params.animDuration,
      );
      this.timer?.start(remainingTime);
    }

    this.setState(this.params.globals.get('states').opened);

    this.setActivityStarted(); // inherited
    this.exercises.forEach((exercise) => {
      exercise.getInstance()?.setActivityStarted?.();
    });

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
      // Exercises which are not tasks are automatically cleared after opening
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
   * Get state.
   * @returns {number} State constant.
   */
  getState() {
    return this.state;
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
   * @param {object} [params] Parameters.
   */
  handleScored(params = {}) {
    const roaming = this.params.globals.get('params').behaviour.map.roaming;
    this.isCompleted = this.exercises.every((exercise) => exercise.wasCompleted());
    const allExercisesSuccessful = this.exercises.every((exercise) => exercise.wasSuccessful());

    // Completed state
    if (allExercisesSuccessful) {
      this.setState(this.params.globals.get('states').cleared);
      // Ensure that exercise statement is triggered before
      window.requestAnimationFrame(() => {
        this.triggerXAPIEvent('completed');
      });
    }
    else if (this.isCompleted) {
      this.setState(this.params.globals.get('states').completed);
      // Ensure that exercise statement is triggered before
      window.requestAnimationFrame(() => {
        this.triggerXAPIEvent('completed');
      });
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
      maxScore: this.getMaxScore(),
      bundleCompleted: this.isCompleted,
      exerciseSuccessful: params.successful,
    });
  }
}
