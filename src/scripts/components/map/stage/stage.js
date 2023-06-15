import Color from 'color';
import Util from '@services/util';
import Label from './label';
import './stage.scss';

export default class Stage {
  /**
   * Construct a Stage.
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClicked] Stage was clicked on.
   * @param {function} [callbacks.onStageChanged] State of stage changed.
   * @param {function} [callbacks.onFocusChanged] State of focus changed.
   * @param {function} [callbacks.onAccessRestrictionsHit] Handle no access.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      accessRestrictions: {
        openOnScoreSufficient: false
      }
    }, params);

    this.params.state = this.params.state ??
      this.params.globals.get('states')['locked'];

    this.callbacks = Util.extend({
      onClicked: () => {},
      onStateChanged: () => {},
      onFocused: () => {},
      onBecameActiveDescendant: () => {},
      onAddedToQueue: () => {},
      onAccessRestrictionsHit: () => {}
    }, callbacks);

    this.isDisabledState = false;
    this.isAnimating = false;
    this.shouldBePlayful = true;

    this.handleAnimationEnded = this.handleAnimationEnded.bind(this);

    this.dom = document.createElement('button');
    this.dom.classList.add('h5p-game-map-stage');
    this.dom.setAttribute('id', `stage-button-${this.params.id}`);
    this.dom.addEventListener('click', (event) => {
      this.handleClick(event);
    });
    this.dom.addEventListener('focus', () => {
      this.callbacks.onFocused(this.params.id);
    });

    if (this.params.globals.get('params').behaviour.map.showLabels) {
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
    this.content.classList.add('dark-text');
    this.dom.appendChild(this.content);

    this.contentComputedStyle = window.getComputedStyle(this.content);

    // Label
    const positionX = (this.params.telemetry.x < 50) ? 'right' : 'left';
    const positionY = (this.params.telemetry.y < 50) ? 'bottom' : 'top';

    this.label = new Label({
      position: `${positionY}-${positionX}`,
      text: this.params.label
    });
    this.dom.appendChild(this.label.getDOM());

    this.setState(this.params.state);

    this.setTabIndex('-1');

    if (!this.params.visible) {
      this.hide();
    }
    else {
      this.show();
    }

    this.update(params.telemetry);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get stage id.
   * @returns {string} Stage id.
   */
  getId() {
    return this.params.id;
  }

  /**
   * Get stage label.
   * @returns {string} Stage label.
   */
  getLabel() {
    return this.params.label;
  }

  /**
   * Get neighbors.
   * @returns {string[]} Neighbors.
   */
  getNeighbors() {
    return this.params.neighbors;
  }

  /**
   * Get visibility state.
   * @returns {boolean} True, if stage is visible, else false.
   */
  isVisible() {
    return this.isVisibleState;
  }

  /**
   * Toggle playfulness.
   * @param {boolean} [state] If true, be playful, else not.
   */
  togglePlayfulness(state) {
    this.shouldBePlayful = (typeof state === 'boolean') ?
      state :
      !this.shouldBePlayful;
  }

  /**
   * Focus.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.skipNextFocusHandler] If true, prevent show label.
   */
  focus(params = {}) {
    this.skipNextFocusHandler = params.skipNextFocusHandler;
    this.dom.focus();
  }

