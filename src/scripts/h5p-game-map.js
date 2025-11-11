import H5PUtil from '@services/h5p-util.js';
import Util from '@services/util.js';
import Dictionary from '@services/dictionary.js';
import Jukebox from '@services/jukebox.js';
import Main from '@components/main.js';
import MessageBox from '@components/messageBox/message-box.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';
import '@styles/h5p-game-map.scss';

/** @constant {number} FULL_SCREEN_DELAY_SMALL_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_SMALL_MS = 50;

/** @constant {number} FULL_SCREEN_DELAY_MEDIUM_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_MEDIUM_MS = 200;

/** @constant {number} FULL_SCREEN_DELAY_LARGE_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_LARGE_MS = 300;

/** @constant {number} EXERCISE_SCREEN_ANIM_DURATION_MS Duration from CSS. */
const EXERCISE_SCREEN_ANIM_DURATION_MS = 1000;

/** @constant {string} ADVANCED_TEXT_VERSION_FALLBACK Fallback version for Advanced Text. */
const ADVANCED_TEXT_VERSION_FALLBACK = '1.1';

/** @constant {object} STATES States lookup. */
export const STATES = {
  unstarted: 0, // Exercise
  locked: 1,
  open: 3,
  opened: 4, // Rename to tried or similar
  completed: 5,
  cleared: 6, // Exercise, Stage, Path,
  sealed: 7, // Stage
};

export default class GameMap extends H5P.Question {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('game-map');

    Util.addMixins(GameMap, [QuestionTypeContract, XAPI]);

    const defaults = Util.extend({
      behaviour: {
        finishScore: Infinity, // Cannot use Infinity in JSON
        enableCheckButton: true, // Undocumented Question Type contract setting
      },
    }, H5PUtil.getSemanticsDefaults());

    this.contentId = contentId;

    // Sanitize parameters
    this.params = Util.extend(defaults, params);

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.handleReduceMotion();
    this.sanitizeStages(contentId);

    this.extras = extras;
    const fullScreenSupported = this.isRoot() && H5P.fullscreenSupported;

    // Set globals
    this.setGlobals(fullScreenSupported);

    // Migrate previous state to newer version
    extras.previousState = this.migratePreviousState1_4(extras.previousState);

    this.jukebox = new Jukebox();
    this.fillJukebox();

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.dom = this.buildDOM();

    this.initializeMain(fullScreenSupported);

