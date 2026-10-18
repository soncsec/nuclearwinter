import { expect, test } from '@playwright/test';
import { openGame, snapshot, tapGame, toPage } from './helpers';

const AMMO = 10;

test.beforeEach(async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__game?.holdWave());
});

test('each shot uses a missile from the base that fired', async ({ page }, info) => {
  expect((await snapshot(page)).ammo).toEqual([AMMO, AMMO, AMMO]);
  await tapGame(page, info, 30, 80);
  await expect.poll(async () => (await snapshot(page)).ammo).toEqual([AMMO - 1, AMMO, AMMO]);
});

test('an empty base shows OUT and the next nearest base fires instead', async ({ page }, info) => {
  for (let i = 0; i < AMMO; i++) await tapGame(page, info, 20, 40 + i * 4);
  await expect.poll(async () => (await snapshot(page)).ammo).toEqual([0, AMMO, AMMO]);
  await expect.poll(async () => (await snapshot(page)).outLabels).toEqual([true, false, false]);

  await tapGame(page, info, 20, 60);
  await expect.poll(async () => (await snapshot(page)).ammo).toEqual([0, AMMO - 1, AMMO]);
  // The launch is recorded on the next frame, so wait for it rather than reading it at once.
  await expect.poll(async () => (await snapshot(page)).lastShot?.baseIndex).toBe(1);
});

test('desktop keys fire from a chosen base at the mouse position', async ({ page }, info) => {
  test.skip(Boolean(info.project.use.hasTouch), 'keyboard is desktop only');
  const p = await toPage(page, 40, 90);
  await page.mouse.move(p.x, p.y);

  await page.keyboard.press('d');
  await expect.poll(async () => (await snapshot(page)).lastShot?.baseIndex).toBe(2);
  const shot = (await snapshot(page)).lastShot;
  expect(shot?.target.x).toBeCloseTo(40, -1);
  expect(shot?.target.y).toBeCloseTo(90, -1);

  await page.keyboard.press('2');
  await expect.poll(async () => (await snapshot(page)).ammo).toEqual([AMMO, AMMO - 1, AMMO - 1]);
  await page.keyboard.press('A');
  await expect
    .poll(async () => (await snapshot(page)).ammo)
    .toEqual([AMMO - 1, AMMO - 1, AMMO - 1]);
});
