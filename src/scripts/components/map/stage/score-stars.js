import Util from '@services/util.js';
import './score-stars.scss';

/** @constant {number} VISIBILITY_HIDDEN_DELAY_MS Delay before visibility hidden is added. */
const VISIBILITY_HIDDEN_DELAY_MS = 10;

export default class ScoreStars {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.mode] Mode ['never'|'onHover'|'always'].
   */
  constructor(params = {}) {
    this.params = Util.extend({}, params);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-stage-score-stars-container');

    if (this.params.mode === 'onHover') {
      this.dom.style.setProperty('--on-hover-transition', 'var(--label-transition)');
    }

    this.addStars();

    this.hide();
  }

  /**
   * Get label DOM.
   * @returns {HTMLElement} Label DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isTouch] If true, was called by touch device.
   * @param {boolean} [params.skipDelay] If true, will immediately show label.
   */
  show(params = {}) {
    if (this.isShowing()) {
      return;
    }

    this.dom.classList.toggle('touch-device', params.isTouch || false);

    if (params.skipDelay) {
      this.dom.classList.remove('visibility-hidden');
    }
    else {
      window.setTimeout(() => {
        this.dom.classList.remove('visibility-hidden');
      }, VISIBILITY_HIDDEN_DELAY_MS);
    }

    this.dom.classList.remove('display-none');

    this.showing = true;
  }

  /**
   * Build star SVG.
   * @returns {SVGElement} Star SVG.
   */
  buildStarSVG() {
    const starSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    starSVG.setAttribute('viewBox', '-22 0 1792 1717');
    starSVG.setAttribute('width', '100%');
    starSVG.setAttribute('height', '100%');
    starSVG.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const starPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    starPath.setAttribute('id', 'outline');
    starPath.setAttribute('fill', 'currentColor');
    starPath.setAttribute('d', 'M874 0q43 0 78 32 22 22 35 52l-2-4 207 419 462 68q38 5 66 24 20 13 35 38t15 53v8l-2 8q-11 50-49 84l2-1-335 324 80 460v-2q3 17 3 36-1 43-23 74-14 19-39 31.5t-50 12.5q-40-1-74-20l2 1-413-218-412 218 1-1q-32 18-70 20h-3q-25 0-49.5-12t-38.5-31q-24-32-24-76l2-21v-5l81-466L24 781l2 1q-40-37-47-91l-1-4v-5q0-27 15.5-52.5T29 591q24-16 62-24h2l463-68L764 80l-1 2q12-28 34-48 34-34 77-34Zm0 172L649 627l-506 74 366 356-87 502 450-238 451 238-87-502 366-357-503-73z');
    starSVG.appendChild(starPath);

    const starPathRight = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    starPathRight.setAttribute('id', 'background-right');
    starPathRight.setAttribute('d', 'M874 172 649 627l-506 74 366 356-87 502 450-238 2 1.055L1323 1559l-87-502 366-357-503-73zm775.24 678.404-.644.623h.644zm-839.555 662.569-5.072 2.683h5.072z');
    starSVG.appendChild(starPathRight);

    const starPathLeft = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    starPathLeft.setAttribute('id', 'background-left');
    starPathLeft.setAttribute('d', 'M874 172 649 627l-506 74 366 356-87 502 450-238 2 1.055zm-64.314 1340.973-5.073 2.683h5.073z');
    starSVG.appendChild(starPathLeft);

    return starSVG;
  }

  /**
   * Add stars to DOM.
   */
  addStars() {
    this.starDOMLeft = document.createElement('div');
    this.starDOMLeft.classList.add('h5p-game-map-stage-score-star');
    this.starDOMLeft.classList.add('small');
    this.starDOMLeft.classList.add('left');
    let svg = this.buildStarSVG();
    this.starDOMLeft.appendChild(svg);
    this.dom.appendChild(this.starDOMLeft);

    this.starDOMCenter = document.createElement('div');
    this.starDOMCenter.classList.add('h5p-game-map-stage-score-star');
    svg = this.buildStarSVG();
    this.starDOMCenter.appendChild(svg);
    this.dom.appendChild(this.starDOMCenter);

    this.starDOMRight = document.createElement('div');
    this.starDOMRight.classList.add('h5p-game-map-stage-score-star');
    this.starDOMRight.classList.add('small');
    this.starDOMRight.classList.add('right');
    svg = this.buildStarSVG();
    this.starDOMRight.appendChild(svg);
    this.dom.appendChild(this.starDOMRight);
  }

  /**
   * Set starts by segments.
   * @param {number} segments Segments.
   */
  setStarsBySegments(segments) {
    if (typeof segments !== 'number') {
      return;
    }

    // Remove classes from elements
    const removeClasses = (elements, ...classes) => {
      elements.forEach((element) => {
        classes.forEach((cls) => element.classList.remove(cls));
      });
    };

    // Add classes to elements
    const addClasses = (elements, ...classes) => {
      elements.forEach((element) => {
        classes.forEach((cls) => element.classList.add(cls));
      });
    };

    // eslint-disable-next-line no-magic-numbers
    segments = Math.max(0, Math.min(segments, 6));

    const stars = [this.starDOMLeft, this.starDOMCenter, this.starDOMRight];

    removeClasses(stars, 'half', 'full');

    switch (segments) {
      case 0:
        break;
      case 1:
        addClasses([this.starDOMLeft], 'half');
        break;
      // eslint-disable-next-line no-magic-numbers
      case 2:
        addClasses([this.starDOMLeft], 'full');
        break;
        // eslint-disable-next-line no-magic-numbers
      case 3:
        addClasses([this.starDOMLeft], 'full');
        addClasses([this.starDOMCenter], 'half');
        break;
        // eslint-disable-next-line no-magic-numbers
      case 4:
        addClasses([this.starDOMLeft, this.starDOMCenter], 'full');
        break;
        // eslint-disable-next-line no-magic-numbers
      case 5:
        addClasses([this.starDOMLeft, this.starDOMCenter], 'full');
        addClasses([this.starDOMRight], 'half');
        break;
        // eslint-disable-next-line no-magic-numbers
      case 6:
        addClasses([this.starDOMLeft, this.starDOMCenter, this.starDOMRight], 'full');
        break;
    }
  }

  /**
   * Set star segments by percentage.
   * @param {number} percentage Percentage.
   */
  setStarsByPercentage(percentage) {
    if (typeof percentage !== 'number') {
      return;
    }

    // eslint-disable-next-line no-magic-numbers
    percentage = Math.max(0, Math.min(percentage, 100));

    if (percentage === 0) {
      this.setStarsBySegments(0);
    }
    // eslint-disable-next-line no-magic-numbers
    else if (percentage === 100) {
    // eslint-disable-next-line no-magic-numbers
      this.setStarsBySegments(6);
    }
    else {
      // eslint-disable-next-line no-magic-numbers
      this.setStarsBySegments(Math.round(Util.project(percentage, 0, 100, 1, 5)));
    }
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('visibility-hidden');
    window.setTimeout(() => {
      this.dom.classList.add('display-none');
    }, 0);
    this.showing = false;
  }

  /**
   * Determine whether label is showing.
   * @returns {boolean} True, if label is showing. Else false.
   */
  isShowing() {
    return this.showing;
  }
}
