import CallbackQueue from '@services/callback-queue';
import Util from '@services/util';
import MainInitialization from './mixins/main-initialization';
import MainHandlersStage from './mixins/main-handlers-stage';
import MainHandlersExercise from './mixins/main-handlers-exercise';
import MainHandlersExerciseScreen from './mixins/main-handlers-exercise-screen';
import MainQuestionTypeContract from './mixins/main-question-type-contract';
import './main.scss';

/**
 * Main DOM component incl. main controller
 */
export default class Main {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onProgressChanged] Called on progress change.
   * @param {function} [callbacks.onFinished] Called when finished.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbackQueue = new CallbackQueue();

    // Without animations requested, schedule whole queue for same time
    this.callbackQueue.setRespectsDelay(
      this.params.globals.get('params').visual.misc.useAnimation
    );

    Util.addMixins(
      Main,
      [
        MainInitialization,
        MainHandlersStage,
        MainHandlersExercise,
        MainHandlersExerciseScreen,
        MainQuestionTypeContract
      ]
    );

    this.callbacks = Util.extend({
      onProgressChanged: () => {},
      onFinished: () => {},
      onFullscreenClicked: () => {}
    }, callbacks);

    this.params.globals.set('getScore', () => {
      return this.getScore();
    });

    this.musicFadeTime = Main.MUSIC_FADE_TIME;

    this.buildDOM();
    this.startVisibilityObserver();
    this.reset({ isInitial: true });

    if (typeof this.params.globals.get('params').behaviour.lives === 'number') {
      this.toolbar.showStatusContainer('lives');
    }

    this.toolbar.showStatusContainer('stages');

    if (this.getMaxScore() > 0) {
      this.toolbar.showStatusContainer('score');
    }

    this.start({ isInitial: true });

    // Reattach H5P.Question buttons and scorebar to endscreen
    H5P.externalDispatcher.on('initialized', () => {
      const feedbackWrapper = this.grabH5PQuestionFeedback({
        maxScore: this.getMaxScore()
      });

      this.endScreen.setContent(feedbackWrapper);

      this.handleAutoplay();
    });
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   * @param {object} params Parameters.
   * @param {boolean} [params.focusButton] If true, start button will get focus.
   * @param {boolean} [params.readOpened] If true, announce screen was opened.
   */
  show(params = {}) {
    this.map.show();
    this.contentDOM.classList.remove('display-none');

    if (params.readOpened) {
      this.params.globals.get('read')(
        this.params.dictionary.get('a11y.mapWasOpened')
      );
    }

    window.setTimeout(() => {
      if (params.focusButton) {
        this.toolbar.focus();
      }
    }, 100);

    if (!this.stageAttentionSeekerTimeout) {
      this.seekAttention();
    }

    // Initially, two resizes are required
    window.requestAnimationFrame(() => {
      this.params.globals.get('resize')();

      window.requestAnimationFrame(() => {
        this.params.globals.get('resize')();
      });
    });
  }

  /**
   * Hide.
   */
  hide() {
    this.map.hide();
    this.contentDOM.classList.add('display-none');
  }

  /**
   * Start.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  start(params = {}) {
    this.endScreen.hide();

    const hasTitleScreen = this.params.globals.get('params').showTitleScreen;

    if (hasTitleScreen) {
      this.hide();

      const startParams = !params.isInitial ?
        { focusButton: true, readOpened: true } :
        {};

      this.startScreen.show(startParams);
    }
    else if (!params.isInitial) {
      this.show({ focusButton: true, readOpened: true });
    }
    else {
      this.show();
    }

    this.params.globals.get('resize')();
  }

  /**
   * Seek attention.
   */
  seekAttention() {
    window.clearTimeout(this.stageAttentionSeekerTimeout);
    this.stageAttentionSeekerTimeout = window.setTimeout(() => {
      this.stages.getNextOpenStage();

      const nextOpenStage = this.stages.getNextOpenStage();
      if (nextOpenStage) {
        nextOpenStage.animate('bounce');
      }

      this.seekAttention();
    }, Main.ATTENTION_SEEKER_TIMEOUT_MS);
  }

  /**
   * Resize.
   */
  resize() {
    const mapSize = this.map.getSize();
    if (!mapSize || mapSize.width === 0 || mapSize.height === 0) {
      return;
    }

    // This should be done with a container selector when support is better.
    this.exerciseScreen.setScreenOffset(mapSize.width);

    this.map.resize();
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.paths.update({ mapSize: this.map.getSize() });
    }, 0);

    /*
     * For some reason, the grid-areas of this.dom can overshoot the maximum
     * width of 100% and some content types will overflow. This solution is
     * not good, but I have not found a different one yet.
     */
    if (
      this.exerciseScreen.getSize().width >
      this.dom.getBoundingClientRect().width
    ) {
      clearTimeout(this.exersizeScreenResizeTimeout);
      this.exersizeScreenResizeTimeout = setTimeout(() => {
        this.params.globals.get('resize')();
      }, 0);
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

  /**
   * Show end screen.
   * @param {object} params Parameters.
   * @param {boolean} [params.focusButton] If true, start button will get focus.
   * @param {boolean} [params.readOpened] If true, announce screen was opened.
   */
  showEndscreen(params = {}) {
    const endscreenParams = this.params.globals.get('params').endScreen;

    // Prepare end screen
    const score = this.getScore();
    const maxScore = this.getMaxScore();

    const textScore = H5P.Question.determineOverallFeedback(
      endscreenParams.overallFeedback, score / maxScore
    );

    // Output via H5P.Question - expects :num and :total
    const ariaMessage = this.params.dictionary.get('a11y.yourResult')
      .replace('@score', ':num')
      .replace('@total', ':total');

    this.params.globals.get('mainInstance').setFeedback(
      textScore,
      score,
      maxScore,
      ariaMessage
    );

    const defaultTitle = `<p style="text-align: center;">${this.params.dictionary.get('l10n.completedMap')}</p>`;

    if (score === maxScore) {
      const success = endscreenParams.success;
      this.endScreen.setMedium(success.endScreenMediumSuccess);

      const html = Util.isHTMLWidgetFilled(success.endScreenTextSuccess) ?
        success.endScreenTextSuccess :
        defaultTitle;

      this.endScreen.setIntroduction(html);

      if (!this.isShowingSolutions) {
        this.params.jukebox.play('endscreenSuccess');
      }
    }
    else {
      const noSuccess = endscreenParams.noSuccess;
      this.endScreen.setMedium(noSuccess.endScreenMediumNoSuccess);

      const html = Util.isHTMLWidgetFilled(noSuccess.endScreenTextNoSuccess) ?
        noSuccess.endScreenTextNoSuccess :
        defaultTitle;

      this.endScreen.setIntroduction(html);
      if (!this.isShowingSolutions) {
        this.params.jukebox.play('endscreenNoSuccess');
      }
    }

    this.hide();
    this.endScreen.show(params);
  }

  /**
   * Set fullscreen state.
   * @param {boolean} state If true, fullscreen is active.
   */
  setFullscreen(state) {
    this.isFullscreenActive = state;

    // Compute size of container space
    const style = window.getComputedStyle(this.contentDOM);
    const marginHorizontal = parseFloat(style.getPropertyValue('margin-left')) +
      parseFloat(style.getPropertyValue('margin-right'));

    const marginVertical = parseFloat(style.getPropertyValue('margin-top')) +
      parseFloat(style.getPropertyValue('margin-bottom'));

    this.map.setFullscreen(state, {
      width: window.innerWidth - marginHorizontal,
      height: window.innerHeight - marginVertical - this.toolbar.getFullHeight()
    });

    this.toolbar.forceButton('fullscreen', state ? 1 : 0, { noCallback: true });
  }

  /**
   * Toggle audio.
   * @param {boolean} [state] State to set audio to.
   */
  toggleAudio(state) {
    this.isAudioOn = (typeof state === 'boolean') ? state : !this.isAudioOn;

    if (!this.isAudioOn) {
      this.params.jukebox.muteAll();
    }
    else {
      this.tryStartBackgroundMusic();
    }
  }

  /**
   * Try start background music.
   * @returns {boolean} True, id audio could be started.
   */
  async tryStartBackgroundMusic() {
    if (this.params.jukebox.audioContext.state === 'suspended') {
      await this.params.jukebox.audioContext.resume();
      this.params.jukebox.unmuteAll();
      return this.params.jukebox.play('backgroundMusic');
    }
    else {
      this.params.jukebox.unmuteAll();
      return this.params.jukebox.play('backgroundMusic');
    }
  }

  /**
   * Handle autoplay of audio.
   */
  async handleAutoplay() {
    if (!this.params.jukebox.getAudioIds().includes('backgroundMusic')) {
      this.toolbar.forceButton('audio', true);
    }

    if (this.autoplayHandlerRunning) {
      return;
    }

    this.autoplayHandlerRunning = true;

    const couldPlay = await this.tryStartBackgroundMusic();
    this.toolbar.forceButton('audio', couldPlay);
  }

  /**
   * Handle timer ticked.
   * @param {number} id Id of exercise that had a timer tick.
   * @param {number} remainingTime Remaining time in ms.
   * @param {object} [options] Options.
   * @param {boolean} [options.timeoutWarning] If true, timeout warning state.
   */
  handleTimerTicked(id, remainingTime, options = {}) {
    if (!id || id !== this.openExerciseId) {
      return;
    }

    this.exerciseScreen.setTime(remainingTime, options);
  }

  /**
   * Handle timeout warning.
   * @param {number} id Id of exercise that is about to time out.
   */
  handleTimeoutWarning(id) {
    if (!id || id !== this.openExerciseId) {
      return;
    }

    this.params.jukebox.play('timeoutWarning');
  }

  /**
   * Handle timeout.
   * @param {number} id Id of exercise that timed out.
   */
  handleTimeout(id) {
    if (!id || id !== this.openExerciseId) {
      return;
    }

    this.handleLostLife();

    if (this.livesLeft > 0) {
      this.handleExerciseScreenClosed({
        animationEndedCallback: () => {
          this.exercises.reset(id);
          this.showTimeoutConfirmation();
        }
      });
    }
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
   * Handle finish.
   */
  showFinishConfirmation() {
    // In solution mode, no dialog and no xAPI necessary
    if (this.isShowingSolutions) {
      this.showEndscreen({ focusButton: true, readOpened: true });
      return;
    }

    const extras = this.params.globals.get('extras');
    extras.isScoringEnabled = true;
    const isScoringEnabled = extras.standalone &&
      (extras.isScoringEnabled || extras.isReportingEnabled);

    const dialogTexts = [
      this.params.dictionary.get('l10n.confirmFinishDialog')
    ];
    if (isScoringEnabled) {
      dialogTexts.push(
        this.params.dictionary.get('l10n.confirmFinishDialogSubmission')
      );
    }
    dialogTexts.push(
      this.params.dictionary.get('l10n.confirmFinishDialogQuestion')
    );

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmFinishHeader'),
        dialogText: dialogTexts.join(' '),
        cancelText: this.params.dictionary.get('l10n.no'),
        confirmText: this.params.dictionary.get('l10n.yes')
      }, {
        onConfirmed: () => {
          this.handleConfirmedFinish();
        },
        onCanceled: () => {
          this.params.jukebox.stopGroup('default');
        }
      }
    );

    this.params.jukebox.stopGroup('default');
    this.confirmationDialog.show();
    this.params.jukebox.play('showDialog');
  }

  /**
   * Handle user confirmed to finish.
   */
  handleConfirmedFinish() {
    this.gameDone = true;
    this.queueAnimation = [];
    this.stages.togglePlayfulness(false);
    this.params.jukebox.stopAll();

    this.callbacks.onFinished();
    this.showEndscreen({ focusButton: true });
  }

  /**
   * Handle game over.
   */
  showGameOverConfirmation() {
    this.gameDone = true;
    this.stages.togglePlayfulness(false);

    this.toolbar.disableButton('finish');

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmGameOverHeader'),
        dialogText: this.params.dictionary.get('l10n.confirmGameOverDialog'),
        confirmText: this.params.dictionary.get('l10n.ok'),
        hideCancel: true
      }, {
        onConfirmed: () => {
          this.params.jukebox.stopAll();
          this.callbacks.onFinished();
          this.showEndscreen({ focusButton: true });
        },
        onCanceled: () => {
          this.toolbar.enableButton('finish');
        }
      }
    );

    this.params.jukebox.stopAll();
    this.params.jukebox.play('gameOver');

    this.confirmationDialog.show();
    this.toolbar.enableButton('finish');
  }

  /**
   * Show timeout confirmation.
   */
  showTimeoutConfirmation() {
    this.toolbar.disableButton('finish');

    const dialogText = (this.livesLeft === Infinity) ?
      this.params.dictionary.get('l10n.confirmTimeoutDialog') :
      this.params.dictionary.get('l10n.confirmTimeoutDialogLostLife');

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmTimeoutHeader'),
        dialogText: dialogText,
        confirmText: this.params.dictionary.get('l10n.ok'),
        hideCancel: true
      }, {
        onConfirmed: () => {
          this.params.jukebox.stopGroup('default');
          this.toolbar.enableButton('finish');
        },
        onCanceled: () => {
          this.params.jukebox.stopGroup('default');
          this.toolbar.enableButton('finish');
        }
      }
    );

    this.confirmationDialog.show();
  }

  /**
   * Show incomplete score confirmation.
   */
  showIncompleteScoreConfirmation() {
    this.toolbar.disableButton('finish');

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmScoreIncompleteHeader'),
        dialogText: this.params.dictionary.get('l10n.confirmIncompleteScoreDialogLostLife'),
        confirmText: this.params.dictionary.get('l10n.ok'),
        hideCancel: true
      }, {
        onConfirmed: () => {
          this.params.jukebox.stopGroup('default');
          this.toolbar.enableButton('finish');
        },
        onCanceled: () => {
          this.params.jukebox.stopGroup('default');
          this.toolbar.enableButton('finish');
        }
      }
    );

    this.confirmationDialog.show();
  }

  /**
   * Show full score confirmation.
   */
  showFullScoreConfirmation() {
    this.toolbar.disableButton('finish');

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmFullScoreHeader'),
        dialogText: this.params.dictionary.get('l10n.confirmFullScoreDialog'),
        confirmText: this.params.dictionary.get('l10n.ok'),
        hideCancel: true
      }, {
        onConfirmed: () => {
          this.params.jukebox.stopGroup('default');
          this.toolbar.enableButton('finish');
        },
        onCanceled: () => {
          this.params.jukebox.stopGroup('default');
          this.toolbar.enableButton('finish');
        }
      }
    );

    this.confirmationDialog.show();
  }
}

/** @constant {number} CONVENIENCE_MARGIN_PX Extra margin for height limit. */
Main.CONVENIENCE_MARGIN_PX = 32;

/** @constant {number} MUSIC_FADE_TIME Music fade time in ms. */
Main.MUSIC_FADE_TIME = 2000;

/** @constant {number} ATTENTION_SEEKER_TIMEOUT_MS Attention seeker timeout. */
Main.ATTENTION_SEEKER_TIMEOUT_MS = 10000;
