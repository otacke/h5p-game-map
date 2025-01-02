import OverlayDialog from './overlay-dialog.js';
import './exercise-dialog.scss';

export default class ExerciseDialog extends OverlayDialog {

  constructor(params = {}, callbacks = {}) {
    super(params, callbacks);
  }
}
