/**
 * Mixin containing handlers for exercise screen.
 */
export default class MainHandlersExerciseScreen {
  /**
   * Handle exercise was closed.
   * @param {object} [params] Parameters.
   * @param {function} [params.animationEndedCallback] Callback.
   */
  handleExerciseScreenClosed(params = {}) {
    if (!this.openExerciseId) {
      params.animationEndedCallback?.();
      return;
    }

    this.exerciseClosedCallback = params.animationEndedCallback;

    this.maps.getDOM().setAttribute(
      'aria-label', this.params.dictionary.get('a11y.applicationInstructions'),
    );

    this.exerciseScreen.hide({ animate: true }, () => {
      this.exerciseScreen.setTime('');
      this.maps.focusStage(this.openExerciseId, { skipNextFocusHandler: true });

      this.openExerciseId = false;
      this.callbackQueue.setSkippable(true);

      this.params.globals.get('resize')();
    });
    this.toolbar.enable();
    this.params.jukebox.stopGroup('default');
    this.params.jukebox.play('closeExercise');

    if (
      this.params.globals.get('params').audio.backgroundMusic.muteDuringExercise
    ) {
      this.params.jukebox.fade(
        'backgroundMusic', { type: 'in', time: this.musicFadeTime },
      );
    }

    this.maps.enableStages();

    this.exerciseBundles.stop(this.openExerciseId);

    this.maps.updateStagesStatePerRestrictions();
  }

  /**
   * Handle exercise screen open animation ended.
   */
  handleExerciseScreenOpenAnimationEnded() {
    this.params.globals.get('resize')();
  }

  /**
   * Handle exercise screen close animation ended.
   */
  handleExerciseScreenCloseAnimationEnded() {
    if (this.gameDone) {
      this.queueAnimation = [];
      return;
    }

    // Schedule all queed callbacks to be called
    this.callbackQueue.scheduleQueued();

    if (this.exerciseClosedCallback) {
      this.exerciseClosedCallback();
      this.exerciseClosedCallback = null;
    }
  }

  /**
   * Handle exercise bundle was initialized.
   * @param {string} id Id of exercise bundle.
   * @param {object} params Parameters.
   * @param {number} params.Stage score.
   * @param {number} params.maxScore Max score.
   */
  handleExerciseBundleInitialized(id, params) {
    if (params.isTask || !this.maps.getCount()) {
      this.maps.updateStageScoreStar(id, params.score / params.maxScore * 100);
    }

    this.maps.setStageTaskState(id, params.isTask);
  }
}
