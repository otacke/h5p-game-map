import Util from '@services/util';
import './label.scss';

export default class Label {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   */
  constructor(params = {}) {
    this.params = Util.extend({
      position: 'bottom'
    }, params);

    // Label
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-stage-label-container');
    this.dom.classList.add(this.params.position);

    const label = document.createElement('div');
    label.classList.add('h5p-game-map-stage-label');
    this.dom.appendChild(label);

    this.labelInner = document.createElement('div');
    this.labelInner.classList.add('h5p-game-map-stage-label-inner');
    this.labelInner.innerText = this.params.text;
    label.appendChild(this.labelInner);

    this.hide();
  }

  /**
   * Get label DOM.
   *
   * @returns {HTMLElement} Label DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.isTouch] If true, was called by touch device.
   */
  show(params = {}) {
    if (this.isShowing()) {
      return;
    }

    if (!this.params.text) {
      return;
    }

    // Determine whether there are multiple lines, need to adjust position
    const fontSize = parseFloat(
      window.getComputedStyle(this.labelInner).getPropertyValue('font-size')
    );
    const labelSize = Math.floor(this.labelInner.getBoundingClientRect().height);
    this.dom.classList.toggle('multiline', fontSize * 1.5 < labelSize);

    this.dom.classList.toggle('touch-device', params.isTouch || false);

    this.dom.classList.remove('visibility-hidden');
    this.showing = true;
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('visibility-hidden');
    this.showing = false;
  }

  /**
   * Determine whether label is showing.
   *
   * @returns {boolean} True, if label is showing. Else false.
   */
  isShowing() {
    return this.showing;
  }
}
