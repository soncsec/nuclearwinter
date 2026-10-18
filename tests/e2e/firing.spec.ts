import { expect, test } from '@playwright/test';
import { openGame, snapshot, tapGame } from './helpers';

const GROUND_Y = 204;

test.beforeEach(async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__game?.holdWave());
});

test('a tap or click fires from the nearest base towards that point', async ({ page }, info) => {
  await tapGame(page, info, 40, 100);
  await expect.poll(async () => (await snapshot(page)).lastShot?.baseIndex).toBe(0);
  const shot = (await snapshot(page)).lastShot;
  expect(shot?.target.x).toBeCloseTo(40, -1);
  expect(shot?.target.y).toBeCloseTo(100, -1);

  await tapGame(page, info, 350, 80);
  await expect.poll(async () => (await snapshot(page)).lastShot?.baseIndex).toBe(2);
});

test('the counter-missile explodes and the blast destroys a warhead for points', async ({
  page,
}, info) => {
  await page.evaluate(
    (ground) => window.__game?.launchWarhead({ x: 120, y: 60 }, { x: 120, y: ground }, 1),
    GROUND_Y,
  );
  await expect.poll(async () => (await snapshot(page)).warheads.length).toBe(1);
  await tapGame(page, info, 120, 62);
  await expect.poll(async () => (await snapshot(page)).score, { timeout: 10_000 }).toBe(25);
  expect((await snapshot(page)).warheads).toEqual([]);
});

test('a warhead that is not shot down destroys the city it lands on', async ({ page }) => {
  await page.evaluate(
    (ground) => window.__game?.launchWarhead({ x: 72, y: ground - 30 }, { x: 72, y: ground }, 120),
    GROUND_Y,
  );
  await expect.poll(async () => (await snapshot(page)).cities[0], { timeout: 10_000 }).toBe(false);
  expect((await snapshot(page)).cities.slice(1)).toEqual([true, true, true, true, true]);
});
