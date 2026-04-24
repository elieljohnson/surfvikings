// Scrapes Surf Vikings Printful storefront for product images + detail URLs.
//
// Printful's CDN sits behind Cloudflare bot protection. We use Playwright
// (already used for screenshots) to open the storefront in a real Chromium —
// the JS challenge passes — then read every rendered product card from the
// DOM and fetch each image via a direct page.goto (which reuses the CF cookie).
//
// A small STATIC table below supplies descriptions + categories we want to
// keep editorial control over (Printful's product titles are fine but the
// descriptions on their store are generic). We match on the product name.
//
// Outputs:
//   public/merch/{slug}.webp     — optimized product images (600px wide)
//   src/lib/merch-products.ts    — typed product array with local image paths
//
// Run: node scripts/fetch-merch.mjs

import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const IMG_OUT = resolve(ROOT, 'public/merch');
const DATA_OUT = resolve(ROOT, 'src/lib/merch-products.ts');

// Editorial copy keyed by the Printful product title (case-insensitive match).
// Anything not listed here falls back to a generic description.
const EDITORIAL = {
  "men's rash guard":              { slug: 'mens-rash-guard',      category: 'Surf Gear',    desc: 'High-performance rash guard with all-over Surf Vikings print. UV protection and 4-way stretch for serious sessions.' },
  'unisex premium hoodie':           { slug: 'premium-hoodie',     category: 'Apparel',      desc: 'Modern mid-weight hoodie with Surf Vikings branding. Premium cotton blend built for layering after dawn patrol.' },
  'unisex premium mid-weight hoodie':{ slug: 'premium-hoodie',     category: 'Apparel',      desc: 'Modern mid-weight hoodie with Surf Vikings branding. Premium cotton blend built for layering after dawn patrol.' },
  'surf vikings t-shirt':          { slug: 'og-tee',               category: 'Apparel',      desc: 'The original Surf Vikings tee. Comfortable, durable, and unmistakably Viking.' },
  "men's premium heavyweight tee": { slug: 'heavyweight-tee',      category: 'Apparel',      desc: 'Heavyweight premium tee with Surf Vikings wave logo. Thick, soft, and built to last.' },
  'unisex t-shirt':                { slug: 'unisex-tee',           category: 'Apparel',      desc: 'Everyday unisex tee with bold Surf Vikings graphics. Soft and comfortable for all-day wear.' },
  'unisex ringer t-shirt':         { slug: 'ringer-tee',           category: 'Apparel',      desc: 'Classic ringer tee with retro contrast trim and Surf Vikings design. Vintage vibes, modern comfort.' },
  'youth short sleeve t-shirt':    { slug: 'youth-tee',            category: 'Apparel',      desc: 'Viking-branded tee sized for young warriors. Soft, durable, and ready for adventure.' },
  'youth long sleeve tee':         { slug: 'youth-long-sleeve',    category: 'Apparel',      desc: 'Long sleeve tee for young Vikings. Extra coverage for cooler mornings and after-surf sessions.' },
  'snapback hat':                  { slug: 'snapback',             category: 'Headwear',     desc: 'Classic snapback with embroidered Surf Vikings logo. Structured crown and flat brim for that clean look.' },
  'under armour® dad hat':         { slug: 'under-armour-dad-hat', category: 'Headwear',     desc: 'Premium dad hat by Under Armour with Surf Vikings embroidery. Moisture-wicking performance fit.' },
  'under armour dad hat':          { slug: 'under-armour-dad-hat', category: 'Headwear',     desc: 'Premium dad hat by Under Armour with Surf Vikings embroidery. Moisture-wicking performance fit.' },
  'vintage corduroy cap':          { slug: 'corduroy-cap',         category: 'Headwear',     desc: 'Textured corduroy cap with vintage appeal and embroidered Surf Vikings wave logo.' },
  'dad hat':                       { slug: 'dad-hat',              category: 'Headwear',     desc: 'Relaxed-fit dad hat with embroidered Surf Vikings logo. Low profile and easy to wear all day.' },
  'foam trucker hat':              { slug: 'foam-trucker',         category: 'Headwear',     desc: 'Retro foam trucker hat with mesh back and bold Surf Vikings wave graphic. Breathable and fun.' },
  'vintage cotton twill cap':      { slug: 'twill-cap',            category: 'Headwear',     desc: 'Washed cotton twill cap with that broken-in vintage look. Embroidered Surf Vikings logo.' },
  'surf vikings towel':            { slug: 'beach-towel',          category: 'Beach',        desc: 'All-over sublimation beach towel with bold Viking graphics. Soft cotton blend that dries fast.' },
  'stainless steel water bottle':  { slug: 'water-bottle',         category: 'Accessories',  desc: 'Insulated water bottle with Surf Vikings branding. Keeps drinks cold through the longest sessions.' },
  'water bottle with straw lid':                    { slug: 'water-bottle-straw',   category: 'Accessories',  desc: 'Stainless steel water bottle with convenient straw lid. Viking-branded hydration for on-the-go.' },
  'stainless steel water bottle with a straw lid':  { slug: 'water-bottle-straw',   category: 'Accessories',  desc: 'Stainless steel water bottle with convenient straw lid. Viking-branded hydration for on-the-go.' },
  'embroidered patches':           { slug: 'patches',              category: 'Accessories',  desc: 'Premium embroidered patches to customize your gear with authentic Viking designs.' },
  'die-cut stickers':              { slug: 'die-cut-stickers',     category: 'Stickers',     desc: 'Premium die-cut vinyl stickers with Surf Vikings graphics. Weatherproof and ready to stick anywhere.' },
  'sticker sheet':                 { slug: 'sticker-sheet',        category: 'Stickers',     desc: 'Sheet of assorted Surf Vikings stickers. Multiple designs to deck out your board, laptop, or water bottle.' },
  'kiss-cut vinyl decals':         { slug: 'kiss-cut-decals',      category: 'Stickers',     desc: 'Precision kiss-cut decals with the Surf Vikings wave logo. Perfect for smooth surfaces.' },
  'holographic stickers':          { slug: 'holographic-stickers', category: 'Stickers',     desc: 'Eye-catching holographic stickers that shift color in the light. Stand out from the lineup.' },
  'bubble-free stickers':          { slug: 'bubble-free-stickers', category: 'Stickers',     desc: 'Premium bubble-free vinyl stickers with Surf Vikings graphics. Smooth application, clean finish.' },
  'towel':                         { slug: 'beach-towel',          category: 'Beach',        desc: 'All-over sublimation beach towel with bold Viking graphics. Soft cotton blend that dries fast.' },
};

