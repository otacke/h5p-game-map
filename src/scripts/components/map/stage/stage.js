import Globals from '@services/globals';
import Dictionary from '@services/dictionary';
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
   * @param {function} [callbacks.onFocusChanged] State of focus changed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      state: Globals.get('states')['locked'],
      accessRestrictions: {
        openOnScoreSufficient: false
      }
    }, params);

    this.callbacks = Util.extend({
      onClicked: () => {},
      onStateChanged: () => {},
      onFocussed: () => {}
    }, callbacks);

    this.isDisabledState = false;

    this.dom = document.createElement('button');
    this.dom.classList.add('h5p-game-map-stage');
    this.dom.addEventListener('click', (event) => {
      this.handleClick(event);
    });
    this.dom.addEventListener('focus', () => {
      this.callbacks.onFocussed(this.params.id);
    });

    if (Globals.get('params').behaviour.map.showLabels) {
      this.dom.addEventListener('mouseenter', (event) => {
        this.handleMouseOver(event);
      });
      this.dom.addEventListener('focus', (event) => {
        this.handleMouseOver(event);
      });
      this.dom.addEventListener('mouseleave', () => {
        this.handleMouseOut();
      });
      this.dom.addEventListener('blur', (event) => {
        this.handleMouseOut(event);
      });
    }

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

    this.setTabIndex('-1');

    if (!this.params.visible && this.params.hiddenInitially) {
      this.hide();
    }
    else {
      this.show();
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

  /**
   * Get stage label.
   *
   * @returns {string} Stage label.
   */
  getLabel() {
    return this.params.label;
  }

  /**
   * Get neighbors.
   *
   * @returns {string[]} Neighbors.
   */
  getNeighbors() {
    return this.params.neighbors;
  }

  /**
   * Get visibility state.
   *
   * @returns {boolean} True, if stage is visible, else false.
   */
  isVisible() {
    return this.isVisibleState;
  }

  /**
   * Focus.
   */
  focus() {
    this.dom.focus();
  }

  /**
   * Update ARIA label.
   *
   * @param {object} [params={}] Parameters.
   * @param {string} [params.customText] Custom aria label text.
   */
  updateAriaLabel(params = {}) {
    const stageLabel = params.customText ||
      Dictionary.get('a11y.stageButtonLabel')
        .replace(/@stagelabel/, this.params.label);

    let stateLabel;
    if (
      this.state === Globals.get('states')['locked'] ||
      this.state === Globals.get('states')['unlocking']
    ) {
      stateLabel = Dictionary.get('a11y.locked');
    }
    else if (
      this.state === Globals.get('states')['completed'] ||
      this.state === Globals.get('states')['cleared']
    ) {
      stateLabel = Dictionary.get('a11y.cleared');
    }

    const stageState = params.customState || stateLabel;

    const ariaSegments = [stageLabel];
    if (stageState) {
      ariaSegments.push(stageState);
    }

    this.dom.setAttribute('aria-label', ariaSegments.join('. '));
  }

  /**
   * Add event listener.
   *
   * @param {string} type Event type.
   * @param {function} callback Callback function.
   */
  addEventListener(type, callback) {
    this.dom.addEventListener(type, callback);
  }

  /**
   * Remove event listener.
   *
   * @param {string} type Event type.
   * @param {function} callback Callback function.
   */
  removeEventListener(type, callback) {
    this.dom.removeEventListener(type, callback);
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
   * Get access restrictions.
   *
   * @returns {object} Settings for access restrictions.
   */
  getAccessRestrictions() {
    return this.params.accessRestrictions;
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');
    this.isVisibleState = true;
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
    this.isVisibleState = false;
  }

  /**
   * Unlock.
   */
  unlock() {
    if (
      this.state === Globals.get('states')['locked'] ||
      this.state === Globals.get('states')['unlocking']
    ) {
      // Do not unlock if there's a restriction that is not yet met
      if (
        typeof (this.params?.accessRestrictions?.minScore) === 'number' &&
        this.params?.accessRestrictions?.minScore > Globals.get('getScore')()
      ) {
        this.setState('unlocking');
        return;
      }

      Globals.get('read')(Dictionary
        .get('a11y.stageUnlocked')
        .replace(/@stagelabel/, this.params.label)
      );

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
   * Enable.
   */
  enable() {
    this.isDisabledState = false;
    this.dom.removeAttribute('disabled');
  }

  /**
   * Disable.
   */
  disable() {
    this.dom.setAttribute('disabled', 'disabled');
    this.isDisabledState = true;
  }

  /**
   * Handle click.
   */
  handleClick() {
    if (this.isDisabledState) {
      return;
    }

    if (
      this.state === Globals.get('states')['locked'] ||
      this.state === Globals.get('states')['unlocking']
    ) {
      return; // You cannot pass!
    }

    this.label.hide();

    this.callbacks.onClicked(this.params.id);
  }

  /**
   * Handle mouseover.
   *
   * @param {Event} event Event that triggered.
   */
  handleMouseOver(event) {
    if (this.isDisabledState) {
      return;
    }

    if (Util.supportsTouch()) {
      return;
    }

    this.label.show({ skipDelay: event instanceof FocusEvent });
  }

  /**
   * Handle mouseout.
   */
  handleMouseOut() {
    if (Util.supportsTouch()) {
      return;
    }

    this.label.hide();
  }

  /**
   * Reset.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    const state = params.isInitial ?
      this.params.state :
      Globals.get('states')['locked'];

    this.setState(state);

    if (
      [Globals.get('states')['locked'], Globals.get('states')['unlocking']]
        .includes(state)
    ) {
      this.setTabIndex('-1');
    }

    if (
      !params.isInitial && this.params.hiddenInitially ||
      params.isInitial && !this.params.visible
    ) {
      this.hide();
    }
    else {
      this.show();
    }
  }

  /**
   * Get state.
   *
   * @returns {number} State id.
   */
  getState() {
    return this.state;
  }

  /**
   * Toggle tabbable.
   *
   * @param {string|number} state Tabindex state
   */
  setTabIndex(state) {
    if (typeof state !== 'number' && typeof state !== 'string') {
      return;
    }

    this.dom.setAttribute('tabindex', `${state}`);
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
    else if (state === states['unlocking']) {
      newState = states['unlocking'];
      this.show();
    }
    else if (
      state === states['open'] ||
      state === states['opened']
    ) {
      if (
        // Was already completed.
        this.state !== states['completed'] &&
        this.state !== states['cleared']
      ) {
        newState = states['open'];
      }
      this.show();
    }
    else if (
      state === states['completed'] &&
      (
        globalParams.behaviour.map.roaming === 'free' ||
        globalParams.behaviour.map.roaming === 'complete'
      )
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

      this.updateAriaLabel();

      this.callbacks.onStateChanged(this.params.id, this.state);
    }
  }
}

/** @constant {number} LABEL_TIMEOUT_MS Timeout for showing label */
Stage.LABEL_TIMEOUT_MS = 3000;
