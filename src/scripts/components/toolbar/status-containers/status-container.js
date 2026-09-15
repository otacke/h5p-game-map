import { animate } from '@services/animate.js';
import Util from '@services/util.js';
import './status-container.scss';

/** Class representing a status container */
export default class StatusContainer {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('status-container');
    this.dom.classList.add(`status-container-${params.id}`);

    const values = document.createElement('div');
    values.classList.add('status-container-values');
    this.dom.append(values);

    this.ariaReplacement = document.createElement('span');
    this.ariaReplacement.classList.add('status-container-aria-replacement');
    values.append(this.ariaReplacement);

    const visibleValues = document.createElement('span');
    visibleValues.classList.add('status-container-visible-values');
    visibleValues.setAttribute('aria-hidden', 'true');
    values.append(visibleValues);

    this.value = document.createElement('span');
    this.value.classList.add('value');
    visibleValues.append(this.value);

    if (params.hasMaxValue) {
      const delimiter = document.createElement('span');
      delimiter.classList.add('delimiter');
      delimiter.innerText = '/';
      visibleValues.append(delimiter);

      this.maxValue = document.createElement('span');
      this.maxValue.classList.add('max-value');
      visibleValues.append(this.maxValue);
    }

    this.hide();
  }

  /**
   * Get container DOM.
   * @returns {HTMLElement} Container DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set score.
   * @param {object} params Parameters.
   */
  setStatus(params = {}) {
    if ((params.value ?? null) !== null) {
      this.value.innerText = params.value;
    }

    if ((params.maxValue ?? null) !== null && this.maxValue) {
      this.maxValue.innerText = params.maxValue;
    }

    if ((params.ariaText ?? '').trim() !== '') {
      this.ariaReplacement.innerText = params.ariaText;
    }
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

  /**
   * Animate.
   * @param {string|null} animationName Animation name, null to stop animation.
   */
  animate(animationName) {
    animate(this.dom, animationName);
  }
}
