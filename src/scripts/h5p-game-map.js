import H5PUtil from '@services/h5p-util.js';
import Util from '@services/util.js';
import Dictionary from '@services/dictionary.js';
import Globals from '@services/globals.js';
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

/** @constant {object} STATES States lookup. */
export const STATES = {
  unstarted: 0, // Exercise
  locked: 1,
  open: 3,
  opened: 4, // Rename to tried or similar
  completed: 5,
  cleared: 6, // Exercise, Stage, Path,
  sealed: 7 // Stage
};

// TODO: Bundle with ListTabWidget

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
    if (this.params.behaviour.map.roaming === 'free') {
      this.params.visual.paths.style.colorPathCleared = this.params.visual.paths.style.colorPath;
    }

    // Determine mediaQuery result for prefers-reduced-motion preference
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )?.matches;

    this.params.visual.misc.useAnimation =
      this.params.visual.misc.useAnimation && !reduceMotion;

    /*
     * Sanitize stages
     * Remove stages without content except for special stages
     * Set animation duration if valid
     *
     * TODO: Fix for new structure (Bundles) and instead of removing stage create a text based one
     */
    this.params.gamemapSteps.gamemap.elements =
      this.params.gamemapSteps.gamemap.elements
        .filter((element) => {
          return !!element.contentsList?.[0]?.contentType.library || !!element.specialStageType;
        })
        .map((element) => {
          element.animDuration = (this.params.visual.misc.useAnimation) ?
            EXERCISE_SCREEN_ANIM_DURATION_MS :
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
    this.globals.set('states', STATES);
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

    // Migrate previous state to newer version
    extras.previousState = this.migratePreviousState1_4(extras.previousState);

    this.jukebox = new Jukebox();
    this.fillJukebox();

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.dom = this.buildDOM();

    const hasExerciseStages =
      this.params.gamemapSteps.gamemap.elements.some((stage) => {
        return stage.contentsList?.length;
      });

    if (!hasExerciseStages) {
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
          },
          onRestarted: () => {
            this.resetTask();
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
        }, FULL_SCREEN_DELAY_SMALL_MS);
      });

      this.on('exitFullScreen', () => {
        this.main.setFullscreen(false);
      });

      const recomputeDimensions = () => {
        if (H5P.isFullscreen) {
          setTimeout(() => { // Needs time to rotate for window.innerHeight
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

    previousState.content.exerciseBundles = (previousState.content.exercises ?? []).map((exerciseObj) => {
      const exerciseBundle = {
        state: exerciseObj.exercise.state,
        id: exerciseObj.exercise.id,
        remainingTime: exerciseObj.exercise.remainingTime,
        isCompleted: exerciseObj.exercise.isCompleted,
        instances: [
          {
            completed: exerciseObj.exercise.instanceState?.isCompleted || exerciseObj.exercise.isCompleted,
            successful: exerciseObj.exercise.instanceState?.isCompleted || exerciseObj.exercise.isCompleted,
            instanceState: exerciseObj.exercise.instanceState,
          }
        ]
      };

      return { exerciseBundle: exerciseBundle };
    });

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
