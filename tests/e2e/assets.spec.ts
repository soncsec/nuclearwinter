import { expect, test } from '@playwright/test';
import { IMAGES, SHEETS } from '../../src/assets/manifest';

test('every image and the font load from our own origin', async ({ page }) => {
  const failed: string[] = [];
  const loaded = new Set<string>();
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
    loaded.add(new URL(res.url()).pathname.replace(/^\//, ''));
  });
  page.on('requestfailed', (req) => failed.push(`failed ${req.url()}`));

  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__game?.scene() ?? null), { timeout: 15_000 })
    .toBe('Title');

  const expected = [...Object.values(IMAGES), ...Object.values(SHEETS).map((s) => s.path)];
  for (const path of expected) expect([...loaded]).toContain(path);
  expect([...loaded].some((p) => /PressStart2P-Regular-.*\.ttf$/.test(p))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('8px "Press Start 2P"'))).toBe(true);
  expect(failed).toEqual([]);
});
