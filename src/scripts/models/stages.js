import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
import Util from '@services/util';
import Stage from '@components/map/stage/stage';

export default class Stages {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [params.elements] Semantics parameters for stages.
   * @param {object} [callbacks={}] Callbacks.
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
   *
   * @returns {HTMLElement[]} Stage DOMs.
   */
  getDOMs() {
    return this.stages.map((path) => path.getDOM());
  }

  /**
   * Build paths.
   *
   * @param {object} elements Parameters.
   * @returns {Stage[]} Stages.
   */
  buildStages(elements) {
    const stages = [];

    if (!Object.keys(elements ?? {}).length) {
      return []; // No elements/stages
    }

    // Get previous instance state
    const stagesState = Globals.get('extras').previousState?.content?.
      stages ?? [];

    for (let index in elements) {
      const elementParams = elements[index];

      // This was a compromise, could be solved better in the editor
      const neighbors = elementParams.neighbors.map((neighbor) => {
        return elements[parseInt(neighbor)].id;
      });

      const stageState = stagesState.find((stage) => {
        return stage.id === elementParams.id;
      });

      stages.push(new Stage(
        {
          id: elementParams.id,
          canBeStartStage: elementParams.canBeStartStage,
          accessRestrictions: elementParams.accessRestrictions,
          contentType: elementParams.contentType,
          label: elementParams.label,
          neighbors: neighbors,
          telemetry: elementParams.telemetry,
          visuals: this.params.visuals,
          visible: stageState?.visible,
          ...(stageState?.state && { state: stageState?.state })
        }, {
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
        }));
    }

    return stages;
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
   *
   * @param {object} [params={}] Parameters.
   * @param {object} [params.filters={}] Filters with string/string[] pairs.
   * @returns {number} Number of stages.
   */
  getCount(params = {}) {
    let stages = [...this.stages];

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
   *
   * @param {string} id Id of stage.
   * @returns {Stage} Stage with respective id.
   */
  getStage(id) {
    return this.stages.find((stage) => stage.getId() === id);
  }

  /**
   * Get current state.
   *
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
   *
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
   * Update stages that are in unlocking state.
   */
  updateUnlockingStages() {
    const globalParams = Globals.get('params');

    if (globalParams.behaviour.map.roaming === 'free') {
      return; // Not relevant
    }

    const unlockingStages = this.stages.filter((stage) => {
      return (
        stage.getState() === Globals.get('states')['unlocking'] &&
        stage.getAccessRestrictions().openOnScoreSufficient
      );
    });

    unlockingStages.forEach((stage) => {
      stage.unlock();
    });
  }

  /**
   * Update the state of a stages neighbors.
   *
   * @param {string} id Id of exercise that was changed.
   * @param {number} state State code.
   */
  updateNeighborsState(id, state) {
    const globalParams = Globals.get('params');

    if (globalParams.behaviour.map.roaming === 'free') {
      return; // Neighbors are not influenced
    }

    const stage = this.getStage(id);
    if (!stage) {
      return;
    }

    const neighborIds = stage.getNeighbors();

    if (
      state === Globals.get('states')['open'] &&
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
    if (state === Globals.get('states')['cleared']) {
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
   *
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
   */
  setStartStages() {
    // Choose all start stages (all if none selected) and choose one randomly
    let startStages = this.stages
      .filter((stage) => stage.canBeStartStage());

    if (!startStages.length) {
      startStages = this.stages; // Use all stages, because none selected
    }

    if (Globals.get('params').behaviour.map.startStages === 'random') {
      startStages = [
        startStages[Math.floor(Math.random() * startStages.length)]
      ];
    }

    startStages.forEach((stage, index) => {
      stage.unlock();

      if (index === 0) {
        stage.setTabIndex('0');
      }
    });
  }

  /**
   * Return next best open stage.
   *
   * @returns {Stage|null} Next best open stage.
   */
  getNextOpenStage() {
    return this.stages.filter((stage) => {
      const state = stage.getState();

      return state === Globals.get('states')['open'] ||
        state === Globals.get('states')['opened'];
    })[0] || null;
  }

  /**
   * Handle stage focused.
   *
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
   * Handle key up on selected stages.
   *
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

        Globals.get('read')(
          Dictionary.get('a11y.movedToStage')
            .replace(
              /@stagelabel/,
              highlightedStage.getLabel()
            )
        );

        window.setTimeout(() => {
          highlightedStage.getDOM().blur();
          highlightedStage.getDOM().focus();
        }, 100); // Make sure 'movedToStage' is being read already

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
   *
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
        customText: Dictionary.get('a11y.adjacentStageLabel')
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
   *
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
   *
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
   *
   * @param {function} callback Callback.
   */
  forEach(callback) {
    for (let i = 0; i < this.stages.length; i++) {
      callback(this.stages[i], i, this.stages);
    }
  }

  /**
   * Reset.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    this.stages.forEach((stage) => {
      stage.reset({ isInitial: params.isInitial });
    });
  }
}
