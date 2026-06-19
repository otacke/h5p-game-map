import { MS_IN_S } from '@services/constants.js';
import Timer from '@services/timer.js';

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
          this.updateTimeoutWarning();

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
   * Show or hide the timeout warning when the remaining time crosses the
   * warning time, playing the warning sound when it is first shown.
   */
  updateTimeoutWarning() {
    const isWithinWarning = this.isWithinTimeoutWarning();
    if (isWithinWarning === this.hasPlayedTimeoutWarningGlobal) {
      return;
    }

    this.hasPlayedTimeoutWarningGlobal = isWithinWarning;
    this.toolbar.toggleHintTimer(isWithinWarning);

    if (isWithinWarning) {
      this.params.jukebox.play('timeoutWarning');
    }
  }

  /**
   * Determine whether the remaining time has reached the timeout warning time.
   * @returns {boolean} True if remaining time is at or below the warning time.
   */
  isWithinTimeoutWarning() {
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

    this.params.jukebox.play('extraTime');
    this.updateTimeLeft(this.timer.getTime() + timeS * MS_IN_S);
  }

  /**
   * Update time left on timer.
   * @param {number} timeLeftMS Time left in milliseconds.
   */
  updateTimeLeft(timeLeftMS) {
    if (typeof timeLeftMS !== 'number' || timeLeftMS < 0 || !this.timer) {
      return;
    }

    this.timer.setTime(timeLeftMS);
    this.toolbar.setStatusContainerStatus('timer', { value: Timer.toTimecode(this.timer.getTime()) });
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
