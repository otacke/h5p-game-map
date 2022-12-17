import Util from '@services/util';
import Path from './path';
import './map.scss';

export default class Map {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {string} [params.backgroundImage] Source string for image.
   * @param {Path[]} [params.paths] Paths.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onImageLoaded] Image loaded.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onImageLoaded: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-map');

    this.image = document.createElement('img');
    this.image.classList.add('h5p-game-map-background-image');
    this.image.addEventListener('load', () => {
      this.callbacks.onImageLoaded(this.image);
    });
    if (this.params.backgroundImage) {
      this.image.src = this.params.backgroundImage;
    }
    this.dom.appendChild(this.image);

    this.pathWrapper = document.createElement('div');
    this.pathWrapper.classList.add('h5p-game-map-path-wrapper');
    this.params.paths.getDOMs().forEach((dom) => {
      this.pathWrapper.appendChild(dom);
    });
    this.dom.appendChild(this.pathWrapper);

    this.stageWrapper = document.createElement('div');
    this.stageWrapper.classList.add('h5p-game-map-stage-wrapper');
    this.params.stages.getDOMs().forEach((dom) => {
      this.stageWrapper.appendChild(dom);
    });
    this.dom.appendChild(this.stageWrapper);
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
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
   * Get map size.
   *
   * @returns {object} Height and width of map.
   */
  getSize() {
    const clientRect = this.dom.getBoundingClientRect();
    return { height: clientRect.height, width: clientRect.width };
  }

  /**
   * Resize.
   */
  resize() {
    // Ensure overlays for paths and stages have image dimensions
    const clientRect = this.image.getBoundingClientRect();
    this.pathWrapper.style.height = `${clientRect.height}px`;
    this.stageWrapper.style.height = `${clientRect.height}px`;
  }
}
