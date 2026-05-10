// Case-study screenshot capture. Assumes `npm run dev` is already running on
// http://localhost:5173. Saves PNGs to docs/screenshots/.
//
// Usage:  node scripts/capture-screenshots.mjs
//
// Takes ~20s end-to-end. Each page is captured at desktop (1280x800) and
// mobile (393x852 = iPhone 14 Pro).

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = resolve(__dirname, '../docs/screenshots');
const BASE = 'http://localhost:5173';

const VIEWS = [
  { name: 'landing-hero',        path: '/',      device: 'desktop', scroll: 0     },
  { name: 'landing-feature',     path: '/',      device: 'desktop', scroll: 900   },
  { name: 'landing-mobile-hero', path: '/',      device: 'mobile',  scroll: 0     },
  { name: 'landing-mobile-feat', path: '/',      device: 'mobile',  scroll: 720   },
  { name: 'landing-mobile-foot', path: '/',      device: 'mobile',  scroll: 9999  },
  { name: 'merch-hero',          path: '/merch', device: 'desktop', scroll: 0     },
  { name: 'merch-grid',          path: '/merch', device: 'desktop', scroll: 800   },
  { name: 'merch-mobile-hero',   path: '/merch', device: 'mobile',  scroll: 0     },
  { name: 'merch-mobile-grid',   path: '/merch', device: 'mobile',  scroll: 700   },
  { name: 'dashboard',           path: '/app/',  device: 'mobile',  scroll: 0     },
  { name: 'dashboard-full',      path: '/app/',  device: 'mobile',  scroll: 400   },
];

const SIZES = {
  desktop: { width: 1280, height: 800,  deviceScaleFactor: 2 },
  mobile:  { width: 393,  height: 852,  deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

for (const view of VIEWS) {
  const size = SIZES[view.device];
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.deviceScaleFactor,
    isMobile: size.isMobile ?? false,
    hasTouch: size.hasTouch ?? false,
    userAgent: size.isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  const page = await context.newPage();
  const url = `${BASE}${view.path}`;
  console.log(`→ ${view.name.padEnd(24)} ${view.device.padEnd(8)} ${url}`);

  await page.goto(url, { waitUntil: 'networkidle' });
  // Give images / fonts a beat to settle.
  await page.waitForTimeout(600);
  if (view.scroll > 0) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), view.scroll);
    await page.waitForTimeout(300);
  }

  const file = resolve(OUT, `${view.name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
}

await browser.close();
console.log(`\n✓ Wrote ${VIEWS.length} screenshots to ${OUT}`);
