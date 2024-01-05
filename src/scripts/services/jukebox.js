/* Service to handle sounds via WebAudio */
export default class Jukebox {

  /**
   * @class
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onAudioContextReady] Callback for when audio context is ready.
   */
  constructor(callbacks = {}) {
    this.callbacks = {};
    this.callbacks.onAudioContextReady =
      callbacks.onAudioContextReady || (() => {});

    // Set up simple dispatcher for events
    this.dispatcher = document.createElement('div');

    // Handle audio was buffered successfully
    this.dispatcher.addEventListener('bufferloaded', (event) => {
      this.setAudioBuffer(event.detail);

      if (this.queued.includes(event.detail.id)) {
        this.removeFromQueue(event.detail.id);
        this.play();
      }
    });

    this.audios = {}; // Key based audio storage.
    this.queued = []; // Ids of queued audios.

    // webkit prefix still required for older iOS versions.
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (this.audioContext) {
      return;
    }

    this.audioContext = new AudioContext();
  }

  /**
   * Fill the jukebox with audios.
   * @param {object} [params] Parameters.
   */
  fill(params = {}) {
    for (const key in params) {
      if (!params[key].src) {
        continue;
      }

      this.add({
        id: key,
        src: params[key].src,
        options: params[key].options ?? {}
      });
    }
  }

  /**
   * Add audio.
   * @param {object} [params] Parameters.
   * @param {string} params.id Id of audio to add.
   * @param {string} params.src URL to audio file.
   * @param {object} [params.options] Options for the audio.
   * @param {boolean} [params.options.loop] If true, loop the audio.
   * @param {boolean} [params.options.muted] If true, be muted.
   * @param {string} [params.options.groupId] Optional group id.
   */
  add(params = {}) {
    if (!this.audioContext) {
      return;
    }

    this.audios[params.id] = {
      loop: params.options.loop || false,
      isMuted: params.options.muted || false,
      groupId: params.options.groupId || 'default'
    };

    this.bufferSound({ id: params.id, url: params.src });
  }

  /**
   * Get audio's state.
   * @param {string} id Id of audio.
   * @returns {number|undefined} State id.
   */
  getState(id) {
    if (!this.audios[id]) {
      return;
    }

    return this.audios[id].state;
  }

  /**
   * Set state for audio.
   * @param {string} id Id of audio to set state for.
   * @param {string|number} newState New state id.
   */
  setState(id, newState) {
    if (typeof newState === 'string') {
      newState = Jukebox.STATES[newState];
    }

    if (
      typeof newState !== 'number' ||
      Object.values(Jukebox.STATES).indexOf(newState) === -1
    ) {
      return; // Not a valid state
    }

    if (!this.audios[id] || this.audios[id].state === newState) {
      return; // Same state or no audio
    }

    this.audios[id].state = newState;
    this.dispatcher.dispatchEvent(
      new CustomEvent('stateChanged', { detail: { id: id, state: newState } })
    );
  }

  /**
   * Set audio buffer.
   * @param {object} [params] Parameters.
   * @param {string} params.id Id of audio to set buffer for.
   * @param {object} params.buffer Audio buffer.
   */
  setAudioBuffer(params = {}) {
    if (!this.audios[params.id]) {
      return;
    }

    this.audios[params.id].buffer = params.buffer;
    this.setState(params.id, Jukebox.STATES['stopped']);
  }

