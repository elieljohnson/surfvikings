// Build the Surf Vikings portfolio case study as a PowerPoint deck.
//
// Matches the site's visual system: dark background, Inter + JetBrains Mono
// typography, teal accent, editorial/instrumentation aesthetic.
//
// Usage:  node scripts/build-case-study-pptx.mjs
// Output: docs/case-study.pptx

import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOCS = resolve(__dirname, '../docs');
const SHOTS = resolve(DOCS, 'screenshots');

// ─── Design Tokens ─────────────────────────────────────────────────────────

const C = {
  bg:       '08090B',
  surface:  '111317',
  surface2: '171A1F',
  surface3: '1E2229',
  border:   '24272E',
  borderHi: '353A43',
  text:     'F2F4F7',
  textDim:  'C4CAD3',
  textMute: 'AFB5BF',
  teal:     '2DD4BF',
  pacific:  '3FB8FF',
  phosphor: '7EE787',
  epic:     '05F772',
  good:     '8EF705',
  fair:     'BAF705',
  amber:    'F5A524',
  orange:   'F97316',
  red:      'EF4444',
  flat:     '4B5058',
};

const SANS = 'Inter';
const MONO = 'JetBrains Mono';

// Slide dimensions (LAYOUT_WIDE = 13.333" × 7.5")
const W = 13.333;
const H = 7.5;
const MARGIN_X = 0.8;
const MARGIN_Y = 0.6;

// Usable content area is bounded by the page chrome:
//   Top chrome:    y = 0.35-0.80
//   Bottom chrome: y = 6.75-7.30
// So keep content between y = 0.9 and y = 6.5.
const CONTENT_Y_TOP = 0.9;
const CONTENT_Y_BOTTOM = 6.5;

// ─── Setup ────────────────────────────────────────────────────────────────

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = 'Surf Vikings — Portfolio Case Study';
pres.author = 'Eliel Johnson';
pres.subject = 'Hyper-local NorCal surf forecasting PWA';

// ─── Helpers ──────────────────────────────────────────────────────────────

function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  return s;
}

function monoLabel(slide, text, x, y, opts = {}) {
  slide.addText(String(text).toUpperCase(), {
    x, y, w: opts.w ?? 5, h: 0.3,
    fontFace: MONO,
    fontSize: opts.size ?? 10,
    color: opts.color ?? C.textMute,
    charSpacing: opts.charSpacing ?? 3,
    align: opts.align ?? 'left',
    valign: 'middle',
    bold: false,
    margin: 0,
  });
}

function headline(slide, text, x, y, w, opts = {}) {
  slide.addText(text, {
    x, y, w,
    h: opts.h ?? 1.6,
    fontFace: SANS,
    fontSize: opts.size ?? 36,
    bold: true,
    color: opts.color ?? C.text,
    charSpacing: opts.charSpacing ?? -0.5,
    align: opts.align ?? 'left',
    valign: 'top',
    margin: 0,
  });
}

function body(slide, text, x, y, w, h, opts = {}) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: SANS,
    fontSize: opts.size ?? 14,
    color: opts.color ?? C.textDim,
    paraSpaceAfter: opts.paraSpaceAfter ?? 8,
    align: 'left',
    valign: 'top',
    margin: 0,
  });
}

function divider(slide, x, y, w, color = C.border) {
  slide.addShape(pres.shapes.LINE, {
    x, y, w, h: 0,
    line: { color, width: 0.75 },
  });
}

function coloredDot(slide, x, y, color = C.teal, size = 0.09) {
  slide.addShape(pres.shapes.OVAL, {
    x, y, w: size, h: size,
    fill: { color },
    line: { type: 'none' },
  });
}

function pageChrome(slide, pageNum, totalPages) {
  // Top-left wordmark
  slide.addText('SURF VIKINGS', {
    x: MARGIN_X, y: 0.35, w: 3, h: 0.3,
    fontFace: MONO, fontSize: 10, color: C.textMute,
    charSpacing: 4, bold: false, margin: 0,
  });
  // Tiny teal dot beside wordmark (like a live-indicator)
  coloredDot(slide, MARGIN_X - 0.22, 0.42, C.teal, 0.07);

  // Top-right: case study label
  slide.addText('PORTFOLIO CASE STUDY', {
    x: W - MARGIN_X - 3, y: 0.35, w: 3, h: 0.3,
    fontFace: MONO, fontSize: 10, color: C.textMute,
    charSpacing: 4, align: 'right', margin: 0,
  });

  // Top rule
  divider(slide, MARGIN_X, 0.8, W - 2 * MARGIN_X);

  // Bottom rule
  divider(slide, MARGIN_X, 6.75, W - 2 * MARGIN_X);

  // Bottom-right: page number
  slide.addText(`${String(pageNum).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`, {
    x: W - MARGIN_X - 2, y: 6.9, w: 2, h: 0.3,
    fontFace: MONO, fontSize: 10, color: C.textMute,
    align: 'right', charSpacing: 2, margin: 0,
  });

  // Bottom-left: domain
  slide.addText('surfvikings.com', {
    x: MARGIN_X, y: 6.9, w: 4, h: 0.3,
    fontFace: MONO, fontSize: 10, color: C.textMute,
    charSpacing: 2, margin: 0,
  });
}

// ─── Slide 1 — Cover ──────────────────────────────────────────────────────

