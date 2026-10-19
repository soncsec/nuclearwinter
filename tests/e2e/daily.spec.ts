import { expect, test, type Page } from '@playwright/test';
import { dailySeed } from '../../src/logic/daily';
import { openTitle, snapshot, tapGame, titleLines } from './helpers';

const GROUND_Y = 204;
const CITY_XS = [72, 104, 136, 248, 280, 312];
/** TITLE.dailyY + half the font height in tuning.ts: the middle of the daily button. */
const DAILY_BUTTON_Y = 174;

async function onDay(page: Page, day: string): Promise<void> {
  await page.clock.setFixedTime(new Date(`${day}T12:00:00Z`));
}

async function startDaily(page: Page, info: import('@playwright/test').TestInfo): Promise<void> {
  await tapGame(page, info, 192, DAILY_BUTTON_Y);
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null)).toBe('Game');
}

async function loseWithScore(page: Page, score: number): Promise<void> {
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate((s) => window.__game?.setScore(s), score);
  await page.evaluate(
    ({ xs, ground }) => {
      for (const x of xs)
        window.__game?.launchWarhead({ x, y: ground - 20 }, { x, y: ground }, 200);
    },
    { xs: CITY_XS, ground: GROUND_Y },
  );
  await expect.poll(async () => (await snapshot(page)).phase, { timeout: 30_000 }).toBe('gameOver');
}

test('the title offers the daily challenge with today’s best', async ({ page }, info) => {
  await onDay(page, '2026-10-19');
  await openTitle(page);
  const daily = (await titleLines(page))[5];
  const keyHint = info.project.use.hasTouch ? '' : 'D  ';
  expect(daily).toBe(`${keyHint}DAILY CHALLENGE  BEST 000000`);
});

test('a tap on the daily button starts the day’s challenge with the day’s seed', async ({
  page,
}, info) => {
  await onDay(page, '2026-10-19');
  await openTitle(page, '?seed=7');
  await startDaily(page, info);
  const snap = await snapshot(page);
  expect(snap.mode).toBe('daily');
  // The day's seed wins over ?seed, so everyone gets the same game.
  expect(snap.seed).toBe(dailySeed('2026-10-19'));
  expect(snap.hudHigh).toBe('DAY 000000');
  expect(snap.interceptors).toBe(0);
});

test('the same day gives the same seed, the next day a different one', async ({ page }, info) => {
  await onDay(page, '2026-10-19');
  await openTitle(page);
  await startDaily(page, info);
  const first = (await snapshot(page)).seed;
  await openTitle(page);
  await startDaily(page, info);
  expect((await snapshot(page)).seed).toBe(first);

  await onDay(page, '2026-10-20');
  await openTitle(page);
  await startDaily(page, info);
  const next = (await snapshot(page)).seed;
  expect(next).toBe(dailySeed('2026-10-20'));
  expect(next).not.toBe(first);
});

test('a daily best is kept apart from the high score', async ({ page }, info) => {
  await onDay(page, '2026-10-19');
  await openTitle(page);
  await page.evaluate(() => window.localStorage.setItem('nuclearwinter.highScore', '9000'));
  await openTitle(page);
  await startDaily(page, info);
  await loseWithScore(page, 1500);
  const snap = await snapshot(page);
  expect(snap.message).toContain('NEW DAILY BEST');
  expect(snap.hudHigh).toBe('DAY 001500');

  const stored = await page.evaluate(() => ({
    daily: window.localStorage.getItem('nuclearwinter.dailyBest'),
    high: window.localStorage.getItem('nuclearwinter.highScore'),
  }));
  expect(stored).toEqual({ daily: '2026-10-19:1500', high: '9000' });

  await openTitle(page);
  const lines = await titleLines(page);
  expect(lines[1]).toBe('HI 009000');
  expect(lines[5]).toMatch(/DAILY CHALLENGE {2}BEST 001500$/);

  // Tomorrow the daily best starts again from zero.
  await onDay(page, '2026-10-20');
  await openTitle(page);
  expect((await titleLines(page))[5]).toMatch(/BEST 000000$/);
});

test('a normal tap still starts a normal game', async ({ page }, info) => {
  await openTitle(page, '?seed=7');
  await tapGame(page, info, 192, 100);
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null)).toBe('Game');
  const snap = await snapshot(page);
  expect(snap.mode).toBe('normal');
  expect(snap.seed).toBe(7);
  expect(snap.hudHigh).toMatch(/^HI /);
});

test('D starts the daily challenge from the keyboard', async ({ page }, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'desktop keyboard only');
  await onDay(page, '2026-10-19');
  await openTitle(page);
  await page.keyboard.press('d');
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null)).toBe('Game');
  expect((await snapshot(page)).mode).toBe('daily');
});
