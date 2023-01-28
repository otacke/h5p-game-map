import Util from '@services/util';
import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
import Jukebox from '@services/jukebox';
import Content from '@components/content';
import '@styles/h5p-game-map.scss';
import MessageBox from './components/messageBox/message-box';
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

    // Sanitize parameters
    this.params = Util.extend({
      gamemapSteps: {
        gamemap: {
          elements: []
        }
      },
      audio: {
        backgroundMusic: {
          autoplay: false,
          muteDuringExercise: true
        }
      },
      visual: {
        misc: {
          useAnimation: true,
          heightLimitMode: 'none'
        }
      },
      behaviour: {
        showLabels: true,
        roaming: 'free',
        displayPaths: true,
        fog: false,
        startStages: 'all',
        finishScore: Infinity,
        enableRetry: true, // @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
        enableSolutionsButton: true, // @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
        enableCheckButton: true // Undocumented Question Type contract setting
      },
      l10n: {
        start: 'Start',
        restart: 'Restart',
        showSolutions: 'Show solutions',
        completedMap: 'You have completed the map!',
        confirmFinishHeader: 'Finish map?',
        confirmFinishDialog: 'If you finish now, you will not be able to explore the map any longer.',
        confirmFinishDialogSubmission: 'Your score will be submitted.',
        confirmFinishDialogQuestion: 'Do you really want to finish the map?',
        no: 'No',
        yes: 'Yes',
        confirmGameOverHeader: 'Game over!',
        confirmGameOverDialog: 'You have lost all your lives. Please try again!',
        ok: 'OK',
        noBackground: 'No background image was set for the map.',
        noStages: 'No valid stages were set for the map.'
      },
      a11y: {
        buttonFinish: 'Finish the map',
        buttonAudioActive: 'Mute audio. Currently unmuted.',
        buttonAudioInactive: 'Unmute audio. Currently muted.',
        close: 'Close',
        yourResult: 'You got @score out of @total points',
        startScreenWasOpened: 'The start screen was opened',
        mapWasOpened: 'The map was opened.',
        mapSolutionsWasOpened: 'The map was opened in solutions mode.',
        endScreenWasOpened: 'The end screen was opened',
        exerciseLabel: '. Exercise for @stagelabel',
        stageButtonLabel: 'Stage: @stagelabel',
        adjacentStageLabel: 'Adjacent stage of @stagelabelOrigin: @stagelabelNeighbor',
        locked: 'Locked',
        cleared: 'Cleared',
        applicationInstructions: 'Use space or enter key to activate current stage. Use arrow keys to select adjacent stage. Use space or enter key on adjacent stage to navigate there.',
        applicationDescription: 'Map.',
        movedToStage: 'Moved to stage @stagelabel',
        stageUnlocked: 'Stage @stagelabel was unlocked.',
        toolbaFallbackLabel: 'Game Map'
      }
    }, params);

    // Sanitize stages
    this.params.gamemapSteps.gamemap.elements =
      this.params.gamemapSteps.gamemap.elements.filter((element) => {
        return element.contentType?.library;
      });

    // Determine mediaQuery result for prefers-reduced-motion preference
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )?.matches;

    this.params.visual.misc.useAnimation =
      this.params.visual.misc.useAnimation && !reduceMotion;

    this.contentId = contentId;
    this.extras = extras;

    // Set globals
    Globals.set('mainInstance', this);
    Globals.set('contentId', this.contentId);
    Globals.set('params', this.params);
    Globals.set('extras', this.extras);
    Globals.set('states', GameMap.STATES);
    Globals.set('resize', () => {
      this.trigger('resize');
    });
    Globals.set('read', (text) => {
      this.read(text);
    });

    // Fill dictionary
    Dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.fillJukebox();

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.dom = this.buildDOM();

    if (!this.params.gamemapSteps.backgroundImageSettings?.backgroundImage) {
      const messageBox = new MessageBox({
        text: Dictionary.get('l10n.noBackground')
      });
      this.dom.append(messageBox.getDOM());
    }
    else if (!this.params.gamemapSteps.gamemap.elements.length) {
      const messageBox = new MessageBox({
        text: Dictionary.get('l10n.noStages')
      });
      this.dom.append(messageBox.getDOM());
    }
    else {
      this.content = new Content({}, {
        onProgressChanged: (index) => {
          this.handleProgressChanged(index);
        },
        onFinished: () => {
          this.handleFinished();
        }
      });
      this.dom.append(this.content.getDOM());

      this.on('resize', () => {
        this.content.resize();
      });
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
   *
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
          loop: true
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

    Jukebox.fill(audios);
  }

  /**
   * Get current state.
   *
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    return {
      content: this.content.getCurrentState()
    };
  }

  /**
   * Handle progress changed.
   *
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