    if (fullScreenSupported) {
      this.setupFullscreenHandlers();
    }
  }

  /**
   * Handle reduced motion.
   */
  handleReduceMotion() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')?.matches;
    this.params.visual.misc.useAnimation = this.params.visual.misc.useAnimation && !reduceMotion;
  }

  /**
   * Sanitize stages.
   * @param {number} contentId Content ID.
   */
  sanitizeStages(contentId) {
    const advancedTextVersion = this.getAdvancedTextVersion(contentId);

    this.params.gamemapSteps.gamemap.elements = this.params.gamemapSteps.gamemap.elements.map((element) => {
      // Replace missing content with a placeholder
      const isContentMissing = !element.specialStageType && !element.contentsList?.[0]?.contentType?.library;
      if (isContentMissing) {
        element.dom = { count: 0 };
        element.contentsList = [this.createMissingContentElement(advancedTextVersion)];
      }

      // Set animation duration
      element.animDuration = this.params.visual.misc.useAnimation ? EXERCISE_SCREEN_ANIM_DURATION_MS : 0;

      return element;
    });
  }

  /**
   * Get Advanced Text version (available if used in content elsewhere).
   * This is illegal, but H5P core does not provide a way to detect loaded libraries for content types.
   * @param {number} contentId Content ID.
   * @returns {string} Advanced Text version.
   */
  getAdvancedTextVersion(contentId) {
    return H5PIntegration?.contents?.[`cid-${contentId}`]?.scripts
      ?.find((script) => script.includes('H5P.AdvancedText-'))
      ?.match(/H5P\.AdvancedText-(\d+\.\d+)/)?.[0] ?? ADVANCED_TEXT_VERSION_FALLBACK;
  }

  /**
   * Create missing text element to replace incompletely saved content.
   * Can happen, because H5P allows to save even if mandatory fields are missing.
   * @param {string} advancedTextVersion Advanced Text version.
   * @returns {object} Missing content element.
   */
  createMissingContentElement(advancedTextVersion) {
    return {
      contentType: {
        params: {
          text: this.dictionary.get('l10n.missingContent'),
        },
        library: `H5P.AdvancedText ${advancedTextVersion}`,
        metadata: {
          authors: [],
          changes: [],
          license: 'U',
          title: this.dictionary.get('l10n.missingContent'),
          contentType: 'Text',
        },
        subContentId: H5P.createUUID(),
      },
    };
  }

  /**
   * Set globals.
   * @param {boolean} fullScreenSupported Full screen supported.
   */
  setGlobals(fullScreenSupported) {
    this.globals = new Map();
    this.globals.set('mainInstance', this);
    this.globals.set('contentId', this.contentId);
    this.globals.set('params', this.params);
    this.globals.set('extras', this.extras);
    this.globals.set('states', STATES);
    this.globals.set('isFullscreenSupported', fullScreenSupported);
    this.globals.set('resize', () => {
      this.trigger('resize');
    });
    this.globals.set('read', (text) => {
      this.read(text);
    });
  }

  /**
   * Initialize main.
   * @param {boolean} fullScreenSupported Full screen supported.
   */
  initializeMain(fullScreenSupported) {
    const hasExerciseStages = this.params.gamemapSteps.gamemap.elements.some((stage) => {
      return stage.contentsList?.length;
    });

    if (!hasExerciseStages) {
      const messageBox = new MessageBox({
        text: this.dictionary.get('l10n.noStages'),
      });
      this.dom.append(messageBox.getDOM());
    }
    else {
      this.main = new Main(
        {
          dictionary: this.dictionary,
          globals: this.globals,
          jukebox: this.jukebox,
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
          },
          onRestarted: () => {
            this.resetTask();
          },
        },
      );
      this.dom.append(this.main.getDOM());

      this.on('resize', () => {
        this.main.resize();
      });
    }
  }

  /**
   * Setups fullscreen handlers.
   */
  setupFullscreenHandlers() {
    this.on('enterFullScreen', () => {
      window.setTimeout(() => {
        this.main.setFullscreen(true);
      }, FULL_SCREEN_DELAY_SMALL_MS);
    });

    this.on('exitFullScreen', () => {
      this.main.setFullscreen(false);
    });

    const recomputeDimensions = () => {
      if (H5P.isFullscreen) {
        window.setTimeout(() => { // Needs time to rotate for window.innerHeight
          this.main.setFullscreen(true);
        }, FULL_SCREEN_DELAY_MEDIUM_MS);
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

  /**
   * Migrate user state structure to version 1.4.
   * @param {object} previousState Previous state.
   * @returns {object} Migrated state.
   */
  migratePreviousState1_4(previousState) {
    if (!previousState?.content || previousState.content.exerciseBundles) {
      return previousState; // No state or already migrated
    }

    previousState.content.exerciseBundles = (previousState.content.exercises ?? []).map(({ exercise }) => ({
      exerciseBundle: {
        state: exercise.state,
        id: exercise.id,
        remainingTime: exercise.remainingTime,
        isCompleted: exercise.isCompleted,
        instances: [
          {
            completed: exercise.instanceState?.isCompleted || exercise.isCompleted,
            successful: exercise.instanceState?.isCompleted || exercise.isCompleted,
            instanceState: exercise.instanceState,
          },
        ],
      },
    }));

    delete previousState.content.exercises;

    return previousState;
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
        this.params.audio.backgroundMusic.music[0].path, this.contentId,
      );

      const crossOrigin = H5P.getCrossOrigin?.(this.params.audio.backgroundMusic.music[0]) ?? 'Anonymous';

      audios.backgroundMusic = {
        src: src,
        crossOrigin: crossOrigin,
        options: { loop: true, groupId: 'background' },
      };
    }

    for (const key in this.params.audio.ambient) {
      if (!this.params.audio.ambient[key]?.[0]?.path) {
        continue;
      }

      const src = H5P.getPath(this.params.audio.ambient[key][0].path, this.contentId);

      const crossOrigin = H5P.getCrossOrigin?.(this.params.audio.ambient[key][0]) ?? 'Anonymous';

      audios[key] = {
        src: src,
        crossOrigin: crossOrigin,
      };
    }

    this.jukebox.fill(audios);
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
      this.getScore() === this.getMaxScore(),
    );

    this.trigger(xAPIEvent);
  }

  /**
   * Handle fullscreen button clicked.
   */
  handleFullscreenClicked() {
    window.setTimeout(() => {
      this.toggleFullscreen();
    }, FULL_SCREEN_DELAY_LARGE_MS); // Some devices don't register user gesture before call to to requestFullscreen
  }

  /**
   * Toggle fullscreen button.
   * @param {string|boolean} state enter|false for enter, exit|true for exit.
   */
  toggleFullscreen(state) {
    if (!this.dom) {
      return;
    }

    switch (state) {
      case 'enter':
        state = false;
        break;

      case 'exit':
        state = true;
        break;

      default:
        state = typeof state === 'boolean' ? state : !H5P.isFullscreen;
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
