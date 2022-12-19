import Util from '@services/util';
import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
import Content from '@components/content';
import '@styles/h5p-game-map.scss';

export default class GameMap extends H5P.Question {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('game-map');

    // Sanitize parameters
    this.params = Util.extend({
      sample: true,
      visual: {
        misc: {
          heightLimitMode: 'none'
        }
      },
      behaviour: {
        showLabels: true,
        roaming: 'free',
        displayPaths: true,
        fog: false,
        startStages: 'all'
      },
      l10n: {
        start: 'Start',
        restart: 'Restart',
        completedMap: 'You have completed the map!',
        confirmFinishHeader: 'Finish map?',
        confirmFinishDialog: 'If you finish now, you will not be able to explore the map any longer. Do you really want to finish the map?',
        no: 'No',
        yes: 'Yes'
      },
      a11y: {
        buttonFinish: 'Finish',
        buttonFinishDisabled: 'Finishing is currently not possible',
        close: 'Close',
        yourResult: 'You got @score out of @total points'
      }
    }, params);

    this.contentId = contentId;
    this.extras = extras;

    Globals.set('mainInstance', this);
    Globals.set('contentId', this.contentId);
    Globals.set('params', this.params);
    Globals.set(
      'states', { unstarted: 0, locked: 1, open: 2, opened: 3, completed: 4, cleared: 5 }
    );
    Globals.set('resize', () => {
      this.trigger('resize');
    });

    // Fill dictionary
    Dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.previousState = extras?.previousState || {};

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.dom = this.buildDOM();

    this.content = new Content({}, {});
    this.dom.appendChild(this.content.getDOM());

    this.on('resize', () => {
      this.content.resize();
    });
  }

  /**
   * Attach to wrapper.
   */
  registerDomElements() {
    this.setContent(this.dom);
  }

  /**
   * Build main DOM.
   *
   * @returns {HTMLElement} Main DOM.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-game-map');

    return dom;
  }

  /**
   * Get task title.
   *
   * @returns {string} Title.
   */
  getTitle() {
    // H5P Core function: createTitle
    return H5P.createTitle(
      this.extras?.metadata?.title || GameMap.DEFAULT_DESCRIPTION
    );
  }

  /**
   * Get description.
   *
   * @returns {string} Description.
   */
  getDescription() {
    return GameMap.DEFAULT_DESCRIPTION;
  }
}

/** @constant {string} Default description */
GameMap.DEFAULT_DESCRIPTION = 'Game Map';
