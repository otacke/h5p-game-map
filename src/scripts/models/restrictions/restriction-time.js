import Restriction from './restriction.js';

const VALID_OPERATORS = ['before', 'is', 'isNot', 'after'];

export default class RestrictionTime extends Restriction {

  /**
   * @class restrictionTime
   * @param {object} params Parameters.
   * @param {string} params.type Type of restriction.
   * @param {string} params.operator Operator.
   * @param {number} params.value Value.
   * @param {object} params.dictionary Localization dictionary.
   * @param {function} params.getCurrentValue Function to get the current value.
   */
  constructor(params = {}) {
    super(params);

    this.value = new Date(this.getValue());
  }

  /**
   * Check restriction against a value.
   * @returns {boolean} True if the restriction is met, false otherwise.
   */
  check() {
    let currentValue = this.getCurrentValue();

    if (currentValue === undefined || currentValue === null) {
      return true; // No value to check, treat as unrestricted
    }

    switch (this.getOperator()) {
      case 'before':
        return currentValue < this.getValue();
      case 'is':
        return currentValue === this.getValue();
      case 'isNot':
        return currentValue !== this.getValue();
      case 'after':
        return currentValue > this.getValue();
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

  /**
   * Get representation of the restriction value.
   * @returns {string} Representation of the restriction value.
   */
  getValueRepresentation() {
    return `${this.value.toLocaleDateString()}, ${this.value.toLocaleTimeString()}`;
  }
}
