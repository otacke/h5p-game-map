import Util from '@services/util.js';
import RestrictionFactory from './restriction-factory.js';

export default class Restrictions {

  /**
   * @class Restrictions
   * @param {object} params Parameters.
   * @param {string} params.type Type of restriction.
   * @param {string} params.operator Operator.
   * @param {number} params.value Value.
   * @param {object} params.dictionary Localization dictionary.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.getTotalScore Function to get the total score.
   * @param {function} callbacks.getTime Function to get the current time.
   * @param {function} callbacks.getStageScore Function to get the current score of stage with these restrictions.
   */
  constructor(params = {}, callbacks = {}) {
    this.callbacks = Util.extend({
      getTotalScore: () => 0,
      getStageScore: () => 0,
      getTime: () => new Date()
    }, callbacks);

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
    const elementParams = this.globals.get('params').gamemapSteps.gamemap.elements;
    return list
      .map((restrictionParams) => {
        if (restrictionParams.restrictionType === 'stageScore' && restrictionParams.stageScoreGroup) {
          const label = elementParams.find((element) => {
            return element.id === restrictionParams.stageScoreGroup.stageScoreId;
          })?.label;
          restrictionParams.stageScoreGroup.stageScoreLabel = label;
        }

        return RestrictionFactory.produce({
          ...restrictionParams,
          dictionary: this.dictionary,
          callbacks: {
            totalScore: this.callbacks.getTotalScore,
            stageScore: this.callbacks.getStageScore,
            time: this.callbacks.getTime
          }
        });
      })
      .filter((restriction) => restriction !== null);
  }

  /**
   * Check if the current values pass the restrictions.
   * @returns {boolean} True if the values pass the restrictions, false otherwise.
   */
  allPassed() {
    if (!this.restrictions) {
      return true;
    }

    const booleanMapping = this.restrictions.restrictionSetList.map((restrictionSet) => {
      return this.checkRestrictionSet(restrictionSet);
    });

    return this.checkAllOrAny(booleanMapping, this.restrictions.allOrAnyRestrictionSet);
  }

  /**
   * Determine whether there are any time restrictions.
   * @returns {boolean} True if there are time restrictions, false otherwise.
   */
  includeTimeRestriction() {
    if (!this.restrictions) {
      return false;
    }

    return this.restrictions.restrictionSetList.some((restrictionSet) => {
      return restrictionSet.restrictionList.some((restriction) => restriction.type === 'time');
    });
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
   * Generate HTML for a restriction set.
   * @param {object} restrictionSet Restriction set object.
   * @returns {string} HTML string for the restriction set.
   */
  generateRestrictionSetHTML(restrictionSet) {
    let setHTML = restrictionSet.restrictionList
      .map((restriction) => `<li>${restriction.getMessage()}</li>`).join('');

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
