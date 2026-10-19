import { expect, test } from '@playwright/test';
import { openGame, snapshot } from './helpers';

const GROUND_Y = 204;

test.beforeEach(async ({ page }) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
});

test('the sky starts clear with a little ash', async ({ page }) => {
  const snap = await snapshot(page);
  expect(snap.gloom).toBe(0);
  expect(snap.ashFlakes).toBe(30);
});

test('losing three cities darkens the sky gradually and thickens the ash', async ({ page }) => {
  await page.evaluate((ground) => {
    for (const x of [72, 104, 136]) {
      window.__game?.launchWarhead({ x, y: 150 }, { x, y: ground }, 200);
    }
  }, GROUND_Y);
  await expect
    .poll(async () => (await snapshot(page)).cities.filter((c) => !c).length, { timeout: 30_000 })
    .toBe(3);
  // Gloom eases in rather than jumping straight to half.
  expect((await snapshot(page)).gloom).toBeLessThan(0.5);
  await expect.poll(async () => (await snapshot(page)).gloom, { timeout: 30_000 }).toBe(0.5);
  expect((await snapshot(page)).ashFlakes).toBe(255);
});
