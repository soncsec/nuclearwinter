// Makes the night skyline from the pack's far-buildings layer by turning its flat sky colour
// (#052c46) transparent, so the game's own sky and stars show above the buildings.
// Usage: node tools/art/key-skyline.mjs   (uses the Chromium that Playwright installs)
import { chromium } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'public/assets/backgrounds/skyline-far.png';
const OUT = 'public/assets/backgrounds/skyline-far-night.png';
/** The sky colour, and how far (sum of channel differences) a pixel may be from it. */
const SKY = [5, 44, 70];
const TOLERANCE = 12;

const browser = await chromium.launch();
const page = await browser.newPage();
const src = `data:image/png;base64,${readFileSync(SRC).toString('base64')}`;
const out = await page.evaluate(
  async ({ src, sky, tolerance }) => {
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = src;
    });
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const diff =
        Math.abs(d.data[i] - sky[0]) +
        Math.abs(d.data[i + 1] - sky[1]) +
        Math.abs(d.data[i + 2] - sky[2]);
      if (diff < tolerance) d.data[i + 3] = 0;
    }
    ctx.putImageData(d, 0, 0);
    return c.toDataURL('image/png');
  },
  { src, sky: SKY, tolerance: TOLERANCE },
);
writeFileSync(OUT, Buffer.from(out.split(',')[1], 'base64'));
await browser.close();
console.log(`wrote ${OUT}`);
