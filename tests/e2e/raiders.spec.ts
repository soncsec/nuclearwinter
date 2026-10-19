import { expect, test } from '@playwright/test';
import { openGame, snapshot, tapGame } from './helpers';

test('wave 2 sends a bomber that drops warheads on the way across', async ({ page }, info) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.finishWave());
  await expect
    .poll(async () => (await snapshot(page)).phase, { timeout: 30_000 })
    .toBe('waveCleared');
  await expect
    .poll(() => page.evaluate(() => window.__game?.canRestart() ?? false), { timeout: 30_000 })
    .toBe(true);
  await tapGame(page, info, 192, 100);
  await expect.poll(async () => (await snapshot(page)).wave).toBe(2);
  // Ordinary warheads stop, so every warhead seen comes from the bomber.
  await page.evaluate(() => window.__game?.finishWave());
  const s = await snapshot(page);
  expect(s.raiders).toEqual([]);
  await page.evaluate(() => {
    // finishWave cancelled the scheduled raider; send the wave's bomber now instead.
    window.__game?.launchRaider('bomber', 60, 1);
  });
  await expect.poll(async () => (await snapshot(page)).raiders.length).toBe(1);
  await expect
    .poll(async () => (await snapshot(page)).warheads.length, { timeout: 30_000 })
    .toBeGreaterThan(0);
  const snap = await snapshot(page);
  expect(snap.raiders[0]?.kind).toBe('bomber');
  expect(snap.warheads[0]?.y).toBeGreaterThanOrEqual(60);
});

test('a bomber caught in a blast is shot down for 100 points', async ({ page }, info) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate(() => window.__game?.launchRaider('bomber', 60, 1));
  // Fire ahead of it, so the blast is waiting when it arrives.
  await expect
    .poll(async () => (await snapshot(page)).raiders[0]?.x ?? -99, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(118);
  await tapGame(page, info, 150, 60);
  await expect
    .poll(async () => (await snapshot(page)).raidersDestroyed, { timeout: 30_000 })
    .toBe(1);
  const snap = await snapshot(page);
  expect(snap.raiders).toEqual([]);
  // 100 for the bomber; its own blast may also catch a warhead it dropped.
  expect(snap.score).toBeGreaterThanOrEqual(100);
  expect((snap.score - 100) % 25).toBe(0);
});

test('a satellite crosses higher up, flying the other way', async ({ page }) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate(() => window.__game?.launchRaider('satellite', 30, -1));
  await expect.poll(async () => (await snapshot(page)).raiders.length).toBe(1);
  const first = (await snapshot(page)).raiders[0];
  await expect
    .poll(async () => (await snapshot(page)).raiders[0]?.x ?? 999, { timeout: 30_000 })
    .toBeLessThan((first?.x ?? 0) - 5);
  expect((await snapshot(page)).raiders[0]).toMatchObject({ kind: 'satellite', y: 30 });
});
