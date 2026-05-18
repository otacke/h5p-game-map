/** @constant {number} MS_IN_S Milliseconds in a second. */
export const MS_IN_S = 1000;

/** @constant {object} STAGE_STATES States lookup for stages. */
export const STAGE_STATES = Object.freeze({
  UNSTARTED: 0, // Exercise
  LOCKED: 1,
  OPEN: 3,
  OPENED: 4, // Rename to tried or similar
  COMPLETED: 5,
  CLEARED: 6, // Exercise, Stage, Path,
  SEALED: 7, // Stage
});

/** @constant {object} STAGE_TYPES Types lookup for stages. */
export const STAGE_TYPES = Object.freeze({
  STAGE: 0,
  SPECIAL_STAGE: 1,
});
