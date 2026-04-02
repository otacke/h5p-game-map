import Util from '@services/util.js';

/** @constant {number} EXERCISE_SCREEN_ANIM_DURATION_MS Duration from CSS. */
const EXERCISE_SCREEN_ANIM_DURATION_MS = 1000;

/** @constant {string} NO_VALUE_STRING Placeholder string for missing values. */
const NO_VALUE_STRING = '---';

export default class QuestionTypeContract {

  /**
   * Sanitize stages.
   * @param {number} contentId Content ID.
   */
  sanitizeStages(contentId) {
    const advancedTextVersion = this.getAdvancedTextVersion(contentId);
    const maxElementIndex = this.params.gamemapSteps.gamemap.elements.length - 1;

    this.params.gamemapSteps.gamemap.elements = this.params.gamemapSteps.gamemap.elements.map((element) => {
      this.sanitizeNeighbors(element, maxElementIndex);
      this.sanitizeContentsList(element);
      this.handleMissingContent(element, advancedTextVersion);

      element.animDuration = this.params.visual.misc.useAnimation ? EXERCISE_SCREEN_ANIM_DURATION_MS : 0;

      this.sanitizeScoreScaling(element);

      return element;
    });
  }

  /**
   * Sanitize neighbor references for an element.
   * @param {object} element Element to sanitize.
   * @param {number} maxElementIndex Maximum valid element index.
   */
  sanitizeNeighbors(element, maxElementIndex) {
    element.neighbors = (element.neighbors || []).filter((neighborIndexString) => {
      const neighborIndex = parseInt(neighborIndexString);
      return neighborIndex > 0 && neighborIndex <= maxElementIndex;
    });
  }

  /**
   * Sanitize contents list for an element.
   * @param {object} element Element to sanitize.
   */
  sanitizeContentsList(element) {
    if (!element.specialStageType) {
      element.contentsList = (element.contentsList || []).filter((content) => {
        return content?.contentType?.library;
      });
    }
  }

  /**
   * Handle missing content by adding a placeholder.
   * @param {object} element Element to check and modify.
   * @param {string} advancedTextVersion Advanced Text version.
   */
  handleMissingContent(element, advancedTextVersion) {
    const isContentMissing = !element.specialStageType && !element.contentsList?.[0]?.contentType?.library;
    if (isContentMissing) {
      element.dom = { count: 0 };
      element.contentsList = [this.createMissingContentElement(advancedTextVersion)];
    }
  }

  /**
   * Sanitize score scaling for an element.
   * @param {object} element Element to sanitize.
   */
  sanitizeScoreScaling(element) {
    element.scoreScaling = Util.extend(
      { scoreScalingList: [], weightIsPercentage: false },
      element.scoreScaling,
    );

    this.removeInvalidScoreScalingEntries(element);
    this.addMissingScoreScalingEntries(element);
    this.cleanUpScoreScalingEntries(element);
  }

  /**
   * Remove invalid score scaling entries.
   * @param {object} element Element to modify.
   */
  removeInvalidScoreScalingEntries(element) {
    const validSubContentIds = element.contentsList.map((content) => content.contentType?.subContentId) || [];
    element.scoreScaling.scoreScalingList = element.scoreScaling.scoreScalingList.filter((scaling) => {
      return validSubContentIds.includes(scaling.subContentId);
    });
  }

  /**
   * Add missing score scaling entries.
   * @param {object} element Element to modify.
   */
  addMissingScoreScalingEntries(element) {
    element.contentsList.forEach((content) => {
      const hasScalingForContent = element.scoreScaling.scoreScalingList
        .find((scaling) => scaling.subContentId === content.contentType.subContentId);

      if (!hasScalingForContent) {
        element.scoreScaling.scoreScalingList.push({
          subContentId: content.contentType.subContentId,
          weight: '1',
        });
      }
    });
  }

  /**
   * Clean up score scaling entries by ensuring correct values.
   * @param {object} element Element to modify.
   */
  cleanUpScoreScalingEntries(element) {
    element.scoreScaling.scoreScalingList = element.scoreScaling.scoreScalingList.map((scaling) => {
      const weight = (!scaling.weight || isNaN(parseFloat(scaling.weight))) ? '1' : scaling.weight;

      return {
        subContentId: scaling.subContentId,
        weight: weight,
      };
    });

    if (element.scoreScaling.scalingMode === 'totalScore') {
      element.scoreScaling.weightIsPercentage = false;

      const totalScore = parseFloat(element.scoreScaling.totalScore);
      if (isNaN(totalScore) || totalScore < 0) {
        delete element.scoreScaling.totalScore;
      }
    }

    if (element.scoreScaling.weightIsPercentage) {
      const totalPercentage = element.scoreScaling.scoreScalingList.reduce((total, scaling) => {
        const weight = parseFloat(scaling.weight);
        return total + (isNaN(weight) ? 0 : weight);
      }, 0);

      element.scoreScaling.scoreScalingList = element.scoreScaling.scoreScalingList.map((scaling) => {
        const weight = parseFloat(scaling.weight);
        const normalizedWeight = isNaN(weight) ? '0' : ((weight / totalPercentage)).toString();

        return {
          ...scaling,
          weight: normalizedWeight,
        };
      });
    }

    // Ensure weights are floats
    element.scoreScaling.scoreScalingList = element.scoreScaling.scoreScalingList.map((scaling) => {
      return {
        ...scaling,
        weight: parseFloat(scaling.weight),
      };
    });
  }
}
