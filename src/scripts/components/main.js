import CallbackQueue from '@services/callback-queue.js';
import TIMER_STATES from '@services/timer.js';
import Util from '@services/util.js';
import MainAudio from './mixins/main-audio.js';
import MainInitialization from './mixins/main-initialization.js';
import MainHandlersStage from './mixins/main-handlers-stage.js';
import MainHandlersExercise from './mixins/main-handlers-exercise.js';
import MainHandlersExerciseScreen from './mixins/main-handlers-exercise-screen.js';
import MainQuestionTypeContract from './mixins/main-question-type-contract.js';
import MainTimer from './mixins/main-timer.js';
import MainUserConfirmation from './mixins/main-user-confirmation.js';
import './main.scss';

/** @constant {number} FOCUS_DELAY_MS Delay before focus is set. */
const FOCUS_DELAY_MS = 100;

/** @constant {number} CONVENIENCE_MARGIN_PX Extra margin for height limit. */
const CONVENIENCE_MARGIN_PX = 32;

/** @constant {number} MUSIC_FADE_TIME_MS Music fade time in ms. */
const MUSIC_FADE_TIME_MS = 2000;

/** @constant {number} ATTENTION_SEEKER_TIMEOUT_MS Attention seeker timeout. */
const ATTENTION_SEEKER_TIMEOUT_MS = 10000;

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
   * @param {function} [callbacks.onFullscreenClicked] Called when fullscreen is clicked.
   * @param {function} [callbacks.onRestarted] Called when content is restarted.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.gameDone = false;

    this.callbackQueue = new CallbackQueue();

    // Without animations requested, schedule whole queue for same time
    this.callbackQueue.setRespectsDelay(
      this.params.globals.get('params').visual.misc.useAnimation
    );

    Util.addMixins(
      Main,
      [
        MainAudio,
        MainInitialization,
        MainHandlersStage,
        MainHandlersExercise,
        MainHandlersExerciseScreen,
        MainQuestionTypeContract,
        MainTimer,
        MainUserConfirmation
      ]
    );

    this.callbacks = Util.extend({
      onProgressChanged: () => {},
      onFinished: () => {},
      onFullscreenClicked: () => {},
      onRestarted: () => {}
    }, callbacks);

    this.params.globals.set('getScore', () => {
      return this.getScore();
    });

    this.musicFadeTime = MUSIC_FADE_TIME_MS;

    this.buildDOM();
    this.startVisibilityObserver();

    this.initializeTimer();

    this.reset({ isInitial: true });

    if (this.params.globals.get('params').behaviour.timeLimitGlobal) {
      this.toolbar.showStatusContainer('timer');
    }

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

      if (this.gameDone) {
        this.showEndscreen();
      }
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
   * Set timer state
   */
  setTimerState() {
    if (this.timer) {
      const timerState = this.timer.getState();
      if (timerState === TIMER_STATES.PAUSED) {
        this.timer.resume();
      }
      else if (timerState === TIMER_STATES.ENDED && !this.gameDone) {
        this.timer.start();
      }
    }
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

    this.setTimerState();

    if (params.readOpened) {
      this.params.globals.get('read')(
        this.params.dictionary.get('a11y.mapWasOpened')
      );
    }

    window.setTimeout(() => {
      if (params.focusButton) {
        this.toolbar.focus();
      }
    }, FOCUS_DELAY_MS);

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
    this.timer?.pause();

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
    }, ATTENTION_SEEKER_TIMEOUT_MS);
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
   * Show end screen success.
   * @param {object} endscreenParams Endscreen parameters.
   * @param {string} defaultTitle Default title.
   */
  showEndscreenSuccess(endscreenParams, defaultTitle) {
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

  /**
   * Show end screen no success.
   * @param {object} endscreenParams Endscreen parameters.
   * @param {string} defaultTitle Default title.
   * @param {number} score Score.
   * @param {number} maxScore Maximum score.
   */
  showEndscreenNoSuccess(endscreenParams, defaultTitle, score, maxScore) {
    const noSuccess = endscreenParams.noSuccess;
    this.endScreen.setMedium(noSuccess.endScreenMediumNoSuccess);

    let html = '';
    if (this.livesLeft === 0 && score >= maxScore) {
      html = `${html}<p style="text-align: center;">${this.params.dictionary.get('l10n.fullScoreButnoLivesLeft')}</p>`;
    }
    else if (this.timer?.getTime() === 0 && score >= maxScore) {
      html = `${html}<p style="text-align: center;">${this.params.dictionary.get('l10n.fullScoreButTimeout')}</p>`;
    }
    else {
      html = Util.isHTMLWidgetFilled(noSuccess.endScreenTextNoSuccess) ?
        noSuccess.endScreenTextNoSuccess :
        defaultTitle;
    }

    this.endScreen.setIntroduction(html);
    if (!this.isShowingSolutions) {
      this.params.jukebox.play('endscreenNoSuccess');
    }
  }

  /**
   * Show end screen.
   * @param {object} params Parameters.
   * @param {boolean} [params.focusButton] If true, start button will get focus.
   * @param {boolean} [params.readOpened] If true, announce screen was opened.
   */
  showEndscreen(params = {}) {
    this.hasUserMadeProgress = true;

    const endscreenParams = this.params.globals.get('params').endScreen;
    this.toolbar.toggleHintFinishButton(false);
    this.toolbar.toggleHintTimer(false);

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

    const defaultTitle =
      `<p style="text-align: center;">${this.params.dictionary.get('l10n.completedMap')}</p>`;

    if (
      score >= maxScore &&
      this.livesLeft > 0 &&
      (typeof this.timeLeft !== 'number' || this.timeLeft > 0)
    ) {
      this.showEndscreenSuccess(
        endscreenParams, defaultTitle
      );
    }
    else {
      this.showEndscreenNoSuccess(
        endscreenParams, defaultTitle, score, maxScore
      );
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
}
