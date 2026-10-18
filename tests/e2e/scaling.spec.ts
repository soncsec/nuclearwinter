import { expect, test } from '@playwright/test';

const GAME_WIDTH = 384;
const GAME_HEIGHT = 216;

async function openGame(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => window.__game?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
}

test('the canvas is a whole number of device pixels per game pixel and fits the window', async ({
  page,
}) => {
  await openGame(page);
  const m = await page.evaluate(() => {
    const r = document.querySelector('#game canvas')?.getBoundingClientRect();
    return {
      width: r?.width ?? 0,
      height: r?.height ?? 0,
      ratio: window.devicePixelRatio,
      viewW: window.innerWidth,
      viewH: window.innerHeight,
    };
  });
  const zoom = (m.width * m.ratio) / GAME_WIDTH;
  expect(zoom).toBeGreaterThanOrEqual(1);
  expect(Math.abs(zoom - Math.round(zoom))).toBeLessThan(0.01);
  expect(Math.abs((m.height * m.ratio) / GAME_HEIGHT - zoom)).toBeLessThan(0.01);
  expect(m.width).toBeLessThanOrEqual(m.viewW);
  expect(m.height).toBeLessThanOrEqual(m.viewH);
});

test('a phone in landscape gets a large zoom, not 1', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone viewport only');
  await openGame(page);
  const width = await page.evaluate(
    () => document.querySelector('#game canvas')?.getBoundingClientRect().width ?? 0,
  );
  // 844x390 CSS at 3x = 2532x1170 device pixels: zoom 5, so 1920 device = 640 CSS pixels.
  expect(width).toBeCloseTo(640, 0);
});

test('a tablet in landscape gets a large zoom too', async ({ page }, info) => {
  test.skip(info.project.name !== 'tablet', 'tablet viewport only');
  await openGame(page);
  const width = await page.evaluate(
    () => document.querySelector('#game canvas')?.getBoundingClientRect().width ?? 0,
  );
  // 1180x820 CSS at 2x = 2360x1640 device pixels: zoom 6, so 2304 device = 1152 CSS pixels.
  expect(width).toBeCloseTo(1152, 0);
});

test('a touch device held upright shows the rotate message instead of the game', async ({
  page,
}, info) => {
  test.skip(!info.project.use.hasTouch, 'touch devices only');
  const { width, height } = info.project.use.viewport ?? { width: 844, height: 390 };
  await page.setViewportSize({ width: height, height: width });
  await page.goto('./');
  await expect(page.getByText('Turn your device sideways to play')).toBeVisible();
  await expect(page.locator('#game')).toBeHidden();
  await page.setViewportSize({ width, height });
  await expect(page.getByText('Turn your device sideways to play')).toBeHidden();
  await expect(page.locator('#game canvas')).toBeVisible();
});

test('desktop windows never show the rotate message, even when tall', async ({ page }, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'desktop only');
  await page.setViewportSize({ width: 600, height: 1000 });
  await page.goto('./');
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.getByText('Turn your device sideways to play')).toBeHidden();
});
