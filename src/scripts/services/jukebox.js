export default class Jukebox {

  /**
   * Fill the jukebox with audios.
   *
   * @param {object} [params={}] Parameters.
   */
  static fill(params = {}) {
    for (const key in params) {
      if (!params[key].src) {
        continue;
      }

      Jukebox.add({
        id: key,
        src: params[key].src,
        options: params[key].options ?? {}
      });
    }
  }

  /**
   * Add audio.
   *
   * @param {object} [params = {}] Parameters.
   * @param {string} params.id Id of audio to add.
   * @param {string} params.src URL to audio file.
   * @param {object} [params.options] Options for the audio.
   * @param {boolean} [params.options.loop] If true, loop the audio.
   */
  static add(params = {}) {
    Jukebox.audios[params.id] = {
      loaded: false
    };

    const dom = document.createElement('audio');
    dom.addEventListener('load', () => {
      Jukebox.audios[params.id].loaded = true;
    });
    dom.src = params.src;

    // Handle loops
    if (params.options.loop) {
      dom.addEventListener('ended', () => {
        Jukebox.play(params.id);
      }, false);
    }

    Jukebox.audios[params.id].dom = dom;

    const track = Jukebox.audioContext.createMediaElementSource(dom);
    track.connect(Jukebox.audioContext.destination);
  }

  /**
   * Play audio.
   *
   * @param {string} id Id of audio to play.
   * @returns {boolean} True, if audio could be played. Else false.
   */
  static async play(id) {
    if (Jukebox.isMuted || !Jukebox.audios[id]) {
      return false;
    }

    // Check if context is in suspended state (autoplay policy)
    if (Jukebox.audioContext.state === 'suspended') {
      Jukebox.audioContext.resume();
    }

    try {
      await Jukebox.audios[id].dom.play();
    }
    catch (error) {
      return false;
    }

    return true;
  }

  /**
   * Stop audio.
   *
   * @param {string} id Id of audio to stop.
   */
  static stop(id) {
    if (!Jukebox.audios[id]) {
      return;
    }

    Jukebox.audios[id].dom.pause();
  }

  /**
   * Stop all audios.
   */
  static stopAll() {
    for (const id in Jukebox.audios) {
      Jukebox.stop(id);
    }
  }

  /**
   * Get DOM element of audio.
   *
   * @param {string} id Id of audio to get DOM element for.
   * @returns {HTMLElement|undefined} Audio element.
   */
  static getDOM(id) {
    if (!Jukebox.audios[id]) {
      return;
    }

    return Jukebox.audios[id].dom;
  }

  /**
   * Get audio ids.
   *
   * @returns {string[]} Audio ids.
   */
  static getAudioIds() {
    return Object.keys(Jukebox.audios);
  }

  /**
   * Mute.
   */
  static mute() {
    Jukebox.stopAll();
    Jukebox.isMuted = true;
  }

  /**
   * Unmute.
   */
  static unmute() {
    Jukebox.isMuted = false;
  }
}

Jukebox.audios = {};

Jukebox.audioContext = new AudioContext();

Jukebox.isMuted = false;
