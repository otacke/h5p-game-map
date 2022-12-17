import Dictionary from '@services/dictionary';
import Util from '@services/util';
import Globals from '@services/globals';
import Paths from '@models/paths';
import Stages from '@models/stages';
import StartScreen from './media-screen/start-screen';
import Map from '@components/map/map';
import Toolbar from '@components/toolbar/toolbar';
import Exercises from '@models/exercises';
import ExerciseScreen from '@components/exercise/exercise-screen';
import './content.scss';

/** Class representing a madia screen */
export default class Content {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-container');

    const globalParams = Globals.get('params');

    // Title screen if set
    if (globalParams.showTitleScreen) {
      this.startScreen = new StartScreen({
        contentId: Globals.get('contentId'),
        introduction: globalParams.titleScreen.titleScreenIntroduction,
        medium: globalParams.titleScreen.titleScreenMedium,
        l10n: { buttonText: 'Start' }
      }, {});
      this.dom.append(this.startScreen.getDOM());
    }

    // Content incl. tool/statusbar and map
    this.contentDOM = document.createElement('div');
    this.contentDOM.classList.add('h5p-game-map-content');
    this.dom.append(this.contentDOM);

    // Toolbar
    this.toolbar = new Toolbar({
      buttons: [{
        id: 'restart',
        type: 'pulse',
        a11y: {
          active: Dictionary.get('a11y.buttonRestart'),
          disabled: Dictionary.get('a11y.buttonRestartDisabled')
        },
        onClick: () => {
          // TODO: Handle restart
        }
      }]
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

    // Set start state stages
    if (globalParams.behaviour.roaming === 'free') {
      this.stages.forEach((stage) => {
        stage.setState('open');
      });
    }
    else if (
      globalParams.behaviour.roaming === 'complete' ||
      globalParams.behaviour.roaming === 'success'
    ) {
      this.stages.unlockStage('settings');
    }

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

    if (globalParams.showTitleScreen) {
      this.map.hide();
    }
    this.contentDOM.append(this.map.getDOM());

    // Exercise
    this.exercises = new Exercises(
      {
        elements: globalParams.gamemapSteps.gamemap.elements
      },
      {
        onStateChanged: (id, state) => {
          this.handleExerciseStateChanged(id, state);
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
   * Resize.
   */
  resize() {
    const mapSize = this.map.getSize();
    if (!mapSize || mapSize.width === 0 || mapSize.height === 0) {
      return;
    }

    this.map.resize();

    this.paths.update({ mapSize: this.map.getSize() });

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
}

/** @constant {number} CONVENIENCE_MARGIN_PX Extra margin for height limit */
Content.CONVENIENCE_MARGIN_PX = 32;
