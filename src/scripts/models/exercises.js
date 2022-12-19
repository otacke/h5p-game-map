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
