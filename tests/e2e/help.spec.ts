import { expect, test, type Page } from '@playwright/test';
import { openTitle, tapGame, titleLines } from './helpers';

/** Middles of the bottom-row buttons in game pixels: TITLE in tuning.ts (y + 4). */
const HELP_BUTTON = { x: 136, y: 192 };
const SETTINGS_BUTTON = { x: 260, y: 192 };

const scene = (page: Page) => page.evaluate(() => window.__game?.scene() ?? null);
const help = (page: Page) => page.evaluate(() => window.__game?.help() ?? null);

test('the title has a How to play button beside Settings', async ({ page }, info) => {
  await openTitle(page);
  const lines = await titleLines(page);
  const touch = Boolean(info.project.use.hasTouch);
  expect(lines[6]).toBe(touch ? 'SETTINGS' : 'S  SETTINGS');
  expect(lines[7]).toBe(touch ? 'HOW TO PLAY' : 'H  HOW TO PLAY');
});

test('a tap opens How to play, taps turn the pages, and the last returns to the title', async ({
  page,
}, info) => {
  await openTitle(page);
  await tapGame(page, info, HELP_BUTTON.x, HELP_BUTTON.y);
  await expect.poll(() => scene(page)).toBe('Help');
  const first = await help(page);
  expect(first?.page).toBe(0);
  expect(first?.pages).toBe(3);
  expect(first?.lines[0]).toBe('HOW TO PLAY');
  expect(first?.lines).toContain('EACH BASE HAS 12 MISSILES A WAVE');
  expect(first?.lines.at(-1)).toBe('1/3');
  const touch = Boolean(info.project.use.hasTouch);
  expect(first?.lines).toContain(touch ? 'TAP FOR MORE' : 'CLICK OR ENTER FOR MORE   ESC BACK');

  await tapGame(page, info, 192, 100);
  await expect.poll(async () => (await help(page))?.page).toBe(1);
  expect((await help(page))?.lines).toContain('A BONUS CITY EVERY 5,000 POINTS');

  await tapGame(page, info, 192, 100);
  await expect.poll(async () => (await help(page))?.page).toBe(2);
  const last = await help(page);
  expect(last?.lines[0]).toBe('ENEMIES');
  expect(last?.lines).toContain(touch ? 'TAP TO GO BACK' : 'CLICK OR ENTER TO GO BACK');

  await tapGame(page, info, 192, 100);
  await expect.poll(() => scene(page)).toBe('Title');
});

test('the settings half of the bottom row still opens Settings', async ({ page }, info) => {
  await openTitle(page);
  await tapGame(page, info, SETTINGS_BUTTON.x, SETTINGS_BUTTON.y);
  await expect.poll(() => scene(page)).toBe('Settings');
});

test('on desktop, H opens How to play, the arrows turn pages and Escape goes back', async ({
  page,
}, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'keyboard controls are for desktop');
  await openTitle(page);
  await page.keyboard.press('h');
  await expect.poll(() => scene(page)).toBe('Help');
  expect((await help(page))?.lines).toContain('OR A S D / 1 2 3 FIRE FROM ONE BASE');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await help(page))?.page).toBe(1);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await help(page))?.page).toBe(0);
  // Turning back from the first page stays on it.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await help(page))?.page).toBe(1);
  await page.keyboard.press('Escape');
  await expect.poll(() => scene(page)).toBe('Title');
  // Back on the title, a game can still start.
  await page.keyboard.press('Enter');
  await expect.poll(() => scene(page)).toBe('Game');
});

test('How to play stores nothing', async ({ page }, info) => {
  await openTitle(page);
  await page.evaluate(() => localStorage.clear());
  await tapGame(page, info, HELP_BUTTON.x, HELP_BUTTON.y);
  await expect.poll(() => scene(page)).toBe('Help');
  for (let i = 0; i < 3; i++) await tapGame(page, info, 192, 100);
  await expect.poll(() => scene(page)).toBe('Title');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