const TOTAL = 14;

function slide1() {
  const s = darkSlide();

  // Teal indicator dot + wordmark
  coloredDot(s, MARGIN_X - 0.22, 0.42, C.teal, 0.07);
  s.addText('SURF VIKINGS', {
    x: MARGIN_X, y: 0.35, w: 3, h: 0.3,
    fontFace: MONO, fontSize: 10, color: C.text,
    charSpacing: 4, bold: true, margin: 0,
  });
  s.addText('PORTFOLIO CASE STUDY · 2026', {
    x: W - MARGIN_X - 4, y: 0.35, w: 4, h: 0.3,
    fontFace: MONO, fontSize: 10, color: C.textMute,
    charSpacing: 4, align: 'right', margin: 0,
  });

  divider(s, MARGIN_X, 0.75, W - 2 * MARGIN_X);

  // Left column: headline + subhead
  monoLabel(s, 'COVER · 01', MARGIN_X, 1.4, { color: C.teal });

  s.addText([
    { text: 'Hyper-local\nNorCal surf\nforecasting,\n', options: { color: C.text } },
    { text: 'from thesis\nto shipped PWA.', options: { color: C.teal } },
  ], {
    x: MARGIN_X, y: 1.9, w: 7.4, h: 4.5,
    fontFace: SANS, fontSize: 52, bold: true,
    charSpacing: -1, lineSpacingMultiple: 0.95,
    valign: 'top', margin: 0,
  });

  // Byline
  divider(s, MARGIN_X, 6.05, 3);
  s.addText('ELIEL JOHNSON', {
    x: MARGIN_X, y: 6.2, w: 4, h: 0.3,
    fontFace: MONO, fontSize: 11, color: C.text,
    bold: true, charSpacing: 3, margin: 0,
  });
  s.addText('Sole designer, engineer, product lead', {
    x: MARGIN_X, y: 6.5, w: 6, h: 0.3,
    fontFace: SANS, fontSize: 11, color: C.textMute, margin: 0,
  });

  // Right column: dashboard screenshot
  // Mobile aspect = 1179/2556 = 0.4613
  const imgH = 5.2;
  const imgW = imgH * (1179 / 2556);
  s.addImage({
    path: resolve(SHOTS, 'dashboard.png'),
    x: W - MARGIN_X - imgW - 0.3, y: 1.2, w: imgW, h: imgH,
  });
  // Soft teal glow bar behind the phone
  s.addShape(pres.shapes.RECTANGLE, {
    x: W - MARGIN_X - imgW - 0.5, y: 1.0, w: 0.05, h: imgH + 0.4,
    fill: { color: C.teal }, line: { type: 'none' },
  });

  // Bottom rule
  divider(s, MARGIN_X, 6.75, W - 2 * MARGIN_X);
  s.addText('surfvikings.com', {
    x: MARGIN_X, y: 6.9, w: 4, h: 0.3,
    fontFace: MONO, fontSize: 10, color: C.textMute,
    charSpacing: 2, margin: 0,
  });
  s.addText('01 / 14', {
    x: W - MARGIN_X - 2, y: 6.9, w: 2, h: 0.3,
    fontFace: MONO, fontSize: 10, color: C.textMute,
    align: 'right', charSpacing: 2, margin: 0,
  });
}

// ─── Slide 2 — Project Snapshot ────────────────────────────────────────────

function slide2() {
  const s = darkSlide();
  pageChrome(s, 2, TOTAL);

  monoLabel(s, 'PROJECT SNAPSHOT · 02', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'At a glance.', MARGIN_X, 1.6, 8, { size: 44 });

  // Two-column data readout
  const rows = [
    ['Product',      'A progressive web app that scores 28 NorCal surf breaks hour-by-hour using free NOAA data.'],
    ['Domain',       'surfvikings.com  (marketing)  ·  surfvikings.com/app  (PWA)'],
    ['Role',         'Sole designer, engineer, and product lead'],
    ['Surface area', 'Marketing site (Landing, Merch, Games, About) + PWA (Dashboard, Spot Detail, Forecast, Map, Settings)'],
    ['Codebase',     '~4,100 lines of TypeScript · 7 feature components · 5 primitives · 3 server fetchers'],
    ['Stack',        'Vite · React 18 · TS · vite-plugin-pwa · react-router-dom v7 · Playwright · Sharp · Vercel'],
    ['Data sources', '100% free public APIs  —  NDBC buoys · Open-Meteo marine · NOAA tides'],
    ['Status',       'Live on custom domain, Let\u2019s Encrypt TLS, 34 commits, installable on iOS / Android'],
  ];

  const startY = 3.3;
  const rowH = 0.42;
  const colLabelW = 2.3;
  const colValueX = MARGIN_X + colLabelW + 0.1;
  const colValueW = 7.6;

  // Rule above
  divider(s, MARGIN_X, startY - 0.15, W - 2 * MARGIN_X);

  rows.forEach(([label, value], i) => {
    const y = startY + i * rowH;
    s.addText(label.toUpperCase(), {
      x: MARGIN_X, y, w: colLabelW, h: rowH,
      fontFace: MONO, fontSize: 9.5, color: C.textMute,
      charSpacing: 3, valign: 'middle', margin: 0,
    });
    s.addText(value, {
      x: colValueX, y, w: colValueW, h: rowH,
      fontFace: SANS, fontSize: 12, color: C.text,
      valign: 'middle', margin: 0,
    });
    if (i < rows.length - 1) {
      divider(s, MARGIN_X, y + rowH, W - 2 * MARGIN_X - 0.5);
    }
  });
}

