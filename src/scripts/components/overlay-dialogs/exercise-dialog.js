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
}
