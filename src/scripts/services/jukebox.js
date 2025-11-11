/** @constant {number} DEFAULT_FADE_TIME_MS Default fade time. */
const DEFAULT_FADE_TIME_MS = 1000;

/** @constant {object} STATES Stated of audios in jukebox. */
export const STATES = Object.freeze({
  BUFFERING: 0,
  STOPPED: 1,
  QUEUED: 2,
  PLAYING: 3,
  PAUSED: 4,
});

/** @constant {object} FADE_TYPES Types of fade effects. */
export const FADE_TYPES = Object.freeze({
  IN: 'in',
  OUT: 'out',
});

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
        this.play(event.detail.id);
      }
    });

    this.audios = new Map(); // Key based audio storage.
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
        options: params[key].options ?? {},
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

    if (!params.id || !params.src) {
      return;
    }

    this.audios.set(params.id, {
      loop: params.options.loop || false,
      isMuted: params.options.muted || false,
      volume: 100,
      groupId: params.options.groupId || 'default',
    });

    this.bufferSound({ id: params.id, url: params.src });
  }

  /**
   * Get audio's state.
   * @param {string} id Id of audio.
   * @returns {number|undefined} State id.
   */
  getState(id) {
    return this.audios.get(id)?.state;
  }

  /**
   * Set state for audio.
   * @param {string} id Id of audio to set state for.
   * @param {string|number} newState New state id.
   */
  setState(id, newState) {
    if (typeof newState === 'string') {
      newState = STATES[newState];
    }

    if (!Number.isInteger(newState) || !Object.values(STATES).includes(newState)) {
      return; // Not a valid state
    }

    const audio = this.audios.get(id);
    if (!audio || audio.state === newState) {
      return; // Same state or no audio
    }

    audio.state = newState;
    this.dispatcher.dispatchEvent(
      new CustomEvent('stateChanged', { detail: { id: id, state: newState } }),
    );
  }

  /**
   * Set audio buffer.
   * @param {object} [params] Parameters.
   * @param {string} params.id Id of audio to set buffer for.
   * @param {object} params.buffer Audio buffer.
   */
  setAudioBuffer(params = {}) {
    if (!this.audios.has(params.id)) {
      return;
    }

    this.audios.get(params.id).buffer = params.buffer;
    this.setState(params.id, STATES.STOPPED);
  }

  /**
   * Buffer sound.
   * @param {object} [params] Parameters.
   * @param {string} params.id Id of audio.
   * @param {string} params.url URL of audio to buffer.
   */
  async bufferSound(params = {}) {
    const { id, url } = params || {};

    if (!this.audios.has(id)) {
      return;
    }

    const audio = this.audios.get(id);
    if (audio.isLoading) {
      return; // Already loading
    }

    this.setState(id, STATES.BUFFERING);
    audio.isLoading = true;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Safari-compatible decode fallback (promise or callback form)
      const decode = this.audioContext.decodeAudioData.bind(this.audioContext);
      const buffer = decode.length === 1 ?
        await decode(arrayBuffer) :
        await new Promise((resolve, reject) => decode(arrayBuffer, resolve, reject));

      this.dispatcher.dispatchEvent(
        new CustomEvent('bufferloaded', { detail: { id: id, buffer: buffer } }),
      );
    }
    catch (error) {
      this.handleRequestError(id, `Failed to load audio ${id}: ${error.message}`);
    }
    finally {
      if (this.audios.has(id)) {
        this.audios.get(id).isLoading = false;
      }
    }
  }

  /**
   * Handle request errors.
   * @param {string} id Id of audio to handle errors for.
   * @param {string} errorMessage Error message.
   */
  handleRequestError(id, errorMessage) {
    const audio = this.audios.get(id);
    if (audio) {
      audio.isLoading = false;
    }
    this.setState(id, STATES.STOPPED);
    console.error(errorMessage);
  }

  /**
   * Play audio.
   * @param {string} id Id of audio to play.
   * @returns {boolean} True, if audio could be played. Else false.
   */
  play(id) {
    if (!this.audios.has(id)) {
      return false;
    }

    const audio = this.audios.get(id);

    if (audio.isMuted) {
      return false; // Muted
    }

    if (this.getState(id) === STATES.PLAYING) {
      return false; // Already playing
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.play(id); // retry
      }).catch((error) => {
        console.warn('Failed to resume audio context:', error);
      });

      return false;
    }

    if (this.getState(id) === STATES.BUFFERING) {
      this.addToQueue(id);
      return false;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audio.buffer;

    // Add gain node
    const gainNode = this.audioContext.createGain();
    source
      .connect(gainNode)
      .connect(this.audioContext.destination);
    audio.gainNode = gainNode;

    // Set volume
    gainNode.gain.value = audio.volume / 100;

    // Set loop if necessary
    source.loop = audio.loop;

    audio.source = source;

    audio.source.onended = () => {
      this.stop(id);
    };

    audio.source.start();
    this.setState(id, STATES.PLAYING);

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
    if (!this.audios.has(id)) {
      return;
    }

    this.removeFromQueue(id);

    if (this.getState(id) !== STATES.PLAYING) {
      return;
    }

    const audio = this.audios.get(id);
    const { source, gainNode } = audio;

    if (source) {
      source.onended = null; // Prevent calling stop again on ended
      try {
        source.stop();
      }
      catch (error) {}
      source.disconnect();
    }

    gainNode?.disconnect();

    audio.gainNode = null;
    audio.source = null;

    this.setState(id, STATES.STOPPED);
  }

  /**
   * Stop audio group.
   * @param {string} groupId GroupId of audios to stop.
   */
  stopGroup(groupId) {
    if (!groupId) {
      return;
    }

    for (const [id, audio] of this.audios) {
      if (audio.groupId === groupId) {
        this.stop(id);
      }
    }
  }

  /**
   * Stop all audios.
   */
  stopAll() {
    for (const id of this.audios.keys()) {
      this.stop(id);
    }
  }

  /**
   * Determine whether audio is playing.
   * @param {string} id Id of audio to be checked.
   * @returns {boolean} True, if audio is playing. Else false.
   */
  isPlaying(id) {
    if (!this.audios.has(id)) {
      return false;
    }

    return this.getState(id) === STATES.PLAYING;
  }

  /**
   * Fade audio.
   * @param {string} id Id of audio to fade.
   * @param {object} [params] Parameters.
   * @param {string} params.type `in` to fade in, `out` to fade out.
   * @param {number} [params.time] Time for fading in milliseconds.
   */
  fade(id, params = {}) {
    const audio = this.audios.get(id);
    if (!audio || audio.isMuted) {
      return;
    }

    if (params.type !== FADE_TYPES.IN && params.type !== FADE_TYPES.OUT) {
      return;
    }

    const gainNode = audio.gainNode;
    if (!gainNode) {
      return;
    }

    // Sanitize time
    const fadeTime = (typeof params.time === 'number' && params.time > 0) ?
      // eslint-disable-next-line no-magic-numbers
      params.time / 1000 :
      // eslint-disable-next-line no-magic-numbers
      DEFAULT_FADE_TIME_MS / 1000;

    const targetGain = (params.type === FADE_TYPES.IN) ? audio.volume / 100 : 0;
    const currentTime = this.audioContext.currentTime;

    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);

    gainNode.gain.linearRampToValueAtTime(targetGain, currentTime + fadeTime);
  }

  /**
   * Get DOM element of audio.
   * @param {string} id Id of audio to get DOM element for.
   * @returns {HTMLElement|undefined} Audio element.
   */
  getDOM(id) {
    return this.audios.get(id)?.dom;
  }

  /**
   * Get audio ids.
   * @returns {string[]} Audio ids.
   */
  getAudioIds() {
    return [...this.audios.keys()];
  }

  /**
   * Mute all audios.
   */
  muteAll() {
    for (const id of this.audios.keys()) {
      this.mute(id);
    }
  }

  /**
   * Mute.
   * @param {string} id Id of sound to unmute.
   */
  mute(id) {
    if (!this.audios.has(id)) {
      return;
    }

    this.stop(id);
    this.audios.get(id).isMuted = true;
  }

  /**
   * Unmute all audios.
   */
  unmuteAll() {
    for (const id of this.audios.keys()) {
      this.unmute(id);
    }
  }

  /**
   * Unmute.
   * @param {string} id Id of sound to unmute.
   */
  unmute(id) {
    if (!this.audios.has(id)) {
      return;
    }

    this.audios.get(id).isMuted = false;
  }

  /**
   * Determine whether an audio is muted.
   * @param {string} id Id of sound to check.
   * @returns {boolean} True, if audio is muted. Else false.
   */
  isMuted(id) {
    return this.audios.get(id)?.isMuted || false;
  }

  /**
   * Get volume.
   * @param {string} id Id of sound to get volume for.
   * @returns {number|undefined} Volume [0, 100] or undefined.
   */
  getVolume(id) {
    return this.audios.get(id)?.volume;
  }

  /**
   * Get volume of a group represented by first audio in group. May cause confusion, yes.
   * @param {string} groupId Group id.
   * @returns {number|undefined} Volume [0, 100] or undefined.
   */
  getVolumeGroup(groupId) {
    for (const [id, audio] of this.audios) {
      if (audio.groupId === groupId) {
        return this.getVolume(id);
      }
    }
  }

  /**
   * Set volume.
   * @param {string} id Id of sound to set volume for.
   * @param {number} volume Volume [0, 100].
   */
  setVolume(id, volume = 100) {
    if (!this.audios.has(id)) {
      return;
    }

    volume = Math.max(0, Math.min(volume, 100));

    const audio = this.audios.get(id);
    audio.volume = volume;
    if (audio.gainNode) {
      audio.gainNode.gain.value = volume / 100;
    }
  }

  /**
   * Set volume for all audios in a group.
   * @param {string} groupId Group id.
   * @param {number} volume Volume [0, 100].
   */
  setVolumeGroup(groupId, volume) {
    for (const [id, audio] of this.audios) {
      if (audio.groupId === groupId) {
        this.setVolume(id, volume);
      }
    }
  }

  /**
   * Set volume for all audios.
   * @param {number} volume Volume [0, 100].
   */
  setVolumeAll(volume) {
    for (const id of this.audios.keys()) {
      this.setVolume(id, volume);
    }
  }
}
