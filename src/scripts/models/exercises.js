import Util from '@services/util';
import Exercise from '@models/exercise';

export default class Exercises {

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

    this.exercises = {};

    this.params.elements.forEach((element) => {
      this.exercises[element.id] = new Exercise(element, {
        onStateChanged: (state) => {
          this.callbacks.onStateChanged(element.id, state);
        },
        onScoreChanged: (score) => {
          this.callbacks.onScoreChanged(element.id, score);
        }
      });
    });
  }

  /**
   * Get exercise.
   *
   * @param {string} id Id of exercise to get.
   * @returns {Exercise} Exercise.
   */
  getExercise(id) {
    return this.exercises[id];
  }

  /**
   * Get xAPI data from exercises.
   *
   * @returns {object[]} XAPI data objects used to build report.
   */
  getXAPIData() {
    return Object.values(this.exercises)
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
      exercise.showSolutions();
    });
  }

  /**
   * Determine whether some answer was given.
   *
   * @returns {boolean} True, if some answer was given.
   */
  getAnswerGiven() {
    return Object.values(this.exercises).some((exercise) => {
      return exercise.getAnswerGiven();
    });
  }

  /**
   * Get summed up score of all exercises.
   *
   * @returns {number} Summed up score of all instances or 0.
   */
  getScore() {
    return Object.values(this.exercises).reduce((score, exercise) => {
      return score += exercise.getScore();
    }, 0);
  }

  /**
   * Get max score of all exercises.
   *
   * @returns {number} Maximum score of instance or 0.
   */
  getMaxScore() {
    return Object.values(this.exercises).reduce((score, exercise) => {
      return score += exercise.getMaxScore();
    }, 0);
  }

  /**
   * Reset.
   */
  reset() {
    Object.values(this.exercises).forEach((exercise) => {
      exercise.reset();
    });
  }
}