// ─── Slide 3 — Thesis ──────────────────────────────────────────────────────

function slide3() {
  const s = darkSlide();
  pageChrome(s, 3, TOTAL);

  monoLabel(s, 'THE THESIS · 03', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'Answer the real question.', MARGIN_X, 1.6, 10, { size: 44 });

  // Pull quote — large serif-style sans with teal quotes
  const quoteX = MARGIN_X + 0.2;
  s.addText('"', {
    x: quoteX - 0.1, y: 2.9, w: 0.8, h: 1.2,
    fontFace: SANS, fontSize: 96, color: C.teal, bold: true,
    valign: 'top', margin: 0,
  });

  s.addText([
    { text: 'A NorCal surfer\u2019s real question isn\u2019t ', options: { color: C.textDim } },
    { text: '"what are the conditions?"', options: { color: C.text, bold: true } },
    { text: '  \u2014  it\u2019s ', options: { color: C.textDim } },
    { text: '"which of my six favorite breaks, at what hour in the next 48, is worth the drive?"', options: { color: C.teal, bold: true } },
  ], {
    x: quoteX + 0.5, y: 3.2, w: 11.2, h: 2.4,
    fontFace: SANS, fontSize: 22, bold: false,
    lineSpacingMultiple: 1.4, valign: 'top', margin: 0,
  });

  // Two sub-theses
  divider(s, MARGIN_X, 5.9, W - 2 * MARGIN_X);

  monoLabel(s, 'PRODUCT THESIS', MARGIN_X, 6.05, { color: C.textMute, w: 5 });
  body(s,
    'A ranked, scored, time-windowed recommendation engine built on 100% free public data, with enough local intelligence baked into the spot profiles that the answer is defensible, not just aggregated.',
    MARGIN_X, 6.4, 5.5, 0.9, { size: 11 });

  monoLabel(s, 'BRAND THESIS', MARGIN_X + 6.5, 6.05, { color: C.textMute, w: 5 });
  body(s,
    'The Norse didn\u2019t wait for perfect conditions. They read the water and went. The app is for surfers who think the same way: committed, local, always looking for the next session.',
    MARGIN_X + 6.5, 6.4, 5.5, 0.9, { size: 11 });
}

// ─── Slide 4 — Arc 1: Forecast engine & PRD ────────────────────────────────

function slide4() {
  const s = darkSlide();
  pageChrome(s, 4, TOTAL);

  monoLabel(s, 'ARC 01 · FORECAST ENGINE', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'Model the domain\nbefore writing the UI.', MARGIN_X, 1.6, 8, { size: 40, h: 2.2 });

  body(s,
    'The work started with a PRD that defined six coastal regions (Sonoma to Santa Cruz), mapped each to a primary NDBC buoy and NOAA tide station, and spec\u2019d a scoring algorithm weighted by swell height, period, direction, wind speed, wind direction, and tide height against per-spot optimal parameters.',
    MARGIN_X, 3.8, 7.2, 1.1);

  body(s,
    'The Spot type carries 12 fields per break including optimalSwell, offshore, tidal range preference, skill floor, and swell shadowing coefficients. The scoring engine (computeScore) is pure, deterministic, and testable: it takes a Spot and ForecastHour and returns a 0-100 score with per-factor breakdown.',
    MARGIN_X, 5.0, 7.2, 1.2);

  // Right: code-style card with Spot interface shape
  const cardX = 8.5, cardY = 2.0, cardW = 4.0, cardH = 4.3;
  s.addShape(pres.shapes.RECTANGLE, {
    x: cardX, y: cardY, w: cardW, h: cardH,
    fill: { color: C.surface }, line: { color: C.border, width: 0.75 },
  });
  // Tiny teal stripe on top
  s.addShape(pres.shapes.RECTANGLE, {
    x: cardX, y: cardY, w: cardW, h: 0.03,
    fill: { color: C.teal }, line: { type: 'none' },
  });
  s.addText('src/lib/data.ts', {
    x: cardX + 0.25, y: cardY + 0.18, w: cardW - 0.5, h: 0.3,
    fontFace: MONO, fontSize: 9, color: C.textMute, charSpacing: 2, margin: 0,
  });

  const code = [
    { text: 'interface Spot {', options: { color: C.pacific, breakLine: true } },
    { text: '  id: string', options: { color: C.textDim, breakLine: true } },
    { text: '  name: string', options: { color: C.textDim, breakLine: true } },
    { text: '  region: Region', options: { color: C.textDim, breakLine: true } },
    { text: '  optimalSwell: number', options: { color: C.teal, breakLine: true } },
    { text: '  swellTolerance: number', options: { color: C.textDim, breakLine: true } },
    { text: '  offshore: number', options: { color: C.teal, breakLine: true } },
    { text: '  optimalPeriod: number', options: { color: C.textDim, breakLine: true } },
    { text: '  tidalPreference: Tide', options: { color: C.textDim, breakLine: true } },
    { text: '  buoyId: string', options: { color: C.textDim, breakLine: true } },
    { text: '  tideStation: string', options: { color: C.textDim, breakLine: true } },
    { text: '  skillFloor: 1 | 2 | 3 | 4', options: { color: C.textDim, breakLine: true } },
    { text: '  shadowing: number', options: { color: C.textDim, breakLine: true } },
    { text: '}', options: { color: C.pacific } },
  ];
  s.addText(code, {
    x: cardX + 0.25, y: cardY + 0.6, w: cardW - 0.5, h: cardH - 0.8,
    fontFace: MONO, fontSize: 11, lineSpacingMultiple: 1.25, margin: 0, valign: 'top',
  });

  // Stats strip at bottom (fits inside content area)
  divider(s, MARGIN_X, 6.25, W - 2 * MARGIN_X);
  const stats = [
    ['28', 'spots modeled'],
    ['6',  'coastal regions'],
    ['48h', 'forecast horizon'],
    ['0',  'non-free data sources'],
  ];
  const statW = (W - 2 * MARGIN_X) / stats.length;
  stats.forEach(([num, label], i) => {
    const x = MARGIN_X + i * statW;
    s.addText(num, {
      x, y: 6.32, w: statW, h: 0.3,
      fontFace: MONO, fontSize: 17, color: C.teal, bold: true, margin: 0,
    });
    s.addText(label, {
      x: x + 0.55, y: 6.35, w: statW - 0.6, h: 0.3,
      fontFace: MONO, fontSize: 9, color: C.textMute, charSpacing: 2, valign: 'middle', margin: 0,
    });
  });
}

