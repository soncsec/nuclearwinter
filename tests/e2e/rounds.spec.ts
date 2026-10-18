import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { openGame, snapshot, tapGame } from './helpers';

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

/** Taps once taps are accepted again; returns when play has resumed (next wave or new game). */
async function tapToRestart(page: Page, info: TestInfo): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => window.__game?.canRestart() ?? false), { timeout: 5_000 })
    .toBe(true);
  await tapGame(page, info, 192, 100);
  await expect.poll(async () => (await snapshot(page)).phase).toBe('playing');
}

test('clearing the wave shows how many cities were saved', async ({ page }) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate(
    (ground) => window.__game?.launchWarhead({ x: 72, y: ground - 20 }, { x: 72, y: ground }, 200),
    GROUND_Y,
  );
  await expect.poll(async () => (await snapshot(page)).cities[0]).toBe(false);
  await page.evaluate(() => window.__game?.finishWave());

  await expect.poll(async () => (await snapshot(page)).phase).toBe('waveCleared');
  const message = (await snapshot(page)).message;
  expect(message[0]).toBe('WAVE 1 CLEARED');
  expect(message[1]).toBe('CITIES SAVED 5');
  expect(message[2]).toMatch(/^(TAP|CLICK) FOR NEXT WAVE$/);
});

test('the game starts at wave 1 and says so', async ({ page }) => {
  await openGame(page);
  const snap = await snapshot(page);
  expect(snap.wave).toBe(1);
  expect(snap.hudWave).toBe('WAVE 1');
  expect(snap.waveBanner).toBe('WAVE 1');
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
    .poll(async () => (await snapshot(page)).phase, { timeout: 10_000 })
    .toBe('waveCleared');
  expect((await snapshot(page)).ammo).toEqual([9, 10, 10]);

  await tapToRestart(page, info);
  const snap = await snapshot(page);
  expect(snap.wave).toBe(2);
  expect(snap.hudWave).toBe('WAVE 2');
  expect(snap.waveBanner).toBe('WAVE 2');
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
  expect(snap.message.slice(0, 2)).toEqual(['GAME OVER', 'SCORE 000000']);
});

test('a tap after game over starts a fresh game, but not straight away', async ({ page }, info) => {
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

  // Back to the real lockout; once it has passed, a tap starts a new game.
  await page.evaluate((ms) => window.__game?.setRestartDelay(ms), RESTART_DELAY_MS);
  await tapToRestart(page, info);
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
  await tapToRestart(page, info);
  expect((await snapshot(page)).seed).not.toBe(first);
});
