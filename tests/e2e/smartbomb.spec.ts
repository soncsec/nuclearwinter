import { expect, test } from '@playwright/test';
import { openGame, snapshot } from './helpers';

const GROUND_Y = 204;

test.beforeEach(async ({ page }) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
});

test('a smart bomb steers clear of a near miss that would catch a plain warhead', async ({
  page,
}) => {
  // In one frame: a slow smart bomb and a slow plain warhead, each with a shot 10 px beside it.
  await page.evaluate((ground) => {
    const g = window.__game;
    g?.launchSmartBomb({ x: 100, y: 60 }, { x: 100, y: ground }, 1);
    g?.launchWarhead({ x: 280, y: 60 }, { x: 280, y: ground }, 1);
    g?.fireAt({ x: 110, y: 60 });
    g?.fireAt({ x: 290, y: 60 });
  }, GROUND_Y);
  await expect.poll(async () => (await snapshot(page)).warheads.length).toBe(2);
  // The plain warhead is caught; the smart bomb is still flying, pushed away from its blast.
  await expect
    .poll(async () => (await snapshot(page)).warheads.length, { timeout: 30_000 })
    .toBe(1);
  await expect.poll(async () => (await snapshot(page)).blasts, { timeout: 30_000 }).toBe(0);
  const snap = await snapshot(page);
  expect(snap.smartBombs).toBe(1);
  expect(snap.warheads[0]?.x).toBeLessThan(100);
  expect(snap.score).toBe(25);
});

test('a smart bomb hit dead on is destroyed for 125 points', async ({ page }) => {
  await page.evaluate((ground) => {
    window.__game?.launchSmartBomb({ x: 100, y: 60 }, { x: 100, y: ground }, 1);
    window.__game?.fireAt({ x: 100, y: 60 });
  }, GROUND_Y);
  await expect.poll(async () => (await snapshot(page)).score, { timeout: 30_000 }).toBe(125);
  expect((await snapshot(page)).smartBombs).toBe(0);
});
