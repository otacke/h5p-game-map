import './message-box.scss';

/** @constant {string} DEFAULT_TEXT Default message text. */
const DEFAULT_TEXT = 'Something important was supposed to be here.';

export default class MessageBox {

  /**
   * General purpose message box.
   * @class
   * @param {object} [params] Parameters, same as H5P.ConfirmationDialog.
   */
  constructor(params = {}) {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-message-box');

    const message = document.createElement('p');
    message.classList.add('h5p-game-map-message-box-message');
    message.innerText = params.text || DEFAULT_TEXT;
    this.dom.append(message);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }
}
