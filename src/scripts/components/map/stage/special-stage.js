import Stage from './stage.js';
import './special-stage.scss';

export default class SpecialStage extends Stage {
  /**
   * Construct a Special Stage.
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClicked] Stage was clicked on.
   * @param {function} [callbacks.onStageChanged] State of stage changed.
   * @param {function} [callbacks.onFocusChanged] State of focus changed.
   * @param {function} [callbacks.onAccessRestrictionsHit] Handle no access.
   */
  constructor(params = {}, callbacks = {}) {
    super(params, callbacks);

    this.content.classList.add(this.params.specialStageType);

    if (this.getState() === this.params.globals.get('states')['cleared']) {
      this.disable();
    }
  }

  /**
   * Run special feature.
   * Could as well be part of main, but this feels cleaner, in particular
   * if more special stages are added alter on
   * @param {object} main Main instance.
   */
  runSpecialFeature(main) {
    if (this.params.specialStageType === 'finish') {
      main.showFinishConfirmation();
    }
    else if (this.params.specialStageType === 'extra-life') {
      this.setState(this.params.globals.get('states')['cleared']);
      main.handleSpecialFeatureRun('extra-life');
      this.disable();
    }
    else if (this.params.specialStageType === 'extra-time') {
      main.addExtraTime(this.params.specialStageExtraTime ?? 0);
      this.setState(this.params.globals.get('states')['cleared']);
      main.handleSpecialFeatureRun('extra-time');
      this.disable();
    }
  }
}
