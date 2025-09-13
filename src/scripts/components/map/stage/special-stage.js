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

    this.content.classList.toggle(
      'override-symbol', this.params.overrideSymbol === true,
    );

    if (this.getState() === this.params.globals.get('states').cleared) {
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
    const states = this.params.globals.get('states');

    switch (this.params.specialStageType) {
      case 'finish':
        main.showFinishConfirmation();
        break;

      case 'extra-life':
        main.addExtraLives(this.params.specialStageExtraLives ?? 0);
        this.setState(states.cleared);
        main.handleSpecialFeatureRun('extra-life');
        this.disable();
        break;

      case 'extra-time':
        main.addExtraTime(this.params.specialStageExtraTime ?? 0);
        this.setState(states.cleared);
        main.handleSpecialFeatureRun('extra-time');
        this.disable();
        break;

      case 'link':
        this.setState(states.cleared);
        window.open(this.params.specialStageLinkURL, this.params.specialStageLinkTarget);
        break;

      default:
        break;
    }
  }
}
