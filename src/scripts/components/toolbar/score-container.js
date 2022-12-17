import Util from '@services/util';
import './score-container.scss';

/** Class representing the score container */
export default class ScoreContainer {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('score-container');

    const scores = document.createElement('div');
    scores.classList.add('score-container-scores');
    this.dom.append(scores);

    this.score = document.createElement('span');
    this.score.classList.add('score');
    scores.append(this.score);

    const delimiter = document.createElement('span');
    delimiter.classList.add('delimiter');
    delimiter.innerText = '/';
    scores.append(delimiter);

    this.maxScore = document.createElement('span');
    this.maxScore.classList.add('max-score');
    scores.append(this.maxScore);

    this.hide();
  }

  /**
   * Get score container DOM.
   *
   * @returns {HTMLElement} score container DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set score.
   *
   * @param {number} score Score.
   */
  setScore(score) {
    this.score.innerText = score;
  }

  /**
   * Set maxScore.
   *
   * @param {number} maxScore Score.
   */
  setMaxScore(maxScore) {
    this.maxScore.innerText = maxScore;
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }
}
