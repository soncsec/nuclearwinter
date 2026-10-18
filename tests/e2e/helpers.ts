import { expect, type Page, type TestInfo } from '@playwright/test';
import type { GameSnapshot } from '../../src/scenes/GameScene';

export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;

const activeScene = (page: Page): Promise<string | null> =>
  page.evaluate(() => window.__game?.scene() ?? null);

/** Loads the page and waits for the title screen. */
export async function openTitle(page: Page, query = ''): Promise<void> {
  await page.goto(`./${query}`);
  await expect.poll(() => activeScene(page), { timeout: 15_000 }).toBe('Title');
}

/** Loads the page and starts a game from the title screen. */
export async function openGame(page: Page, query = ''): Promise<void> {
  await openTitle(page, query);
  await page.evaluate(() => window.__game?.start());
  await expect.poll(() => activeScene(page), { timeout: 15_000 }).toBe('Game');
}

export async function titleLines(page: Page): Promise<string[]> {
  const lines = await page.evaluate(() => window.__game?.titleLines() ?? null);
  if (!lines) throw new Error('title screen is not showing');
  return lines;
}

export async function snapshot(page: Page): Promise<GameSnapshot> {
  const snap = await page.evaluate(() => window.__game?.snapshot() ?? null);
  if (!snap) throw new Error('game scene is not running');
  return snap;
}

/** Converts a game-pixel position to a page position on the scaled canvas. */
export async function toPage(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('#game canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return {
    x: box.x + (x * box.width) / GAME_WIDTH,
    y: box.y + (y * box.height) / GAME_HEIGHT,
  };
}

/** Taps (touch projects) or clicks (mouse projects) a game-pixel position, like a player. */
export async function tapGame(page: Page, info: TestInfo, x: number, y: number): Promise<void> {
  const p = await toPage(page, x, y);
  if (info.project.use.hasTouch) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}
