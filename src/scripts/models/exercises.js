import Exercise from '@models/exercise';

export default class Exercises {

  constructor(params = {}) {
    this.params = params;
    this.exercises = {};

  }

  getExercise(id) {
    if (!this.exercises[id]) {
      const stageParams = Object.values(this.params.elements)
        .find((element) => element.id === id);

      this.exercises[id] = new Exercise(stageParams);
    }

    return this.exercises[id];
  }
}
