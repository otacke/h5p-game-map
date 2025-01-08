import RestrictionFactory from './restriction-factory.js';

export default class Restrictions {

  /**
   * @class Restrictions
   * @param {object} params Parameters.
   * @param {string} params.type Type of restriction.
   * @param {string} params.operator Operator.
   * @param {number} params.value Value.
   * @param {object} params.dictionary Localization dictionary.
   */
  constructor(params = {}) {
    this.dictionary = params.dictionary;
    this.globals = params.globals;

    const restrictionSetList = this.buildRestrictions(params.accessRestrictions.restrictionSetList);

    if (!restrictionSetList.length) {
      this.restrictions = null;
      return;
    }

    this.restrictions = {
      allOrAnyRestrictionSet: params.accessRestrictions.allOrAnyRestrictionSet ?? 'all',
      restrictionSetList: restrictionSetList,
    };
  }

  /**
   * Build a list of restriction sets.
   * @param {object[]} list List of restriction sets.
   * @returns {object[]} Sanitized list of restriction sets.
   */
  buildRestrictions(list = []) {
    return list
      .map((restrictionSet) => ({
        ...restrictionSet,
        restrictionList: this.sanitizeRestrictionList(restrictionSet.restrictionList)
      }))
      .filter((restrictionSet) => restrictionSet.restrictionList.length);
  }

  /**
   * Sanitize a list of restrictions.
   * @param {object[]} list List of restrictions.
   * @returns {object[]} Sanitized list of restrictions.
   */
  sanitizeRestrictionList(list = []) {
    return list
      .map((restrictionParams) => RestrictionFactory.produce({
        ...restrictionParams,
        dictionary: this.dictionary,
        callbacks: {
          totalScore: this.globals.get('getScore')
        }
      }
      ))
      .filter((restriction) => restriction !== null);
  }

  /**
   * Check if the values pass the restrictions.
   * @param {number[]|string[]} values Valued to check.
   * @returns {boolean} True if the values pass the restrictions, false otherwise.
   */
  passes(values = {}) {
    if (!this.restrictions) {
      return true;
    }

    const booleanMapping = this.restrictions.restrictionSetList.map((restrictionSet) => {
      return this.checkRestrictionSet(restrictionSet, values);
    });

    return this.checkAllOrAny(booleanMapping, this.restrictions.allOrAnyRestrictionSet);
  }

  /**
   * Check a set of restrictions against a set of values.
   * @param {object[]} restrictionSet Set of restrictions.
   * @returns {boolean} True if the restrictions are met, false otherwise.
   */
  checkRestrictionSet(restrictionSet) {
    const booleanMapping = restrictionSet.restrictionList.map((restriction) => restriction.check());
    return this.checkAllOrAny(booleanMapping, restrictionSet.allOrAnyRestriction);
  }

  /**
   * Check if all or any conditions are met.
   * @param {boolean[]} list List of checked restrictions mapped to boolean values.
   * @param {string} condition 'all' or 'any'.
   * @returns {boolean} True if all or any conditions are met, false otherwise.
   */
  checkAllOrAny(list = [], condition) {
    if (!list.length || !['all', 'any'].includes(condition)) {
      return true; // Missing condition or list, treat as unrestricted
    }

    return condition === 'all' ? list.every(Boolean) : list.some(Boolean);
  }

  /**
   * Generate HTML for a single restriction.
   * @param {object} restriction Restriction object.
   * @returns {string} HTML string for the restriction.
   */
  generateRestrictionHTML(restriction) {
    return `<li>${restriction.getMessage()}</li>`;
  }

  /**
   * Generate HTML for a restriction set.
   * @param {object} restrictionSet Restriction set object.
   * @returns {string} HTML string for the restriction set.
   */
  generateRestrictionSetHTML(restrictionSet) {
    let setHTML = restrictionSet.restrictionList.map(this.generateRestrictionHTML).join('');
    if (restrictionSet.restrictionList.length > 1) {
      const intro = restrictionSet.allOrAnyRestriction === 'all' ?
        this.dictionary.get('l10n.restrictionsAllOf') :
        this.dictionary.get('l10n.restrictionsAnyOf');
      setHTML = `<li>${intro}<ul>${setHTML}</ul></li>`;
    }
    return setHTML;
  }

  /**
   * Get messages as HTML.
   * @returns {string} HTML string for the messages.
   */
  getMessagesHTML() {
    const intro = this.restrictions.allOrAnyRestrictionSet === 'all' ?
      this.dictionary.get('l10n.restrictionsAllOfLong') :
      this.dictionary.get('l10n.restrictionsAnyOfLong');

    const restrictionSetsHTML = this.restrictions.restrictionSetList
      .map((setItem) => this.generateRestrictionSetHTML(setItem))
      .join('');
    return `${intro}<ul>${restrictionSetsHTML}</ul>`;
  }
}
