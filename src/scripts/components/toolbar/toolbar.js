import ScoreContainer from './score-container';
import ToolbarButton from './toolbar-button';
import Dictionary from '@services/dictionary';
import Util from '@services/util';
import './toolbar.scss';

/** Class representing the button bar */
export default class Toolbar {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object[]} [params.buttons] Button parameters.
   * @param {boolean} [params.hidden=false] If true, hide toolbar.
   * @param {object} [callbacks={}] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      buttons: [],
      hidden: false
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    this.buttons = {};

    // Build DOM
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-toolbar-tool-bar');
    this.dom.setAttribute('role', 'toolbar');

    this.dom.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    if (this.params.hidden) {
      this.hide();
    }

    // Headline
    if (this.params.headline) {
      const headLineId = H5P.createUUID();

      // Use headline as label for toolbar
      this.dom.setAttribute('aria-labelledby', headLineId);

      const headline = document.createElement('div');
      headline.classList.add('toolbar-headline');
      headline.setAttribute('id', headLineId);
      headline.innerText = this.params.headline;
      this.dom.append(headline);
    }
    else {
      this.dom.setAttribute(
        'aria-label', Dictionary.get('a11y.toolbarFallbackLabel')
      );
    }

    // Status values
    this.scoreContainer = new ScoreContainer();
    this.dom.append(this.scoreContainer.getDOM());

    // Buttons
    this.buttonsContainer = document.createElement('div');
    this.buttonsContainer.classList.add('toolbar-buttons');
    this.dom.append(this.buttonsContainer);

    this.params.buttons.forEach((button) => {
      this.addButton(button);
    });

    // Make first button active one
    Object.values(this.buttons).forEach((button, index) => {
      button.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
    this.currentButtonIndex = 0;
  }

  /**
   * Return the DOM for this class.
   *
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Focus whatever should get focus.
   */
  focus() {
    Object.values(this.buttons)[this.currentButtonIndex]?.focus();
  }

  /**
   * Add button.
   *
   * @param {object} [button={}] Button parameters.
   */
  addButton(button = {}) {
    if (typeof button.id !== 'string') {
      return; // We need an id at least
    }

    this.buttons[button.id] = new ToolbarButton(
      {
        id: button.id,
        ...(button.a11y && { a11y: button.a11y }),
        classes: ['toolbar-button', `toolbar-button-${button.id}`],
        ...(typeof button.disabled === 'boolean' && {
          disabled: button.disabled
        }),
        ...(button.active && { active: button.active }),
        ...(button.type && { type: button.type }),
        ...(button.pulseStates && { pulseStates: button.pulseStates }),
        ...(button.pulseIndex && { pulseIndex: button.pulseIndex })
      },
      {
        ...(typeof button.onClick === 'function' && {
          onClick: (event, params) => {
            button.onClick(event, params);
          }
        })
      }
    );
    this.buttonsContainer.appendChild(this.buttons[button.id].getDOM());
  }

  /**
   * Set button attributes.
   *
   * @param {string} id Button id.
   * @param {object} attributes HTML attributes to set.
   */
  setButtonAttributes(id = '', attributes = {}) {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    for (let attribute in attributes) {
      this.buttons[id].setAttribute(attribute, attributes[attribute]);
    }
  }

  /**
   * Force button state.
   *
   * @param {string} id Button id.
   * @param {boolean|number} active If true, toggle active, else inactive.
   */
  forceButton(id = '', active) {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].force(active);
  }

  /**
   * Enable button.
   *
   * @param {string} id Button id.
   */
  enableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].enable();
  }

  /**
   * Disable button.
   *
   * @param {string} id Button id.
   */
  disableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].disable();
  }

  /**
   * Show button.
   *
   * @param {string} id Button id.
   */
  showButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].show();
  }

  /**
   * Hide button.
   *
   * @param {string} id Button id.
   */
  hideButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].hide();
  }

  /**
   * Decloak button.
   *
   * @param {string} id Button id.
   */
  decloakButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].decloak();
  }

  /**
   * Cloak button.
   *
   * @param {string} id Button id.
   */
  cloakButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].cloak();
  }

  /**
   * Focus a button.
   *
   * @param {string} id Button id.
   */
  focusButton(id = '') {
    if (!this.buttons[id] || this.buttons[id].isCloaked()) {
      return; // Button not available
    }

    this.buttons[id].focus();
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
   * Move button focus.
   *
   * @param {number} offset Offset to move position by.
   */
  moveButtonFocus(offset) {
    if (typeof offset !== 'number') {
      return;
    }
    if (
      this.currentButtonIndex + offset < 0 ||
      this.currentButtonIndex + offset > Object.keys(this.buttons).length - 1
    ) {
      return; // Don't cycle
    }
    Object.values(this.buttons)[this.currentButtonIndex]
      .setAttribute('tabindex', '-1');
    this.currentButtonIndex = this.currentButtonIndex + offset;
    const focusButton = Object.values(this.buttons)[this.currentButtonIndex];
    focusButton.setAttribute('tabindex', '0');
    focusButton.focus();
  }

  /**
   * Handle key down.
   *
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      this.moveButtonFocus(-1);
    }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      this.moveButtonFocus(1);
    }
    else if (event.code === 'Home') {
      this.moveButtonFocus(0 - this.currentButtonIndex);
    }
    else if (event.code === 'End') {
      this.moveButtonFocus(
        Object.keys(this.buttons).length - 1 - this.currentButtonIndex
      );
    }
    else {
      return;
    }
    event.preventDefault();
  }

  /**
   * Set scores in score container.
   *
   * @param {object} [params={}] Parameters.
   * @param {number} [params.score] Score.
   * @param {number} [params.maxScore] Maximum score.
   */
  setScores(params = {}) {
    if (typeof params.score === 'number') {
      this.scoreContainer.setScore(params.score);
    }

    if (typeof params.maxScore === 'number') {
      this.scoreContainer.setMaxScore(params.maxScore);
    }
  }

  /**
   * Show score container.
   */
  showScores() {
    this.scoreContainer.show();
  }

  /**
   * Show score container.
   */
  hideScores() {
    this.scoreContainer.hide();
  }

  /**
   * Toggle solution mode on and off.
   *
   * @param {boolean} state If true, solution mode is on, else off.
   */
  toggleSolutionMode(state) {
    this.dom.classList.toggle('solution-mode', state);
  }
}
