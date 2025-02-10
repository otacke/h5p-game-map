import Restriction from '../restriction.js';

/** @constant VALID_OPERATORS {string[]} List of valid operators. */
const VALID_OPERATORS = ['lessThan', 'equalTo', 'notEqualTo', 'greaterThan'];

export default class RestrictionTotalScore extends Restriction {

  /**
   * @class RestrictionTotalScore
   * @param {object} params Parameters.
   * @param {string} params.type Type of restriction.
   * @param {string} params.operator Operator.
   * @param {number} params.value Value.
   * @param {object} params.dictionary Localization dictionary.
   * @param {function} params.getCurrentValue Function to get the current value.
   * @param {string} [params.label] Label to represent the restriction target. Does not have to be used.
   */
  constructor(params = {}) {
    super(params);
  }

  /**
   * Check restriction against a value.
   * @returns {boolean} True if the restriction is met, false otherwise.
   */
  check() {
    const value = this.getCurrentValue();

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
