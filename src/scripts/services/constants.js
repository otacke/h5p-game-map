/** @constant {number} MS_IN_S Milliseconds in a second. */
export const MS_IN_S = 1000;

/** @constant {object} FOG_TYPES Fog types settable in semantics. */
export const FOG_TYPES = Object.freeze({
  ALL: 'all',
  UNLOCKED_AND_NEIGHBORS: '1',
  UNLOCKED: '0',
});

/** @constant {object} ROAMING_TYPES Roaming types settable in semantics. */
export const ROAMING_TYPES = Object.freeze({
  FREE: 'free',
  COMPLETE: 'complete',
  SUCCESS: 'success',
});

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

/** @constant {object} SPECIAL_STAGE_TYPES Types lookup for special stages. */
export const SPECIAL_STAGE_TYPES = Object.freeze({
  EXTRA_LIFE: 'extra-life',
  EXTRA_TIME: 'extra-time',
  LINK: 'link',
  TELEPORT: 'teleport',
});
