import { SPECIAL_STAGE_TYPES, STAGE_STATES } from '@services/constants.js';
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

    if (this.getState() === STAGE_STATES.CLEARED) {
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
    switch (this.params.specialStageType) {
      case SPECIAL_STAGE_TYPES.FINISH:
        main.showFinishConfirmation();
        break;

      case SPECIAL_STAGE_TYPES.EXTRA_LIFE:
        main.addExtraLives(this.params.specialStageExtraLives ?? 0);
        this.setState(STAGE_STATES.CLEARED);
        main.handleSpecialFeatureRun(SPECIAL_STAGE_TYPES.EXTRA_LIFE);
        this.disable();
        break;

      case SPECIAL_STAGE_TYPES.EXTRA_TIME:
        main.addExtraTime(this.params.specialStageExtraTime ?? 0);
        this.setState(STAGE_STATES.CLEARED);
        main.handleSpecialFeatureRun(SPECIAL_STAGE_TYPES.EXTRA_TIME);
        this.disable();
        break;

      case SPECIAL_STAGE_TYPES.LINK:
        this.setState(STAGE_STATES.CLEARED);
        window.open(this.params.specialStageLinkURL, this.params.specialStageLinkTarget);
        break;

      case SPECIAL_STAGE_TYPES.TELEPORT:
        main.handleSpecialFeatureRun(SPECIAL_STAGE_TYPES.TELEPORT, {
          sourceId: this.getId(),
          targetId: this.params.specialStageTeleportTarget,
        });
        break;

      default:
        break;
    }
  }
}
