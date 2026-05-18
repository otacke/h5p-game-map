import { STAGE_STATES, STAGE_TYPES } from '@services/constants.js';

/** @constant {number} DEFAULT_READ_DELAY_MS Delay before reading was triggered. */
const DEFAULT_READ_DELAY_MS = 250;

/**
 * Mixin containing handlers for stage.
 */
export default class MainHandlersStage {
  addExtraLives(amount) {
    if (typeof amount !== 'number' || amount < 1 || this.livesLeft === Infinity) {
      return;
    }

    this.params.jukebox.play('gainedLife');
    this.updateLivesLeft(this.livesLeft + amount);
  }

  /**
   * Handle stage clicked.
   * @param {string} id Id of stage that was clicked on.
   */
  handleStageClicked(id) {
    const stageType = this.maps.getStageType(id);

    if (stageType === STAGE_TYPES.STAGE) {
      this.maps.disableStages();
      window.clearTimeout(this.stageAttentionSeekerTimeout);
      const exerciseBundle = this.exerciseBundles.getExerciseBundle(id);

      const remainingTime = exerciseBundle.getRemainingTime();
      if (typeof remainingTime === 'number') {
        this.exerciseScreen.setTime(remainingTime);
      }

      // Store to restore focus when exercise screen is closed
      this.openExerciseId = id;
      this.callbackQueue.setSkippable(false);

      exerciseBundle.handleOpened();

      const stageLabel = this.maps.getStageLabel(id);
      this.exerciseScreen.setContent(exerciseBundle.getDOM());
      this.exerciseScreen.setTitle(
        stageLabel,
        this.params.dictionary.get('a11y.exerciseLabel').replace(/@stagelabel/, stageLabel),
      );

      const infoChildren = [
        this.buildLivesInfoHTML(exerciseBundle.getLivesInfo()),
        this.buildScoreInfoHTML(exerciseBundle.getScoreInfo()),
      ].filter(Boolean);

      let info;
      if (infoChildren.length) {
        info = document.createElement('div');
        info.classList.add('h5p-game-map-overlay-dialog-header-info-wrapper');
        info.append(...infoChildren);
      }
      this.exerciseScreen.setInfo(info);

      this.params.jukebox.stopGroup('default');
      this.exerciseScreen.show({ isShowingSolutions: this.isShowingSolutions });
      this.toolbar.disable();
      this.exerciseBundles.start(id);

      if (this.params.globals.get('params').audio.muteDuringExercise) {
        this.params.jukebox.fade('backgroundMusic', { type: 'out', time: this.musicFadeTime });
      }

      this.params.jukebox.play('openExercise');

      if (!this.isShowingSolutions) {
        const allElements = (this.params.globals.get('getAllGamemapsParams')?.() ?? [])
          .flatMap((gamemap) => gamemap.elements ?? []);

        // Update context for confusion report contract
        const stageIndex = allElements.findIndex((element) => element.id === id);

        this.currentStageIndex = stageIndex + 1;
        this.hasUserMadeProgress = true;
        this.callbacks.onProgressChanged(this.currentStageIndex);
      }
    }
    else if (stageType === STAGE_TYPES.SPECIAL_STAGE) {
      if (!this.isShowingSolutions) {
        // Special stages should only run once, when open but not opened yet.
        const state = this.maps.getStageState(id);
        if (state === STAGE_STATES.OPEN) {
          this.maps.runSpecialStageFeature(id, this);
        }
      }
    }

    window.requestAnimationFrame(() => {
      this.params.globals.get('resize')();
    });
  }

  /**
   * Build lives info HTML for exercise screen.
   * @param {object} rawLivesInfo Lives info from exercise bundle.
   * @returns {DocumentFragment|undefined} DOM fragment or undefined if no rules.
   */
  buildLivesInfoHTML(rawLivesInfo) {
    if (!rawLivesInfo.rules.length) {
      return undefined;
    }

    const BASE = 'h5p-game-map-overlay-dialog-headline-info-content';

    const intro = document.createElement('p');
    intro.className = `${BASE}-intro`;
    intro.textContent = rawLivesInfo.intro;

    const list = document.createElement('ul');
    list.className = `${BASE}-list`;
    if (rawLivesInfo.rules.length === 1) {
      list.classList.add('one-item');
    }

    for (const rule of rawLivesInfo.rules) {
      const li = document.createElement('li');
      li.className = `${BASE}-listitem`;

      if (rule.title) {
        const titleSpan = document.createElement('span');
        titleSpan.className = `${BASE}-listitem-title`;
        titleSpan.textContent = `${rule.title}: `;
        li.append(titleSpan);
      }

      const ruleSpan = document.createElement('span');
      ruleSpan.className = `${BASE}-listitem-text`;
      ruleSpan.textContent = rule.rule;
      li.append(ruleSpan);

      list.append(li);
    }

    const livesInfo = document.createElement('div');
    livesInfo.classList.add('h5p-game-map-overlay-dialog-info-lives');
    livesInfo.append(intro, list);
    return livesInfo;
  }

