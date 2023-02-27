/* Service to handle sounds via WebAudio */
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
   * @param {boolean} [params.options.muted] If true, be muted.
   * @param {string} [params.options.groupId] Optional group id.
   */
  static add(params = {}) {
    if (!Jukebox.audioContext) {
      return;
    }

    Jukebox.audios[params.id] = {
      loop: params.options.loop || false,
      isMuted: params.options.muted || false,
      groupId: params.options.groupId || 'default'
    };

    Jukebox.bufferSound({ id: params.id, url: params.src });
  }

  /**
   * Get audio's state.
   *
   * @param {string} id Id of audio.
   * @returns {number|undefined} State id.
   */
  static getState(id) {
    if (!Jukebox.audios[id]) {
      return;
    }

    return Jukebox.audios[id].state;
  }

  /**
   * Set state for audio.
   *
   * @param {string} id Id of audio to set state for.
   * @param {string|number} newState New state id.
   */
  static setState(id, newState) {
    if (typeof newState === 'string') {
      newState = Jukebox.STATES[newState];
    }

    if (
      typeof newState !== 'number' ||
      Object.values(Jukebox.STATES).indexOf(newState) === -1
    ) {
      return; // Not a valid state
    }

    if (!Jukebox.audios[id] || Jukebox.audios[id].state === newState) {
      return; // Same state or no audio
    }

    Jukebox.audios[id].state = newState;
    Jukebox.dispatcher.dispatchEvent(
      new CustomEvent('stateChanged', { detail: { id: id, state: newState } })
    );
  }

  /**
   * Set audio buffer.
   *
   * @param {object} [params={}] Parameters.
   * @param {string} params.id Id of audio to set buffer for.
   * @param {object} params.buffer Audio buffer.
   */
  static setAudioBuffer(params = {}) {
    if (!Jukebox.audios[params.id]) {
      return;
    }

    Jukebox.audios[params.id].buffer = params.buffer;
    Jukebox.setState(params.id, Jukebox.STATES['stopped']);
  }

  /**
   * Buffer sound.
   *
   * @param {object} [params={}] Parameters.
   * @param {string} params.id Id of audio.
   * @param {string} params.url URL of audio to buffer.
   */
  static bufferSound(params = {}) {
    if (!Jukebox.audios[params.id]) {
      return;
    }

    Jukebox.setState(params.id, Jukebox.STATES['buffering']);

    var request = new XMLHttpRequest();
    request.open('GET', params.url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = () => {
      Jukebox.audioContext.decodeAudioData(request.response, (buffer) => {
        const event = new CustomEvent(
          'bufferloaded', { detail: { id: params.id, buffer: buffer } }
        );
        Jukebox.dispatcher.dispatchEvent(event);
      });
    };
    request.send();
  }

  /**
   * Play audio.
   *
   * @param {string} id Id of audio to play.
   * @returns {boolean} True, if audio could be played. Else false.
   */
  static play(id) {
    if (!Jukebox.audios[id]) {
      return false;
    }

    if (Jukebox.audios[id].isMuted) {
      return false; // Muted
    }

    if (Jukebox.getState(id) === Jukebox.STATES['playing']) {
      return false; // Already playing
    }

    if (Jukebox.audioContext.state === 'suspended') {
      return false;
    }

    if (Jukebox.getState(id) === Jukebox.STATES['buffering']) {
      Jukebox.addToQueue(id);
      return false;
    }

    const audio = Jukebox.audios[id];

    const source = Jukebox.audioContext.createBufferSource();
    source.buffer = audio.buffer;

    // Add gain node
    const gainNode = Jukebox.audioContext.createGain();
    source
      .connect(gainNode)
      .connect(Jukebox.audioContext.destination);
    Jukebox.audios[id].gainNode = gainNode;

    // Set loop if necessary
    source.loop = Jukebox.audios[id].loop;

    audio.source = source;

    audio.source.onended = () => {
      Jukebox.stop(id);
    };

    audio.source.start();
    Jukebox.setState(id, Jukebox.STATES['playing']);

    return true;
  }

  /**
   * Add audio to play queue.
   *
   * @param {string} id of audio to add to play queue.
   */
  static addToQueue(id) {
    if (!Jukebox.queued.includes(id)) {
      Jukebox.queued.push(id);
    }
  }

  /**
   * Remove audio to play queue.
   *
   * @param {string} id of audio to remove from play queue.
   */
  static removeFromQueue(id) {
    Jukebox.queued = Jukebox.queued.filter((entry) => entry !== id);
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

    Jukebox.removeFromQueue(id);

    if (Jukebox.getState(id) !== Jukebox.STATES['playing']) {
      return;
    }

    Jukebox.audios[id].source?.stop();
    Jukebox.setState(id, Jukebox.STATES['stopped']);
  }

  /**
   * Stop audio group.
   *
   * @param {string} groupId GroupId of audios to stop.
   */
  static stopGroup(groupId) {
    if (!groupId) {
      return;
    }

    for (const id in Jukebox.audios) {
      if (Jukebox.audios[id].groupId === groupId) {
        Jukebox.stop(id);
      }
    }
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
   * Determine whether audio is playing.
   *
   * @param {string} id Id of audio to be checked.
   * @returns {boolean} True, if audio is playing. Else false.
   */
  static isPlaying(id) {
    if (!Jukebox.audios[id]) {
      return false;
    }

    return Jukebox.getState(id) === Jukebox.STATES['playing'];
  }

  /**
   * Fade audio.
   *
   * @param {string} id Id of audio to fade.
   * @param {object} [params={}] Parameters.
   * @param {string} params.type `in` to fade in, `out` to fade out.
   * @param {number} [params.time] Time for fading.
   * @param {number} [params.interval] Interval for fading update.
   */
  static fade(id, params = {}) {
    if (!Jukebox.audios[id] || Jukebox.audios[id].isMuted) {
      return; // Nothing to do here
    }

    if (params.type !== 'in' && params.type !== 'out') {
      return; // Missing required value
    }

    // Clear previous fade timeout
    window.clearTimeout(Jukebox.audios[id].fadeTimeout);
    if (
      params.type === 'out' && Jukebox.audios[id].gainNode.gain.value === 0 ||
      params.type === 'in' && Jukebox.audios[id].gainNode.gain.value === 1
    ) {
      return; // Done
    }

    // Sanitize time
    if (typeof params.time !== 'number') {
      params.time = Jukebox.DEFAULT_FADE_TIME_MS;
    }
    params.time = Math.max(
      Jukebox.DEFAULT_TIMER_INTERVAL_MS, params.time
    );

    // Sanitize interval
    if (typeof params.interval !== 'number') {
      params.interval = Jukebox.DEFAULT_TIMER_INTERVAL_MS;
    }
    params.interval = Math.max(50, params.interval);

    // Set gain delta for each interval
    if (typeof params.gainDelta !== 'number' || params.gainDelta <= 0) {
      if (params.type === 'in') {
        params.gainDelta = (1 - Jukebox.audios[id].gainNode.gain.value) /
        (params.time / params.interval);
      }
      else {
        params.gainDelta = Jukebox.audios[id].gainNode.gain.value /
        (params.time / params.interval);
      }
    }

    // End with clean gain values
    if (params.time <= 0) {
      Jukebox.audios[id].gainNode.gain.value = (params.type === 'in') ?
        1 :
        0;

      return;
    }

    // Update gain
    if (params.type === 'in') {
      Jukebox.audios[id].gainNode.gain.value =
        Math.min(1, Jukebox.audios[id].gainNode.gain.value += params.gainDelta);
    }
    else {
      Jukebox.audios[id].gainNode.gain.value =
      Math.max(0, Jukebox.audios[id].gainNode.gain.value -= params.gainDelta);
    }

    Jukebox.audios[id].fadeTimeout = window.setTimeout(() => {
      Jukebox.fade(
        id,
        {
          time: params.time - params.interval,
          gainDelta: params.gainDelta,
          type: params.type
        }
      );
    }, params.interval);
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
   * Mute all audios.
   */
  static muteAll() {
    for (const id in Jukebox.audios) {
      Jukebox.mute(id);
    }
  }

  /**
   * Unmute.
   *
   * @param {string} id Id of sound to unmute.
   */
  static mute(id) {
    if (!Jukebox.audios[id]) {
      return;
    }

    Jukebox.stop(id);
    Jukebox.audios[id].isMuted = true;
  }

  /**
   * Unmute all audios.
   */
  static unmuteAll() {
    for (const id in Jukebox.audios) {
      Jukebox.unmute(id);
    }
  }

  /**
   * Unmute.
   *
   * @param {string} id Id of sound to unmute.
   */
  static unmute(id) {
    if (!Jukebox.audios[id]) {
      return;
    }

    Jukebox.audios[id].isMuted = false;
  }

  /**
   * Determine whether an audio is muted.
   *
   * @param {string} id Id of sound to check.
   * @returns {boolean} True, if audio is muted. Else false.
   */
  static isMuted(id) {
    if (!Jukebox.audios[id]) {
      return false;
    }

    return Jukebox.audios[id].isMuted;
  }
}

// Set up simple dispatcher for events
Jukebox.dispatcher = document.createElement('div');

// Handle audio was buffered successfully
Jukebox.dispatcher.addEventListener('bufferloaded', (event) => {
  Jukebox.setAudioBuffer(event.detail);

  if (Jukebox.queued.includes(event.detail.id)) {
    Jukebox.removeFromQueue(event.detail.id);
    Jukebox.play();
  }
});

/** @param {object} audios Key based audio storage. */
Jukebox.audios = {};

/** @param {string[]} queued Ids of queued audios. */
Jukebox.queued = [];

// webkit prefix still required for older iOS versions.
const audioContext = window.AudioContext || window.webkitAudioContext;

// This is not best practice, but we want to try to autoplay at least
/** @param {AudioContext} audioContext WebAudio API content. */
Jukebox.audioContext = audioContext ? new audioContext() : null;

/** @constant {number} DEFAULT_TIMER_INTERVAL_MS Default timer interval. */
Jukebox.DEFAULT_TIMER_INTERVAL_MS = 100;

/** @constant {number} DEFAULT_FADE_TIME_MS Default fade time. */
Jukebox.DEFAULT_FADE_TIME_MS = 1000;

/** @constant {object} STATES Stated of audios in jukebox. */
Jukebox.STATES = {
  buffering: 0,
  stopped: 1,
  queued: 2,
  playing: 3,
  paused: 4
};
