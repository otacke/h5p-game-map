import Util from '@services/util.js';
import MediaScreen from './media-screen.js';
import './end-screen.scss';

/** @constant {number} JOUBELUI_SCORE_TIMEOUT_MS Timeout used by JoubelUi to set score once visible */
const JOUBELUI_SCORE_TIMEOUT_MS = 150;

/** Class representing the end screen */
export default class EndScreen extends MediaScreen {

  constructor(params = {}, callbacks = {}) {
    super(params, callbacks);
  }

  /**
   * Override score on end screen. Needed if score exceeds the maximum score, which JoubelUI sets to maxScore.
   * @param {number} score Score to set on end screen.
   */
  overrideScore(score) {
    if (typeof score !== 'number') {
      return;
    }

    const setScoreTextContent = (score) => {
      const scoreSpan = this.content.querySelector('.h5p-joubelui-score-number-counter');
      if (scoreSpan) {
        scoreSpan.textContent = score;
      }
    };

    Util.callOnceVisible(this.content, () => {
      setScoreTextContent(score);

      // Will cause slight flickering, but we have no good way to know when JoubelUi has set the score text content.
      window.setTimeout(() => {
        setScoreTextContent(score);
      }, JOUBELUI_SCORE_TIMEOUT_MS);
    });
  }
}
