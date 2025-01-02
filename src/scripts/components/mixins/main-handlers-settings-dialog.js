/**
 * Mixin containing handlers for exercise.
 */
export default class MainHandlersSettingsDialog {
  /**
   * Handle settings dialog was closed.
   * @param {object} [params] Parameters.
   * @param {function} [params.animationEndedCallback] Callback.
   */
  handleSettingsDialogClosed(params = {}) {
    this.settingsDialog.hide({ animate: true }, () => {
      this.params.globals.get('resize')();
    });
    this.toolbar.enable();
    this.toolbar.forceButton('settings', false, { noCallback: true });
  }

  /**
   * Handle settings dialog open animation ended.
   */
  handleSettingsDialogOpenAnimationEnded() {
    this.params.globals.get('resize')();
  }

  /**
   * Handle exercise dialog value changed.
   * @param {string} id ID.
   * @param {number} value Value.
   */
  handleSettingsDialogValueChanged(id, value) {
    if (id === 'volumeMusic') {
      this.params.jukebox.setVolumeGroup('background', value);
    }
    else if (id === 'volumeSFX') {
      this.params.jukebox.setVolumeGroup('default', value);
    }
  }
}
