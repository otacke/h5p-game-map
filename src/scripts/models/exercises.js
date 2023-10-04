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
