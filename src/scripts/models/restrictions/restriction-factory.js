import RestrictionTotalScore from './restriction-total-score.js';
import Restriction from './restriction.js';

export default class RestrictionFactory {
  /**
   * Produce a restriction.
   * @static
   * @param {object} params Parameters.
   * @returns {Restriction|null} A restriction or null if the restriction is invalid.
   */
  static produce(params = {}) {
    switch (params.restrictionType) {

      case 'totalScore':
        const restriction = new RestrictionTotalScore({
          type: params.restrictionType,
          operator: params.totalScoreOperator,
          value: params.totalScoreValue,
          dictionary: params.dictionary,
          getCurrentValue: params.callbacks.totalScore
        });
        return restriction.isValid() ? restriction : null;

      default:
        return null;
    }
  }
}
