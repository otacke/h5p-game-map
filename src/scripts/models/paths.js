import Globals from '@services/globals';
import Util from '@services/util';
import Path from '@components/map/path';

export default class Paths {

  constructor(params = {}) {
    this.params = Util.extend({
      elements: {},
      hidden: false
    }, params);

    this.paths = this.buildPaths(this.params.elements);
  }

  getDOMs() {
    return this.paths.map((path) => path.getDOM());
  }

  /**
   * Build paths.
   *
   * @param {object} elements Elements with stages.
   * @returns {Path[]} Paths.
   */
  buildPaths(elements) {
    const paths = [];

    if (!Object.keys(elements ?? {}).length) {
      return []; // No elements/stages, so no paths to compute
    }

    // Get previous instance state
    const pathsState = Globals.get('extras').previousState?.content?.
      paths ?? [];

    const pathsCreated = [];
    for (let index in elements) {
      (elements[index].neighbors || []).forEach((neighbor) => {
        if (
          !pathsCreated.includes(`${index}-${neighbor}`) &&
          !pathsCreated.includes(`${neighbor}-${index}`)
        ) {

          // Determine previous state for current path
          const pathState = pathsState
            .find((path) => {
              return path.stageIds?.from === elements[index].id &&
                path.stageIds?.to === elements[neighbor].id;
            });

          paths.push(new Path({
            fromId: elements[index].id,
            toId: elements[neighbor].id,
            telemetryFrom: elements[index].telemetry,
            telemetryTo: elements[neighbor].telemetry,
            index: pathsCreated.length,
            visuals: this.params.visuals,
            hidden: this.params.hidden,
            ...(pathState?.state && { state: pathState?.state })
          }));
          pathsCreated.push(`${index}-${neighbor}`);
        }
      });
    }

    return paths;
  }

  /**
   * Get current state.
   *
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    return this.paths.map((path) => {
      return {
        stageIds: path.getStageIds(),
        state: path.getState()
      };
    });
  }

  /**
   * Update.
   *
   * @param {object} [params={}] Parameters.
   * @param {object} [params.mapSize] Map size.
   */
  update(params = {}) {
    this.paths.forEach((path) => {
      path.resize({ mapSize: params.mapSize });
    });
  }

  /**
   * Update state.
   *
   * @param {string} id Id of stage/exercise that was updated.
   * @param {number} state If of state that was changed to.
   */
  updateState(id, state) {
    const globalParams = Globals.get('params');

    if (globalParams.behaviour.map.roaming === 'free') {
      return;
    }

    const affectedPaths = this.paths.filter((path) => {
      const stageIds = path.getStageIds();
      return (stageIds.from === id || stageIds.to === id);
    });

    if (
      state === Globals.get('states')['open'] &&
      globalParams.behaviour.map.displayPaths &&
      globalParams.behaviour.map.fog !== '0'
    ) {
      affectedPaths.forEach((path) => {
        path.show();
      });
    }

    if (state === Globals.get('states')['cleared']) {
      affectedPaths.forEach((path) => {
        path.setState('cleared');
        path.show();
      });
    }
  }

  /**
   * Do for each path.
   *
   * @param {function} callback Callback.
   */
  forEach(callback) {
    for (let i = 0; i < this.paths.length; i++) {
      callback(this.paths[i], i, this.paths);
    }
  }

  /**
   * Reset.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    this.paths.forEach((path) => {
      path.reset({ isInitial: params.isInitial });
    });
  }
}
