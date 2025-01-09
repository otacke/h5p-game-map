import Restriction from './restriction.js';
import RestrictionTime from './restriction-time.js';
import RestrictionTotalScore from './restriction-total-score.js';
import RestrictionStageScore from './restriction-stage-score.js';

export default class RestrictionFactory {
  /**
   * Produce a restriction.
   * @static
   * @param {object} params Parameters.
   * @returns {Restriction|null} A restriction or null if the restriction is invalid.
   */
  static produce(params = {}) {
    let restriction = null;
    switch (params.restrictionType) {

      case 'time':
        restriction = new RestrictionTime({
          label: params.timeGroup?.timeGroupLabel,
          type: params.restrictionType,
          operator: params.timeGroup?.timeOperator,
          value: params.timeGroup?.timeValue,
          dictionary: params.dictionary,
          getCurrentValue: params.callbacks.time
        });
        return restriction.isValid() ? restriction : null;

      case 'totalScore':
        restriction = new RestrictionTotalScore({
          label: params.totalScoreGroup?.totalScoreLabel,
          type: params.restrictionType,
          operator: params.totalScoreGroup?.totalScoreOperator,
          value: params.totalScoreGroup?.totalScoreValue,
          dictionary: params.dictionary,
          getCurrentValue: params.callbacks.totalScore
        });
        return restriction.isValid() ? restriction : null;

      case 'stageScore':
        restriction = new RestrictionStageScore({
          label: params.stageScoreGroup?.stageScoreLabel,
          type: params.restrictionType,
          operator: params.stageScoreGroup?.stageScoreOperator,
          value: params.stageScoreGroup?.stageScoreValue,
          dictionary: params.dictionary,
          getCurrentValue: () => {
            return params.callbacks.stageScore(params.stageScoreGroup?.stageScoreId);
          }
        });
        return restriction.isValid() ? restriction : null;

      default:
        return null;
    }
  }
}
