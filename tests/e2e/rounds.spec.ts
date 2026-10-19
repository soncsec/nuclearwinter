import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { openGame, snapshot, tapGame, titleLines } from './helpers';

const GROUND_Y = 204;
/** SCREENS.restartDelayMs in tuning.ts. */
const RESTART_DELAY_MS = 1000;
const CITY_XS = [72, 104, 136, 248, 280, 312];

/** Drops a fast warhead straight onto every city. */
async function destroyAllCities(page: Page): Promise<void> {
  await page.evaluate(
    ({ xs, ground }) => {
      for (const x of xs)
        window.__game?.launchWarhead({ x, y: ground - 20 }, { x, y: ground }, 200);
    },
    { xs: CITY_XS, ground: GROUND_Y },
  );
}

async function waitForTaps(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => window.__game?.canRestart() ?? false), { timeout: 5_000 })
    .toBe(true);
}

/** Taps once taps are accepted again; returns when the next wave is playing. */
async function tapToRestart(page: Page, info: TestInfo): Promise<void> {
  await waitForTaps(page);
  await tapGame(page, info, 192, 100);
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
}

/** Taps once taps are accepted after game over; returns when the title screen is showing. */
async function tapToTitle(page: Page, info: TestInfo): Promise<void> {
  await waitForTaps(page);
  await tapGame(page, info, 192, 100);
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null)).toBe('Title');
}

test('clearing the wave counts up a bonus for cities and missiles left', async ({ page }, info) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate(
    (ground) => window.__game?.launchWarhead({ x: 72, y: ground - 20 }, { x: 72, y: ground }, 200),
    GROUND_Y,
  );
  await expect.poll(async () => (await snapshot(page)).cities[0]).toBe(false);
  // Spend two missiles, so 28 are left.
  await tapGame(page, info, 30, 60);
  await tapGame(page, info, 350, 60);
  await expect.poll(async () => (await snapshot(page)).ammo).toEqual([9, 10, 9]);
  await page.evaluate(() => window.__game?.finishWave());

  await expect
    .poll(async () => (await snapshot(page)).phase, { timeout: 30_000 })
    .toBe('waveCleared');
  // 5 cities x 100 + 28 missiles x 5 = 640, counted up on screen and into the score.
  await expect.poll(async () => (await snapshot(page)).message[2]).toBe('BONUS 640');
  const snap = await snapshot(page);
  expect(snap.score).toBe(640);
  expect(snap.hudScore).toBe('000640');
  expect(snap.message[0]).toBe('WAVE 1 CLEARED');
  expect(snap.message[1]).toBe('CITIES 5  MISSILES 28');
  expect(snap.message[3]).toMatch(/^(TAP|CLICK) FOR NEXT WAVE$/);
});

test('a base destroyed in one wave is rebuilt for the next', async ({ page }, info) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate(
    (ground) =>
      window.__game?.launchWarhead({ x: 192, y: ground - 20 }, { x: 192, y: ground }, 200),
    GROUND_Y,
  );
  await expect.poll(async () => (await snapshot(page)).bases).toEqual([true, false, true]);
  await page.evaluate(() => window.__game?.finishWave());
  await expect
    .poll(async () => (await snapshot(page)).phase, { timeout: 30_000 })
    .toBe('waveCleared');

  await tapToRestart(page, info);
  await expect.poll(async () => (await snapshot(page)).hudWave).toBe('WAVE 2');
  const snap = await snapshot(page);
  expect(snap.bases).toEqual([true, true, true]);
  expect(snap.ammo).toEqual([10, 10, 10]);
});

test('the game starts at wave 1 and says so', async ({ page }) => {
  await openGame(page);
  const snap = await snapshot(page);
  expect(snap.wave).toBe(1);
  expect(snap.hudWave).toBe('WAVE 1');
  expect(snap.bannersShown).toEqual(['WAVE 1']);
  // The banner goes away after a moment; the HUD keeps the number.
  await expect.poll(async () => (await snapshot(page)).waveBanner, { timeout: 5_000 }).toBeNull();
  expect((await snapshot(page)).hudWave).toBe('WAVE 1');
});

