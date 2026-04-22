// Rasterize favicon.svg into the PNG icons the PWA manifest references.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pub = resolve(root, 'public');

const LOGO_SVG = await readFile(resolve(pub, 'favicon.svg'));

// Standard icon (transparent padding already baked into SVG).
async function standard(size, file) {
  await sharp(LOGO_SVG, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 8, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(resolve(pub, file));
  console.log('wrote', file);
}

// Maskable icon: add 10% safe-zone padding (per W3C maskable spec).
async function maskable(size, file) {
  const inner = Math.round(size * 0.8);
  const inset = Math.round((size - inner) / 2);
  const bg = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 8, g: 9, b: 11, alpha: 1 } },
  }).png().toBuffer();
  const fg = await sharp(LOGO_SVG, { density: 384 }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(bg)
    .composite([{ input: fg, top: inset, left: inset }])
    .png()
    .toFile(resolve(pub, file));
  console.log('wrote', file);
}

await standard(192, 'icon-192.png');
await standard(512, 'icon-512.png');
await standard(180, 'apple-touch-icon.png');
await maskable(512, 'icon-maskable.png');
