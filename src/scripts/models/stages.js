import Util from '@services/util';
import Stage from '@components/map/stage';

export default class Stages {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      elements: {}
    }, params);

    this.callbacks = Util.extend({
      onStageClicked: () => {}
    }, callbacks);

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
      stages.push(new Stage(
        {
          id: elementParams.id,
          canBeStartStage: elementParams.canBeStartStage,
          contentType: elementParams.contentType,
          label: elementParams.label,
          neighbors: elementParams.neighbors,
          telemetry: elementParams.telemetry,
          visuals: this.params.visuals
        }, {
          onClicked: (id) => {
            this.callbacks.onStageClicked(id);
          }
        }));
    }

    return stages;
  }
}
