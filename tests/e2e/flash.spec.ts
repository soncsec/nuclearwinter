import { expect, test } from '@playwright/test';
import { openGame, snapshot } from './helpers';

const GROUND_Y = 204;
const CITY_XS = [72, 104, 136, 248];

test.beforeEach(async ({ page }) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
});

test('a city hit flashes and shakes the screen', async ({ page }) => {
  await page.evaluate((ground) => {
    window.__game?.launchWarhead({ x: 72, y: 150 }, { x: 72, y: ground }, 200);
  }, GROUND_Y);
  await expect.poll(async () => (await snapshot(page)).shakes, { timeout: 30_000 }).toBe(1);
  expect((await snapshot(page)).flashes).toBe(1);
});

test('four cities hit at once flash only three times (safe-flash limit)', async ({ page }) => {
  await page.evaluate(
    ({ ground, xs }) => {
      for (const x of xs) window.__game?.launchWarhead({ x, y: 150 }, { x, y: ground }, 200);
    },
    { ground: GROUND_Y, xs: CITY_XS },
  );
  await expect.poll(async () => (await snapshot(page)).shakes, { timeout: 30_000 }).toBe(4);
  expect((await snapshot(page)).flashes).toBe(3);
});
