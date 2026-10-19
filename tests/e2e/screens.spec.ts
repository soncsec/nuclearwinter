import { expect, test, type Page } from '@playwright/test';
import { openGame, openTitle, snapshot, tapGame, titleLines } from './helpers';

const GROUND_Y = 204;
const CITY_XS = [72, 104, 136, 248, 280, 312];
/** The pause button fills the top-right corner: PAUSE.width x PAUSE.height in tuning.ts. */
const PAUSE_BUTTON = { x: 374, y: 7 };

const activeScene = (page: Page): Promise<string | null> =>
  page.evaluate(() => window.__game?.scene() ?? null);

test('the title screen names the game, explains the controls and shows the high score', async ({
  page,
}, info) => {
  await openTitle(page);
  const lines = await titleLines(page);
  expect(lines[0]).toBe('NUCLEAR WINTER');
  expect(lines[1]).toBe('HI 000000');
  if (info.project.use.hasTouch) {
    expect(lines[2]).toBe('TAP WHERE A MISSILE SHOULD EXPLODE');
    expect(lines[3]).toBe('DEFEND THE SIX CITIES');
    expect(lines[4]).toBe('TAP TO START');
  } else {
    expect(lines[2]).toBe('CLICK WHERE A MISSILE SHOULD EXPLODE');
    expect(lines[3]).toBe('A S D OR 1 2 3 FIRE FROM ONE BASE');
    expect(lines[4]).toBe('CLICK TO START');
  }
});

test('a tap on the title starts the game without firing a missile', async ({ page }, info) => {
  await openTitle(page, '?seed=7');
  await tapGame(page, info, 192, 100);
  await expect.poll(() => activeScene(page)).toBe('Game');
  const snap = await snapshot(page);
  expect(snap.phase).toBe('playing');
  expect(snap.wave).toBe(1);
  expect(snap.interceptors).toBe(0);
  expect(snap.ammo).toEqual([10, 10, 10]);
});

test('Enter starts the game from the keyboard', async ({ page }, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'desktop keyboard only');
  await openTitle(page);
  await page.keyboard.press('Enter');
  await expect.poll(() => activeScene(page)).toBe('Game');
});

test('the title shows the high score saved in this browser', async ({ page }) => {
  await openTitle(page);
  await page.evaluate(() => window.localStorage.setItem('nuclearwinter.highScore', '4321'));
  await openTitle(page);
  expect(await titleLines(page)).toContain('HI 004321');
});

test('the pause button stops the game and a tap resumes it without firing', async ({
  page,
}, info) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  await tapGame(page, info, PAUSE_BUTTON.x, PAUSE_BUTTON.y);
  await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
  const paused = await snapshot(page);
  expect(paused.phase).toBe('playing');
  expect(paused.message[0]).toBe('PAUSED');
  expect(paused.message[paused.message.length - 1]).toMatch(/^(TAP|CLICK) TO RESUME$/);
  // The pause button itself fired nothing.
  expect(paused.interceptors).toBe(0);

  // The simulation stands still while paused.
  await page.waitForTimeout(300);
  expect((await snapshot(page)).timeMs).toBe(paused.timeMs);

  // A tap anywhere resumes, and is not a shot.
  await tapGame(page, info, 192, 100);
  await expect.poll(async () => (await snapshot(page)).paused).toBe(false);
  await expect.poll(async () => (await snapshot(page)).timeMs).toBeGreaterThan(paused.timeMs);
  const resumed = await snapshot(page);
  expect(resumed.message).toEqual([]);
  expect(resumed.interceptors).toBe(0);
  expect(resumed.ammo).toEqual([10, 10, 10]);

  // Play goes on: the next tap is a shot again.
  await tapGame(page, info, 192, 100);
  await expect.poll(async () => (await snapshot(page)).interceptors).toBe(1);
});

test('P pauses and Escape resumes on the keyboard', async ({ page }, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'desktop keyboard only');
  await openGame(page, '?seed=7');
  await page.keyboard.press('p');
  await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).paused).toBe(false);
});

test('the game pauses by itself when the page is hidden', async ({ page }) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.hide());
  await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
  expect((await snapshot(page)).message[0]).toBe('PAUSED');
});

test('the pause button does nothing between waves or after game over', async ({ page }, info) => {
  await openGame(page, '?seed=7');
  await page.evaluate(() => window.__game?.holdWave());
  await page.evaluate(
    ({ xs, ground }) => {
      for (const x of xs)
        window.__game?.launchWarhead({ x, y: ground - 20 }, { x, y: ground }, 200);
    },
    { xs: CITY_XS, ground: GROUND_Y },
  );
  await expect.poll(async () => (await snapshot(page)).phase).toBe('gameOver');
  await tapGame(page, info, PAUSE_BUTTON.x, PAUSE_BUTTON.y);
  await page.waitForTimeout(200);
  const snap = await snapshot(page);
  expect(snap.paused).toBe(false);
  expect(snap.message[0]).toBe('GAME OVER');
});
