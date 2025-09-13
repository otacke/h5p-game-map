/**
 * Mixin containing main user confirmation stuff.
 */
export default class MainUserConfirmation {
  /**
   * Handle finish.
   */
  showFinishConfirmation() {
    // In solution mode, no dialog and no xAPI necessary
    if (this.isShowingSolutions) {
      this.showEndscreen({ focusButton: true, readOpened: true });
      return;
    }

    const extras = this.params.globals.get('extras');
    extras.isScoringEnabled = true;
    const isScoringEnabled = extras.standalone &&
      (extras.isScoringEnabled || extras.isReportingEnabled);

    const dialogTexts = [
      this.params.dictionary.get('l10n.confirmFinishDialog'),
    ];
    if (isScoringEnabled) {
      dialogTexts.push(
        this.params.dictionary.get('l10n.confirmFinishDialogSubmission'),
      );
    }
    dialogTexts.push(
      this.params.dictionary.get('l10n.confirmFinishDialogQuestion'),
    );

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmFinishHeader'),
        dialogText: dialogTexts.join(' '),
        cancelText: this.params.dictionary.get('l10n.no'),
        confirmText: this.params.dictionary.get('l10n.yes'),
      }, {
        onConfirmed: () => {
          this.handleConfirmedFinish();
        },
        onCanceled: () => {
          this.params.jukebox.stopGroup('default');
        },
      },
    );

    this.params.jukebox.stopGroup('default');
    this.confirmationDialog.show();
    this.params.jukebox.play('showDialog');
  }

  /**
   * Handle user confirmed to finish.
   */
  handleConfirmedFinish() {
    this.gameDone = true;
    this.queueAnimation = [];
    this.stages.togglePlayfulness(false);
    this.params.jukebox.stopAll();
    this.timer?.stop();

    this.callbacks.onFinished();
    this.showEndscreen({ focusButton: true });
  }

  /**
   * Handle game over.
   * @param {string} [dialogKey] Dialog key for message.
   */
  showGameOverConfirmation(dialogKey = 'confirmGameOverDialog') {
    this.gameDone = true;
    this.stages.togglePlayfulness(false);

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmGameOverHeader'),
        dialogText: this.params.dictionary.get(`l10n.${dialogKey}`),
        confirmText: this.params.dictionary.get('l10n.ok'),
        hideCancel: true,
      }, {
        onConfirmed: () => {
          this.params.jukebox.stopAll();
          this.timer?.stop();
          this.callbacks.onFinished();
          this.showEndscreen({ focusButton: true });
        },
      },
    );

    this.params.jukebox.stopAll();
    this.timer?.stop();
    this.params.jukebox.play('gameOver');

    this.confirmationDialog.show();
  }

  /**
   * Show timeout confirmation.
   */
  showTimeoutConfirmation() {
    const dialogText = (this.livesLeft === Infinity) ?
      this.params.dictionary.get('l10n.confirmTimeoutDialog') :
      this.params.dictionary.get('l10n.confirmTimeoutDialogLostLife');

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmTimeoutHeader'),
        dialogText: dialogText,
        confirmText: this.params.dictionary.get('l10n.ok'),
        hideCancel: true,
      }, {
        onConfirmed: () => {
          this.params.jukebox.stopGroup('default');
        },
      },
    );

    this.confirmationDialog.show();
  }

  /**
   * Show incomplete score confirmation.
   */
  showIncompleteScoreConfirmation() {
    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmScoreIncompleteHeader'),
        dialogText: this.params.dictionary.get('l10n.confirmIncompleteScoreDialogLostLife'),
        confirmText: this.params.dictionary.get('l10n.ok'),
        hideCancel: true,
      }, {
        onConfirmed: () => {
          this.params.jukebox.stopGroup('default');
        },
      },
    );

    this.confirmationDialog.show();
  }

  /**
   * Show full score confirmation.
   */
  showFullScoreConfirmation() {
    let dialogText = this.params.dictionary.get('l10n.confirmFullScoreDialog');

    if (this.livesLeft !== Infinity) {
      dialogText = `${dialogText} ${this.params.dictionary.get('l10n.confirmFullScoreDialogLoseLivesAmendmend')}`;
    }

    this.confirmationDialog.update(
      {
        headerText: this.params.dictionary.get('l10n.confirmFullScoreHeader'),
        dialogText: dialogText,
        confirmText: this.params.dictionary.get('l10n.ok'),
        hideCancel: true,
      }, {
        onConfirmed: () => {
          this.params.jukebox.stopGroup('default');
          this.toolbar.toggleHintFinishButton(true);
        },
      },
    );

    this.confirmationDialog.show();
  }
}
