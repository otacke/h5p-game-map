import Restriction from './restriction.js';

const VALID_OPERATORS = ['lessThan', 'equalTo', 'notEqualTo', 'greaterThan'];

export default class RestrictionTotalScore extends Restriction {

  /**
   * @class RestrictionTotalScore
   * @param {object} params Parameters.
   * @param {string} params.type Type of restriction.
   * @param {string} params.operator Operator.
   * @param {number} params.value Value.
   * @param {object} params.dictionary Localization dictionary.
   */
  constructor(params = {}) {
    super(params);
  }

  /**
   * Check restriction against a value.
   * @param {number|string} value Value to check.
   * @returns {boolean} True if the restriction is met, false otherwise.
   */
  check(value) {
    if (value === undefined || value === null) {
      return true; // No value to check, treat as unrestricted
    }

    switch (this.getOperator()) {
      case 'lessThan':
        return value < this.getValue();
      case 'equalTo':
        return value === this.getValue();
      case 'notEqualTo':
        return value !== this.getValue();
      case 'greaterThan':
        return value > this.getValue();
      default:
        return true; // Unknown operator, treat as unrestricted
    }
  }

  /**
   * Get valid operators.
   * @returns {string[]} List of valid operators.
   */
  getValidOperators() {
    return VALID_OPERATORS;
  }
}
