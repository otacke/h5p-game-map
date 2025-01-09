import Paths from '@models/paths.js';
import Stages from '@models/stages.js';
import StartScreen from '@components/media-screen/start-screen.js';
import EndScreen from '@components/media-screen/end-screen.js';
import Map from '@components/map/map.js';
import Toolbar from '@components/toolbar/toolbar.js';
import ExerciseBundles from '@models/exercise-bundles.js';
import ConfirmationDialog from '@components/confirmation-dialog/confirmation-dialog.js';
import ExerciseDialog from '@components/overlay-dialogs/exercise-dialog.js';
import SettingsDialog from '@components/overlay-dialogs/settings-dialog.js';

/** @constant {number} MS_IN_S Milliseconds in a second. */
const MS_IN_S = 1000;

/** @constant {number} DEFAULT_READ_DELAY_MS Delay before reading was triggered. */
const DEFAULT_READ_DELAY_MS = 100;

/**
 * Mixin containing main init stuff.
 */
export default class MainInitialization {
  /**
   * Grab H5P.Question feedback and scorebar.
   * H5P.Question already handles scores nicely, no need to recreate all that.
   * Issue here: We can relocate the DOMs for feedback and scorbar, but those
   * are created after setting feedback the first time only. It's also
   * required to set the maximum score now. Cannot be changed later.
   * @param {object} [params] Parameters.
   * @param {number} [params.maxScore] Maximum score possible.
   * @returns {HTMLElement|null} Wrapper with H5P.Question feedback.
   */
  grabH5PQuestionFeedback(params = {}) {
    const content = this.dom.closest('.h5p-question-content');
    if (!content) {
      return null;
    }

    const container = content.parentNode;
    if (!container) {
      return null;
    }

    const main = this.params.globals.get('mainInstance');
    main.setFeedback('', 0, params.maxScore);

    const feedbackWrapper = document.createElement('div');
    feedbackWrapper.classList.add('h5p-game-map-feedback-wrapper');

    const feedback = container.querySelector('.h5p-question-feedback');
    if (feedback) {
      feedbackWrapper.append(feedback.parentNode.removeChild(feedback));
    }

    const scorebar = container.querySelector('.h5p-question-scorebar');
    if (scorebar) {
      feedbackWrapper.append(scorebar.parentNode.removeChild(scorebar));
      // Keeping attached to prevent potential issues when missing
      if (params.maxScore === 0) {
        scorebar.classList.add('display-none');
      }
    }

    main.removeFeedback();

    return feedbackWrapper;
  }

