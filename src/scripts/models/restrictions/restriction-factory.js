import Restriction from './restriction.js';
import RestrictionTime from './handlers/restriction-time.js';
import RestrictionTotalScore from './handlers/restriction-total-score.js';
import RestrictionStageScore from './handlers/restriction-stage-score.js';
import RestrictionStageProgress from './handlers/restriction-stage-progress.js';

export default class RestrictionFactory {
  /**
   * Produce a restriction.
   * @static
   * @param {object} params Parameters.
   * @returns {Restriction|null} A restriction or null if the restriction is invalid.
   */
  static produce(params = {}) {
    const restrictionParams = {
      label: params[`${params.restrictionType}Group`]?.[`${params.restrictionType}Label`],
      type: params.restrictionType,
      operator: params[`${params.restrictionType}Group`]?.[`${params.restrictionType}Operator`],
      value: params[`${params.restrictionType}Group`]?.[`${params.restrictionType}Value`],
      dictionary: params.dictionary,
      getCurrentValue: params.callbacks[params.restrictionType]
    };

    if (params.restrictionType === 'stageScore') {
      restrictionParams.getCurrentValue = () => {
        return params.callbacks.stageScore(params.stageScoreGroup?.stageScoreId);
      };
    }
    else if (params.restrictionType === 'stageProgress') {
      restrictionParams.valueRepresentation = params.stageProgressGroup?.stageProgressValueRepresentation;
      restrictionParams.getCurrentValue = () => {
        return params.callbacks.stageProgress(params.stageProgressGroup?.stageProgressId);
      };
    }

    const restriction = this.createRestriction(params.restrictionType, restrictionParams);
    return restriction.isValid() ? restriction : null;
  }

  /**
   * Create a restriction object based on the restriction type.
   * @static
   * @param {string} type Restriction type.
   * @param {object} params Parameters.
   * @returns {Restriction|null} A restriction object or null if the type is invalid.
   */
  static createRestriction(type, params) {
    switch (type) {
      case 'time':
        return new RestrictionTime(params);
      case 'totalScore':
        return new RestrictionTotalScore(params);
      case 'stageScore':
        return new RestrictionStageScore(params);
      case 'stageProgress':
        return new RestrictionStageProgress(params);
      default:
        return null;
    }
  }
}