  /**
   * Buffer sound.
   * @param {object} [params] Parameters.
   * @param {string} params.id Id of audio.
   * @param {string} params.url URL of audio to buffer.
   */
  bufferSound(params = {}) {
    if (!this.audios[params.id]) {
      return;
    }

    this.setState(params.id, Jukebox.STATES['buffering']);

    var request = new XMLHttpRequest();
    request.open('GET', params.url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = () => {
      this.audioContext.decodeAudioData(request.response, (buffer) => {
        const event = new CustomEvent(
          'bufferloaded', { detail: { id: params.id, buffer: buffer } }
        );
        this.dispatcher.dispatchEvent(event);
      });
    };
    request.send();
  }

  /**
   * Play audio.
   * @param {string} id Id of audio to play.
   * @returns {boolean} True, if audio could be played. Else false.
   */
  play(id) {
    if (!this.audios[id]) {
      return false;
    }

    if (this.audios[id].isMuted) {
      return false; // Muted
    }

    if (this.getState(id) === Jukebox.STATES['playing']) {
      return false; // Already playing
    }

    if (this.audioContext.state === 'suspended') {
      return false;
    }

    if (this.getState(id) === Jukebox.STATES['buffering']) {
      this.addToQueue(id);
      return false;
    }

    const audio = this.audios[id];

    const source = this.audioContext.createBufferSource();
    source.buffer = audio.buffer;

    // Add gain node
    const gainNode = this.audioContext.createGain();
    source
      .connect(gainNode)
      .connect(this.audioContext.destination);
    this.audios[id].gainNode = gainNode;

    // Set loop if necessary
    source.loop = this.audios[id].loop;

    audio.source = source;

    audio.source.onended = () => {
      this.stop(id);
    };

    audio.source.start();
    this.setState(id, Jukebox.STATES['playing']);

    return true;
  }

  /**
   * Add audio to play queue.
   * @param {string} id of audio to add to play queue.
   */
  addToQueue(id) {
    if (!this.queued.includes(id)) {
      this.queued.push(id);
    }
  }

  /**
   * Remove audio to play queue.
   * @param {string} id of audio to remove from play queue.
   */
  removeFromQueue(id) {
    this.queued = this.queued.filter((entry) => entry !== id);
  }

  /**
   * Stop audio.
   * @param {string} id Id of audio to stop.
   */
  stop(id) {
    if (!this.audios[id]) {
      return;
    }

    this.removeFromQueue(id);

    if (this.getState(id) !== Jukebox.STATES['playing']) {
      return;
    }

    this.audios[id].source?.stop();
    this.setState(id, Jukebox.STATES['stopped']);
  }

  /**
   * Stop audio group.
   * @param {string} groupId GroupId of audios to stop.
   */
  stopGroup(groupId) {
    if (!groupId) {
      return;
    }

    for (const id in this.audios) {
      if (this.audios[id].groupId === groupId) {
        this.stop(id);
      }
    }
  }

  /**
   * Stop all audios.
   */
  stopAll() {
    for (const id in this.audios) {
      this.stop(id);
    }
  }

  /**
   * Determine whether audio is playing.
   * @param {string} id Id of audio to be checked.
   * @returns {boolean} True, if audio is playing. Else false.
   */
  isPlaying(id) {
    if (!this.audios[id]) {
      return false;
    }

    return this.getState(id) === Jukebox.STATES['playing'];
  }

  /**
   * Fade audio.
   * @param {string} id Id of audio to fade.
   * @param {object} [params] Parameters.
   * @param {string} params.type `in` to fade in, `out` to fade out.
   * @param {number} [params.time] Time for fading.
   * @param {number} [params.interval] Interval for fading update.
   */
  fade(id, params = {}) {
    if (!this.audios[id] || this.audios[id].isMuted) {
      return; // Nothing to do here
    }

    if (params.type !== 'in' && params.type !== 'out') {
      return; // Missing required value
    }

    // Clear previous fade timeout
    window.clearTimeout(this.audios[id].fadeTimeout);
    if (
      params.type === 'out' && this.audios[id].gainNode.gain.value === 0 ||
      params.type === 'in' && this.audios[id].gainNode.gain.value === 1
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
        params.gainDelta = (1 - this.audios[id].gainNode.gain.value) /
        (params.time / params.interval);
      }
      else {
        params.gainDelta = this.audios[id].gainNode.gain.value /
        (params.time / params.interval);
      }
    }

    // End with clean gain values
    if (params.time <= 0) {
      this.audios[id].gainNode.gain.value = (params.type === 'in') ?
        1 :
        0;

      return;
    }

    // Update gain
    if (params.type === 'in') {
      this.audios[id].gainNode.gain.value =
        Math.min(1, this.audios[id].gainNode.gain.value += params.gainDelta);
    }
    else {
      this.audios[id].gainNode.gain.value =
      Math.max(0, this.audios[id].gainNode.gain.value -= params.gainDelta);
    }

    this.audios[id].fadeTimeout = window.setTimeout(() => {
      this.fade(
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
   * @param {string} id Id of audio to get DOM element for.
   * @returns {HTMLElement|undefined} Audio element.
   */
  getDOM(id) {
    if (!this.audios[id]) {
      return;
    }

    return this.audios[id].dom;
  }

  /**
   * Get audio ids.
   * @returns {string[]} Audio ids.
   */
  getAudioIds() {
    return Object.keys(this.audios);
  }

  /**
   * Mute all audios.
   */
  muteAll() {
    for (const id in this.audios) {
      this.mute(id);
    }
  }

  /**
   * Unmute.
   * @param {string} id Id of sound to unmute.
   */
  mute(id) {
    if (!this.audios[id]) {
      return;
    }

    this.stop(id);
    this.audios[id].isMuted = true;
  }

  /**
   * Unmute all audios.
   */
  unmuteAll() {
    for (const id in this.audios) {
      this.unmute(id);
    }
  }

  /**
   * Unmute.
   * @param {string} id Id of sound to unmute.
   */
  unmute(id) {
    if (!this.audios[id]) {
      return;
    }

    this.audios[id].isMuted = false;
  }

  /**
   * Determine whether an audio is muted.
   * @param {string} id Id of sound to check.
   * @returns {boolean} True, if audio is muted. Else false.
   */
  isMuted(id) {
    if (!this.audios[id]) {
      return false;
    }

    return this.audios[id].isMuted;
  }
}

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
