var H5PUpgrades = H5PUpgrades || {};

/**
 * Upgrades for the Game Map content type.
 */
H5PUpgrades['H5P.GameMap'] = (() => {
  return {
    1: {
      /**
       * Asynchronous content upgrade hook.
       * Upgrades content parameters to support Game Map 1.2.
       * Turns Summary 1.10 into Single Choice Set 1.11.
       * @param {object} parameters Content parameters.
       * @param {function} finished Callback when finished.
       * @param {object} extras Extra parameters such as metadata, etc.
       */
      2: (parameters, finished, extras) => {
        let elements = parameters?.gamemapSteps?.gamemap?.elements;

        if (Array.isArray(elements)) {
          parameters.gamemapSteps.gamemap.elements = elements.map((element) => {
            if (
              typeof element.contentType !== 'object' ||
              element === null ||
              element.contentType.library !== 'H5P.Summary 1.10'
            ) {
              return element; // Not a Summary
            }

            /*
             * Convert parmas of Summary 1.10 to Single Choice Set 1.11.
             * Will forfeit tips and up to 2 distractors from Summary, because
             * Single Choice Set does not allow tips and only has 3 distractors.
             */
            element.contentType = {
              ...element.contentType,
              library: 'H5P.SingleChoiceSet 1.11',
              metadata: {
                ...element.contentType.metadata ?? {},
                contentType: 'Single Choice Set'
              },
              params: {
                behaviour: {
                  autoContinue: true,
                  enableRetry: true,
                  enableSolutionsButton: true,
                  passPercentage: 100,
                  soundEffectsEnabled: true,
                  timeoutCorrect: 2000,
                  timeoutWrong: 3000
                },
                choices: (element.contentType.params?.summaries ?? []).map(
                  (summary) => {
                    summary.question = element.contentType.params?.intro ?? '';
                    summary.answers = summary.summary ?? [];
                    delete summary.summary;
                    delete summary.tip;

                    return summary;
                  }
                ),
                l10n: {
                  nextButtonLabel: 'Next question',
                  showSolutionButtonLabel: 'Show solution',
                  retryButtonLabel: 'Retry',
                  solutionViewTitle: 'Solution list',
                  correctText: 'Correct!',
                  incorrectText: 'Incorrect!',
                  shouldSelect: 'Should have been selected',
                  shouldNotSelect: 'Should not have been selected',
                  muteButtonLabel: 'Mute feedback sound',
                  closeButtonLabel: 'Close',
                  slideOfTotal: 'Slide :num of :total',
                  scoreBarLabel: 'You got :num out of :total points',
                  solutionListQuestionNumber: 'Question :num',
                  a11yShowSolution: 'Show the solution. The task will be marked with its correct solution.',
                  a11yRetry: 'Retry the task. Reset all responses and start the task over again.'
                },
                overallFeedback: element.contentType.params?.overallFeedback ??
                  [{ from: 0, to: 100 }]
              }
            };

            return element;
          });
        }

        finished(null, parameters, extras);
      }
    }
  };
})();
