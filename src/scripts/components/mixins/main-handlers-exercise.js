import Jukebox from '@services/jukebox';

/**
 * Mixin containing handlers for exercise.
 */
export default class MainHandlersExercise {
  /**
   * Handle exercise state changed.
   *
   * @param {string} id Id of exercise that was changed.
   * @param {number} state State code.
   */
  handleExerciseStateChanged(id, state) {
    if (this.isShowingSolutions) {
      return;
    }

    this.stages.updateState(id, state);
  }

  /**
   * Handle exercise score changed.
   *
   * @param {string} id Id of stage that was changed.
   * @param {object} [params={}] Parameters for scores.
   * @param {number} params.score Score.
   * @param {number} params.maxScore Maximum possible score.
   */
  handleExerciseScoreChanged(id, params = {}) {
    if (this.gameDone) {
      return; // Just cautious ...
    }

    if (!this.fullScoreWasAnnounced && this.getScore() === this.getMaxScore()) {
      this.fullScoreWasAnnounced = true;

      this.addToQueue(() => {
        Jukebox.play('fullScore');
        this.showFullScoreConfirmation();
      });
    }

    // Check whether previously not unlockable stages can not be unlocked
    this.stages.updateUnlockingStages();

    if (typeof params.score === 'number' && params.score !== params.maxScore) {
      this.handleLostLife();
    }

    this.toolbar.setStatusContainerStatus(
      'score', { value: this.getScore(), maxValue: this.getMaxScore() }
    );
  }

  /**
   * Handle exercise timer ticked.
   *
   * @param {number} id Id of exercise that had a timer tick.
   * @param {number} remainingTime Remaining time in ms.
   */
  handleExerciseTimerTicked(id, remainingTime) {
    this.handleTimerTicked(id, remainingTime);
  }

  /**
   * Handle exercise time out warning.
   *
   * @param {number} id Id of exercise that is about to time out.
   */
  handleExerciseTimeoutWarning(id) {
    this.handleTimeoutWarning(id);
  }

  /**
   * Handle exercise time out.
   *
   * @param {number} id Id of exercise that timed out.
   */
  handleExerciseTimeout(id) {
    this.handleTimeout(id);
  }
}
