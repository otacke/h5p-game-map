import Dictionary from '@services/dictionary';
import Util from '@services/util';
import './exercise-screen.scss';

/** Class representing an exercise screen */
export default class ExerciseScreen {

  /**
   * Exercise holding H5P content.
   *
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onClosed] Callback when exercise closed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClosed: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise');

    // Container for H5P content, can be CSS-transformed
    this.contentContainer = document.createElement('div');
    this.contentContainer.classList.add('h5p-game-map-exercise-content-container');
    this.dom.append(this.contentContainer);

    this.h5pContent = document.createElement('div');
    this.h5pContent.classList.add('h5p-game-map-exercise-content');
    this.contentContainer.append(this.h5pContent);

    this.buttonClose = document.createElement('button');
    this.buttonClose.classList.add('h5p-game-map-exercise-button-close');
    this.buttonClose.setAttribute('aria-label', Dictionary.get('a11y.close'));
    this.buttonClose.addEventListener('click', () => {
      this.callbacks.onClicked();
    });
    this.contentContainer.append(this.buttonClose);
  }

  /**
   * Get DOM for exercise.
   *
   * @returns {HTMLElement} DOM for exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');
    window.requestAnimationFrame(() => {
      this.dom.scrollIntoView({block: 'start'});
    });
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  setH5PContent(h5pDOM) {
    this.h5pContent.innerHTML = '';
    this.h5pContent.appendChild(h5pDOM);
  }
}
