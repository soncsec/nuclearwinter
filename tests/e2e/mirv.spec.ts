import { expect, test } from '@playwright/test';
import { openGame, snapshot, tapGame } from './helpers';

const GROUND_Y = 204;

test.beforeEach(async ({ page }) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
});

test('a MIRV splits into several warheads at its split row', async ({ page }) => {
  await page.evaluate(
    (ground) =>
      window.__game?.launchWarhead({ x: 200, y: 0 }, { x: 200, y: ground }, 60, {
        atY: 40,
        count: 3,
      }),
    GROUND_Y,
  );
  await expect.poll(async () => (await snapshot(page)).splits, { timeout: 30_000 }).toBe(1);
  const snap = await snapshot(page);
  expect(snap.warheads).toHaveLength(3);
  for (const h of snap.warheads) expect(h.y).toBeGreaterThanOrEqual(40);
});

test('a MIRV shot down before it splits takes its warheads with it', async ({ page }, info) => {
  await page.evaluate(
    (ground) =>
      window.__game?.launchWarhead({ x: 120, y: 60 }, { x: 120, y: ground }, 1, {
        atY: 150,
        count: 3,
      }),
    GROUND_Y,
  );
  await expect.poll(async () => (await snapshot(page)).warheads.length).toBe(1);
  await tapGame(page, info, 120, 62);
  await expect.poll(async () => (await snapshot(page)).score, { timeout: 30_000 }).toBe(25);
  const snap = await snapshot(page);
  expect(snap.warheads).toEqual([]);
  expect(snap.splits).toBe(0);
});
