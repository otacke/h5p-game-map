import Util from '@services/util';
import Path from '@components/map/path';

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
   *
   * @param {object} elements Elements with stages.
   * @returns {Path[]} Paths.
   */
  buildPaths(elements) {
    const paths = [];

    if (!Object.keys(elements ?? {}).length) {
      return []; // No elements/stages, so no paths to compute
    }

    const pathsCreated = [];
    for (let index in elements) {
      (elements[index].neighbors || []).forEach((neighbor) => {
        if (
          !pathsCreated.includes(`${index}-${neighbor}`) &&
          !pathsCreated.includes(`${neighbor}-${index}`)
        ) {
          paths.push(new Path({
            telemetryFrom: elements[index].telemetry,
            telemetryTo: elements[neighbor].telemetry,
            index: pathsCreated.length,
            visuals: this.params.visuals
          }));
          pathsCreated.push(`${index}-${neighbor}`);
        }
      });
    }

    return paths;
  }

  update(params = {}) {
    this.paths.forEach((path) => {
      path.resize({ mapSize: params.mapSize });
    });
  }
}