  /**
   * Build the DOM.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-container');

    const globalParams = this.params.globals.get('params');

    // Title screen if set
    if (globalParams.showTitleScreen) {
      this.startScreen = new StartScreen({
        id: 'start',
        contentId: this.params.globals.get('contentId'),
        introduction: globalParams.titleScreen.titleScreenIntroduction,
        medium: globalParams.titleScreen.titleScreenMedium,
        buttons: [
          { id: 'start', text: this.params.dictionary.get('l10n.start') }
        ],
        a11y: {
          screenOpened: this.params.dictionary.get('a11y.startScreenWasOpened')
        }
      }, {
        onButtonClicked: () => {
          this.show({ focusButton: true, readOpened: true });
        },
        read: (text) => {
          this.params.globals.get('read')(text);
        }
      });
      this.startScreen.hide();
      this.dom.append(this.startScreen.getDOM());
    }

    const endscreenButtons = [];
    if (globalParams.behaviour.enableSolutionsButton) {
      endscreenButtons.push(
        {
          id: 'show-solutions',
          text: this.params.dictionary.get('l10n.showSolutions'),
          className: 'h5p-joubelui-button'
        }
      );
    }
    if (globalParams.behaviour.enableRetry) {
      endscreenButtons.push(
        {
          id: 'restart',
          text: this.params.dictionary.get('l10n.restart'),
          className: 'h5p-joubelui-button'
        }
      );
    }

    // End screen
    this.endScreen = new EndScreen({
      id: 'end',
      contentId: this.params.globals.get('contentId'),
      buttons: endscreenButtons,
      a11y: {
        screenOpened: this.params.dictionary.get('a11y.endScreenWasOpened')
      }
    }, {
      onButtonClicked: (id) => {
        if (id === 'restart') {
          this.callbacks.onRestarted();
        }
        else if (id === 'show-solutions') {
          this.showSolutions();

          this.params.globals.get('read')(
            this.params.dictionary.get('a11y.mapSolutionsWasOpened')
          );
          window.setTimeout(() => {
            this.toolbar.focus();
          }, DEFAULT_READ_DELAY_MS);
        }
      },
      read: (text) => {
        this.params.globals.get('read')(text);
      }
    });
    this.endScreen.hide();
    this.dom.append(this.endScreen.getDOM());

    // Content incl. tool/statusbar and map
    this.contentDOM = document.createElement('div');
    this.contentDOM.classList.add('h5p-game-map-main');
    this.dom.append(this.contentDOM);

    // Set up toolbar's status containers
    const toolbarStatusContainers = [
      { id: 'timer' },
      { id: 'lives' },
      { id: 'stages', hasMaxValue: true },
      { id: 'score', hasMaxValue: true }
    ];

    // Set up toolbar's buttons
    const toolbarButtons = [];

    if (this.params.jukebox.getAudioIds().length) {
      toolbarButtons.push({
        id: 'audio',
        type: 'toggle',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonAudioActive'),
          inactive: this.params.dictionary.get('a11y.buttonAudioInactive')
        },
        onClick: (ignore, params) => {
          this.toggleAudio(params.active);
        }
      });

      toolbarButtons.push({
        id: 'settings',
        type: 'toggle',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonSettingsActive'),
          inactive: this.params.dictionary.get('a11y.buttonSettingsInactive')
        },
        onClick: (ignore, params) => {
          if (params.active) {
            this.settingsDialog.show();
            this.toolbar.disable();
          }
          else {
            this.settingsDialog.hide();
            this.toolbar.enable();
          }
        }
      });
    }

    toolbarButtons.push({
      id: 'finish',
      type: 'pulse',
      a11y: {
        active: this.params.dictionary.get('a11y.buttonFinish')
      },
      onClick: () => {
        this.showFinishConfirmation();
      }
    });

    if (this.params.globals.get('isFullscreenSupported')) {
      toolbarButtons.push({
        id: 'fullscreen',
        type: 'pulse',
        pulseStates: [
          {
            id: 'enter-fullscreen',
            label: this.params.dictionary.get('a11y.enterFullscreen')
          },
          {
            id: 'exit-fullscreen',
            label: this.params.dictionary.get('a11y.exitFullscreen')
          }
        ],
        onClick: () => {
          this.callbacks.onFullscreenClicked();
        }
      });
    }

    // Toolbar
    this.toolbar = new Toolbar({
      dictionary: this.params.dictionary,
      ...(globalParams.headline && { headline: globalParams.headline }),
      buttons: toolbarButtons,
      statusContainers: toolbarStatusContainers,
      useAnimation: globalParams.visual.misc.useAnimation
    });
    this.contentDOM.append(this.toolbar.getDOM());

    // Map incl. models
    let backgroundImage;
    if (globalParams?.gamemapSteps?.backgroundImageSettings?.backgroundImage) {
      backgroundImage = H5P.getPath(
        globalParams.gamemapSteps.backgroundImageSettings.backgroundImage.path ?? '',
        this.params.globals.get('contentId')
      );
    }

    // Stages
    this.stages = new Stages(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        jukebox: this.params.jukebox,
        elements: globalParams.gamemapSteps.gamemap.elements,
        visuals: globalParams.visual.stages
      },
      {
        onStageClicked: (id, state) => {
          this.handleStageClicked(id, state);
        },
        onStageStateChanged: (id, state) => {
          this.handleStageStateChanged(id, state);
        },
        onFocused: () => {
          this.handleStageFocused();
        },
        onBecameActiveDescendant: (id) => {
          this.handleStageBecameActiveDescendant(id);
        },
        onAddedToQueue: (callback, params) => {
          this.handleStageAddedToQueue(callback, params);
        },
        onAccessRestrictionsHit: (params) => {
          this.handleStageAccessRestrictionsHit(params);
        },
        getStageScore: (id) => {
          return this.exerciseBundles.getExerciseBundle(id).getScore();
        }
      }
    );

    // Paths
    this.paths = new Paths(
      {
        globals: this.params.globals,
        elements: globalParams.gamemapSteps.gamemap.elements,
        visuals: globalParams.visual.paths.style
      }
    );

    // Map
    this.map = new Map(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        backgroundImage: backgroundImage,
        backgroundColor: globalParams?.gamemapSteps?.backgroundImageSettings?.backgroundColor,
        paths: this.paths,
        stages: this.stages
      },
      {
        onImageLoaded: () => {
          // Resize when image is loaded
          this.params.globals.get('resize')();

          // Resize when image resize is done
          window.requestAnimationFrame(() => {
            this.params.globals.get('resize')();
          });
        }
      }
    );
    this.contentDOM.append(this.map.getDOM());

    // Exercise bundles
    this.exerciseBundles = new ExerciseBundles(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        jukebox: this.params.jukebox,
        elements: globalParams.gamemapSteps.gamemap.elements
      },
      {
        onStateChanged: (id, state) => {
          this.handleExerciseStateChanged(id, state);
        },
        onScoreChanged: (id, scoreParams) => {
          this.handleExerciseScoreChanged(id, scoreParams);
        },
        onTimerTicked: (id, remainingTime, options) => {
          this.handleExerciseTimerTicked(id, remainingTime, options);
        },
        onTimeoutWarning: (id) => {
          this.handleExerciseTimeoutWarning(id);
        },
        onTimeout: (id) => {
          this.handleExerciseTimeout(id);
        },
        onContinued: () => {
          this.handleExerciseScreenClosed();
        },
        onBundleInitialized: (id, params) => {
          this.handleExerciseBundleInitialized(id, params);
        }
      }
    );

    this.exerciseScreen = new ExerciseDialog(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        cssMainSelector: 'exercise',
      },
      {
        onClosed: () => {
          this.handleExerciseScreenClosed();
        },
        onOpenAnimationEnded: () => {
          this.handleExerciseScreenOpenAnimationEnded();
        },
        onCloseAnimationEnded: () => {
          this.handleExerciseScreenCloseAnimationEnded();
        }
      }
    );
    this.exerciseScreen.hide();
    this.toolbar.enable();
    this.map.getDOM().append(this.exerciseScreen.getDOM());

    // Confirmation Dialog
    this.confirmationDialog = new ConfirmationDialog({
      globals: this.params.globals
    });

    /*
     * It's important to not simply append the dialog to the document.body, or
     * the dialog will not be shown when the user is in fullscreen mode and the
     * content is embedded.
     */
    this.dom.append(this.confirmationDialog.getDOM());

