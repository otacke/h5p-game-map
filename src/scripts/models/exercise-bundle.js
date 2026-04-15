import Timer from '@services/timer.js';
import Util, { pickFromArray } from '@services/util.js';
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

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise-bundle');

    this.rebuild();
  }

  /**
   * Rebuild.
   */
  rebuild() {
    this.exercises = [];

    const contentSelector =
      this.params.previousState.pickedContentIndexes ?? this.params.stageBehaviour.randomExerciseCount;

    const selectedContentsData = pickFromArray(this.params.contentsList, contentSelector);
    if (contentSelector !== undefined) {
      this.pickedContentIndexes = selectedContentsData.indexes;
    }

    selectedContentsData.indexes.forEach((exerciseIndex) => {
      const previousState = this.params.previousState?.instances?.[exerciseIndex];
      const contentType = this.params.contentsList[exerciseIndex].contentType;
      const livesSettings = this.params.contentsList[exerciseIndex].livesSettings;
      const subContentId = contentType.subContentId;

      const scoreScalingList = this.params.scoreScaling?.scoreScalingList ?? [];
      const scalingItem = scoreScalingList.find((scaling) => scaling.subContentId === subContentId);
      const weight = scalingItem?.weight ?? 0;

      this.exercises.push(
        new Exercise(
          {
            contentType: contentType,
            livesSettings: livesSettings,
            isInitial: this.params.isInitial,
            dictionary: this.params.dictionary,
            globals: this.params.globals,
            jukebox: this.params.jukebox,
            previousState: previousState,
            parent: this,
            weight: weight,
          },
          {
            onInitialized: (params) => {
              window.setTimeout(() => {
                params.score = this.getWeightedScore();
                params.maxScore = this.getWeightedMaxScore();
                this.callbacks.onInitialized(params);
              }, 0);
            },
            onScored: (params = {}) => {
              this.handleScored(params);
            },
          },
        ),
      );
    });

    if (!Object.keys(this.params.scoreScaling).length) {
      this.exercises.forEach((exercise) => {
        if (!exercise.isTask()) {
          return;
        }

        exercise.setWeight(1);
      });
    }
    else if (this.params.scoreScaling.scalingMode === 'totalScore' && this.params.scoreScaling.totalScore) {
      const maxScoreOfAllTasks = this.getMaxScore(); // Important to get original max score before weights are applied
      const weight = this.params.scoreScaling.totalScore / maxScoreOfAllTasks;
      this.exercises.forEach((exercise) => {
        if (!exercise.isTask()) {
          return;
        }

        exercise.setWeight(weight);
      });
    }

    this.dom.innerHTML = '';
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
   * Determine whether the bundle contains at least one task.
   * @returns {boolean} True if bundle contains at least one task, false otherwise.
   */
  containsTask() {
    return this.exercises.some((exercise) => exercise.isTask());
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
      delete this.params.previousState.pickedContentIndexes;
      delete this.pickedContentIndexes;
      this.rebuild();
    }

    if (timeLimit > -1) {
      this.timer = this.timer ?? new Timer(
        { interval: 500 },
        {
          onExpired: () => {
            this.handleTimeout();
          },
          onTick: () => {
            this.setRemainingTime(this.timer.getTime());
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
   * Get information about lives settings for exercises which have it, formatted for display.
   * @returns {object} Lives info for exercises which have lives settings, formatted for display.
   */
  getLivesInfo() {
    const infos = this.exercises
      .map((exercise) => exercise.getLivesInfo())
      .filter((info) => !!info && info.isTask);

    let rules = [];
    if (infos.length) {
      const allRulesAreTheSame = infos.every((info) => info.passPercentage === infos[0].passPercentage);

      if (allRulesAreTheSame) {
        if (infos[0].passPercentage === 0) {
          rules = [];
        }
        else if (infos[0].passPercentage === 100) {
          rules = [{
            rule: this.params.dictionary.get('l10n.loseLifeIfNotFullScore'),
          }];
        }
        else {
          rules = [{
            rule: this.params.dictionary.get('l10n.loseLifeIfBelowPercentage')
              .replace('@percentage', infos[0].passPercentage),
          }];
        }
      }
      else {
        rules = infos.map((info) => {
          if (!info.passPercentage) {
            return {
              title: info.title,
              rule: this.params.dictionary.get('l10n.neverLoseLives'),
            };
          }
          else if (info.passPercentage === 100) {
            return {
              title: info.title,
              rule: this.params.dictionary.get('l10n.loseLifeIfNotFullScore'),
            };
          }
          else {
            return {
              title: info.title,
              rule: this.params.dictionary.get('l10n.loseLifeIfBelowPercentage')
                .replace('@percentage', info.passPercentage),
            };
          }
        });
      }
    }

    return {
      intro: this.params.dictionary.get('l10n.livesInfoIntro'),
      rules: rules,
    };
  }

  /**
   * Get score of all exercises.
   * @returns {number} Score.
   */
  getScore() {
    if (!this.containsTask()) {
      return 0;
    }

    if (typeof this.cheatScore === 'number') {
      return this.cheatScore;
    }

    let score = 0;

    this.exercises.forEach((exercise) => {
      score += exercise.getScore();
    });

    return score;
  }

  /**
   * Get weighted score of all exercises.
   * @returns {number} Weighted score.
   */
  getWeightedScore() {
    if (!this.containsTask()) {
      return 0;
    }

    if (typeof this.cheatScore === 'number') {
      return this.cheatScore;
    }

    return this.exercises.reduce((total, exercise) => total + exercise.getWeightedScore(), 0);
  }

  /**
   * Get maximum score of all exercises.
   * @returns {number} Max score.
   */
  getMaxScore() {
    let maxScore = 0;

    this.exercises.forEach((exercise) => {
      maxScore += exercise.getMaxScore();
    });

    return maxScore;
  }

  /**
   * Get weighted maximum score of all exercises.
   * @returns {number} Weighted max score.
   */
  getWeightedMaxScore() {
    if (!this.containsTask()) {
      return 0;
    }

    if (this.params.scoreScaling.scalingMode === 'totalScore' && this.params.scoreScaling.totalScore) {
      return this.params.scoreScaling.totalScore;
    }

    // We could use this only, but using the integer totalScore if we have it feels less prone to rounding issues.
    return Math.round(this.exercises.reduce((total, exercise) => total + exercise.getWeightedMaxScore(), 0));
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
   * Set remaining time.
   * @param {number} timeMs Remaining time in milliseconds.
   */
  setRemainingTime(timeMs) {
    if (!this.timer || (typeof timeMs !== 'number')) {
      return;
    }

    this.timer.setTime(timeMs);
    this.timeLeft = timeMs;
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
      ...(!!this.pickedContentIndexes && { pickedContentIndexes: this.pickedContentIndexes }),
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
        this.getWeightedScore(), // Question Type Contract mixin
        this.getWeightedMaxScore(), // Question Type Contract mixin
        this, // setScoredResult will try to find `activityStartTime` on a real instance
        true,
        Math.round(this.getWeightedScore()) >= Math.round(this.getWeightedMaxScore()),
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
   * Set cheat score.
   * @param {number} score Cheat score to set.
   */
  setCheatScore(score) {
    if (score === undefined) {
      delete this.cheatScore;
    }
    else if (typeof score === 'number' && score > 0) {
      this.cheatScore = score;

      this.callbacks.onScoreChanged({
        score: this.getWeightedScore(),
        maxScore: this.getWeightedMaxScore(),
        bundleCompleted: this.isCompleted,
        exerciseSuccessful: true, // Prevent loss of life handler
        scoreBelowLifeThreshold: false, // Prevent loss of life handler
      });
    }
  }

  /**
   * Handle exercise scored.
   * @param {object} [params] Parameters.
   */
  handleScored(params = {}) {
    this.setCheatScore(); // In case a cheat score was set, use real score again.

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
      score: this.getWeightedScore(),
      maxScore: this.getWeightedMaxScore(),
      bundleCompleted: this.isCompleted,
      exerciseSuccessful: params.successful,
      scoreBelowLifeThreshold: params.scoreBelowLifeThreshold,
    });
  }
}
