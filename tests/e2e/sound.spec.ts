import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameSnapshot } from '../../src/scenes/GameScene';
import { openTitle, snapshot, tapGame } from './helpers';

const STORAGE_KEY = 'nuclearwinter.settings';
const GROUND_Y = 204;
const CITY_XS = [72, 104, 136, 248, 280, 312];
/** BASES.ammo x 3 bases in tuning.ts. */
const MISSILES = 36;
/** AUDIO.voices.cityHit in tuning.ts. */
const CITY_HIT_VOICES = 2;

const played = async (page: Page): Promise<GameSnapshot['sound']['played']> =>
  (await snapshot(page)).sound.played;
const soundPeak = (page: Page): Promise<number | null> =>
  page.evaluate(() => window.__game?.soundPeak() ?? null);

/**
 * Headless Firefox can't start Web Audio on a machine with no sound card (the dev machine and
 * the CI runners have none); Chromium and WebKit use a silent output instead. Firefox gets its
 * own test below: the game must play on, silently, without queueing sounds.
 */
const NO_SOUND_DEVICE = new Set(['firefox']);
const canPlaySound = (info: TestInfo): boolean => !NO_SOUND_DEVICE.has(info.project.name);

/** Starts a game with a real tap on the title, as a player does. */
async function tapToStart(page: Page, info: TestInfo, query = '?seed=7'): Promise<void> {
  await openTitle(page, query);
  await tapGame(page, info, 192, 100);
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null)).toBe('Game');
  await page.evaluate(() => window.__game?.holdWave());
}

/**
 * Starts a game and waits until sound can play: browsers hold sound back until the first tap
 * or key, so the tap on the title is what lets it start.
 */
async function startWithTap(page: Page, info: TestInfo): Promise<void> {
  test.skip(!canPlaySound(info), 'no sound device for headless Firefox; see NO_SOUND_DEVICE');
  await tapToStart(page, info);
  await expect.poll(async () => (await snapshot(page)).sound.ready, { timeout: 10_000 }).toBe(true);
}

test('a shot plays a launch and its blast a blast, and both reach the speakers', async ({
  page,
}, info) => {
  await startWithTap(page, info);
  const before = await snapshot(page);
  expect(before.sound).toMatchObject({ output: 'webaudio', muted: false });
  expect(before.sound.played.launch).toBe(0);
  await soundPeak(page);

  await page.evaluate(() => window.__game?.fireAt({ x: 192, y: 90 }));
  await expect.poll(async () => (await played(page)).launch).toBe(1);
  await expect.poll(async () => (await played(page)).blast, { timeout: 10_000 }).toBe(1);
  // Something louder than a whisper came out after the master volume.
  await expect.poll(() => soundPeak(page), { timeout: 5_000 }).toBeGreaterThan(0.05);
});

test('a city hit plays the city-hit boom, and a hit on open ground a blast', async ({
  page,
}, info) => {
  await startWithTap(page, info);
  await page.evaluate((ground) => {
    window.__game?.launchWarhead({ x: 72, y: ground - 20 }, { x: 72, y: ground }, 200);
    window.__game?.launchWarhead({ x: 165, y: ground - 20 }, { x: 165, y: ground }, 200);
  }, GROUND_Y);
  await expect.poll(async () => (await played(page)).cityHit, { timeout: 10_000 }).toBe(1);
  await expect.poll(async () => (await played(page)).blast).toBe(1);
});

test('clearing a wave plays the jingle and ticks while the bonus counts up', async ({
  page,
}, info) => {
  await startWithTap(page, info);
  await page.evaluate(() => window.__game?.finishWave());
  await expect
    .poll(async () => (await snapshot(page)).phase, { timeout: 30_000 })
    .toBe('waveCleared');
  await expect.poll(async () => (await snapshot(page)).message[2]).toBe('BONUS 780');
  const sounds = await played(page);
  expect(sounds.waveCleared).toBe(1);
  // A 900 ms count at one tick per 60 ms at most: several ticks, never one per point.
  expect(sounds.bonusTick).toBeGreaterThanOrEqual(3);
  expect(sounds.bonusTick).toBeLessThanOrEqual(16);
});

