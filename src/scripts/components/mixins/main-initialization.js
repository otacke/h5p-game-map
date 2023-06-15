import Globals from '@services/globals';
import Jukebox from '@services/jukebox';
import Paths from '@models/paths';
import Stages from '@models/stages';
import StartScreen from '@components/media-screen/start-screen';
import EndScreen from '@components/media-screen/end-screen';
import Map from '@components/map/map';
import Toolbar from '@components/toolbar/toolbar';
import Exercises from '@models/exercises';
import ExerciseScreen from '@components/exercise/exercise-screen';
import ConfirmationDialog from '@components/confirmation-dialog/confirmation-dialog';

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

    const main = Globals.get('mainInstance');
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

    const globalParams = Globals.get('params');

    // Title screen if set
    if (globalParams.showTitleScreen) {
      this.startScreen = new StartScreen({
        id: 'start',
        contentId: Globals.get('contentId'),
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

          if (!Jukebox.isPlaying('backgroundMusic')) {
            this.tryStartBackgroundMusic();
          }
        },
        read: (text) => {
          Globals.get('read')(text);
        }
      });
      this.startScreen.hide();
      this.dom.append(this.startScreen.getDOM());
    }

    const endscreenButtons = [];
    if (globalParams.behaviour.enableSolutionsButton) {
      endscreenButtons.push(
        { id: 'show-solutions', text: this.params.dictionary.get('l10n.showSolutions') }
      );
    }
    if (globalParams.behaviour.enableRetry) {
      endscreenButtons.push(
        { id: 'restart', text: this.params.dictionary.get('l10n.restart') }
      );
    }

    // End screen
    this.endScreen = new EndScreen({
      id: 'end',
      contentId: Globals.get('contentId'),
      buttons: endscreenButtons,
      a11y: {
        screenOpened: this.params.dictionary.get('a11y.endScreenWasOpened')
      }
    }, {
      onButtonClicked: (id) => {
        if (id === 'restart') {
          this.reset();
          this.start();
        }
        else if (id === 'show-solutions') {
          this.showSolutions();

          Globals.get('read')(this.params.dictionary.get('a11y.mapSolutionsWasOpened'));
          window.setTimeout(() => {
            this.toolbar.focus();
          }, 100);
        }
      },
      read: (text) => {
        Globals.get('read')(text);
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
      { id: 'lives' },
      { id: 'stages', hasMaxValue: true },
      { id: 'score', hasMaxValue: true }
    ];

    // Set up toolbar's buttons
    const toolbarButtons = [];

    if (Jukebox.getAudioIds().length) {
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

    if (Globals.get('isFullscreenSupported')) {
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
      statusContainers: toolbarStatusContainers
    });
    this.contentDOM.append(this.toolbar.getDOM());

    // Map incl. models
    const backgroundImage = H5P.getPath(
      globalParams?.gamemapSteps?.backgroundImageSettings?.backgroundImage
        ?.path ?? '',
      Globals.get('contentId')
    );

    // Stages
    this.stages = new Stages(
      {
        dictionary: this.params.dictionary,
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
        }
      }
    );

    // Paths
    this.paths = new Paths(
      {
        elements: globalParams.gamemapSteps.gamemap.elements,
        visuals: globalParams.visual.paths.style
      }
    );

    // Map
    this.map = new Map(
      {
        dictionary: this.params.dictionary,
        backgroundImage: backgroundImage,
        paths: this.paths,
        stages: this.stages
      },
      {
        onImageLoaded: () => {
          // Resize when image is loaded
          Globals.get('resize')();

          // Resize when image resize is done
          window.requestAnimationFrame(() => {
            Globals.get('resize')();
          });
        }
      }
    );
    this.contentDOM.append(this.map.getDOM());

    // Exercise
    this.exercises = new Exercises(
      {
        elements: globalParams.gamemapSteps.gamemap.elements
      },
      {
        onStateChanged: (id, state) => {
          this.handleExerciseStateChanged(id, state);
        },
        onScoreChanged: (id, scoreParams) => {
          this.handleExerciseScoreChanged(id, scoreParams);
        },
        onTimerTicked: (id, remainingTime) => {
          this.handleExerciseTimerTicked(id, remainingTime);
        },
        onTimeoutWarning: (id) => {
          this.handleExerciseTimeoutWarning(id);
        },
        onTimeout: (id) => {
          this.handleExerciseTimeout(id);
        }
      }
    );

    this.exerciseScreen = new ExerciseScreen(
      {
        dictionary: this.params.dictionary
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
    this.confirmationDialog = new ConfirmationDialog();
    document.body.append(this.confirmationDialog.getDOM());
  }

  /**
   * Handle visibility change.
   */
  startVisibilityObserver() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.unmuteWhenVisible = !Jukebox.isMuted('backgroundMusic');
        Jukebox.muteAll();
      }
      else {
        if (this.unmuteWhenVisible === true) {
          Jukebox.unmuteAll();
          Jukebox.play('backgroundMusic');
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
    Jukebox.muteAll();
    this.stageAttentionSeekerTimeout = null;

    const globalParams = Globals.get('params');
    const previousState = Globals.get('extras')?.previousState?.content ?? {};

    if (params.isInitial && typeof previousState.livesLeft === 'number') {
      this.livesLeft = previousState.livesLeft;
    }
    else {
      this.livesLeft = globalParams.behaviour.lives ?? Infinity;
    }

    if (this.livesLeft === 0) {
      this.stages.forEach((stage) => {
        stage.setState('sealed');
      });
    }

    this.gameDone = false;
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
    this.exercises.resetAll({ isInitial: params.isInitial });

    // Set start state stages
    if (globalParams.behaviour.map.roaming === 'free') {
      this.stages.forEach((stage) => {
        stage.setState('open');
      });
      this.paths.forEach((path) => {
        path.setState('cleared');
        path.show();
      });
    }

    this.stages.setStartStages();

    // Initialize lives
    this.toolbar.setStatusContainerStatus(
      'lives', { value: this.livesLeft }
    );

    // Initialize stage counter
    const filters = {
      state: [
        Globals.get('states')['completed'],
        Globals.get('states')['cleared']
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

    // When *re*starting the map, keep audio on/off as set by user.
    this.isAudioOn = this.isAudioOn ?? false;

    if (this.isAudioOn) {
      Jukebox.unmuteAll();
      Jukebox.play('backgroundMusic');
    }
  }
}
