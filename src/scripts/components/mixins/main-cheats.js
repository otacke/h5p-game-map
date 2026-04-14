/** @constant {number} MS_IN_S Number of milliseconds in a second. */
const MS_IN_S = 1000;

/**
 * Mixin containing methods related to cheating.
 */
export default class MainCheats {

  /**
   * Cheat command to set certain values.
   * @param {object} params Parameters.
   */
  cheat(params = {}) {
    if (this.gameDone) {
      return; // Don't mess with things if game is already done.
    }

    this.cheatSetLives(params.livesLeft);
    this.cheatSetGlobalTime(params.timeLeftS);
    this.cheatStages(params.stages);
  }

  /**
   * Set lives as cheat.
   * @param {number} livesLeft Lives to set.
   */
  cheatSetLives(livesLeft) {
    if (typeof livesLeft !== 'number' || livesLeft < 0) {
      return;
    }

    this.updateLivesLeft(livesLeft);
  }

  /**
   * Set global time as cheat.
   * @param {number} timeLeftS Time to set.
   */
  cheatSetGlobalTime(timeLeftS) {
    if (typeof timeLeftS !== 'number' || timeLeftS < 0) {
      return;
    }

    this.updateTimeLeft(timeLeftS * MS_IN_S);
  }

  /**
   * Set values for stages as cheat.
   * @param {object[]} stages Stage values.
   */
  cheatStages(stages) {
    if (!Array.isArray(stages)) {
      return;
    }

    stages.forEach((stageParams) => {
      if (typeof stageParams !== 'object' || stageParams === null) {
        return;
      }

      this.cheatSetStageState(stageParams.id, stageParams.state);
      this.cheatSetStageScore(stageParams.id, stageParams.score);
      this.cheatSetStageTime(stageParams.id, stageParams.timeLeftS);
    });
  }

  /**
   * Set stage state as cheat.
   * @param {string} id Stage id.
   * @param {number} state State to set.
   */
  cheatSetStageState(id, state) {
    if (!id || typeof state !== 'number') {
      return;
    }

    const stage = this.stages.getStage(id);
    if (!stage) {
      return;
    }

    stage.setState(state);
  }

  /**
   * Set stage score as cheat.
   * @param {string} id Stage id.
   * @param {number} score Score to set.
   */
  cheatSetStageScore(id, score) {
    if (!id || (typeof score !== 'number')) {
      return;
    }

    const exerciseBundle = this.exerciseBundles.getExerciseBundle(id);
    if (!exerciseBundle) {
      return;
    }

    exerciseBundle.setCheatScore(score);
  }

  /**
   * Set stage time in seconds.
   * @param {string} id Stage id.
   * @param {number} timeLeftS Time left in seconds.
   */
  cheatSetStageTime(id, timeLeftS) {
    if (!id || (typeof timeLeftS !== 'number')) {
      return;
    }

    const exerciseBundle = this.exerciseBundles.getExerciseBundle(id);
    if (!exerciseBundle) {
      return;
    }

    exerciseBundle.setRemainingTime(timeLeftS * MS_IN_S);
  }
}
