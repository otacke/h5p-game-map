import Globals from '@services/globals';
import Util from '@services/util';
import Label from './label';
import './stage.scss';

export default class Stage {
  /**
   * Construct a path.
   *
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onClicked] Stage was clicked on.
   * @param {function} [callbacks.onStageChanged] State of stage changed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      state: Globals.get('states')['locked']
    }, params);

    this.callbacks = Util.extend({
      onClicked: () => {},
      onStateChanged: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-stage');
    this.dom.addEventListener('click', (event) => {
      this.handleClick(event);
    });
    this.dom.addEventListener('mouseover', (event) => {
      this.handleMouseOver(event);
    });
    this.dom.addEventListener('mouseout', () => {
      this.handleMouseOut();
    });

    // Hotspot
    this.content = document.createElement('div');
    this.content.classList.add('h5p-game-map-stage-content');
    this.dom.appendChild(this.content);

    // Label
    const positionX = (this.params.telemetry.x < 50) ? 'right' : 'left';
    const positionY = (this.params.telemetry.y < 50) ? 'bottom' : 'top';

    this.label = new Label({
      position: `${positionY}-${positionX}`,
      text: this.params.label
    });
    this.dom.appendChild(this.label.getDOM());

    this.dom.style.setProperty(
      '--stage-color', this.params.visuals.colorStage
    );
    this.dom.style.setProperty(
      '--stage-color-cleared', this.params.visuals.colorStageCleared
    );
    this.dom.style.setProperty(
      '--stage-color-locked', this.params.visuals.colorStageLocked
    );

    this.setState(this.params.state);

    if (this.params.hidden) {
      this.hide();
    }

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
   * Get stage id.
   *
   * @returns {string} Stage id.
   */
  getId() {
    return this.params.id;
  }

  getNeighbors() {
    return this.params.neighbors;
  }

  /**
   * Determine whether stage can be start stage.
   *
   * @returns {boolean} True, if stage can be start stage. Else false.
   */
  canBeStartStage() {
    return this.params.canBeStartStage || false;
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
   * Unlock.
   */
  unlock() {
    if (this.state === Globals.get('states')['locked']) {
      this.setState('open');
    }
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

  /**
   * Handle click.
   *
   * @param {Event} event Event.
   */
  handleClick(event) {
    if (event.pointerType === 'mouse') {
      if (this.state === Globals.get('states')['locked']) {
        return;
      }

      clearTimeout(this.labelTimeout);
      this.label.hide();
      this.callbacks.onClicked(this.params.id);
      return;
    }

    if (this.label.isShowing() || !this.params.label) {
      clearTimeout(this.labelTimeout);
      this.label.hide();
      this.callbacks.onClicked(this.params.id);
    }

    this.label.show();
    this.labelTimeout = setTimeout(() => {
      this.label.hide();
    }, Stage.LABEL_TIMEOUT_MS);
  }

  /**
   * Handle mouseover.
   */
  handleMouseOver() {
    this.label.show();
  }

  /**
   * Handle mouseout.
   */
  handleMouseOut() {
    this.label.hide();
  }

  /**
   * Set exercise state.
   *
   * @param {number|string} state State constant.
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.force] If true, will set state unconditionally.
   */
  setState(state, params = {}) {
    const states = Globals.get('states');
    const globalParams = Globals.get('params');

    if (typeof state === 'string') {
      state = Object.entries(states)
        .find((entry) => entry[0] === state)[1];
    }

    if (typeof state !== 'number') {
      return;
    }

    let newState;

    if (params.force) {
      newState = states[state];
    }
    else if (state === states['locked']) {
      newState = states['locked'];
    }
    else if (
      state === states['open'] ||
      state === states['opened']
    ) {
      newState = states['open'];
      this.show();
    }
    else if (
      state === states['completed'] &&
      globalParams.behaviour.roaming === 'free' ||
      globalParams.behaviour.roaming === 'complete'
    ) {
      newState = states['cleared'];
    }
    else if (state === states['cleared']) {
      newState = states['cleared'];
    }

    if (typeof newState !== 'number') {
      return;
    }

    if (!this.state || this.state !== newState) {
      this.state = newState;

      for (const [key, value] of Object.entries(states)) {
        if (value !== this.state) {
          this.content.classList.remove(`h5p-game-map-stage-${key}`);
        }
        else {
          this.content.classList.add(`h5p-game-map-stage-${key}`);
        }
      }

      this.callbacks.onStateChanged(this.params.id, this.state);
    }
  }
}

/** @constant {number} LABEL_TIMEOUT_MS Timeout for showing label */
Stage.LABEL_TIMEOUT_MS = 3000;
