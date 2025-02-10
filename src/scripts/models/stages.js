import Util from '@services/util.js';
import Stage from '@components/map/stage/stage.js';
import SpecialStage from '@components/map/stage/special-stage.js';
import { STAGE_TYPES } from '@components/map/stage/stage.js';

/** @constant {number} DEFAULT_READ_DELAY_MS Delay before reading was triggered. */
const DEFAULT_READ_DELAY_MS = 100;

export default class Stages {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [params.elements] Semantics parameters for stages.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onStageClicked] Called when stage is clicked.
   * @param {function} [callbacks.onStageStageChanged] Called on state changed.
   * @param {function} [callbacks.onStageFocused] Called on stage focused.
   * @param {function} [callbacks.onBecameActiveDescendant] Called when stage became active descendant.
   * @param {function} [callbacks.onAddedToQueue] Called when function added to queue for main.
   * @param {function} [callbacks.onAccessRestrictionsHit] Handle no access.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      elements: {}
    }, params);

    this.callbacks = Util.extend({
      onStageClicked: () => {},
      onStageStateChanged: () => {},
      onStageFocused: () => {},
      onBecameActiveDescendant: () => {},
      onAddedToQueue: () => {},
      onAccessRestrictionsHit: () => {}
    }, callbacks);

    this.handleSelectionKeydown = this.handleSelectionKeydown.bind(this);

    this.stages = this.buildStages(this.params.elements);
  }

  /**
   * Get doms.
   * @returns {HTMLElement[]} Stage DOMs.
   */
  getDOMs() {
    return this.stages.map((path) => path.getDOM());
  }

  /**
   * Build paths.
   * @param {object} elements Parameters.
   * @returns {Stage[]} Stages.
   */
  buildStages(elements) {
    const stages = [];

    if (!Object.keys(elements ?? {}).length) {
      return []; // No elements/stages
    }

    // Get previous instance state
    const stagesState =
      this.params.globals.get('extras').previousState?.content?.stages ?? [];

    for (let index in elements) {
      const elementParams = elements[index];

      // This was a compromise, could be solved better in the editor
      const neighbors = elementParams.neighbors.map((neighbor) => {
        return elements[parseInt(neighbor)].id;
      });

      const stageState = stagesState.find((stage) => {
        return stage.id === elementParams.id;
      });

      let showStars = this.params.globals.get('params').visual.stages.showScoreStars;
      if (!!elementParams.specialStageType) {
        showStars = 'never';
      }

      // this.params.type === STAGE_TYPES.stage && this.params.globals.get('params').visual.stages.showScoreStars
      const stageParams = {
        id: elementParams.id,
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        jukebox: this.params.jukebox,
        canBeStartStage: elementParams.canBeStartStage,
        showStars: showStars,
        accessRestrictions: elementParams.accessRestrictions,
        ...(
          elementParams.contentType &&
          { contentType: elementParams.contentType }
        ),
        specialStageType: elementParams.specialStageType,
        ...(
          elementParams.specialStageExtraLives &&
          { specialStageExtraLives: elementParams.specialStageExtraLives }
        ),
        ...(
          elementParams.specialStageExtraTime &&
          { specialStageExtraTime: elementParams.specialStageExtraTime }
        ),
        ...(
          elementParams.specialStageLinkURL &&
          { specialStageLinkURL: elementParams.specialStageLinkURL }
        ),
        ...(
          elementParams.specialStageLinkTarget &&
          { specialStageLinkTarget: elementParams.specialStageLinkTarget }
        ),
        label: elementParams.label,
        neighbors: neighbors,
        telemetry: elementParams.telemetry,
        visuals: this.params.visuals,
        visible: stageState?.visible,
        alwaysVisible: elementParams.alwaysVisible,
        overrideSymbol: elementParams.overrideSymbol,
        ...(stageState?.state && { state: stageState?.state })
      };

      const stageCallbacks = {
        onClicked: (id, state) => {
          this.callbacks.onStageClicked(id, state);
        },
        onStateChanged: (id, state) => {
          this.callbacks.onStageStateChanged(id, state);
        },
        onFocused: (id) => {
          // If reading while selecting, other read call will be interrupted
          if (!this.selectionStage) {
            this.callbacks.onFocused();
          }

          this.handleStageFocused(id);
        },
        onBecameActiveDescendant: (id) => {
          this.callbacks.onBecameActiveDescendant(id);
        },
        onAddedToQueue: (callback, params) => {
          this.callbacks.onAddedToQueue(callback, params);
        },
        onAccessRestrictionsHit: (params = {}) => {
          this.callbacks.onAccessRestrictionsHit(params);
        }
      };

      const newStage = (!elementParams.specialStageType) ?
        new Stage(stageParams, stageCallbacks) :
        new SpecialStage(stageParams, stageCallbacks);

      stages.push(newStage);
    }

    return stages;
  }

  /**
   * Gather ids of sub graph.
   * @param {string[]} newIds Ids to start with.
   * @param {string[]} [oldIds] Ids already in sub graph.
   * @returns {string[]} Ids of sub graph.
   */
  gatherSubGraphIds(newIds = [], oldIds = []) {
    if (newIds.length === 0) {
      return oldIds;
    }

    const isUnique = (value, index, array) => array.indexOf(value) === index;

    const neighborIds = newIds
      .reduce((all, id) => {
        return [...all, ...this.getStage(id).getNeighbors()];
      }, [])
      .filter((newId) => !oldIds.includes(newId) && !newIds.includes(newId))
      .filter(isUnique);

    return [...oldIds, ...this.gatherSubGraphIds(neighborIds, newIds)]
      .filter(isUnique);
  }

  /**
   * Update reachability of stages.
   * @param {string[]} reachableStageIds Ids of reachable stages.
   */
  updateReachability(reachableStageIds) {
    this.stages.forEach((stage) => {
      stage.setReachable(reachableStageIds.includes(stage.getId()));
    });
  }

  /**
   * Enable stages.
   */
  enable() {
    this.stages.forEach((stage) => {
      stage.enable();
    });
  }

  /**
   * Disable stages.
   */
  disable() {
    this.stages.forEach((stage) => {
      stage.disable();
    });
  }

  /**
   * Get number of stages (after filtering).
   * @param {object} [params] Parameters.
   * @param {object} [params.filters] Filters with string/string[] pairs.
   * @returns {number} Number of stages.
   */
  getCount(params = {}) {
    let stages = [...this.stages].filter((stage) => stage.isReachable());

    params = Util.extend({ filters: {} }, params);

    for (const key in params.filters) {
      stages = stages.filter((stage) => {
        if (key === 'state') {
          return params.filters[key].includes(stage.getState());
        }

        return true;
      });
    }

    return stages.length;
  }

  /**
   * Get stage by id.
   * @param {string} id Id of stage.
   * @returns {Stage} Stage with respective id.
   */
  getStage(id) {
    return this.stages.find((stage) => stage.getId() === id);
  }

  /**
   * Get current state.
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    return this.stages.map((stage) => {
      return {
        id: stage.getId(),
        state: stage.getState(),
        visible: stage.isVisible()
      };
    });
  }

  /**
   * Update state of a stage.
   * @param {string} id Id of exercise that was changed.
   * @param {number} state State code.
   */
  updateState(id, state) {
    const stage = this.getStage(id);
    if (!stage) {
      return;
    }

    stage.setState(state);
  }

  /**
   * Update stages that are in unlocking state (or reachable).
   */
  updateUnlockingStages() {
    const unlockingStages = this.stages
      .filter((stage) => stage.getState() === this.params.globals.get('states').unlocking);

    unlockingStages.forEach((stage) => {
      stage.unlock();
    });
  }

  /**
   * Update the state of a stages neighbors.
   * @param {string} id Id of exercise that was changed.
   * @param {number} state State code.
   */
  updateNeighborsState(id, state) {
    const globalParams = this.params.globals.get('params');

    if (globalParams.behaviour.map.roaming === 'free') {
      return; // Neighbors are not influenced
    }

    const stage = this.getStage(id);
    if (!stage) {
      return;
    }

    const neighborIds = stage.getNeighbors();

    if (
      state === this.params.globals.get('states').open &&
      globalParams.behaviour.map.fog !== '0'
    ) {
      neighborIds.forEach((id) => {
        const targetStage = this.getStage(id);
        if (!targetStage) {
          return;
        }

        targetStage.show({ queue: true });
      });
    }

    // Get neigbors and unlock if current stage was cleared
    if (state === this.params.globals.get('states').cleared) {
      neighborIds.forEach((id) => {
        const targetStage = this.getStage(id);
        if (!targetStage) {
          return;
        }

        targetStage.unlock();
      });
    }
  }

  /**
   * Unlock a stage or stages.
   * @param {string} id Id to unlock or 'random' for random procedure.
   */
  unlockStage(id) {
    if (typeof id !== 'string') {
      return;
    }

    // Unlock specified stage
    const stage = this.stages.find((stage) => stage.getId() === id);
    if (stage) {
      stage.unlock();
    }
  }

  /**
   * Set start stages.
   * @returns {string[]} IDs of reachable stages.
   */
  setStartStages() {
    // Choose all start stages (all if none selected) and choose one randomly
    let startStages = this.stages
      .filter((stage) => stage.canBeStartStage());

    if (!startStages.length) {
      // Use all stages except special stages, because none selected
      startStages = this.stages
        .filter((stage) => stage.getType() === STAGE_TYPES.stage);
    }

    // Choose one randomly
    startStages = [startStages[Math.floor(Math.random() * startStages.length)]];

    startStages.forEach((stage, index) => {
      stage.unlock({ bruteForce: true }); // Start stages must be unlocked

      if (index === 0) {
        stage.setTabIndex('0');
      }
    });

    return this.gatherSubGraphIds(startStages.map((stage) => stage.getId()));
  }

  /**
   * Return next best open stage.
   * @returns {Stage|null} Next best open stage.
   */
  getNextOpenStage() {
    return this.stages.filter((stage) => {
      const state = stage.getState();

      return state === this.params.globals.get('states').open ||
        state === this.params.globals.get('states').opened;
    })[0] || null;
  }

  /**
   * Handle stage focused.
   * @param {string} id Id of stage that was focused.
   */
  handleStageFocused(id) {
    if (this.selectionNeighbors?.map((stage) => stage.getId()).includes(id)) {
      return; // Id of stage in focus already part of selection
    }

    // Remove old selection properties
    this.stages.forEach((stage) => {
      if (stage.getId() !== id) {
        stage.setTabIndex('-1');
      }
      else {
        stage.setTabIndex('0');
      }

      stage.removeEventListener('keydown', this.handleSelectionKeydown);
    });

    this.selectionStage = this.stages.find((stage) => stage.getId() === id);
    this.selectionNeighbors = this.selectionStage.getNeighbors()
      .map((neighborId) => {
        return this.stages.find((stage) => stage.getId() === neighborId);
      });

    this.highlightedStageId = 0;
    this.selectionStages = [this.selectionStage, ...this.selectionNeighbors];

    // Add listeners
    this.selectionStages.forEach((stage) => {
      stage.addEventListener('keydown', this.handleSelectionKeydown);
    });
  }

  /**
   * Handle key up on selected stages. Implements keyboard navigation.
   *
   * The keyboard navigation here may not be ideal. It requires two steps in
   * order to move from one node to another. First: Choose the neighbor that
   * you want to move to with the arrow keys, then move to that node by pressing
   * space/enter. The target node becomes the current one and can then be
   * activated using space/enter, or one can use the arrow keys to select
   * neighbors ...
   * That's cumbersome for people who can see the map and who might expect to
   * move to a node with all the arrow keys directly (comes with its own set of
   * challenges if a node has many neighbors) and just need to use space/enter
   * to activate the node. However, navigation for blind people then is
   * intransparent and they have no way of gaining a sense of the structure or
   * layout of the graph that they are traversing.
   * Grateful for any good solution to this issue!
   * @param {KeyboardEvent} event Event.
   */
  handleSelectionKeydown(event) {
    if (!['ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Escape', 'Tab']
      .includes(event.key)
    ) {
      return;
    }

    const highlightedStage = this.selectionStages[this.highlightedStageId];

    if (event.key === 'ArrowLeft') {
      if (this.highlightedStageId !== 0) {
        highlightedStage.setTabIndex('-1');
        highlightedStage.updateAriaLabel();
      }

      this.highlightStage(
        this.highlightedStageId = (this.highlightedStageId + 1) %
          this.selectionStages.length
      );

      event.preventDefault();
    }
    else if (event.key === 'ArrowRight') {
      if (this.highlightedStageId !== 0) {
        highlightedStage.setTabIndex('-1');
        highlightedStage.updateAriaLabel();
      }

      this.highlightStage(
        (this.highlightedStageId + this.selectionStages.length - 1) %
          this.selectionStages.length
      );

      event.preventDefault();
    }
    else if (event.key === ' ' || event.key === 'Enter') {
      // Prevent button's click listener from kicking in.
      if (this.highlightedStageId !== 0) {

        // Move to currently highlighted stage
        this.selectionStages[0].setTabIndex('-1');
        this.selectionNeighbors = null;

        highlightedStage.updateAriaLabel();
        highlightedStage.animate('pulse');

        this.params.globals.get('read')(
          this.params.dictionary.get('a11y.movedToStage')
            .replace(
              /@stagelabel/,
              highlightedStage.getLabel()
            )
        );

        window.setTimeout(() => {
          highlightedStage.getDOM().blur();
          highlightedStage.getDOM().focus();
        }, DEFAULT_READ_DELAY_MS); // Make sure 'movedToStage' is being read already

        event.preventDefault();
      }
    }
    else if (event.key === 'Escape') {
      highlightedStage.setTabIndex('-1');
      highlightedStage.updateAriaLabel();
      this.highlightStage(0);
    }
    else if (event.key === 'Tab') {
      if (this.highlightedStageId !== 0) {
        highlightedStage.setTabIndex('-1');
        highlightedStage.updateAriaLabel();
      }

      this.selectionStage = null;
      this.selectionNeighbors = null;
      this.selectionStages = null;
    }
  }

  /**
   * Highlight a stage.
   * @param {number} index Index of selection stages to highlight.
   */
  highlightStage(index) {
    if (
      !Array.isArray(this.selectionStages) ||
      index > this.selectionStages.length
    ) {
      return;
    }

    this.highlightedStageId = index;
    const highlightStage = this.selectionStages[this.highlightedStageId];

    if (index !== 0) {
      highlightStage.updateAriaLabel({
        customText: this.params.dictionary.get('a11y.adjacentStageLabel')
          .replace(
            /@stagelabelOrigin/, this.selectionStages[0].getLabel()
          )
          .replace(
            /@stagelabelNeighbor/, highlightStage.getLabel()
          )
      });
    }

    // Only gets tabIndex to be focussable
    highlightStage.setTabIndex('0', { skipActiveDescendant: true });
    highlightStage.focus();
  }

  /**
   * Set tab index.
   * @param {string} id Stage id.
   * @param {string|number} state Tabindex state.
   */
  setTabIndex(id, state) {
    const stage = this.stages.find((stage) => stage.getId() === id);
    if (stage) {
      stage.setTabIndex(state);
    }
  }

  /**
   * Toggle playfulness.
   * @param {boolean} state If true, be playful, else not.
   */
  togglePlayfulness(state) {
    if (typeof state !== 'boolean') {
      return;
    }

    this.stages.forEach((stage) => {
      stage.togglePlayfulness(false);
    });
  }

  /**
   * Do for each stage.
   * @param {function} callback Callback.
   */
  forEach(callback) {
    for (let i = 0; i < this.stages.length; i++) {
      callback(this.stages[i], i, this.stages);
    }
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    this.stages.forEach((stage) => {
      stage.reset({ isInitial: params.isInitial });
    });
  }

  /**
   *
   * @param {string} id Id of stage to set task state for,
   * @param {*} isTask True if stage is a task. Else false.
   */
  setTaskState(id, isTask) {
    const stage = this.getStage(id);
    if (!stage) {
      return;
    }

    stage.setTaskState(isTask);
    if (isTask && this.params.globals.get('params').visual.stages.showScoreStars === 'always') {
      stage.showScoreStars();
    }
  }

  /**
   * Update score star.
   * @param {string} id Id of stage or '*' for all stages.
   * @param {number} percentage Percentage of score.
   */
  updateScoreStar(id, percentage) {
    if (id === '*') {
      this.stages.forEach((stage) => {
        stage.updateScoreStar(percentage);
      });

      return;
    }

    const stage = this.getStage(id);
    if (!stage) {
      return;
    }

    stage.updateScoreStar(percentage);
  }
}
