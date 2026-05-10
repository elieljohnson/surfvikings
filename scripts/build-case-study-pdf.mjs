// Render docs/case-study.md and docs/case-study-resume.md to PDF.
// Uses marked for MD→HTML + Playwright headless Chromium for HTML→PDF.
//
// Usage:  node scripts/build-case-study-pdf.mjs
// Output: docs/case-study.pdf, docs/case-study-resume.pdf

import { marked } from 'marked';
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOCS = resolve(__dirname, '../docs');

const CSS = `
  :root {
    --ink: #0e1116;
    --ink-soft: #3d4250;
    --ink-mute: #6b7280;
    --accent: #0099a8;
    --rule: #e5e7eb;
    --bg-code: #f6f7f9;
    --bg-note: #f0fafb;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: var(--ink);
    margin: 0;
    padding: 48px 56px;
    max-width: 780px;
  }
  h1 {
    font-size: 26pt;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
    color: var(--ink);
    line-height: 1.1;
  }
  h2 {
    font-size: 16pt;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 32px 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--rule);
    color: var(--ink);
  }
  h3 {
    font-size: 12.5pt;
    font-weight: 600;
    margin: 22px 0 8px;
    color: var(--ink);
  }
  h4 {
    font-size: 11pt;
    font-weight: 600;
    margin: 18px 0 6px;
    color: var(--ink-soft);
  }
  p { margin: 8px 0; color: var(--ink-soft); }
  p em { color: var(--ink-mute); font-size: 9.5pt; }
  strong { color: var(--ink); font-weight: 600; }
  a { color: var(--accent); text-decoration: none; }
  ul, ol { margin: 8px 0; padding-left: 22px; color: var(--ink-soft); }
  li { margin: 3px 0; }
  code {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9.5pt;
    background: var(--bg-code);
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--ink);
  }
  pre {
    background: var(--bg-code);
    border: 1px solid var(--rule);
    border-radius: 6px;
    padding: 12px 14px;
    overflow-x: auto;
    font-size: 9pt;
    line-height: 1.45;
    page-break-inside: avoid;
  }
  pre code {
    background: transparent;
    padding: 0;
    font-size: inherit;
  }
  blockquote {
    border-left: 3px solid var(--accent);
    padding: 6px 14px;
    margin: 12px 0;
    background: var(--bg-note);
    border-radius: 0 4px 4px 0;
    color: var(--ink-soft);
    font-style: italic;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid var(--rule);
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: var(--bg-code);
    font-weight: 600;
    color: var(--ink);
  }
  td { color: var(--ink-soft); }
  hr {
    border: none;
    border-top: 1px solid var(--rule);
    margin: 24px 0;
  }
  img {
    max-width: 100%;
    height: auto;
    margin: 16px 0;
    border-radius: 6px;
    border: 1px solid var(--rule);
    page-break-inside: avoid;
  }
  /* Keep each arc section together when the page breaks */
  h3 + p, h3 + ul, h3 + pre, h3 + table { page-break-before: avoid; }
  h2 { page-break-after: avoid; }
`;

// Inline every <img src="./foo.png"> as a base64 data URL so the PDF is
// fully self-contained and doesn't rely on <base> href resolution quirks.
async function inlineImages(html, baseDir) {
  const imgRegex = /<img([^>]*?)src="([^"]+)"([^>]*)>/g;
  const replacements = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const [full, pre, src, post] = match;
    if (src.startsWith('data:') || src.startsWith('http')) continue;
    try {
      const buf = await readFile(resolve(baseDir, src));
      const ext = src.split('.').pop()?.toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      replacements.push({ full, next: `<img${pre}src="${dataUrl}"${post}>` });
    } catch (err) {
      console.warn(`  ! couldn't inline ${src}: ${err.message}`);
    }
  }
  for (const { full, next } of replacements) html = html.replace(full, next);
  return html;
}

async function renderMarkdownToPdf(mdPath, pdfPath, browser) {
  const md = await readFile(mdPath, 'utf8');
  let bodyHtml = marked.parse(md);
  bodyHtml = await inlineImages(bodyHtml, dirname(mdPath));

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${mdPath}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>${CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath,
    format: 'Letter',
    margin: { top: '0.6in', right: '0.6in', bottom: '0.6in', left: '0.6in' },
    printBackground: true,
  });
  await page.close();
  console.log(`✓ ${pdfPath}`);
}

const browser = await chromium.launch();
try {
  await renderMarkdownToPdf(
    resolve(DOCS, 'case-study.md'),
    resolve(DOCS, 'case-study.pdf'),
    browser,
  );
  await renderMarkdownToPdf(
    resolve(DOCS, 'case-study-resume.md'),
    resolve(DOCS, 'case-study-resume.pdf'),
    browser,
  );
} finally {
  await browser.close();
}
