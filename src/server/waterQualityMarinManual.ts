// Marin County beach water quality — hand-curated weekly fixture.
//
// Why this exists: Marin's public results page sits behind Cloudflare's
// JS-challenge bot detection. A serverless function can't pass the
// challenge without a headless browser (heavy, fragile, possibly TOS-
// violating). Their open-data GIS portal doesn't expose the sampling
// layer. The email to Marin EH for User-Agent whitelisting is queued
// (see backlog) but not yet resolved.
//
// Until then, Eliel screenshots Marin's results page once a week
// (Marin samples Mon/Tue, posts Tue/Wed; sampling season Apr–Oct only)
// and the table below gets rewritten from the screenshot. The TS type
// makes invalid status values fail at build time, so a typo or misread
// can't ship silently.
//
// Workflow:
//   1. Eliel screenshots https://www.marincounty.gov/.../water-quality-results
//   2. Drops it in Claude chat
//   3. Claude rewrites SAMPLE_WEEK + READINGS below
//   4. Commit message records the sample week date
//   5. Push to main → Vercel redeploys → spots show the new status

import type { LiveBeachReading } from './waterQualityLive';

/** ISO date of the Monday this week's samples were collected. Used by the
 *  UI to render "Tested 5/4 · Nd ago" and to grey out the panel once the
 *  data is older than ~10 days (one missed week + a buffer). */
export const MARIN_SAMPLE_WEEK = '2026-05-04';

/** Hand-encoded table from Marin's weekly results page. Status mapping:
 *   OK    → open    (no advisory)
 *   AVOID → caution (advisory posted; consistent with SM "Posted" and
 *                    Sonoma "Caution" — surfers can still enter at own risk)
 *   N/A   → dropped (skipped this week; not enough signal)
 *   -     → dropped (column not yet sampled this week)
 *
 *  Only surf-relevant stations are listed — the full Marin list has 31,
 *  but estuary / bay / freshwater stations (Inkwells, China Camp, etc.)
 *  aren't mapped to any of our spots so they'd just be dead data. */
type MarinRow = {
  beachName: string;
  status: 'OK' | 'AVOID';
};

const RAW: MarinRow[] = [
  { beachName: 'Dillon Beach',          status: 'OK' },
  { beachName: 'Drakes Beach',          status: 'OK' },
  { beachName: 'Drakes Estero',         status: 'OK' },
  { beachName: 'Bolinas Beach',         status: 'OK' },
  { beachName: 'Muir Beach - Central',  status: 'OK' },
  { beachName: 'Rodeo Beach - North',   status: 'OK' },
  { beachName: 'Stinson Beach - North', status: 'OK' },
  { beachName: 'Stinson Beach - Central', status: 'OK' },
];

export const MARIN_READINGS: LiveBeachReading[] = RAW.map((r) => ({
  beachName: r.beachName,
  sampleDate: MARIN_SAMPLE_WEEK,
  status: r.status === 'AVOID' ? 'caution' : 'open',
  rawStatus: r.status === 'AVOID'
    ? 'Water quality advisory — avoid contact'
    : 'No advisory posted',
  source: 'Marin County Env. Health',
}));

/** Sync API — no network. Returned as an array to match the Promise.all
 *  shape used by the other county fetchers. */
export function fetchMarinManual(): LiveBeachReading[] {
  // Drop readings older than 21 days to prevent stale data shipping
  // forever if Eliel takes a vacation mid-season. 21d = two missed
  // weeks + buffer. UI hides the panel rather than showing stale info.
  const age = (Date.now() - new Date(MARIN_SAMPLE_WEEK).getTime()) / 86400_000;
  if (age > 21) return [];
  return MARIN_READINGS;
}
