import Globals from '@services/globals';
import Util from '@services/util';
import Stage from '@components/map/stage/stage';

export default class Stages {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      elements: {}
    }, params);

    this.callbacks = Util.extend({
      onStageClicked: () => {},
      onStageStateChanged: () => {}
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

      // This was a compromise, could be solved better in the editor
      const neighbors = elementParams.neighbors.map((neighbor) => {
        return elements[parseInt(neighbor)].id;
      });

      stages.push(new Stage(
        {
          id: elementParams.id,
          canBeStartStage: elementParams.canBeStartStage,
          accessRestrictions: elementParams.accessRestrictions,
          contentType: elementParams.contentType,
          label: elementParams.label,
          neighbors: neighbors,
          telemetry: elementParams.telemetry,
          visuals: this.params.visuals,
          hidden: this.params.hidden
        }, {
          onClicked: (id) => {
            this.callbacks.onStageClicked(id);
          },
          onStateChanged: (id, state) => {
            this.callbacks.onStageStateChanged(id, state);
          }
        }));
    }

    return stages;
  }

  /**
   * Get stage by id.
   *
   * @param {string} id Id of stage.
   * @returns {Stage} Stage with respective id.
   */

  getStage(id) {
    return this.stages.find((stage) => stage.getId() === id);
  }

  /**
   * Update state of a stage.
   *
   * @param {string} id Id of exercise that was changed.
   * @param {number} state State code.
   */
  updateState(id, state) {
    const stage = this.getStage(id);
    if (!stage) {
      return;
    }

    stage.setState(state);
  }

  /**
   * Update stages that are in unlocking state.
   */
  updateUnlockingStages() {
    const globalParams = Globals.get('params');

    if (globalParams.behaviour.roaming === 'free') {
      return; // Not relevant
    }

    const unlockingStages = this.stages.filter((stage) => {
      return (
        stage.getState() === Globals.get('states')['unlocking'] &&
        stage.getAccessRestrictions().openOnScoreSufficient
      );
    });

    unlockingStages.forEach((stage) => {
      stage.unlock();
    });
  }

  /**
   * Update the state of a stages neighbors.
   *
   * @param {string} id Id of exercise that was changed.
   * @param {number} state State code.
   */
  updateNeighborsState(id, state) {
    const globalParams = Globals.get('params');

    if (globalParams.behaviour.roaming === 'free') {
      return; // Neighbors are not influenced
    }

    const stage = this.getStage(id);
    if (!stage) {
      return;
    }

    const neighborIds = stage.getNeighbors();

    if (
      state === Globals.get('states')['open'] &&
      globalParams.behaviour.fog !== '0'
    ) {
      neighborIds.forEach((id) => {
        const targetStage = this.getStage(id);
        if (!targetStage) {
          return;
        }

        targetStage.show();
      });
    }

    // Get neigbors and unlock if current stage was cleared
    if (state === Globals.get('states')['cleared']) {
      neighborIds.forEach((id) => {
        const targetStage = this.getStage(id);
        if (!targetStage) {
          return;
        }

        targetStage.unlock();
      });
    }
  }

  /**
   * Unlock a stage or stages.
   *
   * @param {string} id Id to unlock or 'random' for random procedure.
   */
  unlockStage(id) {
    if (typeof id !== 'string') {
      return;
    }

    if (id !== 'settings') {
      // Unlock specified stage
      const stage = this.stages.find((stage) => stage.getId() === id);
      if (stage) {
        stage.unlock();
      }

      return;
    }

    // Choose all start stages (all if none selected) and choose one randomly
    let startStages = this.stages
      .filter((stage) => stage.canBeStartStage());

    if (!startStages.length) {
      startStages = this.stages; // Use all stages, because none selected
    }

    if (Globals.get('params').behaviour.startStages === 'random') {
      startStages = [
        startStages[Math.floor(Math.random() * startStages.length)]
      ];
    }

    startStages.forEach((stage) => {
      stage.unlock();
    });
  }

  /**
   * Do for each stage.
   *
   * @param {function} callback Callback.
   */
  forEach(callback) {
    for (let i = 0; i < this.stages.length; i++) {
      callback(this.stages[i], i, this.stages);
    }
  }

  /**
   * Reset.
   */
  reset() {
    this.stages.forEach((stage) => {
      stage.reset();
    });
  }
}