// ─── Slide 5 — Arc 2: Live data integration ────────────────────────────────

function slide5() {
  const s = darkSlide();
  pageChrome(s, 5, TOTAL);

  monoLabel(s, 'ARC 02 · LIVE DATA', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'Graceful degradation\nby default.', MARGIN_X, 1.6, 7.5, { size: 38, h: 2.0 });

  body(s,
    'Replaced mock data with real NDBC buoy feeds, Open-Meteo marine forecasts, and NOAA tide predictions. Built a three-state renderer: cached -> mock -> stale. The UI is never empty, never throws, and never leaves the user staring at a spinner.',
    MARGIN_X, 3.7, 7.2, 1.4);

  // Three-state row with colored dots
  const states = [
    ['CACHED',  C.phosphor, 'Serve from in-memory cache if fresh (<10 min)'],
    ['MOCK',    C.teal,     'Render synthetic timeline while live fetch resolves'],
    ['STALE',   C.amber,    'Keep last-known data, surface an OFFLINE badge'],
  ];
  const sy = 5.2;
  states.forEach(([label, color, desc], i) => {
    const y = sy + i * 0.35;
    coloredDot(s, MARGIN_X, y + 0.1, color, 0.1);
    s.addText(label, {
      x: MARGIN_X + 0.3, y, w: 1.1, h: 0.3,
      fontFace: MONO, fontSize: 10, color: color, charSpacing: 3, bold: true, valign: 'middle', margin: 0,
    });
    s.addText(desc, {
      x: MARGIN_X + 1.5, y, w: 5.8, h: 0.3,
      fontFace: SANS, fontSize: 12, color: C.textDim, valign: 'middle', margin: 0,
    });
  });

  // Right: dashboard screenshot (sized to stay above chrome)
  const imgH = 4.8;
  const imgW = imgH * (1179 / 2556);
  s.addImage({
    path: resolve(SHOTS, 'dashboard.png'),
    x: W - MARGIN_X - imgW - 0.2, y: 1.4, w: imgW, h: imgH,
  });
  s.addText('LIVE · BUOY 46012 · 0M AGO', {
    x: W - MARGIN_X - imgW - 0.3, y: 6.3, w: imgW + 0.2, h: 0.3,
    fontFace: MONO, fontSize: 9, color: C.phosphor, charSpacing: 2, align: 'center', margin: 0,
  });
}

// ─── Slide 6 — Arc 3: Design system / color ────────────────────────────────

function slide6() {
  const s = darkSlide();
  pageChrome(s, 6, TOTAL);

  monoLabel(s, 'ARC 03 · DESIGN SYSTEM', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'Color conveys quality, not state.', MARGIN_X, 1.6, 11, { size: 36 });

  body(s,
    'Red-green is the lazy default for scoring \u2014 it carries medical emergency connotations and flattens nuance. A 7-tier palette (phosphor -> amber) paired with numeric scores communicates more information with less cognitive load, and reads correctly across all color-vision profiles.',
    MARGIN_X, 2.9, 11.7, 1.2);

  // 7-tier palette
  const tiers = [
    { label: 'EPIC',    hex: C.epic,     score: '80-100' },
    { label: 'GOOD',    hex: C.good,     score: '60-79'  },
    { label: 'FAIR',    hex: C.fair,     score: '50-59'  },
    { label: 'MID',     hex: C.amber,    score: '35-49'  },
    { label: 'MEH',     hex: C.orange,   score: '30-34'  },
    { label: 'POOR',    hex: C.red,      score: '15-29'  },
    { label: 'FLAT',    hex: C.flat,     score: '0-14'   },
  ];
  const swatchY = 4.0;
  const swatchW = (W - 2 * MARGIN_X) / tiers.length;
  const swatchH = 1.15;
  tiers.forEach((t, i) => {
    const x = MARGIN_X + i * swatchW + 0.1;
    const w = swatchW - 0.2;
    // Swatch
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: swatchY, w, h: swatchH,
      fill: { color: t.hex }, line: { type: 'none' },
    });
    // Label
    s.addText(t.label, {
      x, y: swatchY + swatchH + 0.15, w, h: 0.3,
      fontFace: MONO, fontSize: 11, color: C.text, charSpacing: 3, bold: true, margin: 0,
    });
    s.addText(t.score, {
      x, y: swatchY + swatchH + 0.45, w, h: 0.25,
      fontFace: MONO, fontSize: 9, color: C.textMute, charSpacing: 2, margin: 0,
    });
    s.addText('#' + t.hex, {
      x, y: swatchY + swatchH + 0.72, w, h: 0.25,
      fontFace: MONO, fontSize: 8, color: C.textMute, charSpacing: 1, margin: 0,
    });
  });
}

