// One-off renderer: composes the 3 existing public/screenshots/*.png captures
// into a 2560×1440 LinkedIn article cover. Faded hero-surfer background,
// straight (untilted) phones, Surf Vikings logo + wordmark upper-left.
// Output: docs/linkedin-cover.png.

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHOTS = resolve(ROOT, 'public/screenshots');
const OUT_DIR = resolve(ROOT, 'docs');
const OUT = resolve(OUT_DIR, 'linkedin-cover.png');

await mkdir(OUT_DIR, { recursive: true });

async function dataUrl(path, mime) {
  const buf = await readFile(path);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const [heroBg, map, dashboard, spot] = await Promise.all([
  dataUrl(resolve(ROOT, 'public/hero-surfer.jpg'), 'image/jpeg'),
  dataUrl(resolve(SHOTS, 'map.png'), 'image/png'),
  dataUrl(resolve(SHOTS, 'dashboard.png'), 'image/png'),
  dataUrl(resolve(SHOTS, 'spot-detail.png'), 'image/png'),
]);

const logoSrc = await readFile(resolve(ROOT, 'src/components/Logo.tsx'), 'utf8');
const pathMatch = logoSrc.match(/<path d="([^"]+)"\/>/);
if (!pathMatch) throw new Error('Could not extract logo path from Logo.tsx');
const LOGO_PATH = pathMatch[1];

const CANVAS_W = 2560;
const CANVAS_H = 1440;
const PHONE_W = 460;
const PHONE_H = 1000;
const BEZEL = 14;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${CANVAS_W}px; height: ${CANVAS_H}px; overflow: hidden; }
  body {
    position: relative;
    background: #08090B;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: white;
  }
  .bg {
    position: absolute; inset: 0;
    background-image: url('${heroBg}');
    background-size: cover;
    background-position: center 30%;
    opacity: 0.18;
    filter: grayscale(0.4) contrast(1.05);
  }
  .vignette {
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at center, transparent 35%, rgba(8,9,11,0.75) 100%),
      linear-gradient(180deg, rgba(8,9,11,0.35) 0%, transparent 25%, transparent 70%, rgba(8,9,11,0.55) 100%);
  }
  .brand {
    position: absolute;
    top: 88px; left: 110px;
    display: flex; align-items: center;
    gap: 20px;
    color: white;
    z-index: 10;
  }
  .brand svg { display: block; flex-shrink: 0; }
  .brand-text {
    font-size: 48px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .phones {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 180px;
  }
  .device {
    width: ${PHONE_W}px;
    height: ${PHONE_H}px;
    background: #0F172A;
    border-radius: 56px;
    padding: ${BEZEL}px;
    box-shadow:
      0 60px 100px -10px rgba(0,0,0,0.6),
      0 30px 60px -15px rgba(0,0,0,0.5),
      0 0 0 1px rgba(255,255,255,0.06);
  }
  .screen {
    width: 100%; height: 100%;
    border-radius: 42px;
    overflow: hidden;
    background: #000;
  }
  .screen img {
    display: block; width: 100%; height: 100%;
    object-fit: cover; object-position: top center;
  }
</style></head><body>
  <div class="bg"></div>
  <div class="vignette"></div>
  <div class="brand">
    <svg width="60" height="60" viewBox="0 0 804 810" fill="white" aria-hidden="true">
      <path d="${LOGO_PATH}"/>
    </svg>
    <span class="brand-text">Surf Vikings</span>
  </div>
  <div class="phones">
    <div class="device"><div class="screen"><img src="${map}" alt=""/></div></div>
    <div class="device"><div class="screen"><img src="${dashboard}" alt=""/></div></div>
    <div class="device"><div class="screen"><img src="${spot}" alt=""/></div></div>
  </div>
</body></html>`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({
  viewport: { width: CANVAS_W, height: CANVAS_H },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.waitForTimeout(300);
await page.screenshot({
  path: OUT,
  type: 'png',
  clip: { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H },
});
await browser.close();

const fs = await import('node:fs');
const sizeKb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`✓ ${OUT} — ${sizeKb} KB`);
