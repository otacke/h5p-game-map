import { test, expect } from '@playwright/test';

/** @constant {number} OVERLAY_TIMEOUT_MS Timeout to wait to ensure overlay animation finished. */
const OVERLAY_TIMEOUT_MS = 1000;

// Just a demo for now ...
test.describe('whole tour', () => {
  let page;
  let h5pContainer;
  let confirmationDialog;
  let overlayExercise;
  let pathWrapper;
  let toolbar;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe(('start-up'), () => {
    test('has correct content title', async () => {
      await page.goto('http://localhost:8080/view/h5p-game-map/test-2?session=null');

      h5pContainer = await page.frameLocator('.h5p-iframe').locator('.h5p-container');
      confirmationDialog = h5pContainer.locator('.h5p-game-map-confirmation-dialog');
      overlayExercise = h5pContainer.locator('.h5p-game-map-overlay-dialog.exercise');
      pathWrapper = h5pContainer.locator('.h5p-game-map-path-wrapper');
      toolbar = await h5pContainer.locator('.h5p-game-map-toolbar-tool-bar');

      await expect(toolbar).toContainText('I am a headline');
    });

    test('has correct scores', async () => {
      await Promise.all([
        expect(toolbar).toContainText('0/6'), // 0/6 stages
        expect(toolbar).toContainText('0/8') // 0/8 points
      ]);
    });

    test ('overlay is not visible', async () => {
      await expect(overlayExercise).not.toBeVisible();
    });

    test ('"First stage" is unlocked', async () => {
      const stageButton = await h5pContainer
        .getByLabel('Stage: First stage', { exact: true })
        .locator('.h5p-game-map-stage-content');
      await expect(stageButton).toHaveClass(/h5p-game-map-stage-open/);
    });

    test ('"One more MC" is locked', async () => {
      const stageButton = await h5pContainer
        .getByLabel('Stage: One more MC')
        .locator('.h5p-game-map-stage-content');
      await expect(stageButton).toHaveClass(/h5p-game-map-stage-locked/);
    });

    test ('"111" is locked', async () => {
      const stageButton = await h5pContainer
        .getByLabel('Stage: 111')
        .locator('.h5p-game-map-stage-content');
      await expect(stageButton).toHaveClass(/h5p-game-map-stage-locked/);
    });
  });

  test ('Path from "First stage" to "One more MC" has default color', async () => {
    const path = await pathWrapper.locator('.h5p-game-map-path').locator('nth=2');
    const pathColor = await path.evaluate((el) => {
      return window.getComputedStyle(el).getPropertyValue('border-color');
    });
    expect(pathColor).toBe('rgba(219, 230, 21, 0.7)');
  });

  test ('Path from "First stage" to "One more MC" has default style', async () => {
    const path = await pathWrapper.locator('.h5p-game-map-path').locator('nth=2');
    const pathColor = await path.evaluate((el) => {
      return window.getComputedStyle(el).getPropertyValue('border-top');
    });
    expect(pathColor).toContain('solid');
  });

  test ('Path from "Multi-Choice" to "Finish" has custom color', async () => {
    const path = await pathWrapper.locator('.h5p-game-map-path').locator('nth=6');
    const pathColor = await path.evaluate((el) => {
      return window.getComputedStyle(el).getPropertyValue('border-color');
    });
    expect(pathColor).toBe('rgba(0, 0, 0, 0.7)');
  });

  test ('Path from "Multi-Choice" to "Finish" has custom style', async () => {
    const path = await pathWrapper.locator('.h5p-game-map-path').locator('nth=6');
    const pathColor = await path.evaluate((el) => {
      return window.getComputedStyle(el).getPropertyValue('border-top');
    });
    expect(pathColor).toContain('dotted');
  });

  test ('go to full screen', async () => {
    await h5pContainer.getByLabel('Enter fullscreen mode').click();
    await expect(h5pContainer).toHaveClass(/h5p-fullscreen/);
  });

  test.describe('complete "First Stage"', () => {
    test ('does open "First Stage" (unlocked)', async () => {
      await h5pContainer.getByLabel('Stage: First stage', { exact: true }).click();
      await Promise.all([
        expect(overlayExercise).toBeVisible(),
        expect(overlayExercise).toContainText('I am the starting point'),
        expect(toolbar).toContainText('31/6'), // 3 hearts in front of stages
        expect(toolbar).toContainText('1/6'), // 1/5 stages
        expect(toolbar).toContainText('0/8') // 0/8 points
      ]);
    });

    test ('closes "First stage"', async () => {
      await page.waitForTimeout(OVERLAY_TIMEOUT_MS);
      await overlayExercise.getByLabel('Close').click();
      await expect(overlayExercise).not.toBeVisible();
    });
  });

  test ('Path from "First stage" to "One more MC" has cleared color', async () => {
    await page.waitForTimeout(2 * OVERLAY_TIMEOUT_MS);
    const path = await pathWrapper.locator('.h5p-game-map-path').locator('nth=2');
    const pathColor = await path.evaluate((el) => {
      return window.getComputedStyle(el).getPropertyValue('border-color');
    });
    expect(pathColor).toBe('rgba(1, 255, 1, 0.7)');
  });

  test.describe('try to open "Multi-Choice" even though it is locked', () => {
    test ('does not open "Multi-Choice" (locked)', async () => {
      await h5pContainer.getByLabel('Stage: Multi-Choice').click();
      await expect(overlayExercise).not.toBeVisible();
    });
  });

  test ('"One more MC" is unlocked', async () => {
    const stageButton = await h5pContainer
      .getByLabel('Stage: One more MC')
      .locator('.h5p-game-map-stage-content');
    await expect(stageButton).toHaveClass(/h5p-game-map-stage-open/);
  });

  test.describe('try to open "Jump" even though it is locked', () => {
    test ('does not open "Jump" (locked)', async () => {
      await h5pContainer.getByLabel('Stage: Jump').click();
      await page.waitForTimeout(OVERLAY_TIMEOUT_MS);
      await expect(overlayExercise).not.toBeVisible();
      await expect(confirmationDialog).toContainText('This stage requires');
    });

    test.describe('close confirmation dialog', () => {
      test ('does close confirmation dialog', async () => {
        await confirmationDialog.getByLabel('Close').click();
        await expect(confirmationDialog).not.toBeVisible();
      });
    });
  });

  test.describe('complete "One more MC" with 1 point', () => {
    test ('does open "One more MC" (unlocked)', async () => {
      await h5pContainer.getByLabel('Stage: One more MC').click();
      await Promise.all([
        expect(overlayExercise).toBeVisible(),
        expect(overlayExercise).toContainText('All good')
      ]);
    });

    test ('closes "One more MC"', async () => {
      await page.waitForTimeout(OVERLAY_TIMEOUT_MS);
      await overlayExercise.getByLabel('Close').click();
      await expect(overlayExercise).not.toBeVisible();
    });

    test ('keeps "Even one more true false" locked', async () => {
      const stageButton = await h5pContainer
        .getByLabel('Stage: Even one more true false')
        .locator('.h5p-game-map-stage-content');
      await expect(stageButton).toHaveClass(/h5p-game-map-stage-locked/);
    });

    test ('re-opens "One more MC"', async () => {
      await h5pContainer.getByLabel('Stage: One more MC').click();
      await Promise.all([
        expect(overlayExercise).toBeVisible(),
        expect(overlayExercise).toContainText('All good')
      ]);
    });

    test ('evaluates wrong answer', async () => {
      await overlayExercise.getByText('Check').click();
      await Promise.all([
        expect(overlayExercise).toContainText('0/3'),
        expect(overlayExercise).toContainText('Show solution'),
        expect(overlayExercise).toContainText('Retry'),
        expect(overlayExercise).toContainText('Continue'),
        expect(toolbar).toContainText('22/6'), // 2 hearts in front of stages
        expect(toolbar).toContainText('2/6'), // 2/6 stages
        expect(toolbar).toContainText('0/8'), // 0/8 points
        expect(confirmationDialog).toContainText('You did not achieve full score and lost a life')
      ]);
    });

    test ('closes dialog', async () => {
      await confirmationDialog.getByLabel('Close').click();
      await expect(confirmationDialog).not.toBeVisible();
    });

    test ('lets user try again', async () => {
      await overlayExercise.getByLabel('Retry the task').click();
      await Promise.all([
        expect(overlayExercise).not.toContainText('0/3'),
        expect(overlayExercise).not.toContainText('Show solution'),
        expect(overlayExercise).not.toContainText('Retry'),
        expect(overlayExercise).toContainText('Check'),
        expect(overlayExercise).toContainText('Continue'),
        expect(toolbar).toContainText('22/6'), // 2 hearts in front of stages
        expect(toolbar).toContainText('2/6'), // 2/8 stages
        expect(toolbar).toContainText('0/8') // 0/8 points
      ]);
    });

    test ('evaluates 1 correct answer', async () => {
      await overlayExercise.getByText('Yabba dabba du').click();
      await overlayExercise.getByLabel('Check the answers').click();
      await Promise.all([
        expect(overlayExercise).toContainText('1/3'),
        expect(overlayExercise).toContainText('Show solution'),
        expect(overlayExercise).toContainText('Retry'),
        expect(overlayExercise).toContainText('Continue'),
        expect(toolbar).toContainText('12/6'), // 1 heart in front of stages
        expect(toolbar).toContainText('2/6'), // 2/6 stages
        expect(toolbar).toContainText('1/8'), // 1/8 points
        expect(confirmationDialog).toContainText('You did not achieve full score and lost a life')
      ]);
    });

    test ('closes dialog again', async () => {
      await confirmationDialog.getByLabel('Close').click();
      await expect(confirmationDialog).not.toBeVisible();
    });

    test ('lets user continue and closes overlay', async () => {
      await overlayExercise.getByText('Continue').click();
      await expect(overlayExercise).not.toBeVisible();
    });
  });

  test ('"Even one more true false" is now unlocked', async () => {
    const stageButton = await h5pContainer
      .getByLabel('Stage: Even one more true false')
      .locator('.h5p-game-map-stage-content');
    await expect(stageButton).toHaveClass(/h5p-game-map-stage-open/);
  });

  test ('"Multi-Choice" is still locked', async () => {
    const stageButton = await h5pContainer
      .getByLabel('Stage: Multi-Choice')
      .locator('.h5p-game-map-stage-content');
    await expect(stageButton).toHaveClass(/h5p-game-map-stage-locked/);
  });

  test.describe('complete "111"', () => {
    test ('does open "111" (unlocked)', async () => {
      await h5pContainer.getByLabel('Stage: 111', { exact: true }).click();
      await Promise.all([
        expect(overlayExercise).toBeVisible(),
        expect(overlayExercise).toContainText('just a distraction'),
        expect(toolbar).toContainText('13/6'), // 1 heart in front of stages
        expect(toolbar).toContainText('3/6'), // 3/6 stages
        expect(toolbar).toContainText('1/8'), // 1/8 points
      ]);
    });

    test ('closes "111"', async () => {
      await page.waitForTimeout(OVERLAY_TIMEOUT_MS);
      await overlayExercise.getByLabel('Close').click();
      await expect(overlayExercise).not.toBeVisible();
    });
  });

  test ('"Multi-Choice" is now unlocked', async () => {
    const stageButton = await h5pContainer
      .getByLabel('Stage: Multi-Choice')
      .locator('.h5p-game-map-stage-content');
    await expect(stageButton).toHaveClass(/h5p-game-map-stage-open/);
  });

  test.describe('try to open "Jump" again even though it is still locked', () => {
    test ('does not open "Jump" (locked)', async () => {
      await h5pContainer.getByLabel('Stage: Jump').click();
      await page.waitForTimeout(OVERLAY_TIMEOUT_MS);
      await expect(overlayExercise).not.toBeVisible();
      await expect(confirmationDialog).toContainText('This stage requires');
    });

    test.describe('close confirmation dialog', () => {
      test ('does close confirmation dialog', async () => {
        await confirmationDialog.getByLabel('Close').click();
        await expect(confirmationDialog).not.toBeVisible();
      });
    });
  });

  test.describe('complete "True Or False?" with 1 point', () => {
    test ('does open "True Or False?" (unlocked)', async () => {
      await h5pContainer.getByLabel('Stage: True Or False?').click();
      await Promise.all([
        expect(overlayExercise).toBeVisible(),
        expect(overlayExercise).toContainText('Hint: It\'s true!')
      ]);
    });

    test ('evaluates correct answer', async () => {
      await overlayExercise.locator('.h5p-true-false-answer').getByText('True').click();
      await overlayExercise.getByLabel('Check the answers').click();
      await Promise.all([
        expect(overlayExercise).toContainText('1/1'),
        expect(overlayExercise).not.toContainText('Show solution'),
        expect(overlayExercise).not.toContainText('Retry'),
        expect(overlayExercise).toContainText('Continue'),
        expect(toolbar).toContainText('14/6'), // 1 heart in front of stages
        expect(toolbar).toContainText('4/6'), // 4/6 stages
        expect(toolbar).toContainText('2/8'), // 2/8 points
      ]);
    });

    test ('lets user continue and closes overlay', async () => {
      await overlayExercise.getByText('Continue').click();
      await expect(overlayExercise).not.toBeVisible();
    });
  });

  test.describe('try to open "Jump" again even though it is locked as before', () => {
    test ('does not open "Jump" (locked)', async () => {
      await h5pContainer.getByLabel('Stage: Jump').click();
      await page.waitForTimeout(OVERLAY_TIMEOUT_MS);
      await expect(overlayExercise).not.toBeVisible();
      await expect(confirmationDialog).toContainText('This stage requires');
    });

    test.describe('close confirmation dialog', () => {
      test ('does close confirmation dialog', async () => {
        await confirmationDialog.getByLabel('Close').click();
        await expect(confirmationDialog).not.toBeVisible();
      });
    });
  });

  test.describe('get extra life', () => {
    test ('does open "Heart" (unlocked)', async () => {
      await h5pContainer.getByLabel('Stage: Heart', { exact: true }).click();
      await Promise.all([
        expect(overlayExercise).not.toBeVisible(),
        expect(toolbar).toContainText('24/6'), // 1 heart in front of stages
        expect(toolbar).toContainText('4/6'), // 3/6 stages
        expect(toolbar).toContainText('2/8'), // 1/8 points
      ]);
    });
  });
});

