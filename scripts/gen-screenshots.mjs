// Capture iPhone-viewport screenshots of the PWA for the Landing page.
//
// Usage:   node scripts/gen-screenshots.mjs [--local]
//
// Default: screenshots the production Vercel deploy. Pass --local to
// point at http://localhost:5173 (run `npm run dev` first).
//
// Outputs: public/screenshots/{dashboard,spot-detail,map}.{png,webp}

import { chromium, devices } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'public/screenshots');

const isLocal = process.argv.includes('--local');
const BASE = isLocal
  ? 'http://localhost:5173'
  : 'https://surfvikings-app.vercel.app';

console.log(`Screenshotting ${BASE}`);

await mkdir(OUT, { recursive: true });

const iPhone = {
  ...devices['iPhone 14 Pro'],
  // Override the device's Safari-chrome-adjusted viewport with the full
  // iPhone 14 Pro CSS viewport (393×852) so the captured image has proper
  // 9:19.5 iPhone proportions, not the stubby 9:15 Safari sees.
  viewport: { width: 393, height: 852 },
  // Capture at 2x for crisp retina images without ballooning file size to 3x
  deviceScaleFactor: 2,
};

const browser = await chromium.launch();
const context = await browser.newContext(iPhone);
const page = await context.newPage();

/** Capture the currently-rendered viewport as PNG, then convert to WebP. */
async function capture(name) {
  const pngPath = resolve(OUT, `${name}.png`);
  const webpPath = resolve(OUT, `${name}.webp`);
  await page.screenshot({
    path: pngPath,
    fullPage: false,   // viewport only, not the whole scrollable doc
    type: 'png',
  });
  // Sharp WebP at 82% quality — visually indistinguishable, ~40-60% smaller
  await sharp(pngPath).webp({ quality: 82 }).toFile(webpPath);
  const { size: pngSize } = await (await import('node:fs')).promises.stat(pngPath);
  const { size: webpSize } = await (await import('node:fs')).promises.stat(webpPath);
  console.log(`  ${name.padEnd(14)} ${String(pngSize).padStart(7)} png · ${String(webpSize).padStart(7)} webp`);
}

/** Settle: give the page time for fonts + SVG paints + any animations to finish. */
async function settle(ms = 800) {
  await page.waitForTimeout(ms);
}

// 1. Dashboard — the default /app landing
console.log('→ Dashboard');
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
// Wait for real data to render — Top Pick card shows "Top Pick · N min drive"
await page.getByText(/Top Pick ·/i).first().waitFor({ timeout: 20000 });
await settle();
await capture('dashboard');

// 2. Spot Detail — click the Top Pick card to open whichever spot is #1 today
console.log('→ Spot Detail');
await page.getByText(/Top Pick ·/i).first().click();
await page.getByText(/why this score/i).first().waitFor({ timeout: 20000 });
await settle();
await capture('spot-detail');

// 3. Region Map — go back to dashboard, switch to Map tab
console.log('→ Region Map');
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
await page.getByText(/Top Pick ·/i).first().waitFor({ timeout: 20000 });
// Tab labels are inside a button with an icon sibling — click the text
await page.getByText('Map', { exact: true }).click();
await page.getByText(/Salt Point/i).first().waitFor({ timeout: 10000 });
await settle();
await capture('map');

await browser.close();
console.log(`✓ Screenshots saved to ${OUT}`);
