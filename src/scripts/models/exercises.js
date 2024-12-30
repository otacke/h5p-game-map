import Util from '@services/util.js';
import Exercise from '@models/exercise.js';

export default class Exercises {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [params.elements] Element parameters for exercises.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onStateChanged] Callback when state changed.
   * @param {function} [callbacks.onScoreChanged] Callback when score changed.
   * @param {function} [callbacks.onTimerTicked] Callback when timer ticked.
   * @param {function} [callbacks.onTimeoutWarning] Callback when timer warned.
   * @param {function} [callbacks.onTimeout] Callback when time ran out.
   * @param {function} [callbacks.onContinued] Callback when user clicked continue.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.callbacks = Util.extend({
      onStateChanged: () => {},
      onScoreChanged: () => {},
      onTimerTicked: () => {},
      onTimeoutWarning: () => {},
      onTimeout: () => {},
      onContinued: () => {}
    }, callbacks);

    this.exercises = {};

    this.params.elements.forEach((element) => {
      if (element.specialStageType || !element.contentType) {
        return;
      }

      this.exercises[element.id] = new Exercise(
        { ...element,
          dictionary: this.params.dictionary,
          globals: this.params.globals,
          jukebox: this.params.jukebox
        },
        {
          onStateChanged: (state) => {
            this.callbacks.onStateChanged(element.id, state);
          },
          onScoreChanged: (scoreParams) => {
            this.callbacks.onScoreChanged(element.id, scoreParams);
          },
          onTimerTicked: (remainingTime, options) => {
            this.callbacks.onTimerTicked(element.id, remainingTime, options);
          },
          onTimeoutWarning: () => {
            this.callbacks.onTimeoutWarning(element.id);
          },
          onTimeout: () => {
            this.callbacks.onTimeout(element.id);
          },
          onContinued: () => {
            this.callbacks.onContinued(element.id);
          }
        }
      );
    });

    const subContentIds = Object.keys(this.exercises)
      .map((id) => this.exercises[id].getSubContentIds())
      .flat();

    this.trackAllXAPI(subContentIds);
  }

  /**
   * Track xAPI events from all exercises. Useful to cover subcontents that we do not know of.
   * We'll receive all xAPI events from all subcontents, but also from potential siblings and ancestors!
   * Known subcontents are still covered in thei respective exercise instance.
   * @param {string[]} subContentIds SubContentIds of instances to track.
   */
  trackAllXAPI(subContentIds = []) {
    H5P.externalDispatcher.on('xAPI', (event) => {
      if (subContentIds.length) {
        // Only care about events from contents with these subContentIds
        const url = new URL(event.getVerifiedStatementValue(['object', 'id']));
        const subContentId = url.searchParams.get('subContentId');

        if (!subContentIds.includes(subContentId)) {
          return;
        }
      }

      const score = event.getScore();
      if (score === null) {
        return; // Not relevant
      }

      const maxScore = event.getMaxScore();
      const success = event.getVerifiedStatementValue(['result', 'success']);

      if (score >= maxScore || success) {
        this.params.jukebox.stopGroup('default');
        this.params.jukebox.play('checkExerciseFullScore');
      }
      else {
        this.params.jukebox.stopGroup('default');
        this.params.jukebox.play('checkExerciseNotFullScore');
      }
    });
  }

  /**
   * Get exercise.
   * @param {string} id Id of exercise to get.
   * @returns {Exercise} Exercise.
   */
  getExercise(id) {
    return this.exercises[id];
  }

  /**
   * Update reachability of exercises.
   * @param {string[]} reachableStageIds Ids of reachable stages.
   */
  updateReachability(reachableStageIds) {
    Object.keys(this.exercises).forEach((key) => {
      this.exercises[key].setReachable(reachableStageIds.includes(key));
    });
  }

  /**
   * Get current state.
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    return Object.values(this.exercises)
      .filter((exercise) => exercise.isReachable())
      .map((exercise) => {
        return {
          exercise: exercise.getCurrentState()
        };
      });
  }

  /**
   * Get xAPI data from exercises.
   * @returns {object[]} XAPI data objects used to build report.
   */
  getXAPIData() {
    return Object.values(this.exercises)
      .filter((exercise) => exercise.isReachable())
      .map((exercise) => {
        return exercise?.getXAPIData?.();
      })
      .filter((data) => !!data);
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    Object.values(this.exercises).forEach((exercise) => {
      if (!exercise.isReachable()) {
        return;
      }

      exercise.showSolutions();
    });
  }

  /**
   * Determine whether some answer was given.
   * @returns {boolean} True, if some answer was given.
   */
  getAnswerGiven() {
    return Object.values(this.exercises).some((exercise) => {
      if (!exercise.isReachable()) {
        return false;
      }

      return exercise.getAnswerGiven();
    });
  }

  /**
   * Get summed up score of all exercises.
   * @returns {number} Summed up score of all instances or 0.
   */
  getScore() {
    return Object.values(this.exercises).reduce((score, exercise) => {
      if (!exercise.isReachable()) {
        return score;
      }

      return score += exercise.getScore();
    }, 0);
  }

  /**
   * Get max score of all exercises.
   * @returns {number} Maximum score of instance or 0.
   */
  getMaxScore() {
    return Object.values(this.exercises).reduce((score, exercise) => {
      if (!exercise.isReachable()) {
        return score;
      }

      return score += exercise.getMaxScore();
    }, 0);
  }

  /**
   * Reset all exercises.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  resetAll(params = {}) {
    Object.values(this.exercises).forEach((exercise) => {
      exercise.reset({ isInitial: params.isInitial });
    });
  }

  /**
   * Reset.
   * @param {number} id Id of exercise to reset.
   */
  reset(id) {
    if (!this.exercises[id]) {
      return;
    }

    this.exercises[id].reset();
  }

  /**
   * Stop exercise.
   * @param {string} id Id of exercise to start.
   */
  start(id) {
    if (!this.exercises[id]) {
      return;
    }

    this.exercises[id].start();
  }

  /**
   * Stop exercise.
   * @param {string} id Id of exercise to stop.
   */
  stop(id) {
    if (!this.exercises[id]) {
      return;
    }

    this.exercises[id].stop();
  }
}
