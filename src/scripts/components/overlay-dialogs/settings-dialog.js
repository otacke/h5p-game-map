import OverlayDialog from './overlay-dialog.js';
import Slider from '@components/slider/slider.js';
import './settings-dialog.scss';

export default class SettingsDialog extends OverlayDialog {

  /**
   * @class SettingsDialog
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    super(params, callbacks);

    this.callbacks.onValueChanged = callbacks.onValueChanged || (() => {});
    this.setTitle(this.params.dictionary.get('l10n.settings'));

    this.buildDOM();
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    const settingsWrapperDOM = document.createElement('div');
    settingsWrapperDOM.classList.add('h5p-game-map-settings-wrapper');

    // Volume Music
    const volumeMusic = document.createElement('div');
    volumeMusic.classList.add('settings-group');
    settingsWrapperDOM.append(volumeMusic);

    const volumeMusicLabel = document.createElement('span');
    volumeMusicLabel.classList.add('h5p-game-map-settings-label');
    volumeMusicLabel.innerText = this.params.dictionary.get('l10n.volumeMusic');
    volumeMusic.append(volumeMusicLabel);

    const volumeMusicSlider = new Slider(
      {
        ariaLabel: this.params.dictionary.get('l10n.volumeMusic'),
        value: this.params.values.volumeMusic,
      },
      {
        onSeeked: (value) => {
          this.callbacks.onValueChanged('volumeMusic', value);
        },
      },
    );
    volumeMusic.append(volumeMusicSlider.getDOM());

    // Volume SFX
    const volumeSFX = document.createElement('div');
    volumeSFX.classList.add('settings-group');
    settingsWrapperDOM.append(volumeSFX);

    const volumeSFXLabel = document.createElement('span');
    volumeSFXLabel.classList.add('h5p-game-map-settings-label');
    volumeSFXLabel.innerText = this.params.dictionary.get('l10n.volumeSFX');
    volumeSFX.append(volumeSFXLabel);

    const volumeSFXSlider = new Slider(
      {
        ariaLabel: this.params.dictionary.get('l10n.volumeSFX'),
        value: this.params.values.volumeSFX,
      },
      {
        onSeeked: (value) => {
          this.callbacks.onValueChanged('volumeSFX', value);
        },
      },
    );
    volumeSFX.append(volumeSFXSlider.getDOM());

    this.setContent(settingsWrapperDOM);
  }
}
