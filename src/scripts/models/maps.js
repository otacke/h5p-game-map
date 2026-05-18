import Map from '@components/map/map.js';
import Util from '@services/util.js';

/**
 * @typedef {object} Stages
 * @property {function} getDOMs Get DOMs.
 * @property {function} buildStages Build Stages.
 */

/**
 * Collection of game maps. Owns the active map index and relays calls
 * to whichever map is currently shown.
 */
export default class Maps {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} params.dictionary Dictionary.
   * @param {object} params.globals Globals.
   * @param {object} params.jukebox Jukebox.
   * @param {object[]} params.gamemaps Raw gamemap configurations.
   * @param {object} [callbacks] Callbacks forwarded to each Map.
   * @param {function} [callbacks.onImageLoaded] Image loaded.
   * @param {function} [callbacks.onStageClicked] Stage clicked.
   * @param {function} [callbacks.onStageStateChanged] Stage state changed.
   * @param {function} [callbacks.onFocused] Stage focused.
   * @param {function} [callbacks.onBecameActiveDescendant] Stage became active descendant.
   * @param {function} [callbacks.onAddedToQueue] Callback added to queue.
   * @param {function} [callbacks.onAccessRestrictionsHit] Access restrictions hit.
   * @param {function} [callbacks.getTotalScore] Get total score.
   * @param {function} [callbacks.getStageScore] Get stage score.
   * @param {function} [callbacks.getStageScorePercentage] Get stage score percentage.
   * @param {function} [callbacks.getExerciseState] Get exercise state.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.callbacks = Util.extend({
      onImageLoaded: () => {},
      onStageClicked: () => {},
      onStageStateChanged: () => {},
      onFocused: () => {},
      onBecameActiveDescendant: () => {},
      onAddedToQueue: () => {},
      onAccessRestrictionsHit: () => {},
      getTotalScore: () => 0,
      getStageScore: () => 0,
      getStageScorePercentage: () => 0,
      getExerciseState: () => 0,
    }, callbacks);

    this.currentIndex = 0;

    this.maps = this.params.gamemaps.map((mapParams) => {
      let backgroundImage;
      if (mapParams?.mapOptions?.backgroundSettings?.backgroundImage) {
        backgroundImage = H5P.getPath(
          mapParams.mapOptions.backgroundSettings.backgroundImage.path ?? '',
          this.params.globals.get('contentId'),
        );
      }

      return new Map(
        {
          dictionary: this.params.dictionary,
          globals: this.params.globals,
          jukebox: this.params.jukebox,
          backgroundImage: backgroundImage,
          backgroundColor: mapParams.mapOptions.backgroundSettings?.backgroundColor,
          elements: mapParams.elements,
          paths: mapParams.paths,
        },
        {
          onImageLoaded: (image) => this.callbacks.onImageLoaded(image),
          onStageClicked: (id, state) => this.callbacks.onStageClicked(id, state),
          onStageStateChanged: (id, state) => this.callbacks.onStageStateChanged(id, state),
          onFocused: () => this.callbacks.onFocused(),
          onBecameActiveDescendant: (id) => this.callbacks.onBecameActiveDescendant(id),
          onAddedToQueue: (callback, queueParams) => this.callbacks.onAddedToQueue(callback, queueParams),
          onAccessRestrictionsHit: (hitParams) => this.callbacks.onAccessRestrictionsHit(hitParams),
          getTotalScore: () => this.callbacks.getTotalScore(),
          getStageScore: (id) => this.callbacks.getStageScore(id),
          getStageScorePercentage: (id) => this.callbacks.getStageScorePercentage(id),
          getExerciseState: (id) => this.callbacks.getExerciseState(id),
        },
      );
    });
  }

  /**
   * Get number of maps.
   * @returns {number} Number of maps.
   */
  getCount() {
    return this.maps.length;
  }

  /**
   * Get DOMs of all maps.
   * @returns {HTMLElement[]} DOMs of all maps.
   */
  getDOMs() {
    return this.maps.map((map) => map.getDOM());
  }

  /**
   * Get currently active map index.
   * @returns {number} Index of currently active map.
   */
  getCurrentIndex() {
    return this.currentIndex;
  }

  /**
   * Set currently active map index.
   * @param {number} index Index to make current.
   */
  setCurrentIndex(index) {
    if (typeof index !== 'number' || index < 0 || index >= this.maps.length) {
      return;
    }

    this.currentIndex = index;

    this.maps.forEach((map, i) => {
      map.hide();
    });

    this.maps[index].show();
  }

  /**
   * Get currently active map.
   * @returns {Map|undefined} Currently active map.
   */
  getCurrent() {
    return this.maps[this.currentIndex];
  }

  /**
   * Get current map index.
   * @returns {number} Current map index.
   */
  getCurrentIndex() {
    return this.currentIndex;
  }

  /**
   * Get DOM of currently active map.
   * @returns {HTMLElement|undefined} DOM of currently active map.
   */
  getDOM() {
    return this.getCurrent()?.getDOM();
  }

  /**
   * Show currently active map.
   */
  show() {
    this.getCurrent()?.show();
  }

  /**
   * Hide currently active map.
   */
  hide() {
    this.getCurrent()?.hide();
  }

  /**
   * Resize all maps.
   */
  resize() {
    this.maps.forEach((map) => {
      map.resize();
    });
  }

  /**
   * Get size of currently active map.
   * @returns {object|undefined} Size of currently active map.
   */
  getSize() {
    return this.getCurrent()?.getSize();
  }

  /**
   * Set fullscreen state for currently active map.
   * @param {boolean} state If true, fullscreen on.
   * @param {object} [availableSpace] Available width and height.
   */
  setFullscreen(state, availableSpace = {}) {
    this.getCurrent()?.setFullscreen(state, availableSpace);
  }

  /**
   * Update paths on every map, using each map's own size so the per-map
   * telemetry stays correct (path positions depend on the map's image).
   */
  updatePaths() {
    this.maps.forEach((map) => {
      const mapSize = map.getSize();
      if (!mapSize || mapSize.width === 0 || mapSize.height === 0) {
        return;
      }

      map.updatePaths({ mapSize: mapSize });
    });
  }

  /**
   * Update path state across all maps.
   * @param {string} pathId Path id.
   * @param {number} state State code.
   */
  updatePathState(pathId, state) {
    this.maps.forEach((map) => {
      map.updatePathState(pathId, state);
    });
  }

  /**
   * Show paths of currently active map.
   */
  showPaths() {
    this.maps.forEach((map) => {
      map.showPaths();
    });
  }

  /**
   * Show stages of all maps.
   */
  showStages() {
    this.maps.forEach((map) => {
      map.showStages();
    });
  }

  /**
   * Get current paths state of currently active map.
   * @returns {object|undefined} Current paths state.
   */
  getPathsState() {
    return (this.maps.map((map) => map.getCurrentPathsState()) ?? []).flat();
  }

  /**
   * Get current stages state of currently active map.
   * @returns {object|undefined} Current stages state.
   */
  getStagesState() {
    return (this.maps.map((map) => map.getCurrentStagesState()) ?? []).flat();
  }

  /**
   * Get stages of currently active map.
   * @returns {Stages|undefined} Stages of currently active map.
   */
  getStages() {
    return this.getCurrent()?.getStages();
  }

  /**
   * Get stage count from currently active map.
   * @param {object} [options] Options.
   * @returns {number} Stage count.
   */
  getStagesCount(options = {}) {
    return this.maps.reduce((count, map) => count + (map.getStageCount(options) ?? 0), 0);
  }

  /**
   * Get the map that holds a given stage.
   * @param {string} stageId Stage id.
   * @returns {Map|undefined} Map holding the stage, or undefined.
   */
  getMapHolding(stageId) {
    return this.maps.find((map) => map.holdsStage(stageId));
  }

  /**
   * Get stage type from whichever map holds the stage.
   * @param {string} stageId Stage id.
   * @returns {number|undefined} Stage type.
   */
  getStageType(stageId) {
    return this.getMapHolding(stageId)?.getStageType(stageId);
  }

  /**
   * Get stage label from whichever map holds the stage.
   * @param {string} id Stage id.
   * @returns {string|undefined} Stage label.
   */
  getStageLabel(id) {
    return this.getMapHolding(id)?.getStageLabel(id);
  }

  /**
   * Get stage state from whichever map holds the stage.
   * @param {string} id Stage id.
   * @returns {number|undefined} Stage state.
   */
  getStageState(id) {
    return this.getMapHolding(id)?.getStageState(id);
  }

  /**
   * Set stage state on whichever map holds the stage.
   * @param {string} stageId Stage id.
   * @param {number} state State code.
   */
  setStageState(stageId, state) {
    this.getMapHolding(stageId)?.setStageState(stageId, state);
  }

  /**
   * Update stage state. Targets the holding map for a specific id; applies
   * to all maps when stageId is '*'.
   * @param {string} stageId Stage id or '*' for all stages.
   * @param {number|string} state State code.
   */
  updateStageState(stageId, state) {
    if (stageId === '*') {
      this.maps.forEach((map) => {
        map.updateStageState(stageId, state);
      });

      return;
    }

    this.getMapHolding(stageId)?.updateStageState(stageId, state);
  }

  /**
   * Set stage task state on whichever map holds the stage.
   * @param {string} stageId Stage id.
   * @param {boolean} taskState Task state.
   */
  setStageTaskState(stageId, taskState) {
    this.getMapHolding(stageId)?.setStageTaskState(stageId, taskState);
  }

  /**
   * Update stage neighbors state on whichever map holds the stage.
   * @param {string} id Stage id.
   * @param {number} state State code.
   */
  updateStageNeighborsState(id, state) {
    this.getMapHolding(id)?.updateStageNeighborsState(id, state);
  }

  /**
   * Update stage score star. Targets the holding map for a specific id;
   * applies to all maps when stageId is '*'.
   * @param {string} stageId Stage id or '*' for all stages.
   * @param {number} scorePercentage Score percentage.
   */
  updateStageScoreStar(stageId, scorePercentage) {
    if (stageId === '*') {
      this.maps.forEach((map) => {
        map.updateStageScoreStar(stageId, scorePercentage);
      });

      return;
    }

    this.getMapHolding(stageId)?.updateStageScoreStar(stageId, scorePercentage);
  }

  /**
   * Update stages state per restrictions on currently active map.
   */
  updateStagesStatePerRestrictions() {
    this.maps.forEach((map) => {
      map.updateStagesStatePerRestrictions();
    });
  }

  /**
   * Open stages that pass restrictions.
   */
  openStagesIfPassingRestrictions() {
    this.maps.forEach((map) => {
      map.openStagesIfPassingRestrictions();
    });
  }

  /**
   * Inform user about locked state of stage.
   * @param {object} params Parameters.
   * @param {string} params.sourceId Stage id.
   * @param {string} params.targetId Stage id.
   */
  informAboutStageLockedState(params = {}) {
    this.getMapHolding(params.targetId)?.informAboutStageLockedState(params);
  }

  /**
   * Set start stages on all maps.
   * @returns {string[]} Ids of reachable stages across all maps.
   */
  setStartStages() {
    return (this.maps.map((map) => map.setStartStages()) ?? []).flat();
  }

  /**
   * Toggle stages playfulness on currently active map.
   * @param {boolean} isPlayful If true, stages are playful.
   */
  toggleStagesPlayfulness(isPlayful) {
    this.maps.forEach((map) => {
      map.toggleStagesPlayfulness(isPlayful);
    });
  }

  /**
   * Enable stages on currently.
   */
  enableStages() {
    this.maps.forEach((map) => {
      map.enableStages();
    });
  }

  /**
   * Disable stages across all maps.
   */
  disableStages() {
    this.maps.forEach((map) => {
      map.disableStages();
    });
  }

  /**
   * Focus a stage on whichever map holds it.
   * @param {string} id Stage id.
   * @param {object} [options] Options.
   */
  focusStage(id, options = {}) {
    this.getMapHolding(id)?.focusStage(id, options);
  }

  /**
   * Get next open stage from currently active map.
   * @returns {object|undefined} Next open stage.
   */
  getNextOpenStage() {
    return this.getCurrent()?.getNextOpenStage();
  }

  /**
   * Run a special stage feature on whichever map holds the stage.
   * @param {string} stageId Stage id.
   * @param {object} context Context.
   */
  runSpecialStageFeature(stageId, context) {
    this.getMapHolding(stageId)?.runSpecialStageFeature(stageId, context);
  }

  /**
   * Set active descendant for aria composite pattern on whichever map holds the stage.
   * @param {string} id Stage id.
   */
  setActiveDescendant(id) {
    this.getMapHolding(id)?.setActiveDescendant(id);
  }

  /**
   * Reset currently active map.
   * @param {object} [params] Parameters.
   */
  reset(params = {}) {
    this.maps.forEach((map) => {
      map.reset(params);
    });
  }

  /**
   * Show the map that holds stage with stageId.
   * @param {string} stageId Target stage id.
   * @returns {boolean} True if map could be shown, false otherwise.
   */
  showMapThatHoldsStage(stageId) {
    const mapHolding = this.getMapHolding(stageId);
    if (!mapHolding) {
      return false;
    }

    const index = this.maps.indexOf(mapHolding);
    if (index === -1) {
      return false;
    }

    this.setCurrentIndex(index);

    return true;
  }
}