  /**
   * Update ARIA label.
   * @param {object} [params] Parameters.
   * @param {string} [params.customText] Custom aria label text.
   */
  updateAriaLabel(params = {}) {
    const stageLabel = params.customText ||
      this.params.dictionary.get('a11y.stageButtonLabel')
        .replace(/@stagelabel/, this.params.label);

    let stateLabel;
    if (
      this.state === this.params.globals.get('states')['locked'] ||
      this.state === this.params.globals.get('states')['unlocking']
    ) {
      stateLabel = this.params.dictionary.get('a11y.locked');
    }
    else if (
      this.state === this.params.globals.get('states')['completed'] ||
      this.state === this.params.globals.get('states')['cleared']
    ) {
      stateLabel = this.params.dictionary.get('a11y.cleared');
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
   * @param {string} type Event type.
   * @param {function} callback Callback function.
   */
  addEventListener(type, callback) {
    this.dom.addEventListener(type, callback);
  }

  /**
   * Remove event listener.
   * @param {string} type Event type.
   * @param {function} callback Callback function.
   */
  removeEventListener(type, callback) {
    this.dom.removeEventListener(type, callback);
  }

  /**
   * Determine whether stage can be start stage.
   * @returns {boolean} True, if stage can be start stage. Else false.
   */
  canBeStartStage() {
    return this.params.canBeStartStage || false;
  }

  /**
   * Get access restrictions.
   * @returns {object} Settings for access restrictions.
   */
  getAccessRestrictions() {
    return this.params.accessRestrictions;
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   */
  show(params = {}) {
    const makeVisible = () => {
      this.dom.classList.remove('display-none');
      window.requestAnimationFrame(() => {
        this.dom.classList.remove('transparent');
      });
    };

    if (params.queue) {
      this.callbacks.onAddedToQueue(() => {
        makeVisible();
      });
    }
    else {
      makeVisible();
    }

    this.isVisibleState = true;
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
    this.dom.classList.add('transparent');
    this.isVisibleState = false;
  }

  /**
   * Unlock.
   */
  unlock() {
    if (
      this.state === this.params.globals.get('states')['locked'] ||
      this.state === this.params.globals.get('states')['unlocking']
    ) {
      // Do not unlock if there's a restriction that is not yet met
      if (
        typeof (this.params?.accessRestrictions?.minScore) === 'number' &&
        this.params?.accessRestrictions?.minScore > this.params.globals.get('getScore')()
      ) {
        this.setState('unlocking');
        return;
      }

      this.params.globals.get('read')(this.params.dictionary
        .get('a11y.stageUnlocked')
        .replace(/@stagelabel/, this.params.label)
      );

      this.setState('open');
    }
  }

  /**
   * Update telemetry.
   * @param {object} [params] Parameters.
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
      else {
        return;
      }

      this.dom.style.setProperty(
        `--stage-${styleProperty}`, `${params[property]}%`
      );
    }
  }

  /**
   * Update color.
   *
   * Will set text color based on contrast to background color.
   */
  updateColor() {
    if (!this.dom.isConnected) {
      return; // Not attached yet, no values.
    }

    const backgroundColor = Color(
      this.contentComputedStyle.getPropertyValue('background-color')
    );

    // Set text color to contrast color with higher contrast
    const colorContrastDark = this.contentComputedStyle
      .getPropertyValue('--stage-color-contrast-dark');

    const colorContrastLight = this.contentComputedStyle
      .getPropertyValue('--stage-color-contrast-light');

    const contrastDark = backgroundColor.contrast(Color(colorContrastDark));
    const contrastLight = backgroundColor.contrast(Color(colorContrastLight));

    this.content.classList.toggle('dark-text', contrastDark > contrastLight);
    this.content.classList.toggle('light-text', contrastDark <= contrastLight);

    // Set border color
    if (backgroundColor.isDark()) {
      this.content.style.setProperty(
        '--stage-color-border',
        backgroundColor.darken(0.3).rgb().string()
      );
    }
    else {
      this.content.style.setProperty(
        '--stage-color-border',
        backgroundColor.lighten(0.3).rgb().string()
      );
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
   * Animate
   * @param {string} animationName Animation name.
   */
  animate(animationName) {
    if (typeof animationName !== 'string' || this.isAnimating) {
      return;
    }

    if (!this.params.globals.get('params').visual.misc.useAnimation) {
      return; // Animation deactivated by author or user preference
    }

    this.isAnimating = true;

    this.dom.addEventListener('animationend', this.handleAnimationEnded);

    this.dom.classList.add('animate');
    this.dom.classList.add(`animate-${animationName}`);
  }

  /**
   * Handle animation ended.
   */
  handleAnimationEnded() {
    this.dom.classList.remove('animate');
    this.dom.className = this.dom.className.replace(/animate-\w*/g, '');

    this.dom.removeEventListener('animationend', this.handleAnimationEnded);

    this.isAnimating = false;
  }

  /**
   * Handle click.
   */
  handleClick() {
    if (this.isDisabledState) {
      return;
    }

    this.label.hide();

    if (
      this.state === this.params.globals.get('states')['locked'] ||
      this.state === this.params.globals.get('states')['unlocking'] ||
      this.state === this.params.globals.get('states')['sealed']
    ) {
      this.animate('shake');
      this.params.jukebox.play('clickStageLocked');

      if (
        (typeof this.params.accessRestrictions?.minScore === 'number') &&
        (
          this.state === this.params.globals.get('states')['locked'] ||
          this.state === this.params.globals.get('states')['unlocking']
        )
      ) {
        this.callbacks.onAccessRestrictionsHit({
          id: this.params.id,
          minScore: this.params.accessRestrictions?.minScore
        });
      }

      return;
    }

    this.callbacks.onClicked(this.params.id, this.state);
  }

  /**
   * Handle mouseover.
   * @param {Event} event Event that triggered.
   */
  handleMouseOver(event) {
    if (this.skipNextFocusHandler) {
      this.skipNextFocusHandler = false;
      return; // Don't show when focus was gained from closing exercise.
    }

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
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    const state = params.isInitial ?
      this.params.state :
      this.params.globals.get('states')['locked'];

    this.setState(state);

    if (
      [this.params.globals.get('states')['locked'], this.params.globals.get('states')['unlocking']]
        .includes(state)
    ) {
      this.setTabIndex('-1');
    }

    this.shouldBePlayful = true;

    if (params.isInitial && this.params.visible) {
      this.show();
    }
    else {
      this.hide();
    }
  }

  /**
   * Get state.
   * @returns {number} State id.
   */
  getState() {
    return this.state;
  }

  /**
   * Set exercise state.
   * @param {number|string} state State constant.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.force] If true, will set state unconditionally.
   */
  setState(state, params = {}) {
    const states = this.params.globals.get('states');
    const globalParams = this.params.globals.get('params');

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
    else if (state === states['sealed']) {
      newState = states['sealed'];
    }

    if (typeof newState !== 'number') {
      return;
    }

    if (!this.state || this.state !== newState) {
      this.state = newState;

      // Callback to run once exercise screen closed
      const callback = () => {
        for (const [key, value] of Object.entries(states)) {
          if (value !== this.state) {
            this.content.classList.remove(`h5p-game-map-stage-${key}`);
          }
          else {
            this.content.classList.add(`h5p-game-map-stage-${key}`);
          }
        }

        this.updateAriaLabel();

        window.requestAnimationFrame(() => {
          this.updateColor();
        });

        // Put animation and sound in queue
        if (this.shouldBePlayful) {
          if (newState === states['open'] || newState === states['opened']) {
            this.animate('bounce');
            this.params.jukebox.play('unlockStage');
          }
          else if (newState === states['cleared']) {
            this.animate('bounce');
            this.params.jukebox.play('clearStage');
          }
        }
      };

      // Optional queue params, e.g. stalling following callbacks in queue
      const params = {};

      // Make sure to add a blocking delay for when stages are cleared
      if (this.shouldBePlayful) {
        if (newState === states['cleared']) {
          params.block = Stage.ANIMATION_CLEARED_BLOCK_MS;
        }
        else if (newState === states['sealed']) {
          params.skipQueue = true;
        }
      }
      else {
        params.block = 0;
      }

      this.callbacks.onAddedToQueue(callback, params);

      this.callbacks.onStateChanged(this.params.id, this.state);
    }
  }

  /**
   * Toggle tabbable.
   * @param {string|number} state Tabindex state.
   * @param {object} params Parameters.
   * @param {boolean} [params.skipActiveDescendant] If false, don't get active.
   */
  setTabIndex(state, params = {}) {
    if (typeof state !== 'number' && typeof state !== 'string') {
      return;
    }

    this.dom.setAttribute('tabindex', `${state}`);

    if (state === '0' && !params.skipActiveDescendant) {
      this.callbacks.onBecameActiveDescendant(this.params.id);
    }
  }
}

/** @constant {number} LABEL_TIMEOUT_MS Timeout for showing label */
Stage.LABEL_TIMEOUT_MS = 3000;

/** @constant {number} ANIMATION_CLEARED_BLOCK_MS Blockign time */
Stage.ANIMATION_CLEARED_BLOCK_MS = 1000;
