import { expect, test } from '@playwright/test';
import { openTitle } from './helpers';

// scripts/load-time.mjs (M5.3) times the game by this mark, so it must keep being set.
test('the title screen marks when it is first shown, once', async ({ page }) => {
  await openTitle(page);
  await expect
    .poll(() => page.evaluate(() => performance.getEntriesByName('title-shown').length))
    .toBe(1);
  const ms = await page.evaluate(() => performance.getEntriesByName('title-shown')[0]?.startTime);
  expect(ms).toBeGreaterThan(0);
});
