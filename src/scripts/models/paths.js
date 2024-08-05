import Util from '@services/util.js';
import Path from '@components/map/path.js';

export default class Paths {

  constructor(params = {}) {
    this.params = Util.extend({
      elements: {}
    }, params);

    this.paths = this.buildPaths(this.params.elements);
  }

  getDOMs() {
    return this.paths.map((path) => path.getDOM());
  }

  /**
   * Build paths.
   * Might be replaced by SVGs at some point.
   * @param {object} elements Elements with stages.
   * @returns {Path[]} Paths.
   */
  buildPaths(elements) {
    const paths = [];

    if (!Object.keys(elements ?? {}).length) {
      return []; // No elements/stages, so no paths to compute
    }

    // Get previous instance state
    const pathsState =
      this.params.globals.get('extras').previousState?.content?.paths ?? [];

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
            globals: this.params.globals,
            fromId: elements[index].id,
            toId: elements[neighbor].id,
            telemetryFrom: elements[index].telemetry,
            telemetryTo: elements[neighbor].telemetry,
            index: pathsCreated.length,
            visuals: this.params.visuals,
            visible: pathState?.visible,
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
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    return this.paths.map((path) => {
      return {
        stageIds: path.getStageIds(),
        state: path.getState(),
        visible: path.isVisible()
      };
    });
  }

  /**
   * Update.
   * @param {object} [params] Parameters.
   * @param {object} [params.mapSize] Map size.
   */
  update(params = {}) {
    this.paths.forEach((path) => {
      path.resize({ mapSize: params.mapSize });
    });
  }

  /**
   * Update reachability of paths.
   * @param {string[]} reachableStageIds Ids of reachable stages.
   */
  updateReachability(reachableStageIds) {
    this.paths.forEach((path) => {
      path.setReachable(
        reachableStageIds.some((id) => path.connectsTo(id))
      );
    });
  }

  /**
   * Update state.
   * @param {string} id Id of stage/exercise that was updated.
   * @param {number} state If of state that was changed to.
   */
  updateState(id, state) {
    const globalParams = this.params.globals.get('params');

    if (globalParams.behaviour.map.roaming === 'free') {
      return;
    }

    const affectedPaths = this.paths.filter((path) => {
      const stageIds = path.getStageIds();
      return (stageIds.from === id || stageIds.to === id);
    });

    if (
      state === this.params.globals.get('states').open &&
      globalParams.visual.paths.displayPaths &&
      globalParams.behaviour.map.fog !== '0'
    ) {
      affectedPaths.forEach((path) => {
        path.show();
      });
    }

    if (state === this.params.globals.get('states').cleared) {
      affectedPaths.forEach((path) => {
        path.setState('cleared');
        path.show();
      });
    }
  }

  /**
   * Do for each path.
   * @param {function} callback Callback.
   */
  forEach(callback) {
    for (let i = 0; i < this.paths.length; i++) {
      callback(this.paths[i], i, this.paths);
    }
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    this.paths.forEach((path) => {
      path.reset({ isInitial: params.isInitial });
    });
  }
}
