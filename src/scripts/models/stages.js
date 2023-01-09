import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
import Util from '@services/util';
import Stage from '@components/map/stage/stage';

export default class Stages {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      elements: {}
    }, params);

    this.callbacks = Util.extend({
      onStageClicked: () => {},
      onStageStateChanged: () => {},
      onStageFocussed: () => {}
    }, callbacks);

    this.handleSelectionKeyUp = this.handleSelectionKeyUp.bind(this);

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
          hiddenInitially: this.params.hidden,
          ...(stageState?.state && { state: stageState?.state })
        }, {
          onClicked: (id) => {
            this.callbacks.onStageClicked(id);
          },
          onStateChanged: (id, state) => {
            this.callbacks.onStageStateChanged(id, state);
          },
          onFocussed: (id) => {
            // If reading while selecting, other read call will be interrupted
            if (!this.selectionStage) {
              this.callbacks.onFocussed();
            }

            this.handleStageFocussed(id);
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

        targetStage.show();
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

    if (id !== 'settings') {
      // Unlock specified stage
      const stage = this.stages.find((stage) => stage.getId() === id);
      if (stage) {
        stage.unlock();
      }

      return;
    }

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

    startStages.forEach((stage) => {
      stage.unlock();
      stage.setTabIndex('0');
    });
  }

  /**
   * Handle stage focussed.
   *
   * @param {string} id Id of stage that was focussed.
   */
  handleStageFocussed(id) {
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

      stage.removeEventListener('keydown', this.handleSelectionKeyUp);
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
      stage.addEventListener('keydown', this.handleSelectionKeyUp);
    });
  }

  /**
   * Handle key up on selected stages.
   *
   * @param {KeyboardEvent} event Event.
   */
  handleSelectionKeyUp(event) {
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

    highlightStage.setTabIndex('0');
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
