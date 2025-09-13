import Timer from '@services/timer.js';

/** @constant {number} MS_IN_S Milliseconds in a second. */
const MS_IN_S = 1000;

/**
 * Mixin containing methods related to the timer.
 */
export default class MainTimer {

  /**
   * Initialize timer.
   */
  initializeTimer() {
    if (!this.params.globals.get('params').behaviour.timeLimitGlobal) {
      return;
    }

    this.timer = new Timer(
      { interval: 500 },
      {
        onTick: () => {
          this.timeLeft = this.timer.getTime();
          const isTimeoutWarning = this.isTimeoutWarning();

          if (isTimeoutWarning) {
            this.hasPlayedTimeoutWarningGlobal = true;
            this.params.jukebox.play('timeoutWarning');
            this.toolbar.toggleHintTimer(true);
          }

          this.toolbar.setStatusContainerStatus(
            'timer',
            { value: Timer.toTimecode(this.timeLeft) },
          );
        },
        onExpired: () => {
          this.showGameOverConfirmation('confirmGameOverDialogTimeout');
        },
      },
    );
  }

  /**
   * Determine whether exercise is in timeout warning state.
   * @returns {boolean} True, if exercise is in timeout warning state.
   */
  isTimeoutWarning() {
    if (this.hasPlayedTimeoutWarningGlobal) {
      return false;
    }

    const timeoutWarning =
      this.params.globals.get('params').behaviour.timeoutWarningGlobal;

    return (
      typeof timeoutWarning === 'number' &&
      this.timeLeft <= timeoutWarning * MS_IN_S
    );
  }

  /**
   * Add extra time to timer.
   * @param {number} timeS Time in seconds.
   */
  addExtraTime(timeS) {
    if (typeof timeS !== 'number' || timeS < 1 || !this.timer) {
      return;
    }

    this.timer.setTime(this.timer.getTime() + timeS * MS_IN_S);
    this.toolbar.setStatusContainerStatus(
      'timer',
      { value: Timer.toTimecode(this.timer.getTime()) },
    );
    this.params.jukebox.play('extraTime');
  }

  /**
   * Reset timer.
   * @param {number} timeMs Time in milliseconds.
   */
  resetTimer(timeMs) {
    if (typeof timeMs !== 'number' || timeMs < 1) {
      return;
    }

    this.hasPlayedTimeoutWarningGlobal = false;
    this.timer?.reset(timeMs);

    this.toolbar.setStatusContainerStatus(
      'timer',
      { value: Timer.toTimecode(timeMs) },
    );
  }
}
