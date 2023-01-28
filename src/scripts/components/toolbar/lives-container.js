import Util from '@services/util';
import './lives-container.scss';

/** Class representing the lives container */
export default class livesContainer {

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
    this.dom.classList.add('lives-container');

    const lives = document.createElement('div');
    lives.classList.add('lives-container-lives');
    this.dom.append(lives);

    this.lives = document.createElement('span');
    this.lives.classList.add('lives');
    lives.append(this.lives);

    this.hide();
  }

  /**
   * Get lives container DOM.
   *
   * @returns {HTMLElement} lives container DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set lives.
   *
   * @param {number} lives lives.
   */
  setLives(lives) {
    this.lives.innerText = lives;
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