    this.settingsDialog = new SettingsDialog(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        cssMainSelector: 'settings',
        values: {
          volumeMusic: this.params.jukebox.getVolumeGroup('background'),
          volumeSFX: this.params.jukebox.getVolumeGroup('default')
        }
      },
      {
        onClosed: () => {
          this.handleSettingsDialogClosed();
        },
        onOpenAnimationEnded: () => {
          this.handleSettingsDialogOpenAnimationEnded();
        },
        onValueChanged: (id, value) => {
          this.handleSettingsDialogValueChanged(id, value);
        }
      }
    );
    this.settingsDialog.hide();
    this.dom.append(this.settingsDialog.getDOM());
  }

  /**
   * Handle visibility change.
   */
  startVisibilityObserver() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.unmuteWhenVisible =
          !this.params.jukebox.isMuted('backgroundMusic');
        this.params.jukebox.muteAll();
      }
      else {
        if (this.unmuteWhenVisible === true) {
          this.params.jukebox.unmuteAll();
          this.params.jukebox.play('backgroundMusic');
        }
      }
    });
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    this.toolbar.toggleHintFinishButton(false);
    this.toolbar.toggleHintTimer(false);

    this.stages.updateScoreStar('*', 0);

    this.params.jukebox.muteAll();
    this.stageAttentionSeekerTimeout = null;
    this.hasUserMadeProgress = false;

    const globalParams = this.params.globals.get('params');
    const previousState =
      this.params.globals.get('extras')?.previousState?.content ?? {};

    if (params.isInitial && typeof previousState.livesLeft === 'number') {
      this.livesLeft = previousState.livesLeft;
    }
    else {
      this.livesLeft = globalParams.behaviour.lives ?? Infinity;
    }

    if (params.isInitial && typeof previousState.timeLeft === 'number') {
      this.resetTimer(previousState.timeLeft);
    }
    else if (typeof this.params.globals.get('params').behaviour.timeLimitGlobal === 'number') {
      this.resetTimer(this.params.globals.get('params').behaviour.timeLimitGlobal * MS_IN_S);
    }

    if (this.livesLeft === 0) {
      this.stages.forEach((stage) => {
        stage.setState('sealed');
      });
    }

    this.gameDone = params.isInitial ?
      previousState.gameDone ?? false :
      false;

    this.stages.togglePlayfulness(true);

    this.stagesGameOverState = [];

    this.currentStageIndex = 0;
    this.confirmationDialog.hide();

    this.fullScoreWasAnnounced = false;
    this.openExerciseId = false;
    this.callbackQueue.setSkippable(true);

    this.queueAnimation = [];
    this.scheduledAnimations = [];

    if (!params.isInitial) {
      this.isShowingSolutions = false;
    }

    this.toolbar.toggleSolutionMode(false);

    this.paths.reset({ isInitial: params.isInitial });
    this.stages.reset({ isInitial: params.isInitial });
    this.exerciseBundles.resetAll({ isInitial: params.isInitial });

    // Show everything if fog is deactivated
    if (globalParams.behaviour.map.fog === 'all') {
      this.stages.forEach((stage) => {
        stage.show();
      });
      this.paths.forEach((path) => {
        path.show();
      });
    }

    // Set start state stages
    if (globalParams.behaviour.map.roaming === 'free') {
      this.stages.forEach((stage) => {
        if (stage.passesRestrictions()) {
          stage.setState('open');
        }
      });
      this.paths.forEach((path) => {
        path.setState('cleared');
        path.show();
      });
    }

    const reachableStageIds = this.stages.setStartStages();

    this.stages.updateReachability(reachableStageIds);
    this.paths.updateReachability(reachableStageIds);
    this.exerciseBundles.updateReachability(reachableStageIds);

    // Initialize lives
    this.toolbar.setStatusContainerStatus(
      'lives', { value: this.livesLeft }
    );

    // Initialize stage counter
    const filters = {
      state: [
        this.params.globals.get('states').completed,
        this.params.globals.get('states').cleared
      ]
    };

    // Initialize stages
    this.toolbar.setStatusContainerStatus(
      'stages',
      {
        value: this.stages.getCount({ filters: filters }),
        maxValue: this.stages.getCount()
      }
    );

    // Initialize score
    this.toolbar.setStatusContainerStatus(
      'score',
      {
        value: this.getScore(),
        maxValue: this.getMaxScore()
      }
    );

    if (this.getScore() >= this.getMaxScore()) {
      this.fullScoreWasAnnounced = true;
      this.toolbar.toggleHintFinishButton(true);
    }

    // When *re*starting the map, keep audio on/off as set by user.
    this.isAudioOn = this.isAudioOn ?? false;

    if (this.isAudioOn) {
      this.params.jukebox.unmuteAll();
      this.params.jukebox.play('backgroundMusic');
    }

    this.stages.updateStatePerRestrictions();
  }
}
