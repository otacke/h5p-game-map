import Util from '@services/util';
import Globals from '@services/globals';
import Paths from '@models/paths';
import Stages from '@models/stages';
import StartScreen from './media-screen/start-screen';
import Map from '@components/map/map';

/** Class representing a madia screen */
export default class Content {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-content');

    const globalParams = Globals.get('params');

    if (globalParams.showTitleScreen) {
      this.startScreen = new StartScreen({
        contentId: Globals.get('contentId'),
        introduction: globalParams.titleScreen.titleScreenIntroduction,
        medium: globalParams.titleScreen.titleScreenMedium,
        l10n: { buttonText: 'Start' }
      }, {});
      this.dom.appendChild(this.startScreen.getDOM());
    }

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

    this.stages = new Stages({
      elements: globalParams.gamemapSteps.gamemap.elements,
      visuals: globalParams.visual.stages
    });

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
    this.dom.appendChild(this.map.getDOM());
  }

  getDOM() {
    return this.dom;
  }

  resize() {
    const mapSize = this.map.getSize();
    if (!mapSize || mapSize.width === 0 || mapSize.height === 0) {
      return;
    }

    this.paths.update({ mapSize: this.map.getSize() });
  }
}
