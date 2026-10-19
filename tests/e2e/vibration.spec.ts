import { expect, test, type Page } from '@playwright/test';
import { openGame, snapshot } from './helpers';

const GROUND_Y = 204;

declare global {
  interface Window {
    __vibrations?: unknown[];
  }
}

/**
 * Replaces the Vibration API with a recorder, so every browser (even iOS-like ones) can test it.
 * Writable, because Phaser assigns navigator.vibrate itself while it starts.
 */
async function recordVibrations(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vibrations = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: (pattern: unknown) => {
        window.__vibrations?.push(pattern);
        return true;
      },
    });
  });
}

async function hitCity(page: Page): Promise<void> {
  await page.evaluate((ground) => {
    window.__game?.holdWave();
    window.__game?.launchWarhead({ x: 72, y: 150 }, { x: 72, y: ground }, 200);
  }, GROUND_Y);
  await expect.poll(async () => (await snapshot(page)).cities[0], { timeout: 30_000 }).toBe(false);
  await expect.poll(async () => (await snapshot(page)).sparkBursts).toBe(1);
}

test('a city hit vibrates the phone once', async ({ page }) => {
  await recordVibrations(page);
  await openGame(page, '?seed=7');
  await hitCity(page);
  expect((await snapshot(page)).vibrations).toBe(1);
  expect(await page.evaluate(() => window.__vibrations)).toEqual([[90, 50, 60]]);
});

test('no vibration when the player turned it off', async ({ page }) => {
  await recordVibrations(page);
  await page.addInitScript(() =>
    localStorage.setItem('nuclearwinter.settings', 'reduceFlashing=0,vibration=0'),
  );
  await openGame(page, '?seed=7');
  await hitCity(page);
  expect((await snapshot(page)).vibrations).toBe(0);
  expect(await page.evaluate(() => window.__vibrations)).toEqual([]);
});

test('a browser without the Vibration API plays on without it', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });
  await openGame(page, '?seed=7');
  await hitCity(page);
  expect((await snapshot(page)).vibrations).toBe(0);
  expect((await snapshot(page)).phase).toBe('playing');
});
