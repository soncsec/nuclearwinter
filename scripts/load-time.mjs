// Measures how long the game takes to load (M5.3: under 2 seconds on the local network).
//
// Usage: node scripts/load-time.mjs <url> [--host NAME] [--runs N] [--max-ms MS]
//
// Each run opens the page in a fresh Chromium profile (empty cache, like a first visit) and
// reads the "title-shown" performance mark the title screen sets once it has drawn. That is the
// time from navigation start to the game being ready to play. --host maps NAME to the URL's
// address, so the real site name (and its virtual host) can be used before DNS exists.
// Exit code 0 when the median is within --max-ms, 1 otherwise.
import process from 'node:process';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const target = args.find((a) => /^https?:\/\//.test(a));
if (!target) {
  console.error('usage: node scripts/load-time.mjs <url> [--host NAME] [--runs N] [--max-ms MS]');
  process.exit(2);
}
const host = opt('--host', null);
const runs = Number.parseInt(opt('--runs', '5'), 10);
const maxMs = Number.parseInt(opt('--max-ms', '2000'), 10);

const url = new URL(target);
const launchArgs = [];
if (host) {
  launchArgs.push(`--host-resolver-rules=MAP ${host} ${url.hostname}`);
  url.hostname = host;
}

const browser = await chromium.launch({ args: launchArgs });
const times = [];
let bytes = 0;
for (let i = 0; i < runs; i++) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url.href);
  const ms = await page.waitForFunction(
    () => performance.getEntriesByName('title-shown')[0]?.startTime ?? false,
    null,
    { timeout: 30_000 },
  );
  times.push(Math.round(await ms.jsonValue()));
  bytes = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .concat(performance.getEntriesByType('navigation'))
      .reduce((sum, e) => sum + (e.transferSize || 0), 0),
  );
  await context.close();
}
await browser.close();

times.sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)];
console.log(`load time to the title screen, ${runs} cold runs: ${times.join(', ')} ms`);
console.log(`median ${median} ms, worst ${times[times.length - 1]} ms, limit ${maxMs} ms`);
console.log(`downloaded ${(bytes / 1024).toFixed(0)} KiB per first visit`);
console.log(median <= maxMs ? 'load time: passed' : 'load time: FAILED');
process.exit(median <= maxMs ? 0 : 1);
