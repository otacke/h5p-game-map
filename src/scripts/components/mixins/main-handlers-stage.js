import { STAGE_TYPES } from '@components/map/stage/stage.js';

/**
 * Mixin containing handlers for stage.
 */
export default class MainHandlersStage {
  addExtraLives(amount) {
    if (typeof amount !== 'number' || amount < 1 || this.livesLeft === Infinity) {
      return;
    }

    this.livesLeft += amount;
    this.toolbar.setStatusContainerStatus('lives', { value: this.livesLeft });
    this.params.jukebox.play('gainedLife');
  }

  /**
   * Handle stage clicked.
   * @param {string} id Id of stage that was clicked on.
   */
  handleStageClicked(id) {
    const stage = this.stages.getStage(id);

    const stageType = stage.getType();

    if (stageType === STAGE_TYPES['stage']) {
      this.stages.disable();
      window.clearTimeout(this.stageAttentionSeekerTimeout);
      const exercise = this.exercises.getExercise(id);

      const remainingTime = exercise.getRemainingTime();
      if (typeof remainingTime === 'number') {
        this.exerciseScreen.setTime(remainingTime);
      }

      // Store to restore focus when exercise screen is closed
      this.openExerciseId = id;
      this.callbackQueue.setSkippable(false);

      this.exerciseScreen.setH5PContent(exercise.getDOM());
      this.exerciseScreen.setTitle(stage.getLabel());
      this.params.jukebox.stopGroup('default');
      this.exerciseScreen.show({ isShowingSolutions: this.isShowingSolutions });
      this.toolbar.disable();
      this.exercises.start(id);

      if (
        this.params.globals.get('params').audio.backgroundMusic.muteDuringExercise
      ) {
        this.params.jukebox.fade(
          'backgroundMusic', { type: 'out', time: this.musicFadeTime }
        );
      }

      this.params.jukebox.play('openExercise');

      if (!this.isShowingSolutions) {
        // Update context for confusion report contract
        const stageIndex =
          this.params.globals.get('params').gamemapSteps.gamemap.elements
            .findIndex((element) => element.id === id);
        this.currentStageIndex = stageIndex + 1;
        this.hasUserMadeProgress = true;
        this.callbacks.onProgressChanged(this.currentStageIndex);
      }
    }
    else if (stageType === STAGE_TYPES['special-stage']) {
      if (!this.isShowingSolutions) {
        stage.runSpecialFeature(this);
      }
    }

    window.requestAnimationFrame(() => {
      this.params.globals.get('resize')();
    });
  }

  /**
   * Handle special feature has run.
   * @param {string} feature Feature name.
   */
  handleSpecialFeatureRun(feature) {
    if (feature === 'extra-life') {
      this.toolbar.animateStatusContainer('lives', 'pulse');
    }
    else if (feature === 'extra-time') {
      this.toolbar.animateStatusContainer('timer', 'pulse');
    }
  }

  /**
   * Handle stage state changed.
   * @param {string} id Id of exercise that was changed.
   * @param {number} state State code.
   */
  handleStageStateChanged(id, state) {
    if (this.isShowingSolutions) {
      return;
    }

    if (this.paths) {
      this.callbackQueue.add(() => {
        this.paths.updateState(id, state);
      });
    }

    if (this.stages) {
      this.stages.updateNeighborsState(id, state);

      // Set filters for completed/cleared stages
      const filters = {
        state: [
          this.params.globals.get('states')['completed'],
          this.params.globals.get('states')['cleared']
        ]
      };

      this.toolbar.setStatusContainerStatus('stages', {
        value: this.stages.getCount({ filters: filters }),
        maxValue: this.stages.getCount()
      });
    }
  }

  /**
   * Handle stage focused.
   */
  handleStageFocused() {
    window.setTimeout(() => {
      this.params.globals.get('read')(
        this.params.dictionary.get('a11y.applicationInstructions')
      );
    }, 250); // Make sure everything else is read already
  }

  /**
   * Handle stage became active descendant.
   * @param {string} id Stage's id.
   */
  handleStageBecameActiveDescendant(id) {
    this.map?.setActiveDescendant(id);
  }

  /**
   * Handle stage added function to main queue.
   * @param {function} callback Function to add to queue.
   * @param {object} params Parameters for queue.
   */
  handleStageAddedToQueue(callback, params) {
    this.callbackQueue.add(callback, params);
  }

  /**
   * Handle stage to be opened with restrictions.
   * @param {object} [params] Parameters.
   * @param {string} [params.id] Stage id.
   * @param {number} [params.minScore] Minimum score to open stage.
   */
  handleStageAccessRestrictionsHit(params = {}) {
    if (!params.minScore) {
      return;
    }

    this.toolbar.disableButton('finish');

    const restrictions = [];

    if (params.minScore) {
      restrictions.push(
        this.params.dictionary.get('l10n.confirmAccessDeniedMinScore')
          .replace(/@minscore/gi, params.minScore)
      );
    }

    let restriction = restrictions
      .map((restriction) => `<li>${restriction}</li>`)
      .join('');

    restriction = `<ul>${restriction}</ul>`;

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmAccessDeniedHeader'),
        dialogText: `${this.params.dictionary.get('l10n.confirmAccessDeniedDialog')}${restriction}`,
        confirmText: this.params.dictionary.get('l10n.ok'),
        hideCancel: true
      }, {
        onConfirmed: () => {
          this.toolbar.enableButton('finish');
        },
        onCanceled: () => {
          this.toolbar.enableButton('finish');
        }
      }
    );

    this.confirmationDialog.show();
  }
}
