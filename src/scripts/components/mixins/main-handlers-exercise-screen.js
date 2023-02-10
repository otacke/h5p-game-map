import Dictionary from '@services/dictionary';
import Jukebox from '@services/jukebox';
import Globals from '@services/globals';

/**
 * Mixin containing handlers for exercise screen.
 */
export default class MainHandlersExerciseScreen {
  /**
   * Handle exercise was closed.
   *
   * @param {object} [params={}] Parameters.
   * @param {function} [params.animationEndedCallback] Callback.
   */
  handleExerciseScreenClosed(params = {}) {
    if (!this.openExerciseId) {
      return;
    }

    this.exerciseClosedCallback = params.animationEndedCallback;

    this.map.dom.setAttribute(
      'aria-label', Dictionary.get('a11y.applicationInstructions')
    );

    this.exerciseScreen.hide({ animate: true }, () => {
      this.exerciseScreen.setTime('');
      this.stages
        .getStage(this.openExerciseId)
        .focus({ skipNextFocusHandler: true });

      this.openExerciseId = false;

      Globals.get('resize')();
    });
    Jukebox.stopGroup('default');
    Jukebox.play('closeExercise');

    if (Globals.get('params').audio.backgroundMusic.muteDuringExercise) {
      Jukebox.fade(
        'backgroundMusic', { type: 'in', time: this.musicFadeTime }
      );
    }

    this.stages.enable();

    this.exercises.stop(this.openExerciseId);
  }

  /**
   * Handle exercise screen open animation ended.
   */
  handleExerciseScreenOpenAnimationEnded() {
    Globals.get('resize')();
  }

  /**
   * Handle exercise screen close animation ended.
   */
  handleExerciseScreenCloseAnimationEnded() {
    if (this.gameDone) {
      this.queueAnimation = [];
      return;
    }

    this.playAnimationQueue();

    if (this.exerciseClosedCallback) {
      this.exerciseClosedCallback();
      this.exerciseClosedCallback = null;
    }
  }
}
