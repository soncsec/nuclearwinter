import { expect, test } from '@playwright/test';
import { openGame, snapshot } from './helpers';

const GROUND_Y = 204;

test.beforeEach(async ({ page }) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
});

test('a warhead shot down throws sparks that then die away', async ({ page }) => {
  await page.evaluate((ground) => {
    window.__game?.launchWarhead({ x: 120, y: 60 }, { x: 120, y: ground }, 1);
    window.__game?.fireAt({ x: 120, y: 60 });
  }, GROUND_Y);
  await expect.poll(async () => (await snapshot(page)).score, { timeout: 30_000 }).toBe(25);
  await expect.poll(async () => (await snapshot(page)).sparkBursts).toBe(1);
  await expect.poll(async () => (await snapshot(page)).sparks, { timeout: 30_000 }).toBe(0);
});

test('a warhead hitting a city throws a shower of sparks', async ({ page }) => {
  await page.evaluate((ground) => {
    window.__game?.launchWarhead({ x: 72, y: 150 }, { x: 72, y: ground }, 200);
  }, GROUND_Y);
  await expect.poll(async () => (await snapshot(page)).cities[0], { timeout: 30_000 }).toBe(false);
  await expect.poll(async () => (await snapshot(page)).sparkBursts).toBe(1);
});