function slugify(name) {
  return name.toLowerCase().replace(/®/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}
function editorial(name) {
  // Normalize curly apostrophes, registered marks, and hyphens so the lookup
  // table doesn't need to know which typographic variant the live store uses.
  const key = name.toLowerCase().replace(/®/g, '').replace(/[’‘]/g, "'").trim();
  return EDITORIAL[key] ?? EDITORIAL[key.replace(/-/g, ' ')] ?? { slug: slugify(name), category: 'Apparel', desc: '' };
}

await mkdir(IMG_OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 800 },
});
const page = await ctx.newPage();

console.log('→ Loading storefront...');
await page.goto('https://surfvikings.printful.me/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000); // extra settle for lazy-loaded cards

// Scroll to bottom to trigger lazy-loading on any below-the-fold product images.
await page.evaluate(async () => {
  await new Promise(resolve => {
    let y = 0;
    const step = () => {
      window.scrollTo(0, y += 400);
      if (y >= document.body.scrollHeight) return resolve();
      setTimeout(step, 100);
    };
    step();
  });
});
await page.waitForTimeout(2000);

const raw = await page.evaluate(() => {
  const out = [];
  for (const a of document.querySelectorAll('a[href*="/product/"]')) {
    const href = a.getAttribute('href');
    const img = a.querySelector('img');
    if (!img) continue;
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    if (!src) continue;
    // Name: prefer alt, fall back to nearby heading/text
    const name = (img.getAttribute('alt') || a.querySelector('h2,h3,h4,[class*="title"],[class*="name"]')?.textContent || '').trim();
    if (!name) continue;
    // Price: look for a sibling element containing a $/€/£ sign
    const priceEl = Array.from(a.parentElement?.querySelectorAll('*') ?? []).find(
      el => /[$€£]\s*\d/.test(el.textContent || '') && el.children.length === 0
    );
    const priceMatch = priceEl?.textContent?.match(/(\d+(?:\.\d+)?)/);
    out.push({
      name,
      url: href.startsWith('http') ? href : `https://surfvikings.printful.me${href}`,
      image: src,
      price: priceMatch ? parseFloat(priceMatch[1]) : null,
    });
  }
  // Dedupe by product name. Printful shows a card per pre-selected color
  // variant; the base product URL has no trailing -{hex} hash, and that's
  // the one we want to link to so users land on the color picker rather
  // than a specific variant.
  const HASH_SUFFIX = /-[a-f0-9]{13}$/;
  const byName = new Map();
  for (const p of out) {
    const path = new URL(p.url).pathname; // /product/snapback-hat or /product/snapback-hat-698...
    const isCanonical = !HASH_SUFFIX.test(path.replace(/\/$/, ''));
    const existing = byName.get(p.name);
    if (!existing || (isCanonical && !existing.isCanonical)) {
      byName.set(p.name, { ...p, isCanonical });
    }
  }
  return [...byName.values()].map(({ isCanonical, ...p }) => p);
});
console.log(`  Scraped ${raw.length} products from DOM`);
if (raw.length === 0) {
  console.error('No products found. Has the storefront markup changed?');
  await browser.close();
  process.exit(1);
}

// Warm the CDN origin so the per-hostname challenge cookie is set.
console.log('→ Warming CDN origin...');
await page.goto(raw[0].image, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1500);

const results = [];
for (const p of raw) {
  const ed = editorial(p.name);
  process.stdout.write(`  ${ed.slug.padEnd(26)} `);
  try {
    const resp = await page.goto(p.image, { waitUntil: 'load', timeout: 30000 });
    if (!resp || !resp.ok()) throw new Error(`HTTP ${resp?.status() ?? '??'}`);
    const buf = await resp.body();
    const webpPath = resolve(IMG_OUT, `${ed.slug}.webp`);
    await sharp(buf).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(webpPath);
    results.push({
      slug: ed.slug,
      name: p.name,
      price: p.price ?? 0,
      category: ed.category,
      desc: ed.desc || `${p.name} — Surf Vikings gear.`,
      image: `/merch/${ed.slug}.webp`,
      url: p.url,
    });
    console.log(`ok  $${p.price ?? '?'}  → ${p.url.replace('https://surfvikings.printful.me', '')}`);
  } catch (e) {
    console.log(`FAIL ${e.message}`);
  }
}

await browser.close();

const ts = `// Generated by scripts/fetch-merch.mjs — do not edit by hand.
// Run \`node scripts/fetch-merch.mjs\` to regenerate.

export interface MerchProduct {
  slug: string;
  name: string;
  price: number;
  category: string;
  desc: string;
  image: string;
  url: string;
}

export const MERCH_PRODUCTS: MerchProduct[] = ${JSON.stringify(results, null, 2)};
`;
await writeFile(DATA_OUT, ts);
console.log(`✓ Wrote ${results.length} products → ${DATA_OUT}`);
