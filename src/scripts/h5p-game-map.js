import H5PUtil from '@services/h5p-util';
import Util from '@services/util';
import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
import Jukebox from '@services/jukebox';
import Main from '@components/main';
import '@styles/h5p-game-map.scss';
import MessageBox from '@components/messageBox/message-box';
import QuestionTypeContract from '@mixins/question-type-contract';
import XAPI from '@mixins/xapi';

export default class GameMap extends H5P.Question {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('game-map');

    Util.addMixins(
      GameMap, [QuestionTypeContract, XAPI]
    );

    const defaults = Util.extend({
      behaviour: {
        finishScore: Infinity, // Cannot use Infinity in JSON
        enableCheckButton: true // Undocumented Question Type contract setting
      }
    }, H5PUtil.getSemanticsDefaults());

    // Sanitize parameters
    this.params = Util.extend(defaults, params);

    /*
     * All paths are cleared by default in roaming mode, but that's not obvious
     * to the user. Copy color set for path as color for cleared path is hidden
     * in the editor.
     */
    if (this.params.behaviour.roaming === 'free') {
      this.params.visual.paths.style.colorPathCleared =
        this.params.visual.paths.style.colorPath;
    }

    // Determine mediaQuery result for prefers-reduced-motion preference
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )?.matches;

    this.params.visual.misc.useAnimation =
      this.params.visual.misc.useAnimation && !reduceMotion;

    // Sanitize stages
    this.params.gamemapSteps.gamemap.elements =
      this.params.gamemapSteps.gamemap.elements
        .filter((element) => {
          return element.contentType?.library;
        })
        .map((element) => {
          element.animDuration = (this.params.visual.misc.useAnimation) ?
            GameMap.EXERCISE_SCREEN_ANIM_DURATION_MS :
            0;

          return element;
        });

    this.contentId = contentId;
    this.extras = extras;

    const fullScreenSupported = this.isRoot() && H5P.fullscreenSupported;

    // Set globals
    this.globals = new Globals();
    this.globals.set('mainInstance', this);
    this.globals.set('contentId', this.contentId);
    this.globals.set('params', this.params);
    this.globals.set('extras', this.extras);
    this.globals.set('states', GameMap.STATES);
    this.globals.set('isFullscreenSupported', fullScreenSupported);
    this.globals.set('resize', () => {
      this.trigger('resize');
    });
    this.globals.set('read', (text) => {
      this.read(text);
    });

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.jukebox = new Jukebox();
    this.fillJukebox();

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.dom = this.buildDOM();

    if (!this.params.gamemapSteps.backgroundImageSettings?.backgroundImage) {
      const messageBox = new MessageBox({
        text: this.dictionary.get('l10n.noBackground')
      });
      this.dom.append(messageBox.getDOM());
    }
    else if (!this.params.gamemapSteps.gamemap.elements.length) {
      const messageBox = new MessageBox({
        text: this.dictionary.get('l10n.noStages')
      });
      this.dom.append(messageBox.getDOM());
    }
    else {
      this.main = new Main(
        {
          dictionary: this.dictionary,
          globals: this.globals,
          jukebox: this.jukebox
        },
        {
          onProgressChanged: (index) => {
            this.handleProgressChanged(index);
          },
          onFinished: () => {
            this.handleFinished();
          },
          onFullscreenClicked: () => {
            this.handleFullscreenClicked();
          }
        }
      );
      this.dom.append(this.main.getDOM());

      this.on('resize', () => {
        this.main.resize();
      });
    }

    if (fullScreenSupported) {
      this.on('enterFullScreen', () => {
        window.setTimeout(() => {
          this.main.setFullscreen(true);
        }, 50);
      });

      this.on('exitFullScreen', () => {
        this.main.setFullscreen(false);
      });

      const recomputeDimensions = () => {
        if (H5P.isFullscreen) {
          setTimeout(() => { // Needs time to rotate for window.innerHeight
            this.main.setFullscreen(true);
          }, 200);
        }
      };

      // Resize fullscreen dimensions when rotating screen
      if (screen?.orientation?.addEventListener) {
        screen?.orientation?.addEventListener('change', () => {
          recomputeDimensions();
        });
      }
      else {
        /*
        * `orientationchange` is deprecated, but guess what browser doesn't
        * support the Screen Orientation API ... From something with fruit.
        */
        window.addEventListener('orientationchange', () => {
          recomputeDimensions();
        }, false);
      }
    }
  }

  /**
   * Attach to wrapper.
   */
  registerDomElements() {
    this.setContent(this.dom);
  }

  /**
   * Build main DOM.
   * @returns {HTMLElement} Main DOM.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-game-map');

    return dom;
  }

  /**
   * Fill jukebox with audios.
   */
  fillJukebox() {
    const audios = {};

    if (this.params.audio.backgroundMusic.music?.[0]?.path) {
      const src = H5P.getPath(
        this.params.audio.backgroundMusic.music[0].path, this.contentId
      );

      const crossOrigin =
        H5P.getCrossOrigin?.(this.params.audio.backgroundMusic.music[0]) ??
        'Anonymous';

      audios.backgroundMusic = {
        src: src,
        crossOrigin: crossOrigin,
        options: {
          loop: true,
          groupId: 'background'
        }
      };
    }

    for (const key in this.params.audio.ambient) {
      if (!this.params.audio.ambient[key]?.[0]?.path) {
        continue;
      }

      const src = H5P.getPath(
        this.params.audio.ambient[key][0].path, this.contentId
      );

      const crossOrigin =
        H5P.getCrossOrigin?.(this.params.audio.ambient[key][0]) ??
        'Anonymous';

      audios[key] = {
        src: src,
        crossOrigin: crossOrigin
      };
    }

    this.jukebox.fill(audios);
  }

  /**
   * Get current state.
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    if (!this.main) {
      return {};
    }

    if (!this.getAnswerGiven()) {
      // Nothing relevant to store, but previous state in DB must be cleared after reset
      return this.contentWasReset ? {} : undefined;
    }

    return {
      content: this.main.getCurrentState()
    };
  }

  /**
   * Handle progress changed.
   * @param {number} index Index of stage + 1.
   */
  handleProgressChanged(index) {
    const xAPIEvent = this.createXAPIEventTemplate('progressed');
    xAPIEvent.data.statement.object.definition
      .extensions['http://id.tincanapi.com/extension/ending-point'] = index;
    this.trigger(xAPIEvent);
  }

  /**
   * Handle finished.
   */
  handleFinished() {
    const xAPIEvent = this.createXAPIEventTemplate('completed');

    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition());

    xAPIEvent.setScoredResult(
      this.getScore(), // Question Type Contract mixin
      this.getMaxScore(), // Question Type Contract mixin
      this,
      true,
      this.getScore() === this.getMaxScore()
    );

    this.trigger(xAPIEvent);
  }

  /**
   * Handle fullscreen button clicked.
   */
  handleFullscreenClicked() {
    setTimeout(() => {
      this.toggleFullscreen();
    }, 300); // Some devices don't register user gesture before call to to requestFullscreen
  }

  /**
   * Toggle fullscreen button.
   * @param {string|boolean} state enter|false for enter, exit|true for exit.
   */
  toggleFullscreen(state) {
    if (!this.dom) {
      return;
    }

    if (typeof state === 'string') {
      if (state === 'enter') {
        state = false;
      }
      else if (state === 'exit') {
        state = true;
      }
    }

    if (typeof state !== 'boolean') {
      state = !H5P.isFullscreen;
    }

    if (state) {
      this.container = this.container || this.dom.closest('.h5p-container');
      if (this.container) {
        H5P.fullScreen(H5P.jQuery(this.container), this);
      }
    }
    else {
      H5P.exitFullScreen();
    }
  }
}

/** @constant {object} STATES States lookup */
GameMap.STATES = {
  unstarted: 0, // Exercise
  locked: 1,
  unlocking: 2,
  open: 3,
  opened: 4,
  completed: 5,
  cleared: 6, // Exercise, Stage, Path,
  sealed: 7 // Stage
};

/** @constant {number} EXERCISE_SCREEN_ANIM_DURATION_MS Duration from CSS. */
GameMap.EXERCISE_SCREEN_ANIM_DURATION_MS = 1000;
