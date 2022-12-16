import Util from '@services/util';
import Exercise from '@models/exercise';

export default class Exercises {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onStateChanged] Callback when state changed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;
    this.callbacks = Util.extend({
      onStateChanged: () => {}
    }, callbacks);

    this.exercises = {};
  }

  /**
   * Get exercise.
   *
   * @param {string} id Id of exercise to get.
   * @returns {Exercise} Exercise.
   */
  getExercise(id) {
    if (!this.exercises[id]) {
      const stageParams = Object.values(this.params.elements)
        .find((element) => element.id === id);

      this.exercises[id] = new Exercise(stageParams, {
        onStateChanged: (state) => {
          this.callbacks.onStateChanged(id, state);
        }
      });
    }

    return this.exercises[id];
  }
}
