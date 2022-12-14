import './stage.scss';

export default class Stage {
  /**
   * Construct a path.
   *
   * @class
   * @param {object} [params={}] Parameters.
   */
  constructor(params = {}) {
    this.params = params;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-stage');

    this.content = document.createElement('div');
    this.content.classList.add('h5p-game-map-stage-content');
    this.dom.appendChild(this.content);

    this.update(params.telemetry);
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
   * Update telemetry.
   *
   * @param {object} [params={}] Parameters.
   * @param {number} params.x Start position x in percent.
   * @param {number} params.y Start position y in percent.
   * @param {number} params.width Width in px.
   * @param {number} params.height Height in px.
   */
  update(params = {}) {
    for (let property in params) {
      if (typeof params[property] === 'string') {
        params[property] = parseFloat(params[property]);
      }

      // Update DOM
      let styleProperty = property;
      if (property === 'x') {
        styleProperty = 'left';
      }
      else if (property === 'y') {
        styleProperty = 'top';
      }
      this.dom.style[styleProperty] = `${params[property]}%`;
    }
  }
}