  /**
   * Build info score HTML.
   * @param {string} scoreInfo Info message.
   * @returns {HTMLElement|undefined} Score info element.
   */
  buildScoreInfoHTML(scoreInfo) {
    if (!scoreInfo) {
      return;
    }

    const message = document.createElement('p');
    message.classList.add('h5p-game-map-overlay-dialog-headline-info-content-intro');
    message.innerText = scoreInfo;

    return message;
  }

  /**
   * Handle special feature has run.
   * @param {string} feature Feature name.
   * @param {object} [options] Options for feature.
   */
  handleSpecialFeatureRun(feature, options = {}) {
    if (feature === 'extra-life') {
      this.toolbar.animateStatusContainer('lives', 'pulse');
    }
    else if (feature === 'extra-time') {
      this.toolbar.animateStatusContainer('timer', 'pulse');
    }
    else if (feature === 'teleport') {
      const stageState = this.maps.getStageState(options.targetId);
      if (stageState === STAGE_STATES.LOCKED || stageState === STAGE_STATES.SEALED) {
        this.maps.informAboutStageLockedState({ sourceId: options.sourceId, targetId: options.targetId });
        return;
      }

      this.showMapThatHoldsStage(options.targetId);
    }
  }

  /**
   * Show the map that shows the stage with targetId.
   * @param {string} targetId Target stage id.
   */
  showMapThatHoldsStage(targetId) {
    const oldMapIndex = this.maps.getCurrentIndex() ?? 0;
    const backgroundMusicKey = this.getBackgroundMusicKey(oldMapIndex);

    const isPlayingBackgroundMusic = this.params.jukebox.isPlaying(backgroundMusicKey);
    const mapWasChanged = this.maps.showMapThatHoldsStage(targetId);

    if (mapWasChanged) {
      if (isPlayingBackgroundMusic) {
        this.params.jukebox.mute(backgroundMusicKey);
        this.tryStartBackgroundMusic();
      }

      this.params.jukebox.play('teleport');
    }
  }

  /**
   * Handle stage state changed.
   * @param {string} id Id of exercise that was changed.
   * @param {number} state State code.
   */
  handleStageStateChanged(id, state) {
    if (this.isShowingSolutions || !this.maps?.getCount()) {
      return;
    }

    this.callbackQueue.add(() => {
      this.maps.updatePathState(id, state);
    });

    this.maps.updateStageNeighborsState(id, state);

    const states = [STAGE_STATES.COMPLETED, STAGE_STATES.CLEARED];
    const stageTypes = [STAGE_TYPES.STAGE];

    const filterExercisesOnly = {
      type: stageTypes,
    };

    // Initialize stage counter
    const filterExercisesDone = {
      state: states,
      type: stageTypes,
    };

    // Initialize stages
    this.toolbar.setStatusContainerStatus('stages', {
      value: this.maps.getStagesCount({ filters: filterExercisesDone }),
      maxValue: this.maps.getStagesCount({ filters: filterExercisesOnly }),
    });
  }

  /**
   * Handle stage focused.
   */
  handleStageFocused() {
    window.setTimeout(() => {
      this.params.globals.get('read')(
        this.params.dictionary.get('a11y.applicationInstructions'),
      );
    }, DEFAULT_READ_DELAY_MS); // Make sure everything else is read already
  }

  /**
   * Handle stage became active descendant.
   * @param {string} id Stage's id.
   */
  handleStageBecameActiveDescendant(id) {
    this.maps.setActiveDescendant(id);
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
   * @param {number} [params.html] HTML to display.
   */
  handleStageAccessRestrictionsHit(params = {}) {
    params.html = params.html ? ` ${params.html}` : '';

    const hitFromTarget = !params.sourceId || params.sourceId === params.id;

    const dialogTextIntroId = hitFromTarget ? 'confirmAccessDeniedDialog' : 'confirmAccessDeniedForTargetDialog';
    const dialogTextIntro = this.params.dictionary.get(`l10n.${dialogTextIntroId}`);

    this.toolbar.disableButton('finish');

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmAccessDeniedHeader'),
        dialogText: `${dialogTextIntro}${params.html}`,
        confirmText: this.params.dictionary.get('l10n.ok'),
        hideCancel: true,
      },
      {
        onConfirmed: () => {
          this.toolbar.enableButton('finish');
        },
        onCanceled: () => {
          this.toolbar.enableButton('finish');
        },
      },
    );

    this.confirmationDialog.show();
  }
}
