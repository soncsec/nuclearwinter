import { expect, test, type Page } from '@playwright/test';
import { openTitle, snapshot, tapGame, titleLines } from './helpers';

const STORAGE_KEY = 'nuclearwinter.settings';
/** Middles of the buttons in game pixels: TITLE.settingsY and SETTINGS rows in tuning.ts, + 4. */
const TITLE_SETTINGS_Y = 192;
const REDUCE_ROW_Y = 88;
const VIBRATION_ROW_Y = 124;
const BACK_Y = 174;
const GROUND_Y = 204;

const scene = (page: Page) => page.evaluate(() => window.__game?.scene() ?? null);
const settingsLines = (page: Page) => page.evaluate(() => window.__game?.settingsLines() ?? null);
const stored = (page: Page) => page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);

test('the title has a settings button above the build number', async ({ page }, info) => {
  await openTitle(page);
  const lines = await titleLines(page);
  expect(lines[6]).toBe(info.project.use.hasTouch ? 'SETTINGS' : 'S  SETTINGS');
  expect(lines[lines.length - 1]).toMatch(/^BUILD /);
});

test('settings are toggled by tapping, saved, and kept after a reload', async ({ page }, info) => {
  await openTitle(page);
  await tapGame(page, info, 192, TITLE_SETTINGS_Y);
  await expect.poll(() => scene(page)).toBe('Settings');
  const keys = info.project.use.hasTouch ? ['', ''] : ['1  ', '2  '];
  expect((await settingsLines(page))?.[1]).toBe(`${keys[0]}REDUCE FLASHING  OFF`);
  expect((await settingsLines(page))?.[3]).toBe(`${keys[1]}VIBRATION  ON`);

  await tapGame(page, info, 192, REDUCE_ROW_Y);
  await expect.poll(async () => (await settingsLines(page))?.[1]).toMatch(/REDUCE FLASHING {2}ON$/);
  await tapGame(page, info, 192, VIBRATION_ROW_Y);
  await expect.poll(async () => (await settingsLines(page))?.[3]).toMatch(/VIBRATION {2}OFF$/);
  expect(await stored(page)).toBe('reduceFlashing=1,vibration=0');

  await tapGame(page, info, 192, BACK_Y);
  await expect.poll(() => scene(page)).toBe('Title');

  await openTitle(page);
  await tapGame(page, info, 192, TITLE_SETTINGS_Y);
  await expect.poll(() => scene(page)).toBe('Settings');
  expect((await settingsLines(page))?.[1]).toMatch(/ON$/);
  expect((await settingsLines(page))?.[3]).toMatch(/OFF$/);
});

test('the keyboard opens settings, toggles them and goes back', async ({ page }, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'keyboard controls are for desktop');
  await openTitle(page);
  await page.keyboard.press('s');
  await expect.poll(() => scene(page)).toBe('Settings');
  await page.keyboard.press('1');
  await expect.poll(async () => (await settingsLines(page))?.[1]).toBe('1  REDUCE FLASHING  ON');
  await page.keyboard.press('Escape');
  await expect.poll(() => scene(page)).toBe('Title');
  expect(await stored(page)).toBe('reduceFlashing=1,vibration=1');
});

test('a damaged saved value reads as the defaults', async ({ page }, info) => {
  await openTitle(page);
  await page.evaluate((k) => localStorage.setItem(k, '<img src=x onerror=alert(1)>'), STORAGE_KEY);
  await openTitle(page);
  await tapGame(page, info, 192, TITLE_SETTINGS_Y);
  await expect.poll(() => scene(page)).toBe('Settings');
  expect((await settingsLines(page))?.[1]).toMatch(/REDUCE FLASHING {2}OFF$/);
  expect((await settingsLines(page))?.[3]).toMatch(/VIBRATION {2}ON$/);
});

test('with reduce flashing on, a city hit neither flashes nor shakes', async ({ page }) => {
  await openTitle(page);
  await page.evaluate((k) => localStorage.setItem(k, 'reduceFlashing=1,vibration=1'), STORAGE_KEY);
  await openTitle(page, '?seed=7');
  await page.evaluate(() => window.__game?.start());
  await expect.poll(() => scene(page)).toBe('Game');
  await page.evaluate((ground) => {
    window.__game?.holdWave();
    window.__game?.launchWarhead({ x: 72, y: 150 }, { x: 72, y: ground }, 200);
  }, GROUND_Y);
  await expect.poll(async () => (await snapshot(page)).cities[0], { timeout: 30_000 }).toBe(false);
  await expect.poll(async () => (await snapshot(page)).sparkBursts).toBe(1);
  const snap = await snapshot(page);
  expect(snap.flashes).toBe(0);
  expect(snap.shakes).toBe(0);
});
