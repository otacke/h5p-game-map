import semantics from '@root/semantics.json';

/**
 * Get subContentId from xAPI statement.
 * @param {object} xAPIStatement XAPI statement.
 * @returns {string|null} subContentId or null.
 */
export const getSubContentIdFromXAPIStatement = (xAPIStatement = {}) => {
  if (typeof xAPIStatement.object?.id !== 'string') {
    return null;
  }

  const queryString = xAPIStatement.object.id.split('?')[1]; // xAPI Spec requires this to be a IRI.
  const queryParams = new URLSearchParams(queryString);
  return queryParams.get('subContentId');
};

/**
 * Get contentId from xAPI statement.
 * @param {object} xAPIStatement xAPI statement.
 * @returns {string|null} contentId or null.
 */
export const getContentIdFromXAPIStatement = (xAPIStatement = {}) => {
  if (typeof xAPIStatement.object?.id !== 'string') {
    return null;
  }

  // xAPI Spec requires this to be a IRI.
  return xAPIStatement.object.id.split('/').pop()?.split('?')[0] || null;
};

/**
 * Determine whether the H5P editor is being used.
 * @returns {boolean} True if the H5P editor is being used, false otherwise.
 */
export const isEditor = () => {
  return window.H5PEditor !== undefined;
};

/** Class for h5p related utility functions */
export default class H5PUtil {
  /**
   * Determine whether an H5P instance is a task.
   * @param {H5P.ContentType} instance Instance.
   * @returns {boolean} True, if instance is a task.
   */
  static isInstanceTask(instance = {}) {
    if (!instance) {
      return false;
    }

    if (typeof instance.isTask === 'boolean') {
      return instance.isTask; // Content will determine if it's task on its own
    }

    // Check for maxScore > 0 as indicator for being a task
    const hasGetMaxScore = (typeof instance.getMaxScore === 'function');
    if (hasGetMaxScore && instance.getMaxScore() > 0) {
      return true;
    }

    return false;
  }

  /**
   * Get default values from semantics fields.
   * @param {object[]} start Start semantics field.
   * @returns {object} Default values from semantics.
   */
  static getSemanticsDefaults(start = semantics) {
    let defaults = {};

    if (!Array.isArray(start)) {
      return defaults; // Must be array, root or list
    }

    start.forEach((entry) => {
      if (typeof entry.name !== 'string') {
        return;
      }

      if (typeof entry.default !== 'undefined') {
        defaults[entry.name] = entry.default;
      }
      if (entry.type === 'list') {
        defaults[entry.name] = []; // Does not set defaults within list items!
      }
      else if (entry.type === 'group' && entry.fields) {
        const groupDefaults = H5PUtil.getSemanticsDefaults(entry.fields);
        if (Object.keys(groupDefaults).length) {
          defaults[entry.name] = groupDefaults;
        }
      }
    });

    return defaults;
  }
}