test('six cities lost at once play two booms, not six, then the game-over sound', async ({
  page,
}, info) => {
  await startWithTap(page, info);
  await page.evaluate(
    ({ xs, ground }) => {
      for (const x of xs)
        window.__game?.launchWarhead({ x, y: ground - 20 }, { x, y: ground }, 200);
    },
    { xs: CITY_XS, ground: GROUND_Y },
  );
  await expect.poll(async () => (await snapshot(page)).phase, { timeout: 10_000 }).toBe('gameOver');
  const snap = await snapshot(page);
  expect(snap.sound.played.gameOver).toBe(1);
  expect(snap.sound.played.cityHit).toBe(CITY_HIT_VOICES);
  expect(snap.sound.capped).toBe(CITY_XS.length - CITY_HIT_VOICES);
});

test('a tap with every missile spent plays the empty click', async ({ page }, info) => {
  await startWithTap(page, info);
  await page.evaluate((count) => {
    for (let i = 0; i < count; i++) window.__game?.fireAt({ x: 20 + i * 9, y: 40 });
  }, MISSILES);
  await expect.poll(async () => (await snapshot(page)).ammo).toEqual([0, 0, 0]);
  expect((await played(page)).empty).toBe(0);
  await page.evaluate(() => window.__game?.fireAt({ x: 192, y: 60 }));
  await expect.poll(async () => (await played(page)).empty).toBe(1);
  // 36 launches in one go stack up to the cap, and the rest are skipped.
  const snap = await snapshot(page);
  expect(snap.sound.played.launch).toBeGreaterThanOrEqual(1);
  expect(snap.sound.played.launch).toBeLessThan(MISSILES);
});

test('earning a bonus city plays its jingle when the next wave starts', async ({ page }, info) => {
  await startWithTap(page, info);
  await page.evaluate(() => window.__game?.setScore(4_900));
  await page.evaluate(() => window.__game?.finishWave());
  await expect
    .poll(async () => (await snapshot(page)).phase, { timeout: 30_000 })
    .toBe('waveCleared');
  expect((await played(page)).bonusCity).toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.__game?.canRestart() ?? false), { timeout: 30_000 })
    .toBe(true);
  await tapGame(page, info, 192, 100);
  await expect.poll(async () => (await snapshot(page)).hudWave).toBe('WAVE 2');
  await expect.poll(async () => (await played(page)).bonusCity).toBe(1);
});

test('where the browser cannot start sound, the game plays on silently', async ({ page }, info) => {
  test.skip(canPlaySound(info), 'this browser has a sound output');
  await tapToStart(page, info);
  await page.evaluate(() => window.__game?.fireAt({ x: 192, y: 90 }));
  await expect.poll(async () => (await snapshot(page)).blasts, { timeout: 10_000 }).toBe(1);
  const snap = await snapshot(page);
  expect(snap.sound).toMatchObject({ output: 'webaudio', muted: false, ready: false });
  // Nothing is queued to burst out later if sound starts.
  expect(Object.values(snap.sound.played).every((n) => n === 0)).toBe(true);
});

test('with mute on, the game plays no sound at all', async ({ page }, info) => {
  await openTitle(page);
  await page.evaluate(
    (k) => localStorage.setItem(k, 'reduceFlashing=0,vibration=1,mute=1'),
    STORAGE_KEY,
  );
  await tapToStart(page, info);
  await soundPeak(page);

  await page.evaluate((ground) => {
    window.__game?.fireAt({ x: 192, y: 90 });
    window.__game?.launchWarhead({ x: 72, y: ground - 20 }, { x: 72, y: ground }, 200);
  }, GROUND_Y);
  await expect.poll(async () => (await snapshot(page)).cities[0], { timeout: 10_000 }).toBe(false);
  await expect.poll(async () => (await snapshot(page)).blasts).toBe(0);
  const snap = await snapshot(page);
  expect(snap.sound.muted).toBe(true);
  expect(snap.sound.ready).toBe(false);
  expect(Object.values(snap.sound.played).every((n) => n === 0)).toBe(true);
  expect(await soundPeak(page)).toBe(0);
});
