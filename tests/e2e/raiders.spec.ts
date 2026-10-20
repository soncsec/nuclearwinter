import { expect, test } from '@playwright/test';
import { openGame, snapshot, tapGame, waitInGameTime } from './helpers';

test('wave 2 sends a bomber that drops warheads on the way across', async ({ page }, info) => {
  // The waits below run on game time, which a busy machine slows down; allow for that.
  test.setTimeout(300_000);
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
  // Wave 2 schedules one raider, which arrives on its own 4 s (game time) in.
  expect(await waitInGameTime(page, (s) => s.raiders.length === 1, 8_000)).toBe('met');
  // From now on nothing else launches, so a new warhead can only come from the bomber.
  await page.evaluate(() => window.__game?.holdWave());
  const before = await snapshot(page);
  expect(before.raiders[0]?.kind).toBe('bomber');
  const drops = before.raiders[0]?.dropsLeft ?? 0;
  expect(drops).toBeGreaterThan(0);
  // It drops its first warhead about a second after it comes on screen. Earlier warheads may
  // land meanwhile, so count the bomber's drops rather than the warheads in the sky.
  expect(await waitInGameTime(page, (s) => (s.raiders[0]?.dropsLeft ?? drops) < drops, 6_000)).toBe(
    'met',
  );
  expect((await snapshot(page)).warheads.length).toBeGreaterThan(0);
});

test('a bomber caught in a blast is shot down for 100 points', async ({ page }) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  // In one frame: a bomber at x 120 flying right, and a shot at x 150 just ahead of it. The
  // missile takes about 0.6 s, and the bomber reaches the blast about 1 s in, while it is large.
  await page.evaluate(() => {
    window.__game?.launchRaider('bomber', 60, 1, 120);
    window.__game?.fireAt({ x: 150, y: 60 });
  });
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
