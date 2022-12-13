import Util from '@services/util';
import Globals from '@services/globals';
import Dictionary from '@services/dictionary';
import StartScreen from './media-screen/start-screen';

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
    console.log(globalParams);

    if (globalParams.showTitleScreen) {
      this.startScreen = new StartScreen({
        contentId: Globals.get('contentId'),
        introduction: globalParams.titleScreen.titleScreenIntroduction,
        medium: globalParams.titleScreen.titleScreenMedium,
        l10n: { buttonText: 'Start' }
      }, {});
      this.dom.appendChild(this.startScreen.getDOM());
    }
  }

  getDOM() {
    return this.dom;
  }
}
