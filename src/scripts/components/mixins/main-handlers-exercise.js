/**
 * Mixin containing handlers for exercise.
 */
export default class MainHandlersExercise {
  /**
   * Handle exercise state changed.
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
   * @param {string} id Id of stage that was changed.
   * @param {object} [params] Parameters for scores.
   * @param {number} params.score Score.
   * @param {number} params.maxScore Maximum possible score.
   */
  handleExerciseScoreChanged(id, params = {}) {
    if (this.gameDone) {
      return; // Just cautious ...
    }

    // eslint-disable-next-line no-magic-numbers
    this.stages.updateScoreStar(id, params.score / params.maxScore * 100);

    if (!this.fullScoreWasAnnounced && this.getScore() === this.getMaxScore()) {
      this.fullScoreWasAnnounced = true;

      this.callbackQueue.add(() => {
        this.params.jukebox.play('fullScore');
        this.showFullScoreConfirmation();
      });
    }

    // Check whether previously not unlockable stages can not be unlocked
    this.stages.updateUnlockingStages();

    if (typeof params.score === 'number' && params.score !== params.maxScore) {
      this.handleIncompleteScore(id);
    }

    this.toolbar.setStatusContainerStatus(
      'score', { value: this.getScore(), maxValue: this.getMaxScore() }
    );
  }

  /**
   * Handle incomplete score.
   */
  handleIncompleteScore() {
    if (this.livesLeft === Infinity) {
      return;
    }

    this.handleLostLife();

    if (this.livesLeft > 0) {
      this.showIncompleteScoreConfirmation();
    }
  }

  /**
   * Handle exercise timer ticked.
   * @param {number} id Id of exercise that had a timer tick.
   * @param {number} remainingTime Remaining time in ms.
   * @param {object} [options] Options.
   * @param {boolean} [options.timeoutWarning] If true, timeout warning state.
   */
  handleExerciseTimerTicked(id, remainingTime, options) {
    if (!id || id !== this.openExerciseId) {
      return;
    }

    this.exerciseScreen.setTime(remainingTime, options);
  }

  /**
   * Handle exercise time out warning.
   * @param {number} id Id of exercise that is about to time out.
   */
  handleExerciseTimeoutWarning(id) {
    if (!id || id !== this.openExerciseId) {
      return;
    }

    this.params.jukebox.play('timeoutWarning');
  }

  /**
   * Handle exercise time out.
   * @param {number} id Id of exercise that timed out.
   */
  handleExerciseTimeout(id) {
    if (!id || id !== this.openExerciseId) {
      return;
    }

    this.handleLostLife();

    if (this.livesLeft > 0) {
      this.handleExerciseScreenClosed({
        animationEndedCallback: () => {
          this.exerciseBundles.reset(id);
          this.showTimeoutConfirmation();
        }
      });
    }
  }

  /**
   * Handle user lost a life.
   */
  handleLostLife() {
    if (this.livesLeft === 0) {
      return;
    }

    this.livesLeft--;
    this.params.jukebox.play('lostLife');

    this.toolbar.setStatusContainerStatus('lives', { value: this.livesLeft });

    if (this.livesLeft === 0) {
      // Clear all animations that were about to be played
      this.queueAnimation = [];

      // Store current state and seal stage
      this.stagesGameOverState = this.stages.getCurrentState();
      this.stages.forEach((stage) => {
        stage.setState('sealed');
      });

      this.handleExerciseScreenClosed({
        animationEndedCallback: () => {
          this.showGameOverConfirmation();
        }
      });
    }
  }
}
