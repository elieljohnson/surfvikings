// One-off renderer: composes the 3 existing public/screenshots/*.png captures
// into a 2560×1440 LinkedIn article cover with phone frames, dark gradient
// background, soft cyan glow, drop shadows. Output: docs/linkedin-cover.png.

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

const [map, dashboard, spot] = await Promise.all([
  readFile(resolve(SHOTS, 'map.png')),
  readFile(resolve(SHOTS, 'dashboard.png')),
  readFile(resolve(SHOTS, 'spot-detail.png')),
]).then((bufs) => bufs.map((b) => `data:image/png;base64,${b.toString('base64')}`));

const CANVAS_W = 2560;
const CANVAS_H = 1440;

// Phone dimensions (scaled). Source iPhone 14 Pro is 393×852 CSS = 9:19.5.
const PHONE_W = 460;
const PHONE_H = 1000;
const BEZEL = 14;

function phoneCss(left, top, rot) {
  return `position:absolute;left:${left - PHONE_W / 2}px;top:${top - PHONE_H / 2}px;width:${PHONE_W}px;height:${PHONE_H}px;transform:rotate(${rot}deg);`;
}

const html = `<!DOCTYPE html><html><head><style>
  html, body { margin: 0; padding: 0; }
  body { width: ${CANVAS_W}px; height: ${CANVAS_H}px; overflow: hidden; }
  .canvas {
    position: relative;
    width: ${CANVAS_W}px;
    height: ${CANVAS_H}px;
    background: linear-gradient(135deg, #0B1120 0%, #1E293B 100%);
    overflow: hidden;
  }
  .glow {
    position: absolute;
    left: ${CANVAS_W / 2 - 400}px;
    top: ${CANVAS_H / 2 - 400}px;
    width: 800px; height: 800px;
    background: radial-gradient(circle, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0) 70%);
    filter: blur(40px);
    pointer-events: none;
  }
  .device {
    border-radius: 56px;
    background: #0F172A;
    padding: ${BEZEL}px;
    box-sizing: border-box;
    box-shadow:
      0 60px 100px -10px rgba(0, 0, 0, 0.55),
      0 0 0 1px rgba(15, 23, 42, 0.6);
    transform-origin: center center;
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
  <div class="canvas">
    <div class="glow"></div>

    <!-- Map (left, tilted away) -->
    <div class="device" style="${phoneCss(720, 780, -7)}">
      <div class="screen"><img src="${map}"/></div>
    </div>

    <!-- Spot Detail (right, tilted away) -->
    <div class="device" style="${phoneCss(1840, 780, 7)}">
      <div class="screen"><img src="${spot}"/></div>
    </div>

    <!-- Dashboard (center, hero — drawn last so it sits on top) -->
    <div class="device" style="${phoneCss(1280, 700, 0)}">
      <div class="screen"><img src="${dashboard}"/></div>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const ctx = await browser.newContext({
  viewport: { width: CANVAS_W, height: CANVAS_H },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.waitForTimeout(300);
await page.screenshot({ path: OUT, type: 'png', fullPage: false, clip: { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H } });
await browser.close();

const fs = await import('node:fs');
const sizeKb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`✓ ${OUT} — ${sizeKb} KB`);
