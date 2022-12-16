import Util from '@services/util';
import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
import Content from '@components/content';
import '@styles/h5p-game-map.scss';

export default class GameMap extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    // Sanitize parameters
    this.params = Util.extend({
      sample: true,
      behaviour: {
        sample: 'Sample behaviour'
      },
      l10n: {
        sample: 'Sample l10n',
        mediaScreenButtonText: 'Close'
      },
      a11y: {
        buttonRestart: 'Restart',
        buttonRestartDisabled: 'Restarting is currently not possible'
      }
    }, params);

    this.contentId = contentId;
    this.extras = extras;

    Globals.set('mainInstance', this);
    Globals.set('contentId', this.contentId);
    Globals.set('params', this.params);
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
   * Attach library to wrapper.
   *
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    $wrapper.get(0).classList.add('h5p-game-map');
    $wrapper.get(0).appendChild(this.dom);
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
