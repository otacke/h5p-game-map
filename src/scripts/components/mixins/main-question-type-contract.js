/**
 * Mixin containing methods for H5P Question Type contract.
 */
export default class MainQuestionTypeContract {
  /**
   * Get xAPI data from exercises.
   * @returns {object[]} XAPI data objects used to build report.
   */
  getXAPIData() {
    return this.exerciseBundles.getXAPIData();
  }

  /**
   * Determine whether some answer was given.
   * @returns {boolean} True, if some answer was given.
   */
  getAnswerGiven() {
    return this.exerciseBundles.getAnswerGiven() || this.hasUserMadeProgress;
  }

  /**
   * Get score.
   * @returns {number} Score.
   */
  getScore() {
    return Math.min(
      this.exerciseBundles.getScore(),
      this.getMaxScore()
    );
  }

  /**
   * Get max score.
   * @returns {number} Max score.
   */
  getMaxScore() {
    const maxScore = this.exerciseBundles.getMaxScore();
    const finishScore = this.params.globals.get('params').behaviour.finishScore;

    return Math.min(finishScore, maxScore);
  }

  /**
   * Get context data.
   * Contract used for confusion report.
   * @returns {object} Context data.
   */
  getContext() {
    return {
      type: 'stage',
      value: this.currentStageIndex
    };
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    this.gameDone = true;

    this.confirmationDialog.hide();
    this.endScreen.hide();

    this.stagesGameOverState.forEach((previousState) => {
      this.stages.updateState(previousState.id, previousState.state);
    });

    this.params.jukebox.stopAll();
    this.show();

    this.exerciseBundles.showSolutions();

    this.isShowingSolutions = true;
    this.toolbar.toggleSolutionMode(true);
  }

  /**
   * Get current state. Not strictly question type contract.
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    return {
      exerciseBundles: this.exerciseBundles.getCurrentState(),
      stages: this.stages.getCurrentState(),
      paths: this.paths.getCurrentState(),
      ...(
        this.livesLeft && this.livesLeft !== Infinity &&
        { livesLeft: this.livesLeft }
      ),
      ...(this.timeLeft && { timeLeft: this.timeLeft }),
      ...(this.gameDone && { gameDone: this.gameDone })
    };
  }
}