// ─── Slide 7 — Arc 4: Merch scraper ────────────────────────────────────────

function slide7() {
  const s = darkSlide();
  pageChrome(s, 7, TOTAL);

  monoLabel(s, 'ARC 04 · MERCH PIPELINE', MARGIN_X, 1.2, { color: C.teal });
  headline(s,
    'When the platform fights you,\nroute through what it trusts.',
    MARGIN_X, 1.6, 7.5, { size: 28, h: 1.6 });

  body(s,
    'curl returned 403. Cloudflare bot challenge. Playwright\'s ctx.request.get() also 403: browser contexts don\'t share challenge cookies between hostnames for the request API. Fix: route fetches through page.goto(), which runs in the authenticated Chromium page context.',
    MARGIN_X, 3.3, 7.3, 1.4);

  // Pipeline steps as numbered list with teal dots
  const steps = [
    'Warm the storefront to pass the HTML challenge',
    'Scroll to lazy-load all product cards',
    'Dedupe variants via canonical-URL regex',
    'Warm the CDN origin through a dummy page.goto()',
    'Download each image through the page context',
    'Pipe through Sharp (600px, WebP q82)',
  ];
  const stepY = 4.9;
  steps.forEach((step, i) => {
    const y = stepY + i * 0.24;
    s.addText(String(i + 1).padStart(2, '0'), {
      x: MARGIN_X, y, w: 0.5, h: 0.22,
      fontFace: MONO, fontSize: 10, color: C.teal, bold: true, charSpacing: 1, valign: 'middle', margin: 0,
    });
    s.addText(step, {
      x: MARGIN_X + 0.5, y, w: 7.0, h: 0.22,
      fontFace: SANS, fontSize: 11, color: C.textDim, valign: 'middle', margin: 0,
    });
  });

  // Right: merch-hero screenshot (desktop aspect 1.6)
  const imgW = 4.5;
  const imgH = imgW / 1.6;
  const imgX = W - MARGIN_X - imgW;
  const imgY = 1.6;
  s.addImage({
    path: resolve(SHOTS, 'merch-hero.png'),
    x: imgX, y: imgY, w: imgW, h: imgH,
  });
  // Stat callouts under the image
  const imgBottom = imgY + imgH + 0.3;
  s.addText([
    { text: '22', options: { color: C.teal, bold: true } },
    { text: '  products   ', options: { color: C.textMute } },
    { text: '·', options: { color: C.border } },
    { text: '   0', options: { color: C.teal, bold: true } },
    { text: '  manual edits', options: { color: C.textMute } },
  ], {
    x: imgX - 0.2, y: imgBottom, w: imgW + 0.4, h: 0.3,
    fontFace: MONO, fontSize: 11, charSpacing: 1, align: 'center', margin: 0,
  });
  s.addText([
    { text: '~20 KB', options: { color: C.teal, bold: true } },
    { text: '  average WebP   ', options: { color: C.textMute } },
    { text: '·', options: { color: C.border } },
    { text: '   0', options: { color: C.teal, bold: true } },
    { text: '  hand-written copies', options: { color: C.textMute } },
  ], {
    x: imgX - 0.2, y: imgBottom + 0.35, w: imgW + 0.4, h: 0.3,
    fontFace: MONO, fontSize: 11, charSpacing: 1, align: 'center', margin: 0,
  });
}

// ─── Slide 8 — Arc 4: Merch result (full bleed) ────────────────────────────

function slide8() {
  const s = darkSlide();
  pageChrome(s, 8, TOTAL);

  monoLabel(s, 'ARC 04 · RESULT', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'surfvikings.com / merch', MARGIN_X, 1.55, 10, { size: 32, h: 0.7 });

  // Bounded merch hero — sized to fit available vertical space
  // Available: y=2.35 to y=6.15 → 3.8" tall max
  // Aspect 1.6: if H=3.7 then W=5.92. Too narrow for a full-bleed feel.
  // Better: W=7.5, H=4.69 — but cap at 3.8.
  const imgH = 3.7;
  const imgW = imgH * 1.6;   // 5.92"
  const imgX = (W - imgW) / 2;
  const imgY = 2.4;
  s.addImage({
    path: resolve(SHOTS, 'merch-hero.png'),
    x: imgX, y: imgY, w: imgW, h: imgH,
  });
  // Subtle teal tick on top-left corner of image
  s.addShape(pres.shapes.RECTANGLE, {
    x: imgX, y: imgY, w: 0.05, h: imgH,
    fill: { color: C.teal }, line: { type: 'none' },
  });

  // Caption row below the image
  s.addText([
    { text: 'HERO COLLAGE', options: { color: C.teal, bold: true } },
    { text: '   +   SIX-CATEGORY GRID   ·   PLAYWRIGHT-CAPTURED   ·   SHARP-OPTIMIZED   ·   EDITORIAL-MERGED FROM A MAPPING TABLE', options: { color: C.textMute } },
  ], {
    x: MARGIN_X, y: imgY + imgH + 0.3, w: W - 2 * MARGIN_X, h: 0.4,
    fontFace: MONO, fontSize: 10, charSpacing: 2, align: 'center', margin: 0,
  });
}

