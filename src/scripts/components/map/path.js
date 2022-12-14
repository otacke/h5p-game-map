import Util from '@services/util';
import './path.scss';

export default class Path {
  /**
   * Construct a path.
   *
   * @class
   * @param {object} [params={}] Parameters.
   */
  constructor(params = {}) {
    this.params = params;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-path');
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
   * Get height from CSS.
   *
   * @returns {string} Defined height for px only!
   */
  getHeight() {
    const cssHeight = window.getComputedStyle(this.dom)
      .getPropertyValue('border-top-width');

    const height = Util.parseCSSLengthProperty(cssHeight);
    if (!height) {
      return 1;
    }

    if (height.unit === 'px') {
      return height.value;
    }

    return 1; // Fallback
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
   * Update telemetry.
   *
   * @param {object} [params={}] Parameters.
   * @param {number} params.x Start position x in percent.
   * @param {number} params.y Start position y in percent.
   * @param {number} params.length length in px.
   * @param {number} params.angle Angle in radians.
   */
  update(params = {}) {
    if (typeof params.x === 'number') {
      this.dom.style.left = `${params.x}%`;
    }

    if (typeof params.y === 'number') {
      this.dom.style.top = `${params.y}%`;
    }

    if (typeof params.length === 'number') {
      this.dom.style.width = `${params.length}px`;
    }

    if (typeof params.angle === 'number') {
      this.dom.style.transform = `rotate(${params.angle}rad)`;
    }
  }

  resize(params = {}) {
    const telemetry = this.computePathTelemetry({ mapSize: params.mapSize });
    if (!telemetry) {
      return; // Resize before active
    }

    this.update({
      x: telemetry.x,
      y: telemetry.y,
      length: telemetry.length,
      angle: telemetry.angle
    });
  }

  /**
   * Compute path telemetry.
   *
   * @param {object} [params = {}] Parameters.
   * @param {object} params.mapSize Map width and height.
   * @returns {object} Telemetry date for an path
   */
  computePathTelemetry(params = {}) {
    if (params.mapSize.height === 0 || params.mapSize.width === 0) {
      return null;
    }

    const fromX = this.params.telemetryFrom.x;
    const fromY = this.params.telemetryFrom.y;
    const fromWidth = this.params.telemetryFrom.width;
    const fromHeight = this.params.telemetryFrom.height;

    const toX = this.params.telemetryTo.x;
    const toY = this.params.telemetryTo.y;

    const fromXPx = parseFloat(fromX) / 100 * params.mapSize.width;
    const fromYPx = parseFloat(fromY) / 100 * params.mapSize.height;
    const toXPx = parseFloat(toX) / 100 * params.mapSize.width;
    const toYPx = parseFloat(toY) / 100 * params.mapSize.height;
    const width = parseFloat(fromWidth) / 100 * params.mapSize.width;
    const height = parseFloat(fromHeight) / 100 * params.mapSize.height;

    const deltaXPx = fromXPx - toXPx;
    const deltaYPx = fromYPx - toYPx;

    const angleOffset = (Math.sign(deltaXPx) >= 0) ? Math.PI : 0;
    const angle = Math.atan(deltaYPx / deltaXPx) + angleOffset;

    // Distance from center to border
    const offsetToBorder = {
      x: width / 2 * Math.cos(angle) * 100 / params.mapSize.width,
      y: height / 2 * Math.sin(angle) * 100 / params.mapSize.height
    };

    const offsetPathStroke = this.getHeight() / 2 * 100 / params.mapSize.height;

    // Position + offset for centering + offset for border (+ stroke offset)
    const x = parseFloat(fromX) +
      parseFloat(fromWidth) / 2 +
      offsetToBorder.x;

    const y = parseFloat(fromY) +
      parseFloat(fromHeight) / 2 +
      offsetToBorder.y -
      offsetPathStroke;

    // Good old Pythagoras
    const length = Math.sqrt(
      Math.abs(deltaXPx) * Math.abs(deltaXPx) +
      Math.abs(deltaYPx) * Math.abs(deltaYPx)
    ) - width; // assuming circle for hotspot

    return { x, y, length, angle };
  }
}
