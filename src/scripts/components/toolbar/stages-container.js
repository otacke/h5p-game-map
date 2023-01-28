import Util from '@services/util';
import './stages-container.scss';

/** Class representing the stages container */
export default class StagesContainer {

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
    this.dom.classList.add('stages-container');

    const stagess = document.createElement('div');
    stagess.classList.add('stages-container-stages');
    this.dom.append(stagess);

    this.stages = document.createElement('span');
    this.stages.classList.add('stages');
    stagess.append(this.stages);

    const delimiter = document.createElement('span');
    delimiter.classList.add('delimiter');
    delimiter.innerText = '/';
    stagess.append(delimiter);

    this.maxstages = document.createElement('span');
    this.maxstages.classList.add('max-stages');
    stagess.append(this.maxstages);

    this.hide();
  }

  /**
   * Get stages container DOM.
   *
   * @returns {HTMLElement} stages container DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set stages.
   *
   * @param {number} stages stages.
   */
  setStages(stages) {
    this.stages.innerText = stages;
  }

  /**
   * Set maxstages.
   *
   * @param {number} maxstages stages.
   */
  setMaxStages(maxstages) {
    this.maxstages.innerText = maxstages;
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