// ─── Slide 9 — Arc 5: Domain migration ─────────────────────────────────────

function slide9() {
  const s = darkSlide();
  pageChrome(s, 9, TOTAL);

  monoLabel(s, 'ARC 05 · INFRASTRUCTURE', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'Decouple orthogonal concerns.', MARGIN_X, 1.6, 10, { size: 36 });

  body(s,
    'Legacy surfvikings.com was a manually maintained static site on DreamHost shared hosting. Migrated to Vercel while preserving email routing at the same domain. Web hosting and email hosting are different services that happen to share a domain. DNS was the seam.',
    MARGIN_X, 2.7, 11.7, 1.0);

  // Before/After card
  const cardY = 3.9;
  const cardH = 1.95;
  const cardW = (W - 2 * MARGIN_X - 0.4) / 2;

  // BEFORE
  s.addShape(pres.shapes.RECTANGLE, {
    x: MARGIN_X, y: cardY, w: cardW, h: cardH,
    fill: { color: C.surface }, line: { color: C.border, width: 0.75 },
  });
  s.addText('BEFORE', {
    x: MARGIN_X + 0.3, y: cardY + 0.2, w: cardW - 0.6, h: 0.3,
    fontFace: MONO, fontSize: 10, color: C.amber, charSpacing: 3, bold: true, margin: 0,
  });
  const beforeRows = [
    ['Host',   'DreamHost shared hosting'],
    ['Deploy', 'Manual uploads via Cyberduck'],
    ['TLS',    'Self-managed'],
    ['Email',  'DreamHost'],
  ];
  beforeRows.forEach(([k, v], i) => {
    const y = cardY + 0.65 + i * 0.3;
    s.addText(k.toUpperCase(), {
      x: MARGIN_X + 0.3, y, w: 1.4, h: 0.28,
      fontFace: MONO, fontSize: 9, color: C.textMute, charSpacing: 2, valign: 'middle', margin: 0,
    });
    s.addText(v, {
      x: MARGIN_X + 1.7, y, w: cardW - 2.0, h: 0.28,
      fontFace: SANS, fontSize: 11, color: C.textDim, valign: 'middle', margin: 0,
    });
  });

  // AFTER
  const afterX = MARGIN_X + cardW + 0.4;
  s.addShape(pres.shapes.RECTANGLE, {
    x: afterX, y: cardY, w: cardW, h: cardH,
    fill: { color: C.surface }, line: { color: C.teal, width: 1 },
  });
  s.addText('AFTER', {
    x: afterX + 0.3, y: cardY + 0.2, w: cardW - 0.6, h: 0.3,
    fontFace: MONO, fontSize: 10, color: C.phosphor, charSpacing: 3, bold: true, margin: 0,
  });
  const afterRows = [
    ['Host',   'Vercel (auto-deploy from main)'],
    ['Deploy', '22-second production builds'],
    ['TLS',    'Auto Let\u2019s Encrypt + HSTS'],
    ['Email',  'DreamHost (unchanged)'],
  ];
  afterRows.forEach(([k, v], i) => {
    const y = cardY + 0.65 + i * 0.3;
    s.addText(k.toUpperCase(), {
      x: afterX + 0.3, y, w: 1.4, h: 0.28,
      fontFace: MONO, fontSize: 9, color: C.textMute, charSpacing: 2, valign: 'middle', margin: 0,
    });
    s.addText(v, {
      x: afterX + 1.7, y, w: cardW - 2.0, h: 0.28,
      fontFace: SANS, fontSize: 11, color: C.text, valign: 'middle', margin: 0,
    });
  });

  // Bottom callout: DNS verification, positioned well clear of cards + chrome
  const calloutY = 6.15;
  divider(s, MARGIN_X, calloutY - 0.1, W - 2 * MARGIN_X);
  s.addText([
    { text: 'DIG  ', options: { color: C.textMute } },
    { text: 'A @ 76.76.21.21', options: { color: C.teal, bold: true } },
    { text: '   ·   ', options: { color: C.borderHi } },
    { text: 'A www 76.76.21.21', options: { color: C.teal, bold: true } },
    { text: '   ·   ', options: { color: C.borderHi } },
    { text: 'HTTP/2 200', options: { color: C.phosphor, bold: true } },
    { text: '   ·   ', options: { color: C.borderHi } },
    { text: 'ZERO-DOWNTIME MIGRATION', options: { color: C.textMute } },
  ], {
    x: MARGIN_X, y: calloutY, w: W - 2 * MARGIN_X, h: 0.35,
    fontFace: MONO, fontSize: 11, charSpacing: 2, align: 'center', valign: 'middle', margin: 0,
  });
}

// ─── Slide 10 — Mobile responsive proof ────────────────────────────────────

