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
    const contentDOM = document.createElement('div');
    contentDOM.classList.add('h5p-game-map-content');
    this.dom.append(contentDOM);

    // Toolbar
    const toolbar = new Toolbar({
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
    contentDOM.append(toolbar.getDOM());

    // Map incl. models
    const backgroundImage = H5P.getPath(
      globalParams?.gamemapSteps?.backgroundImageSettings?.backgroundImage
        ?.path ?? '',
      Globals.get('contentId')
    );

    // Paths
    this.paths = new Paths({
      elements: globalParams.gamemapSteps.gamemap.elements,
      visuals: globalParams.visual.paths
    });

    // Stages
    this.stages = new Stages(
      {
        elements: globalParams.gamemapSteps.gamemap.elements,
        visuals: globalParams.visual.stages
      },
      {
        onStageClicked: (id) => {
          this.handleStageClicked(id);
        }
      }
    );

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
    contentDOM.append(this.map.getDOM());

    // Exercise
    this.exercises = new Exercises({
      elements: globalParams.gamemapSteps.gamemap.elements
    });

    this.exerciseScreen = new ExerciseScreen();
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

    this.paths.update({ mapSize: this.map.getSize() });
  }

  /**
   * Handle stage clicked.
   *
   * @param {string} id Id of stage that was clicked on.
   */
  handleStageClicked(id) {
    const exercise = this.exercises.getExercise(id);

    this.exerciseScreen.setH5PContent(exercise.getDOM());

    window.requestAnimationFrame(() => {
      Globals.get('resize')();
    });
  }
}
