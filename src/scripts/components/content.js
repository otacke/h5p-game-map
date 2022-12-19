import Dictionary from '@services/dictionary';
import Util from '@services/util';
import Globals from '@services/globals';
import Paths from '@models/paths';
import Stages from '@models/stages';
import StartScreen from './media-screen/start-screen';
import EndScreen from './media-screen/end-screen';
import Map from '@components/map/map';
import Toolbar from '@components/toolbar/toolbar';
import Exercises from '@models/exercises';
import ExerciseScreen from '@components/exercise/exercise-screen';
import ConfirmationDialog from '@components/confirmation-dialog/confirmation-dialog';
import './content.scss';

/** Class representing a madia screen */
export default class Content {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    Globals.set('getScore', () => {
      return this.getScore();
    });

    this.buildDOM();

    this.reset();

    if (this.getMaxScore() > 0) {
      this.toolbar.showScores();
    }

    this.start();

    // Reattach H5P.Question buttons and scorebar to endscreen
    H5P.externalDispatcher.on('initialized', () => {
      const feedbackWrapper = this.grabH5PQuestionFeedback({
        maxScore: this.getMaxScore()
      });

      this.endScreen.setContent(feedbackWrapper);
    });
  }

  /**
   * Grab H5P.Question feedback and scorebar.
   * H5P.Question already handles scores nicely, no need to recreate all that.
   * Issue here: We can relocate the DOMs for feedback and scorbar, but those
   * are created after setting feedback the first time only. It's also
   * required to set the maximum score now. Cannot be changed later.
   *
   * @param {object} [params={}] Parameters.
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
        l10n: { buttonText: Dictionary.get('l10n.start') }
      }, {
        onButtonClicked: () => {
          this.show();
        }
      });
      this.startScreen.hide();
      this.dom.append(this.startScreen.getDOM());
    }

    // End screen
    this.endScreen = new EndScreen({
      id: 'end',
      contentId: Globals.get('contentId'),
      l10n: { buttonText: Dictionary.get('l10n.restart') }
    }, {
      onButtonClicked: () => {
        this.reset();
        this.start();
      }
    });
    this.endScreen.hide();
    this.dom.append(this.endScreen.getDOM());

    // Content incl. tool/statusbar and map
    this.contentDOM = document.createElement('div');
    this.contentDOM.classList.add('h5p-game-map-content');
    this.dom.append(this.contentDOM);

    // Toolbar
    this.toolbar = new Toolbar({
      buttons: [
        {
          id: 'finish',
          type: 'pulse',
          a11y: {
            active: Dictionary.get('a11y.buttonFinish'),
            disabled: Dictionary.get('a11y.buttonFinishDisabled')
          },
          onClick: () => {
            this.handleFinish();
          }
        }
      ]
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
        elements: globalParams.gamemapSteps.gamemap.elements,
        visuals: globalParams.visual.stages,
        hidden: globalParams.behaviour.fog !== 'all'
      },
      {
        onStageClicked: (id) => {
          this.handleStageClicked(id);
        },
        onStageStateChanged: (id, state) => {
          this.handleStageStateChanged(id, state);
        }
      }
    );

    // Paths
    const pathsHidden = (globalParams.behaviour.displayPaths === false) ||
      globalParams.behaviour.fog !== 'all';

    this.paths = new Paths({
      elements: globalParams.gamemapSteps.gamemap.elements,
      visuals: globalParams.visual.paths,
      hidden: pathsHidden
    });

    // Map
    this.map = new Map(
      {
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
        onScoreChanged: (id, state) => {
          this.handleExerciseScoreChanged(id, state);
        }
      }
    );

    this.exerciseScreen = new ExerciseScreen({}, {
      onClicked: () => {
        this.exerciseScreen.hide();
      }
    });
    this.exerciseScreen.hide();
    this.dom.append(this.exerciseScreen.getDOM());

    // Confirmation Dialog
    this.confirmationDialog = new ConfirmationDialog();
    document.body.append(this.confirmationDialog.getDOM());
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   */
  show() {
    this.contentDOM.classList.remove('display-none');
    Globals.get('resize')();
  }

  /**
   * Hide.
   */
  hide() {
    this.contentDOM.classList.add('display-none');
  }

  /**
   * Resize.
   */
  resize() {
    const mapSize = this.map.getSize();
    if (!mapSize || mapSize.width === 0 || mapSize.height === 0) {
      return;
    }

    const paramsMisc = Globals.get('params').visual.misc;
    if (paramsMisc.heightLimitMode === 'auto') {
      // Try to compute maximum visible height
      const displayLimits = Util.computeDisplayLimits(this.dom);
      if (!displayLimits?.height) {
        return;
      }

      this.limitMapHeight(displayLimits.height);
    }
    else if (
      paramsMisc.heightLimitMode === 'custom' &&
      typeof paramsMisc.heightLimit === 'number' &&
      paramsMisc.heightLimit > 200
    ) {
      this.limitMapHeight(paramsMisc.heightLimit);
    }

    this.map.resize();
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.paths.update({ mapSize: this.map.getSize() });
    }, 0);
  }

  /**
   * Limit map height
   *
   * @param {number} maxHeight Maximum wanted height.
   */
  limitMapHeight(maxHeight) {
    // Reset to get intrinsic height
    this.map.setMaxHeight();

    // Height of content
    const contentHeight = this.contentDOM.getBoundingClientRect().height;

    // Margin around content
    const contentStyle = window.getComputedStyle(this.contentDOM);
    const contentMargin =
      parseFloat(contentStyle.getPropertyValue('margin-top')) +
      parseFloat(contentStyle.getPropertyValue('margin-bottom'));

    // Toolbar height
    const toolbarStyle = window.getComputedStyle(this.toolbar.getDOM());
    const toolbarHeight = this.toolbar.getDOM().getBoundingClientRect().height +
      parseFloat(toolbarStyle.getPropertyValue('margin-top')) +
      parseFloat(toolbarStyle.getPropertyValue('margin-bottom'));

    /*
     * If maximum set height for all display is not sufficient, limit map height
     */
    if (maxHeight - contentMargin < contentHeight) {
      this.map.setMaxHeight(
        maxHeight - contentMargin - toolbarHeight -
        Content.CONVENIENCE_MARGIN_PX
      );
    }
  }

  /**
   * Handle stage clicked.
   *
   * @param {string} id Id of stage that was clicked on.
   */
  handleStageClicked(id) {
    const exercise = this.exercises.getExercise(id);

    this.exerciseScreen.setH5PContent(exercise.getDOM());
    this.exerciseScreen.show();

    window.requestAnimationFrame(() => {
      Globals.get('resize')();
    });
  }

  /**
   * Handle exercise state changed.
   *
   * @param {string} id Id of exercise that was changed.
   * @param {number} state State code.
   */
  handleExerciseStateChanged(id, state) {
    this.stages.updateState(id, state);
  }

  /**
   * Handle stage state changed.
   *
   * @param {string} id Id of exercise that was changed.
   * @param {number} state State code.
   */
  handleStageStateChanged(id, state) {
    if (this.paths) {
      this.paths.updateState(id, state);
    }

    if (this.stages) {
      this.stages.updateNeighborsState(id, state);
    }
  }

  /**
   * Get score.
   *
   * @returns {number} Score.
   */
  getScore() {
    return Math.min(
      this.exercises.getScore(),
      this.getMaxScore()
    );
  }

  /**
   * Get max score.
   *
   * @returns {number} Max score.
   */
  getMaxScore() {
    const maxScore = this.exercises.getMaxScore();
    const finishScore = Globals.get('params').behaviour.finishScore;

    return Math.min(finishScore, maxScore);
  }

  /**
   * Handle exercise score changed.
   */
  handleExerciseScoreChanged() {
    this.stages.updateUnlockingStages();

    this.toolbar.setScores({
      score: this.getScore(),
      maxScore: this.getMaxScore()
    });
  }

  /**
   * Show end screen.
   */
  showEndscreen() {
    const endscreenParams = Globals.get('params').endScreen;

    // Prepare end screen
    const score = this.getScore();
    const maxScore = this.getMaxScore();

    const textScore = H5P.Question.determineOverallFeedback(
      endscreenParams.overallFeedback, score / maxScore
    );

    // Output via H5P.Question - expects :num and :total
    const ariaMessage = Dictionary.get('a11y.yourResult')
      .replace('@score', ':num')
      .replace('@total', ':total');

    Globals.get('mainInstance').setFeedback(
      textScore,
      score,
      maxScore,
      ariaMessage
    );

    const defaultTitle = `<p style="text-align: center;">${Dictionary.get('l10n.completedMap')}</p>`;

    if (score === maxScore) {
      const success = endscreenParams.success;
      this.endScreen.setMedium(success.endScreenMediumSuccess);

      const html = Util.isHTMLWidgetFilled(success.endScreenTextSuccess) ?
        success.endScreenTextSuccess :
        defaultTitle;

      this.endScreen.setIntroduction(html);
    }
    else {
      const noSuccess = endscreenParams.noSuccess;
      this.endScreen.setMedium(noSuccess.endScreenMediumNoSuccess);

      const html = Util.isHTMLWidgetFilled(noSuccess.endScreenTextNoSuccess) ?
        noSuccess.endScreenTextNoSuccess :
        defaultTitle;

      this.endScreen.setIntroduction(html);
    }

    this.hide();
    this.endScreen.show();
  }

  /**
   * Handle finish.
   */
  handleFinish() {
    this.confirmationDialog.update(
      {
        headerText: Dictionary.get('l10n.confirmFinishHeader'),
        dialogText: Dictionary.get('l10n.confirmFinishDialog'),
        cancelText: Dictionary.get('l10n.no'),
        confirmText: Dictionary.get('l10n.yes')
      }, {
        onConfirmed: () => {
          this.showEndscreen();
        }
      }
    );

    this.confirmationDialog.show();
  }

  /**
   * Reset.
   */
  reset() {
    const globalParams = Globals.get('params');

    this.paths.reset();
    this.stages.reset();
    this.exercises.reset();

    // Set start state stages
    if (globalParams.behaviour.roaming === 'free') {
      this.stages.forEach((stage) => {
        stage.setState('open');
      });
      this.paths.forEach((path) => {
        path.show();
      });
    }
    else if (
      globalParams.behaviour.roaming === 'complete' ||
      globalParams.behaviour.roaming === 'success'
    ) {
      this.stages.unlockStage('settings');
    }

    // Initialize scores
    this.toolbar.setScores({
      score: this.getScore(),
      maxScore: this.getMaxScore()
    });
  }

  /**
   * Start.
   */
  start() {
    this.endScreen.hide();

    if (Globals.get('params').showTitleScreen) {
      this.hide();
      this.startScreen.show();
    }
    else {
      this.show();
    }

    Globals.get('resize')();
  }
}

/** @constant {number} CONVENIENCE_MARGIN_PX Extra margin for height limit */
Content.CONVENIENCE_MARGIN_PX = 32;