test('after a cleared wave, a tap starts the next wave with cities, score and reloaded bases', async ({
  page,
}, info) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  // Use a missile, lose one city, then clear the wave.
  await tapGame(page, info, 30, 60);
  await page.evaluate(
    (ground) => window.__game?.launchWarhead({ x: 72, y: ground - 20 }, { x: 72, y: ground }, 200),
    GROUND_Y,
  );
  await expect.poll(async () => (await snapshot(page)).cities[0]).toBe(false);
  await page.evaluate(() => window.__game?.finishWave());
  await expect
    .poll(async () => (await snapshot(page)).phase, { timeout: 30_000 })
    .toBe('waveCleared');
  expect((await snapshot(page)).ammo).toEqual([9, 10, 10]);

  await tapToRestart(page, info);
  // The HUD and banner update on the frame after the tap, so wait for them.
  await expect.poll(async () => (await snapshot(page)).hudWave).toBe('WAVE 2');
  const snap = await snapshot(page);
  expect(snap.wave).toBe(2);
  expect(snap.hudWave).toBe('WAVE 2');
  expect(snap.bannersShown).toEqual(['WAVE 1', 'WAVE 2']);
  expect(snap.message).toEqual([]);
  expect(snap.cities).toEqual([false, true, true, true, true, true]);
  expect(snap.ammo).toEqual([10, 10, 10]);
  expect(snap.seed).toBe(7);
});

test('losing every city ends the game and shows the score', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__game?.holdWave());
  await destroyAllCities(page);

  await expect.poll(async () => (await snapshot(page)).phase).toBe('gameOver');
  const snap = await snapshot(page);
  expect(snap.cities).toEqual([false, false, false, false, false, false]);
  expect(snap.message.slice(0, 2)).toEqual(['GAME OVER', 'SCORE 000000  WAVE 1']);
  expect(snap.message[snap.message.length - 1]).toMatch(/^(TAP|CLICK) TO CONTINUE$/);
  // The game ended while "WAVE 1" was still up; the banner must give way to the message.
  expect(snap.bannersShown).toEqual(['WAVE 1']);
  expect(snap.waveBanner).toBeNull();
});

test('a tap after game over returns to the title, but not straight away', async ({
  page,
}, info) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  // A long lockout, so "too early" doesn't depend on how fast the test machine is.
  await page.evaluate(() => window.__game?.setRestartDelay(60_000));
  await destroyAllCities(page);
  await expect.poll(async () => (await snapshot(page)).phase).toBe('gameOver');

  // A tap during the lockout is ignored, so a shot fired as the last city falls can't skip the
  // screen. Wait a few frames so the tap has certainly been handled.
  expect(await page.evaluate(() => window.__game?.canRestart())).toBe(false);
  await tapGame(page, info, 192, 100);
  await page.waitForTimeout(300);
  expect((await snapshot(page)).phase).toBe('gameOver');

  // Back to the real lockout; once it has passed, a tap returns to the title, which shows the
  // score just made as the high score, and a tap there starts a fresh game.
  await page.evaluate((ms) => window.__game?.setRestartDelay(ms), RESTART_DELAY_MS);
  await tapToTitle(page, info);
  expect(await titleLines(page)).toContain('HI 000000');
  await tapGame(page, info, 192, 100);
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null)).toBe('Game');
  const snap = await snapshot(page);
  expect(snap.cities).toEqual([true, true, true, true, true, true]);
  expect(snap.bases).toEqual([true, true, true]);
  expect(snap.score).toBe(0);
  expect(snap.hudScore).toBe('000000');
  expect(snap.message).toEqual([]);
  expect(snap.seed).toBe(7);

  // Input still works, and fires once per tap (the restart must not add a second listener).
  await page.evaluate(() => window.__game?.holdWave());
  await tapGame(page, info, 40, 100);
  await expect.poll(async () => (await snapshot(page)).interceptors).toBe(1);
});

