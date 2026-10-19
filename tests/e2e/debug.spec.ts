import { expect, test } from '@playwright/test';
import { openGame, openTitle, snapshot } from './helpers';

const debugLines = (page: import('@playwright/test').Page): Promise<string[] | null> =>
  page.evaluate(() => window.__game?.debugLines() ?? null);

test('the debug overlay stays hidden unless the URL asks for it', async ({ page }) => {
  await openGame(page);
  await page.waitForTimeout(200);
  expect(await debugLines(page)).toBeNull();
});

test('?debug shows the frame rate on the title and the counts during play', async ({ page }) => {
  await openTitle(page, '?debug&seed=7');
  await expect.poll(() => debugLines(page)).not.toBeNull();
  const onTitle = await debugLines(page);
  expect(onTitle?.[0]).toMatch(/^FPS \d+ {2}WORST \d+$/);
  expect(onTitle).toHaveLength(1);

  await page.evaluate(() => window.__game?.start());
  await expect.poll(() => page.evaluate(() => window.__game?.scene() ?? null)).toBe('Game');
  await page.evaluate(() => window.__game?.holdWave());
  await expect.poll(async () => (await debugLines(page))?.length).toBe(4);
  const lines = await debugLines(page);
  const snap = await snapshot(page);
  expect(lines?.[1]).toBe(`WAVE 1  TO LAUNCH ${12 - snap.warheads.length}`);
  expect(lines?.[2]).toBe(`WARHEADS ${snap.warheads.length}  MISSILES 0  BLASTS 0`);
  expect(lines?.[3]).toBe(`RAIDERS 0  FX 0/16  BLOOM ${snap.bloom ? 'ON' : 'OFF'}`);
});

test('the backquote key toggles the overlay on desktop', async ({ page }, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'desktop keyboard only');
  await openGame(page);
  await page.keyboard.press('`');
  await expect.poll(() => debugLines(page)).not.toBeNull();
  await page.keyboard.press('`');
  await expect.poll(() => debugLines(page)).toBeNull();
});
