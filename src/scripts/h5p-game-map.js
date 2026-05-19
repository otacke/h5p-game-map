import { STAGE_STATES } from '@services/constants.js';
import H5PUtil from '@services/h5p-util.js';
import Util from '@services/util.js';
import Dictionary from '@services/dictionary.js';
import Jukebox from '@services/jukebox.js';
import Main from '@components/main.js';
import MessageBox from '@components/messageBox/message-box.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import Sanitization from '@mixins/sanitization.js';
import XAPI from '@mixins/xapi.js';
import '@styles/h5p-game-map.scss';

/** @constant {number} FULL_SCREEN_DELAY_SMALL_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_SMALL_MS = 50;

/** @constant {number} FULL_SCREEN_DELAY_MEDIUM_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_MEDIUM_MS = 200;

/** @constant {number} FULL_SCREEN_DELAY_LARGE_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_LARGE_MS = 300;

/** @constant {string} ADVANCED_TEXT_VERSION_FALLBACK Fallback version for Advanced Text. */
const ADVANCED_TEXT_VERSION_FALLBACK = '1.1';

// TODO: Check why start stage might be off after restart (no previous state? previous state?)
// TODO: Update Image Hotspots 1.11 once released
// TODO: TEST TEST TEST

export default class GameMap extends H5P.Question {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('game-map');

    Util.addMixins(GameMap, [QuestionTypeContract, Sanitization, XAPI]);

    const defaults = Util.extend({
      gamemaps: [],
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
    extras.previousState = this.migratePreviousState1_7(extras.previousState);

    this.jukebox = new Jukebox();
    this.fillJukebox();

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.dom = this.buildDOM();

    this.initializeMain(fullScreenSupported);

    if (this.params.isPreview) {
      this.interceptXAPIEvents();
    }

    if (fullScreenSupported) {
      this.setupFullscreenHandlers();
    }
  }

  /**
   * Intercept xAPI events in preview mode to avoid polluting LRS with test data.
   */
  interceptXAPIEvents() {
    /*
     * Kill all external listeners that may have been added so far.
     * /!\ This can have side effects if a customization listens within the H5P Editor!
     * There's no way though to block events from subcontents without being able to block them at the source.
     */
    H5P.externalDispatcher.off('xAPI');
  }

  /**
   * Handle reduced motion.
   */
  handleReduceMotion() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')?.matches;
    this.params.visual.misc.useAnimation = this.params.visual.misc.useAnimation && !reduceMotion;
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
    const firstMap = this.params.gamemaps[0];
    const hasExerciseStages = (firstMap?.elements ?? []).some((stage) => {
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
   * Migrate user state structure to version 1.7.
   * Adds the new `currentMapIndex` field that tracks which map of the
   * `gamemaps` list is active. Pre-1.7 content had a single map, so the
   * restored state belongs to map index 0.
   *
   * The flat `stages`, `paths`, and `exerciseBundles` arrays are kept as-is;
   * 1.7 still stores them flat (just sourced across all maps).
   * @param {object} previousState Previous state.
   * @returns {object} Migrated state.
   */
  migratePreviousState1_7(previousState) {
    if (!previousState?.content || typeof previousState.content.currentMapIndex === 'number') {
      return previousState; // No state or already migrated
    }

    previousState.content.currentMapIndex = 0;

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

    const buildAudio = (entry, options) => {
      if (!entry?.path) {
        return null;
      }
      return {
        src: H5P.getPath(entry.path, this.contentId),
        crossOrigin: H5P.getCrossOrigin?.(entry) ?? 'Anonymous',
        ...(options && { options }),
      };
    };

    const backgroundOptions = { loop: true, groupId: 'background' };

    const backgroundMusic = buildAudio(this.params.audio.music?.[0], backgroundOptions);
    if (backgroundMusic) {
      audios.backgroundMusic = backgroundMusic;
    }

    this.params.gamemaps.forEach((map, mapIndex) => {
      const customBackgroundMusic = buildAudio(
        map.mapOptions?.audioSettings?.music?.[0],
        backgroundOptions,
      );
      if (customBackgroundMusic) {
        audios[`backgroundMusic-${mapIndex}`] = customBackgroundMusic;
      }
    });

    Object.entries(this.params.audio.ambient ?? {}).forEach(([key, entry]) => {
      const ambient = buildAudio(entry?.[0]);
      if (ambient) {
        audios[key] = ambient;
      }
    });

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

    const maxScore = this.getMaxScore(); // Question Type Contract mixin
    const score = Math.min(this.getScore(), maxScore); // Question Type Contract mixin

    xAPIEvent.setScoredResult(
      score,
      maxScore,
      this,
      true,
      score === maxScore,
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

  /**
   * Get stages.
   * @returns {object[]} Stages.
   */
  getStages() {
    return this.main.getStages();
  }

  /**
   * Cheat!
   * @param {object} params Parameters.
   */
  cheat(params) {
    this.main.cheat(params);
  }
}