test('without ?seed each game gets a new random seed', async ({ page }, info) => {
  await openGame(page);
  const first = (await snapshot(page)).seed;
  await page.evaluate(() => window.__game?.holdWave());
  await destroyAllCities(page);
  await expect.poll(async () => (await snapshot(page)).phase).toBe('gameOver');
  await tapToTitle(page, info);
  await page.evaluate(() => window.__game?.start());
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null)).toBe('Game');
  expect((await snapshot(page)).seed).not.toBe(first);
});

test('reaching 10,000 points rebuilds a lost city at the next wave', async ({ page }, info) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate(
    (ground) =>
      window.__game?.launchWarhead({ x: 104, y: ground - 20 }, { x: 104, y: ground }, 200),
    GROUND_Y,
  );
  await expect.poll(async () => (await snapshot(page)).cities[1]).toBe(false);
  // Just short of 10,000; the end-of-wave bonus carries it over.
  await page.evaluate(() => window.__game?.setScore(9_900));
  await page.evaluate(() => window.__game?.finishWave());
  await expect
    .poll(async () => (await snapshot(page)).phase, { timeout: 30_000 })
    .toBe('waveCleared');
  expect((await snapshot(page)).score).toBeGreaterThanOrEqual(10_000);

  await tapToRestart(page, info);
  await expect.poll(async () => (await snapshot(page)).hudWave).toBe('WAVE 2');
  const snap = await snapshot(page);
  expect(snap.cities).toEqual([true, true, true, true, true, true]);
  expect(snap.bannersShown.at(-1)).toBe('WAVE 2\nBONUS CITY');
});

test('from wave 3 every point counts double, and the banner says so', async ({ page }, info) => {
  await openGame(page, '?seed=7');
  // Clear waves 1 and 2 with nothing launched: all six cities and 30 missiles each time.
  for (const wave of [1, 2]) {
    await page.evaluate(() => window.__game?.finishWave());
    await expect
      .poll(async () => (await snapshot(page)).phase, { timeout: 30_000 })
      .toBe('waveCleared');
    expect((await snapshot(page)).message[1]).toBe('CITIES 6  MISSILES 30');
    await tapToRestart(page, info);
    await expect.poll(async () => (await snapshot(page)).wave).toBe(wave + 1);
  }
  await expect
    .poll(async () => (await snapshot(page)).bannersShown)
    .toEqual(['WAVE 1', 'WAVE 2', 'WAVE 3\n2X POINTS']);
  // Two clean waves at 1x: 2 x (6 x 100 + 30 x 5) = 1500.
  const before = await snapshot(page);
  expect(before.multiplier).toBe(2);
  expect(before.score).toBe(1500);

  // A kill on wave 3 is worth 2 x 25.
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate(
    (ground) => window.__game?.launchWarhead({ x: 120, y: 60 }, { x: 120, y: ground }, 1),
    GROUND_Y,
  );
  await expect.poll(async () => (await snapshot(page)).warheads.length).toBe(1);
  await tapGame(page, info, 120, 62);
  await expect.poll(async () => (await snapshot(page)).score, { timeout: 30_000 }).toBe(1550);

  // The wave's bonus is doubled too, and the tally says so.
  await page.evaluate(() => window.__game?.finishWave());
  await expect
    .poll(async () => (await snapshot(page)).phase, { timeout: 30_000 })
    .toBe('waveCleared');
  await expect.poll(async () => (await snapshot(page)).message[2]).toBe('BONUS 1490');
  expect((await snapshot(page)).message[1]).toBe('CITIES 6  MISSILES 29  2X');
  expect((await snapshot(page)).score).toBe(1550 + 1490);
});
