import './exercise-screen.scss';

/** Class representing an exercise screen */
export default class ExerciseScreen {

  /**
   * Exercise holding H5P content.
   *
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-exercise');

    this.h5pContent = document.createElement('div');
    this.h5pContent.classList.add('h5p-game-map-exercise-content');
    this.dom.appendChild(this.h5pContent);
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
