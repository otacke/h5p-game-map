import Util from '@services/util';
import Stage from '@components/map/stage';

export default class Stages {

  constructor(params = {}) {
    this.params = Util.extend({
      elements: {}
    }, params);

    this.stages = this.buildStages(this.params.elements);
  }

  getDOMs() {
    return this.stages.map((path) => path.getDOM());
  }

  /**
   * Build paths.
   *
   * @param {object} elements Parameters.
   * @returns {Stage[]} Stages.
   */
  buildStages(elements) {
    const stages = [];

    if (!Object.keys(elements ?? {}).length) {
      return []; // No elements/stages
    }

    for (let index in elements) {
      const elementParams = elements[index];
      stages.push(new Stage({
        canBeStartStage: elementParams.canBeStartStage,
        contentType: elementParams.contentType,
        id: elementParams.id,
        neighbors: elementParams.neighbors,
        telemetry: elementParams.telemetry,
        visuals: this.params.visuals
      }, {}));
    }

    return stages;
  }
}
