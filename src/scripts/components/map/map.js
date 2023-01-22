import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
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

    const globalParams = Globals.get('params');

    const stageWidthPercentage = globalParams.gamemapSteps?.gamemap?.elements[0]?.telemetry?.width;
    const stageHeightPercentage = globalParams.gamemapSteps?.gamemap?.elements[0]?.telemetry?.height;

    // Custom CSS variables for stages
    this.dom.style.setProperty(
      '--stage-height', `${stageHeightPercentage}%`
    );
    this.dom.style.setProperty(
      '--stage-width', `${stageWidthPercentage}%`
    );
    this.dom.style.setProperty(
      '--stage-color', globalParams.visual.stages.colorStage
    );
    this.dom.style.setProperty(
      '--stage-color-cleared', globalParams.visual.stages.colorStageCleared
    );
    this.dom.style.setProperty(
      '--stage-color-locked', globalParams.visual.stages.colorStageLocked
    );
    this.dom.style.setProperty(
      '--stage-color-contrast-dark', Map.COLOR_CONTRAST_DARK
    );
    this.dom.style.setProperty(
      '--stage-color-contrast-light', Map.COLOR_CONTRAST_LIGHT
    );

    // Custom CSS variables for paths
    this.dom.style.setProperty(
      '--path-color', globalParams.visual.paths.colorPath);
    this.dom.style.setProperty(
      '--path-color-cleared', globalParams.visual.paths.colorPathCleared
    );
    this.dom.style.setProperty(
      '--path-style', globalParams.visual.paths.pathStyle
    );

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
    this.stageWrapper.setAttribute('role', 'application');
    this.stageWrapper.setAttribute(
      'aria-label', Dictionary.get('a11y.applicationDescription')
    );

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

    const height = window.getComputedStyle(this.dom).overflowY !== 'hidden' ?
      this.dom.scrollHeight :
      clientRect.height;

    return { height: height, width: clientRect.width };
  }

  /**
   * Resize.
   */
  resize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      // Ensure overlays for paths and stages have image dimensions
      const clientRect = this.image.getBoundingClientRect();
      this.pathWrapper.style.height = `${clientRect.height}px`;
      this.stageWrapper.style.height = `${clientRect.height}px`;

      const heightPercentage = parseInt(
        this.dom.style.getPropertyValue('--stage-height')
      );

      const fontSize = clientRect.height / 100 * heightPercentage;

      this.dom.style.setProperty(
        '--stage-font-size', `calc(${Map.STAGE_BORDER_RADIUS} * ${fontSize}px)`
      );
      this.dom.style.setProperty(
        '--stage-line-height', `${fontSize}px`
      );
    }, 0);
  }

  /**
   * Set maximum height.
   *
   * @param {number} [heightPx] Max height.
   */
  setMaxHeight(heightPx) {
    if (typeof heightPx !== 'number') {
      this.dom.style.maxHeight = '';
      this.dom.style.overflow = 'hidden';
    }
    else {
      this.dom.style.maxHeight = `${heightPx}px`;
      this.dom.style.overflow = 'auto';
    }
  }

  /**
   * Set active descendant for aria composite pattern.
   *
   * @param {string} id Id of active descendant.
   */
  setActiveDescendant(id) {
    this.stageWrapper.setAttribute(
      'aria-activedescendant', `stage-button-${id}`
    );
  }
}

/** @constant {string} COLOR_CONTRAST_DARK Dark color contrast */
Map.COLOR_CONTRAST_DARK = '#000';

/** @constant {string} COLOR_CONTRAST_LIGHT Light color contrast */
Map.COLOR_CONTRAST_LIGHT = '#fff';

/** @constant {number} STAGE_BORDER_RADIUS Border radius */
Map.STAGE_BORDER_RADIUS = 0.5;
