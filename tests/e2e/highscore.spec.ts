import { expect, test, type Page } from '@playwright/test';
import { openGame, snapshot } from './helpers';

const GROUND_Y = 204;
const CITY_XS = [72, 104, 136, 248, 280, 312];
const KEY = 'nuclearwinter.highScore';

async function loseGameWithScore(page: Page, score: number): Promise<void> {
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate((s) => window.__game?.setScore(s), score);
  await page.evaluate(
    ({ xs, ground }) => {
      for (const x of xs)
        window.__game?.launchWarhead({ x, y: ground - 20 }, { x, y: ground }, 200);
    },
    { xs: CITY_XS, ground: GROUND_Y },
  );
  await expect.poll(async () => (await snapshot(page)).phase).toBe('gameOver');
}

const stored = (page: Page): Promise<string | null> =>
  page.evaluate((k) => window.localStorage.getItem(k), KEY);

test('a new browser starts with a high score of zero', async ({ page }) => {
  await openGame(page);
  expect((await snapshot(page)).hudHigh).toBe('HI 000000');
});

test('a best score is saved, announced, and still there after a reload', async ({ page }) => {
  await openGame(page);
  await loseGameWithScore(page, 1234);
  const snap = await snapshot(page);
  expect(snap.message[2]).toBe('NEW HIGH SCORE');
  expect(snap.hudHigh).toBe('HI 001234');
  expect(await stored(page)).toBe('1234');

  await openGame(page);
  expect((await snapshot(page)).hudHigh).toBe('HI 001234');
});

test('a lower score leaves the high score alone', async ({ page }) => {
  await openGame(page);
  await page.evaluate((k) => window.localStorage.setItem(k, '5000'), KEY);
  await openGame(page);
  await loseGameWithScore(page, 100);
  const snap = await snapshot(page);
  expect(snap.message).not.toContain('NEW HIGH SCORE');
  expect(snap.hudHigh).toBe('HI 005000');
  expect(await stored(page)).toBe('5000');
});

test('the HI display rises with the score once it passes the record', async ({ page }) => {
  await openGame(page);
  await page.evaluate((k) => window.localStorage.setItem(k, '300'), KEY);
  await openGame(page);
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate(() => window.__game?.setScore(450));
  expect((await snapshot(page)).hudHigh).toBe('HI 000450');
});

test('a tampered saved value is ignored and the game still runs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openGame(page);
  await page.evaluate((k) => window.localStorage.setItem(k, '<img src=x onerror=alert(1)>'), KEY);
  await openGame(page);
  expect((await snapshot(page)).hudHigh).toBe('HI 000000');
  await loseGameWithScore(page, 60);
  expect(await stored(page)).toBe('60');
  expect(errors).toEqual([]);
});
