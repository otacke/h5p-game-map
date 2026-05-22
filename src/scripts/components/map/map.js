import Paths from '@models/paths.js';
import Stages from '@models/stages.js';
import Util from '@services/util.js';
import './map.scss';
import { STAGE_STATES } from '@services/constants.js';

/** @constant {string} COLOR_CONTRAST_DARK Dark color contrast */
const COLOR_CONTRAST_DARK = '#000';

/** @constant {string} COLOR_CONTRAST_LIGHT Light color contrast */
const COLOR_CONTRAST_LIGHT = '#fff';

/** @constant {number} STAGE_BORDER_RADIUS Border radius */
const STAGE_BORDER_RADIUS = 0.5;

/**
 * @typedef {object} Stage
 * @property {function} getDOM Get DOMs.
 */

export default class Map {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.backgroundImage] Source string for image.
   * @param {string} [params.backgroundColor] Background color.
   * @param {object[]} [params.elements] Raw stage element definitions.
   * @param {object[]} [params.paths] Raw path definitions.
   * @param {object} [callbacks] Callbacks.
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
    this.params = Util.extend({
    }, params);

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

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-map');

    const globalParams = this.params.globals.get('params');

    const stageWidthPercentage = params.elements[0]?.telemetry?.width;
    const stageHeightPercentage = params.elements[0]?.telemetry?.height;

    // Custom CSS variables for stages
    this.dom.style.setProperty('--stage-height', `${stageHeightPercentage}%`);
    this.dom.style.setProperty('--stage-width', `${stageWidthPercentage}%`);
    this.dom.style.setProperty('--stage-color', globalParams.visual.stages.colorStage);
    this.dom.style.setProperty('--stage-color-cleared', globalParams.visual.stages.colorStageCleared);
    this.dom.style.setProperty('--stage-color-locked', globalParams.visual.stages.colorStageLocked);
    this.dom.style.setProperty('--stage-color-contrast-dark', COLOR_CONTRAST_DARK);
    this.dom.style.setProperty('--stage-color-contrast-light', COLOR_CONTRAST_LIGHT);

    // Custom CSS variables for paths
    this.dom.style.setProperty('--path-color', globalParams.visual.paths.style.colorPath);
    this.dom.style.setProperty('--path-color-cleared', globalParams.visual.paths.style.colorPathCleared);
    this.dom.style.setProperty('--path-style', globalParams.visual.paths.style.pathStyle);

    this.image = document.createElement('img');
    this.image.classList.add('h5p-game-map-background-image');
    this.image.alt = ''; // No alt text for background image
    this.image.addEventListener('load', () => {
      this.callbacks.onImageLoaded(this.image);
    });
    if (this.params.backgroundImage) {
      this.image.src = this.params.backgroundImage;
    }
    else {
      this.image.classList.add('hidden');
    }

    if (this.params.backgroundColor) {
      this.dom.style.setProperty('--map-background-color', this.params.backgroundColor);
    }

    this.dom.appendChild(this.image);

    this.stages = new Stages(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        jukebox: this.params.jukebox,
        elements: this.params.elements,
        visuals: globalParams.visual.stages,
      },
      {
        onStageClicked: (id, state) => this.callbacks.onStageClicked(id, state),
        onStageStateChanged: (id, state) => this.callbacks.onStageStateChanged(id, state),
        onFocused: () => this.callbacks.onFocused(),
        onBecameActiveDescendant: (id) => this.callbacks.onBecameActiveDescendant(id),
        onAddedToQueue: (callback, params) => this.callbacks.onAddedToQueue(callback, params),
        onAccessRestrictionsHit: (params) => this.callbacks.onAccessRestrictionsHit(params),
        getTotalScore: () => this.callbacks.getTotalScore(),
        getStageScore: (id) => this.callbacks.getStageScore(id),
        getStageScorePercentage: (id) => this.callbacks.getStageScorePercentage(id),
        getExerciseState: (id) => this.callbacks.getExerciseState(id),
      },
    );

    this.paths = new Paths(
      {
        globals: this.params.globals,
        elements: this.params.elements,
        paths: this.params.paths,
        visuals: globalParams.visual.paths.style,
      },
    );

    this.pathWrapper = document.createElement('div');
    this.pathWrapper.classList.add('h5p-game-map-path-wrapper');
    this.paths.getDOMs().forEach((dom) => {
      this.pathWrapper.appendChild(dom);
    });
    this.dom.appendChild(this.pathWrapper);

    this.stageWrapper = document.createElement('div');
    this.stageWrapper.classList.add('h5p-game-map-stage-wrapper');
    this.stageWrapper.setAttribute('role', 'application');
    this.stageWrapper.setAttribute(
      'aria-label', this.params.dictionary.get('a11y.applicationDescription'),
    );

    this.stages.getDOMs().forEach((dom) => {
      this.stageWrapper.appendChild(dom);
    });
    this.dom.appendChild(this.stageWrapper);

    this.hide();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Update paths' size.
   * @param {object} options Options.
   * @param {object} [options.mapSize] Map size.
   */
  resizeAllPaths(options = {}) {
    this.paths.resizeAll(options);
  }

  /**
   * Update path state.
   * @param {string} stageId Id of stage.
   * @param {number} state State code.
   */
  updatePathState(stageId, state) {
    this.paths.updateState(stageId, state);
  }

  /**
   * Draw all available paths (based on current stage's state)
   */
  drawAllAvailablePaths() {
    this.stages.forEach((stage) => {
      this.updatePathState(stage.params.id, stage.state);
    });
  }

  /**
   * Show paths.
   */
  showPaths() {
    this.paths.forEach((path) => {
      path.show();
    });
  }

  /**
   * Get current paths state.
   * @returns {object} Current paths state.
   */
  getCurrentPathsState() {
    return this.paths.getCurrentState();
  }

  /**
   * Get current stages state.
   * @returns {object} Current stages state.
   */
  getCurrentStagesState() {
    return this.stages.getCurrentState();
  }

  updateStageState(stageId, state) {
    this.stages.updateState(stageId, state);
  }

  setStageTaskState(stageId, taskState) {
    this.stages.setTaskState(stageId, taskState);
  }

  /**
   * Update stage score star.
   * @param {string} stageId Id of stage.
   * @param {number} scorePercentage Score percentage (0-100) to determine how much of the star should be filled.
   */
  updateStageScoreStar(stageId, scorePercentage) {
    this.stages.updateScoreStar(stageId, scorePercentage);
  }

  /**
   * Toggle stages playfulness.
   * @param {boolean} isPlayful If true, stage is playful, else not.
   */
  toggleStagesPlayfulness(isPlayful) {
    this.stages.togglePlayfulness(isPlayful);
  }

  /**
   * Show paths.
   */
  showStages() {
    this.stages.forEach((stage) => {
      stage.show();
    });
  }

  /**
   * Set start stages.
   * @returns {string[]} Ids of reachable stages, used to determine which stages are reachable.
   */
  setStartStages() {
    const reachableStageIds = this.stages.setStartStages();
    this.paths.updateReachability(reachableStageIds);
    this.stages.updateReachability(reachableStageIds);

    return reachableStageIds;
  }

  /**
   * Inform user about locked state of stage.
   * @param {object} params Parameters.
   * @param {string} params.sourceId Stage id.
   * @param {string} params.targetId Stage id.
   */
  informAboutStageLockedState(params = {}) {
    this.stages.informAboutLockedState(params);
  }

  getStageCount(options = {}) {
    return this.stages.getCount(options);
  }

  updateStagesStatePerRestrictions() {
    this.stages.updateStatePerRestrictions();
  }

  setStageState(stageId, state) {
    const stage = this.stages.getStage(stageId);
    stage?.setState(state);
  }

  enableStages() {
    this.stages.enable();
  }

  disableStages() {
    this.stages.disable();
  }

  /**
   * Get next open stage.
   * @returns {Stage|null} Next best open stage.
   */
  getNextOpenStage() {
    return this.stages.getNextOpenStage();
  }

  /**
   * Check whether this map contains a stage with the given id.
   * @param {string} stageId Stage id.
   * @returns {boolean} True if the stage exists on this map.
   */
  holdsStage(stageId) {
    return !!this.stages.getStage(stageId);
  }

  /**
   * Get stage type.
   * @param {string} stageId Stage id.
   * @returns {number|undefined} Stage type or undefined if stage doesn't exist or id is not provided.
   */
  getStageType(stageId) {
    const stage = this.stages.getStage(stageId);
    return stage?.getType();
  }

  /**
   * Get special stage type.
   * @param {string} stageId Stage id.
   * @returns {string|undefined} Special stage type. Only applicable if stage is a special stage.
   */
  getSpecialStageType(stageId) {
    const stage = this.stages.getStage(stageId);
    return stage?.getSpecialStageType();
  }

  /**
   * Get stage label.
   * @param {string} id Stage id.
   * @returns {string|undefined} Stage label or undefined if stage doesn't exist or id is not provided.
   */
  getStageLabel(id) {
    const stage = this.stages.getStage(id);
    return stage?.getLabel();
  }

  /**
   * Determine whether stage with id passes restrictions.
   * @param {string} id Id of stage.
   * @returns {boolean} True id stage passes restrictions, else false.
   */
  doesStagePassRestrictions(id) {
    const stage = this.stages.getStage(id);
    return stage?.passesRestrictions() ?? false;
  }

  /**
   * Get stage state.
   * @param {string} id Stage id.
   * @returns {number|undefined} Stage state or undefined if stage doesn't exist or id is not provided.
   */
  getStageState(id) {
    const stage = this.stages.getStage(id);
    return stage?.getState();
  }

  /**
   * Run special stage feature.
   * @param {string} stageId Stage id.
   * @param {object} context Context.
   */
  runSpecialStageFeature(stageId, context) {
    const stage = this.stages.getStage(stageId);
    stage?.runSpecialFeature(context);
  }

  /**
   * Update stage neighbors state.
   * @param {string} id Id of stage.
   * @param {number} state State code.
   */
  updateStageNeighborsState(id, state) {
    this.stages.updateNeighborsState(id, state);
  }

  /**
   * Open stages if passing restrictions.
   */
  openStagesIfPassingRestrictions() {
    this.stages.forEach((stage) => {
      if (stage.passesRestrictions()) {
        stage.setState(STAGE_STATES.OPEN);
      }
    });
  }

  focusStage(id, options = {}) {
    const stage = this.stages.getStage(id);
    stage?.focus(options);
  }

  getStages() {
    return this.stages;
  }

  /**
   * Show.
   */
  show() {
    this.paths.forEach((path) => {
      path.hideTemporarily();
    });
    this.stages.forEach((stage) => {
      stage.hideTemporarily();
    });

    this.dom.classList.remove('display-none');

    window.requestAnimationFrame(() => {
      this.paths.forEach((path) => {
        path.endTemporaryHide();
      });
      this.stages.forEach((stage) => {
        stage.endTemporaryHide();
      });

      this.params.globals.get('resize')();
    });
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Set fullscreen.
   * @param {boolean} state If true, fullscreen on.
   * @param {object} [availableSpace] Available width and height.
   */
  setFullscreen(state, availableSpace = {}) {
    if (!availableSpace.height || !availableSpace.width) {
      return;
    }

    if (!state) {
      this.forceSize(null);
      return;
    }

    const mapSize = this.getSize();

    let width, height;
    if (mapSize.width / mapSize.height > availableSpace.width / availableSpace.height) {
      width = availableSpace.width;
      height = availableSpace.width * mapSize.height / mapSize.width;
    }
    else {
      width = availableSpace.height * mapSize.width / mapSize.height;
      height = availableSpace.height;
    }

    this.forceSize({
      container: { width: availableSpace.width, height: availableSpace.height },
      map: { width: width, height: height },
    });
  }

  /**
   * Get map size.
   * @returns {object} Height and width of map.
   */
  getSize() {
    const clientRect = this.image.getBoundingClientRect();

    return { height: clientRect.height, width: clientRect.width };
  }

  /**
   * Resize.
   */
  resize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = window.setTimeout(() => {
      // Ensure overlays for paths and stages have image dimensions
      const clientRect = this.getSize();
      this.pathWrapper.style.height = `${clientRect.height}px`;
      this.stageWrapper.style.height = `${clientRect.height}px`;

      const heightPercentage = parseFloat(
        this.dom.style.getPropertyValue('--stage-height'),
      );

      const fontSize = clientRect.height / 100 * heightPercentage;

      this.dom.style.setProperty('--stage-font-size', `calc(${STAGE_BORDER_RADIUS} * ${fontSize}px)`);
      this.dom.style.setProperty('--stage-line-height', `${fontSize}px`);
    }, 0);
  }

  /**
   * Force size.
   * @param {object|null} sizes Size to force into.
   * @param {object} sizes.container Container size.
   * @param {number} [sizes.container.width] Container width in px.
   * @param {number} [sizes.container.height] Container height in px.
   * @param {object} sizes.map Map size.
   * @param {number} [sizes.map.width] Map width in px.
   * @param {number} [sizes.map.height] Map height in px.
   */
  forceSize(sizes) {
    this.dom.style.height = '';
    this.dom.style.width = '';
    this.dom.style.margin = '';
    this.dom.style.overflow = '';

    this.image.style.height = '';
    this.image.style.width = '';
    this.pathWrapper.style.height = '';
    this.pathWrapper.style.width = '';
    this.stageWrapper.style.height = '';
    this.stageWrapper.style.width = '';

    if (sizes === null) {
      return;
    }

    else if (sizes?.container?.width && sizes?.container?.height && sizes?.map?.width && sizes?.map?.height) {
      window.requestAnimationFrame(() => {
        this.dom.style.height = `${sizes.container.height}px`;
        this.dom.style.width = `${sizes.container.width}px`;
        this.dom.style.margin = 'auto';
        this.dom.style.overflow = 'hidden auto';

        this.image.style.height = `${sizes.map.height}px`;
        this.image.style.width = `${sizes.map.width}px`;
        this.pathWrapper.style.height = `${sizes.map.height}px`;
        this.pathWrapper.style.width = `${sizes.map.width}px`;
        this.stageWrapper.style.height = `${sizes.map.height}px`;
        this.stageWrapper.style.width = `${sizes.map.width}px`;

        window.requestAnimationFrame(() => {
          this.params.globals.get('resize')();
        });
      });
    }

    window.requestAnimationFrame(() => {
      this.params.globals.get('resize')();
    });
  }

  /**
   * Set active descendant for aria composite pattern.
   * @param {string} id Id of active descendant.
   */
  setActiveDescendant(id) {
    this.stageWrapper.setAttribute('aria-activedescendant', `stage-button-${id}`);
  }

  /**
   * Reset map.
   * @param {params} params Parameters.
   */
  reset(params = {}) {
    this.paths.reset(params.paths);
    this.stages.reset(params.stages);
  }
}
