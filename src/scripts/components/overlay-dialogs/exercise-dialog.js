import OverlayDialog from './overlay-dialog.js';
import './exercise-dialog.scss';

export default class ExerciseDialog extends OverlayDialog {

  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    super(params, callbacks);
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {boolean|undefined} [params.isShowingSolutions] If true, showing solutions.
   */
  show(params = {}) {
    if (typeof params.isShowingSolutions === 'boolean') {
      this.instanceContainer.classList.toggle('blocked', !params.isShowingSolutions);
    }

    super.show(params);
  }
}
