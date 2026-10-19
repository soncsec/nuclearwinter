import { expect, test } from '@playwright/test';
import { openGame, snapshot } from './helpers';

test.beforeEach(async ({ page }) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
});

test('bloom is on wherever the game renders with WebGL', async ({ page }) => {
  const snap = await snapshot(page);
  expect(snap.bloom).toBe(snap.renderer === 'webgl');
});

test('bloom switches off for good when the frame rate stays low', async ({ page }) => {
  test.skip((await snapshot(page)).renderer !== 'webgl', 'bloom needs WebGL');
  // Past the warm-up, then several seconds at 30 fps.
  await page.evaluate(() => {
    window.__game?.feedFrames(1000 / 60, 2500);
    window.__game?.feedFrames(1000 / 30, 6000);
  });
  expect((await snapshot(page)).bloom).toBe(false);
  // Back at 60 fps it stays off, so the look never flickers.
  await page.evaluate(() => window.__game?.feedFrames(1000 / 60, 10_000));
  expect((await snapshot(page)).bloom).toBe(false);
  // The game plays on.
  expect((await snapshot(page)).phase).toBe('playing');
});
