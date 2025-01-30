import { test, expect } from '@playwright/test';

/** @constant {number} OVERLAY_OPENED_TIMEOUT_MS Timeout to wait to ensure overlay animation finished. */
const OVERLAY_OPENED_TIMEOUT_MS = 1000;

// Just a demo for now ...
test.describe('demo', () => {
  let page;
  let h5pContainer;
  let overlay;
  let toolbar;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe(('start-up'), () => {
    test('has correct content title', async () => {
      /*
       * Workaround: Calling twice, because of bug in H5P CLI. H5P CLI will run the content upgrade
       * if required, but still use the old parameters on first content load.
       * @see {@link https://h5ptechnology.atlassian.net/browse/HFP-4200}
       */
      await page.goto('http://localhost:8080/view/h5p-game-map/test-1?session=null');
      await page.goto('http://localhost:8080/view/h5p-game-map/test-1?session=null');

      h5pContainer = await page.frameLocator('.h5p-iframe').locator('.h5p-container');
      overlay = h5pContainer.locator('.h5p-game-map-overlay-dialog.exercise');
      toolbar = await h5pContainer.locator('.h5p-game-map-toolbar-tool-bar');

      await expect(toolbar).toContainText('Animals around the world');
    });

    test('has correct scores', async () => {
      await Promise.all([
        expect(toolbar).toContainText('0/8'), // 0/8 stages
        expect(toolbar).toContainText('0/17') // 0/17 points
      ]);
    });

    test ('overlay is not visible', async () => {
      await expect(overlay).not.toBeVisible();
    });

    test ('1st stage is unlocked', async () => {
      const stageButton = await h5pContainer
        .getByLabel('Stage: Animals on Greenland', { exact: true })
        .locator('.h5p-game-map-stage-content');
      await expect(stageButton).toHaveClass(/h5p-game-map-stage-open/);
    });

    test ('2nd stage is locked', async () => {
      const stageButton = await h5pContainer
        .getByLabel('Stage: Animals on Greenland quiz')
        .locator('.h5p-game-map-stage-content');
      await expect(stageButton).toHaveClass(/h5p-game-map-stage-locked/);
    });

    test ('3rd stage is locked', async () => {
      const stageButton = await h5pContainer
        .getByLabel('Stage: Drag and drop words in')
        .locator('.h5p-game-map-stage-content');
      await expect(stageButton).toHaveClass(/h5p-game-map-stage-locked/);
    });
  });

  test ('go to full screen', async () => {
    await h5pContainer.getByLabel('Enter fullscreen mode').click();
    await expect(h5pContainer).toHaveClass(/h5p-fullscreen/);
  });

  test.describe('complete 1st stage', () => {
    test ('does open 1st stage (unlocked)', async () => {
      await h5pContainer.getByLabel('Stage: Animals on Greenland', { exact: true }).click();
      await Promise.all([
        expect(overlay).toBeVisible(),
        expect(overlay).toContainText('Greenland, despite its icy and'),
        expect(toolbar).toContainText('1/8'), // 1/8 stages
        expect(toolbar).toContainText('0/17') // 0/17 points
      ]);
    });

    test ('closes 1st stage', async () => {
      await page.waitForTimeout(OVERLAY_OPENED_TIMEOUT_MS);
      await overlay.getByLabel('Close').click();
      await expect(overlay).not.toBeVisible();
    });
  });

  test.describe('try to open 3rd stage even though it is locked', () => {
    test ('does not open 3rd stage (locked)', async () => {
      await h5pContainer.getByLabel('Stage: Drag and drop words in').click();
      await expect(overlay).not.toBeVisible();
    });
  });

  test.describe('complete 2nd stage', () => {
    test ('does open 2nd stage (unlocked)', async () => {
      await h5pContainer.getByLabel('Stage: Animals on Greenland quiz').click();
      await Promise.all([
        expect(overlay).toBeVisible(),
        expect(overlay).toContainText('What is the primary diet of Polar Bears?')
      ]);
    });

    test ('closes 2nd stage', async () => {
      await page.waitForTimeout(OVERLAY_OPENED_TIMEOUT_MS);
      await overlay.getByLabel('Close').click();
      await expect(overlay).not.toBeVisible();
    });

    test ('keeps 3rd stage locked', async () => {
      const stageButton = await h5pContainer
        .getByLabel('Stage: Drag and drop words in')
        .locator('.h5p-game-map-stage-content');
      await expect(stageButton).toHaveClass(/h5p-game-map-stage-locked/);
    });

    test ('re-opens 2nd stage', async () => {
      await h5pContainer.getByLabel('Stage: Animals on Greenland quiz').click();
      await Promise.all([
        expect(overlay).toBeVisible(),
        expect(overlay).toContainText('What is the primary diet of Polar Bears?')
      ]);
    });

    test ('evaluates wrong answer', async () => {
      await overlay.getByText('Grass and plants').click();
      await overlay.getByLabel('Check the answers').click();
      await Promise.all([
        expect(overlay).toContainText('0/1'),
        expect(overlay).toContainText('Show solution'),
        expect(overlay).toContainText('Retry'),
        expect(overlay).toContainText('Continue'),
        expect(toolbar).toContainText('2/8'), // 2/8 stages
        expect(toolbar).toContainText('0/17') // 0/17 points
      ]);
    });

    test ('lets user try again', async () => {
      await overlay.getByLabel('Retry the task').click();
      await Promise.all([
        expect(overlay).not.toContainText('0/1'),
        expect(overlay).not.toContainText('Show solution'),
        expect(overlay).not.toContainText('Retry'),
        expect(overlay).toContainText('Check'),
        expect(overlay).toContainText('Continue'),
        expect(toolbar).toContainText('2/8'), // 2/8 stages
        expect(toolbar).toContainText('0/17') // 0/17 points
      ]);
    });

    test ('evaluates correct answer', async () => {
      await overlay.getByText('Seals and other marine mammals').click();
      await overlay.getByLabel('Check the answers').click();
      await Promise.all([
        expect(overlay).toContainText('1/1'),
        expect(overlay).not.toContainText('Show solution'),
        expect(overlay).not.toContainText('Retry'),
        expect(overlay).toContainText('Continue'),
        expect(toolbar).toContainText('2/8'), // 2/8 stages
        expect(toolbar).toContainText('1/17') // 0/17 points
      ]);
    });

    test ('lets user continue and closes overlay', async () => {
      await overlay.getByText('Continue').click();
      await expect(overlay).not.toBeVisible();
    });

    test ('3rd stage is now open', async () => {
      const stageButton = await h5pContainer
        .getByLabel('Stage: Drag and drop words in')
        .locator('.h5p-game-map-stage-content');
      await expect(stageButton).toHaveClass(/h5p-game-map-stage-open/);
    });
  });

  test.describe('user can finish the map', () => {
    test ('Opens confirmation dialog', async () => {
      await h5pContainer.getByLabel('Finish the map').click();
      const dialog = await h5pContainer.locator('.h5p-confirmation-dialog-popup');

      await Promise.all([
        expect(dialog).toBeVisible(),
        expect(dialog.locator('.h5p-core-cancel-button')).toBeVisible(),
        expect(dialog.locator('.h5p-confirmation-dialog-confirm-button')).toBeVisible()
      ]);
    });

    test ('user can stay', async () => {
      const dialog = await h5pContainer.locator('.h5p-confirmation-dialog-popup');
      // Playwright seems to have trouble with the focus trap except when using --debug
      // await dialog.locator('.h5p-core-cancel-button').click();
      await dialog.locator('.h5p-core-cancel-button').press('Enter');

      await expect(dialog).not.toBeVisible();
    });

    test ('Opens confirmation dialog again', async () => {
      await h5pContainer.getByLabel('Finish the map').click();
      const dialog = await h5pContainer.locator('.h5p-confirmation-dialog-popup');

      await Promise.all([
        expect(dialog).toBeVisible(),
        expect(dialog.locator('.h5p-core-cancel-button')).toBeVisible(),
        expect(dialog.locator('.h5p-confirmation-dialog-confirm-button')).toBeVisible()
      ]);
    });

    test ('user actually finished the map', async () => {
      const dialog = await h5pContainer.locator('.h5p-confirmation-dialog-popup');
      // Playwright seems to have trouble with the focus trap except when using --debug
      // await dialog.locator('.h5p-confirmation-dialog-confirm-button').click();
      await dialog.locator('.h5p-confirmation-dialog-confirm-button').press('Enter');

      await Promise.all([
        expect(dialog).not.toBeVisible(),
        expect(h5pContainer).toContainText('You have completed the map'),
        expect(h5pContainer).toContainText('1/17'),
        expect(h5pContainer).toContainText('Show solutions'),
        expect(h5pContainer).toContainText('Restart')
      ]);
    });
  });
});

