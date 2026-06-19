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
   * Get the jukebox key for a map's background music.
   * Falls back to the global `backgroundMusic` key when no per-map track is registered.
   * @param {number} mapIndex Index of the gamemap.
   * @returns {string} Key to look up in the jukebox.
   */
  getBackgroundMusicKey(mapIndex) {
    const perMapKey = `backgroundMusic-${mapIndex}`;
    return this.params.jukebox?.has(perMapKey) ? perMapKey : 'backgroundMusic';
  }

  /**
   * Try start background music.
   * @returns {boolean} True, id audio could be started.
   */
  async tryStartBackgroundMusic() {
    const currentMapIndex = this.maps.getCurrentIndex();
    const backgroundMusicKey = this.getBackgroundMusicKey(currentMapIndex);

    if (this.params.jukebox.audioContext?.state === 'suspended') {
      await this.params.jukebox.audioContext.resume();
      this.params.jukebox.unmuteAll();
      return this.params.jukebox.play(backgroundMusicKey);
    }
    else {
      this.params.jukebox.unmuteAll();
      return this.params.jukebox.play(backgroundMusicKey);
    }
  }
}