function slide10() {
  const s = darkSlide();
  pageChrome(s, 10, TOTAL);

  monoLabel(s, 'ARC 05 · RESPONSIVE PASS', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'Mobile-first, respected.', MARGIN_X, 1.6, 10, { size: 36 });

  // Three mobile screenshots in a row
  const files = ['landing-mobile-hero.png', 'landing-mobile-feat.png', 'landing-mobile-foot.png'];
  const captions = [
    'Stacked hero with visible wordmark and iOS safe-area padding',
    'Halved hero-to-headline gap with stacked feature section',
    'Single-column footer  —  no more horizontal overflow',
  ];
  const imgH = 3.6;
  const imgW = imgH * (1179 / 2556);
  const totalW = imgW * 3 + 0.8;
  const startX = (W - totalW) / 2;
  const imgY = 2.3;
  files.forEach((f, i) => {
    const x = startX + i * (imgW + 0.4);
    s.addImage({ path: resolve(SHOTS, f), x, y: imgY, w: imgW, h: imgH });
    s.addText(captions[i], {
      x: x - 0.3, y: imgY + imgH + 0.25, w: imgW + 0.6, h: 0.55,
      fontFace: SANS, fontSize: 10, color: C.textMute,
      align: 'center', valign: 'top', lineSpacingMultiple: 1.3, margin: 0,
    });
  });
}

// ─── Slide 11 — Arc 6: Dashboard personalization ──────────────────────────

function slide11() {
  const s = darkSlide();
  pageChrome(s, 11, TOTAL);

  monoLabel(s, 'ARC 06 · DASHBOARD', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'Platform affordances\nover platform APIs.', MARGIN_X, 1.6, 8, { size: 38, h: 2.2 });

  body(s,
    'The header was hardcoded copy left over from a static mock. Shipped in two commits: first a live clock, time-aware greeting, localStorage-backed name and location, real buoy air temp and top-spot wind. Then the bug: iOS silently suppresses window.prompt() in standalone PWA mode.',
    MARGIN_X, 4.0, 7.5, 1.5);

  body(s,
    'The fix wasn\u2019t feature-detection \u2014 it was inline editing. An <input> swap replaces the prompt entirely, works identically in browser, PWA, and in-app WebView, and handles iOS keyboard niceties: enterKeyHint="done", autoCorrect="off", select-on-focus.',
    MARGIN_X, 5.6, 7.5, 1.3);

  // Right: dashboard screenshot
  const imgH = 4.9;
  const imgW = imgH * (1179 / 2556);
  s.addImage({
    path: resolve(SHOTS, 'dashboard.png'),
    x: W - MARGIN_X - imgW - 0.2, y: 1.4, w: imgW, h: imgH,
  });
}

// ─── Slide 12 — Engineering Principles ─────────────────────────────────────

function slide12() {
  const s = darkSlide();
  pageChrome(s, 12, TOTAL);

  monoLabel(s, 'CROSS-CUTTING', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'Engineering principles.', MARGIN_X, 1.6, 10, { size: 40 });

  const principles = [
    ['Model the domain before writing the UI',                'Types exist before components render them'],
    ['Graceful degradation by default',                       'Three-state rendering never leaves a spinner'],
    ['Color conveys quality, not state',                      '7-tier palette beats red/green stoplight'],
    ['Route through what the platform trusts',                'Cloudflare bypass via real Chromium, not solving'],
    ['Decouple orthogonal concerns',                          'Web hosting and email are different services; DNS is the seam'],
    ['Platform affordances over platform APIs',               'Inline input beats window.prompt() on every target'],
    ['Editorial systems, not editorial content',              'Content-as-code survives scraper re-runs'],
    ['Iterate in commits, not in branches',                   '34 linear commits, every change reversible'],
  ];

  const colW = (W - 2 * MARGIN_X - 0.5) / 2;
  const rowH = 0.95;
  const startY = 3.0;
  principles.forEach(([title, desc], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN_X + col * (colW + 0.5);
    const y = startY + row * rowH;
    // Teal number
    s.addText(String(i + 1).padStart(2, '0'), {
      x, y, w: 0.55, h: 0.4,
      fontFace: MONO, fontSize: 22, color: C.teal, bold: true, charSpacing: 1, margin: 0,
    });
    // Title
    s.addText(title, {
      x: x + 0.6, y: y - 0.02, w: colW - 0.6, h: 0.3,
      fontFace: SANS, fontSize: 12.5, color: C.text, bold: true, margin: 0,
    });
    // Desc
    s.addText(desc, {
      x: x + 0.6, y: y + 0.32, w: colW - 0.6, h: 0.4,
      fontFace: SANS, fontSize: 10.5, color: C.textMute, margin: 0,
    });
  });
}

// ─── Slide 13 — Stack & Scope ──────────────────────────────────────────────

