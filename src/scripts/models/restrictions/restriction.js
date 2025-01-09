export default class Restriction {

  /**
   * @class Restriction
   * @param {object} params Parameters.
   * @param {string} params.type Type of the restriction.
   * @param {string} params.operator Operator of the restriction.
   * @param {object} params.dictionary Dictionary.
   * @param {function} params.getCurrentValue Function to get the current value.
   * @param {number|string} params.value Value of the restriction.
   * @param {string} [params.label] Label to represent the restriction target. Does not have to be used.
   */
  constructor(params = {}) {
    if (
      !params.type ||
      !params.operator ||
      typeof params.value !== 'number' ||
      !params.dictionary ||
      !params.getCurrentValue
    ) {
      return null;
    }

    this.label = params.label ?? '---';
    this.type = params.type;
    this.operator = params.operator;
    this.value = params.value;
    this.dictionary = params.dictionary;
    this.getCurrentValue = params.getCurrentValue;

    return this;
  }

  /**
   * Check a restriction against a value.
   * returns {boolean} True if the restriction is met, false otherwise.
   */
  check() {
    // Needs to be implemnted in the child class
    throw new Error('Method not implemented');
  }

  /**
   * Get valid operators for the restriction.
   * returns {string[]} List of valid operators.
   */
  getValidOperators() {
    // Needs to be implemnted in the child class
    throw new Error('Method not implemented');
  }

  /**
   * Check if the restriction is valid.
   * @returns {boolean} True if the restriction is valid, false otherwise.
   */
  isValid() {
    return this.getValidOperators().includes(this.getOperator());
  }

  /**
   * Get type of the restriction.
   * @returns {string} Type of the restriction.
   */
  getType() {
    return this.type;
  }

  /**
   * Get operator of the restriction.
   * @returns {string} Operator of the restriction
   */
  getOperator() {
    return this.operator;
  }

  /**
   * Get value of the restriction.
   * @returns {number|string} Value of the restriction.
   */
  getValue() {
    return this.value;
  }

  /**
   * Get representation of the restriction value.
   * Can be useful to override by child classes.
   * @returns {string} Representation of the restriction value.
   */
  getValueRepresentation() {
    return this.getValue().toString();
  }

  /**
   * Get message explaining the restriction.
   * @returns {string} Message explaining the restriction.
   */
  getMessage() {
    const type = this.getType().charAt(0).toUpperCase() + this.getType().slice(1);
    const operator = this.getOperator().charAt(0).toUpperCase() + this.getOperator().slice(1);

    return (this.dictionary.get(`l10n.restriction${type}${operator}`) ?? '')
      .replace('@value', this.getValueRepresentation())
      .replace('@label', this.label);
  }
}
