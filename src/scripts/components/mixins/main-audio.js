/**
 * Mixin containing methods related to audio.
 */
export default class MainAudio {
  /**
   * Toggle audio.
   * @param {boolean} [state] State to set audio to.
   */
  toggleAudio(state) {
    this.isAudioOn = (typeof state === 'boolean') ? state : !this.isAudioOn;

    if (!this.isAudioOn) {
      this.params.jukebox.muteAll();
    }
    else {
      this.tryStartBackgroundMusic();
    }
  }

  /**
   * Try start background music.
   * @returns {boolean} True, id audio could be started.
   */
  async tryStartBackgroundMusic() {
    if (this.params.jukebox.audioContext.state === 'suspended') {
      await this.params.jukebox.audioContext.resume();
      this.params.jukebox.unmuteAll();
      return this.params.jukebox.play('backgroundMusic');
    }
    else {
      this.params.jukebox.unmuteAll();
      return this.params.jukebox.play('backgroundMusic');
    }
  }

  /**
   * Handle autoplay of audio.
   */
  async handleAutoplay() {
    if (!this.params.jukebox.getAudioIds().includes('backgroundMusic')) {
      this.toolbar.forceButton('audio', true);
    }

    if (this.autoplayHandlerRunning) {
      return;
    }

    this.autoplayHandlerRunning = true;

    const couldPlay = await this.tryStartBackgroundMusic();
    this.toolbar.forceButton('audio', couldPlay);
  }
}