function slide13() {
  const s = darkSlide();
  pageChrome(s, 13, TOTAL);

  monoLabel(s, 'STACK · SCOPE · OUTCOMES', MARGIN_X, 1.2, { color: C.teal });
  headline(s, 'Small surface, opinionated choices.', MARGIN_X, 1.6, 12, { size: 34 });

  // 4 pill-shaped sections
  const sections = [
    {
      label: 'FRONTEND',
      color: C.teal,
      items: ['Vite', 'React 18', 'TypeScript', 'vite-plugin-pwa'],
    },
    {
      label: 'BUILD · TOOLING',
      color: C.pacific,
      items: ['TypeScript strict', 'Playwright', 'Sharp', 'Node scripts'],
    },
    {
      label: 'DATA LAYER',
      color: C.phosphor,
      items: ['NDBC buoys', 'Open-Meteo marine', 'NOAA tides', '10-min cache'],
    },
    {
      label: 'INFRASTRUCTURE',
      color: C.amber,
      items: ['Vercel hosting', 'DreamHost email', 'Let\u2019s Encrypt', '$0 / month'],
    },
  ];
  const sectY = 2.9;
  const sectH = 1.9;
  const sectW = (W - 2 * MARGIN_X - 0.6) / 4;
  sections.forEach((sec, i) => {
    const x = MARGIN_X + i * (sectW + 0.2);
    // Card
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: sectY, w: sectW, h: sectH,
      fill: { color: C.surface }, line: { color: C.border, width: 0.75 },
    });
    // Top-left accent bar
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: sectY, w: 0.08, h: sectH,
      fill: { color: sec.color }, line: { type: 'none' },
    });
    // Label
    s.addText(sec.label, {
      x: x + 0.25, y: sectY + 0.18, w: sectW - 0.4, h: 0.3,
      fontFace: MONO, fontSize: 9, color: sec.color, charSpacing: 3, bold: true, margin: 0,
    });
    // Items stacked
    const itemRuns = sec.items.map((it, idx) => ({
      text: it, options: { breakLine: idx < sec.items.length - 1, color: C.textDim },
    }));
    s.addText(itemRuns, {
      x: x + 0.25, y: sectY + 0.6, w: sectW - 0.4, h: sectH - 0.7,
      fontFace: SANS, fontSize: 12, lineSpacingMultiple: 1.4, margin: 0, valign: 'top',
    });
  });

  // Stats row at bottom
  const statY = 5.1;
  divider(s, MARGIN_X, statY, W - 2 * MARGIN_X);
  const stats = [
    ['~4,100', 'LINES TS'],
    ['34',     'COMMITS'],
    ['28',     'SPOTS'],
    ['48h',    'FORECAST'],
    ['0',      '3rd-party JS'],
    ['$0',     'HOSTING'],
  ];
  const sw = (W - 2 * MARGIN_X) / stats.length;
  stats.forEach(([num, lab], i) => {
    const x = MARGIN_X + i * sw;
    s.addText(num, {
      x, y: statY + 0.25, w: sw, h: 0.7,
      fontFace: MONO, fontSize: 32, color: C.teal, bold: true,
      align: 'center', valign: 'top', margin: 0,
    });
    s.addText(lab, {
      x, y: statY + 1.05, w: sw, h: 0.3,
      fontFace: MONO, fontSize: 9, color: C.textMute,
      align: 'center', charSpacing: 3, margin: 0,
    });
  });
}

// ─── Slide 14 — Closer ─────────────────────────────────────────────────────

function slide14() {
  const s = darkSlide();
  pageChrome(s, 14, TOTAL);

  monoLabel(s, 'CLOSER · LIVE', MARGIN_X, 1.1, { color: C.teal });

  s.addText([
    { text: 'Surf Vikings is a hyper-local NorCal surf forecasting PWA I designed, engineered, and shipped solo. ', options: { color: C.text } },
    { text: 'Scored 28 breaks across 150 miles of coast hour-by-hour on free public NOAA data.', options: { color: C.teal } },
    { text: ' Shipped on a custom domain with zero-downtime migration, an installable PWA, a Printful-backed merch store with a custom Cloudflare-bypass scraper, and a personalized dashboard that works identically in browser, home-screen PWA, and in-app WebView.', options: { color: C.text } },
  ], {
    x: MARGIN_X, y: 1.7, w: W - 2 * MARGIN_X, h: 3.6,
    fontFace: SANS, fontSize: 22, bold: true, charSpacing: -0.5,
    lineSpacingMultiple: 1.3, valign: 'top', margin: 0,
  });

  divider(s, MARGIN_X, 5.5, W - 2 * MARGIN_X);

  // Three link columns
  const links = [
    ['LIVE',    'surfvikings.com'],
    ['REPO',    'github.com/elieljohnson/surfvikings'],
    ['CONTACT', 'eliel.johnson@gmail.com'],
  ];
  const linkW = (W - 2 * MARGIN_X) / 3;
  links.forEach(([lab, val], i) => {
    const x = MARGIN_X + i * linkW;
    s.addText(lab, {
      x, y: 5.7, w: linkW, h: 0.3,
      fontFace: MONO, fontSize: 10, color: C.textMute, charSpacing: 3, margin: 0,
    });
    s.addText(val, {
      x, y: 6.0, w: linkW, h: 0.4,
      fontFace: MONO, fontSize: 14, color: C.teal, bold: true, charSpacing: 1, valign: 'top', margin: 0,
    });
  });
}

// ─── Build ────────────────────────────────────────────────────────────────

[slide1, slide2, slide3, slide4, slide5, slide6, slide7,
 slide8, slide9, slide10, slide11, slide12, slide13, slide14].forEach((fn) => fn());

const out = resolve(DOCS, 'case-study.pptx');
await pres.writeFile({ fileName: out });
console.log(`✓ ${out}`);
