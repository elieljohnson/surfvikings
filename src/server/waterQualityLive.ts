// Per-county live water-quality scrapers. The California Open Data Portal
// CSVs turned out to be historical-only (months-to-years stale on active
// records), so we read each county's own weekly-updated page or API.
// See docs/water-quality-sources.md for the freshness investigation.
//
// Current coverage:
//   Sonoma (HTML tables)            — weekly during in-season
//   SF / SFPUC (hidden JSON API)    — weekly year-round, 20+ stations
//   San Mateo (Google MyMaps KML)   — weekly, 40 stations, no sample date
// Future:
//   Marin   — Cloudflare-blocked; needs whitelist or Playwright
//   SC     — date-only fresh data; permanent postings already encoded

export interface LiveBeachReading {
  /** Canonical beach name used by the source (matches what we put in the
   *  spot → beach mapping). */
  beachName: string;
  /** ISO-8601 date of the most recent sample. */
  sampleDate: string;
  /** Normalized status: 'open' (clean), 'caution' (advisory in effect),
   *  'closed' (full closure / unsafe). */
  status: 'open' | 'caution' | 'closed';
  /** Verbatim source-side status string for tooltip / debugging. */
  rawStatus: string;
  /** Attribution string ('Sonoma County Env. Health', 'SFPUC'). */
  source: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Sonoma County Environmental Health — HTML table scrape
// 7 beaches: Gualala, Black Point (Sea Ranch), Stillwater Cove, Goat Rock
// (Russian River mouth), Salmon Creek, Campbell Cove, Doran. Each table is:
//   <table>
//     <caption>Beach Name</caption>  ← or first row holds the name
//     <tr>Date Collected: | May 4, 2026</tr>
//     <tr>Total Coliform: | Less than 10 (per 100ml)</tr>
//     ...
//     <tr>Beach Status: | Open</tr>
//   </table>
// ───────────────────────────────────────────────────────────────────────────

const SONOMA_URL =
  'https://sonomacounty.gov/health-and-human-services/health-services/divisions/public-health/environmental-health/programs-and-services/ocean-water-quality';

export async function fetchSonomaCounty(signal?: AbortSignal): Promise<LiveBeachReading[]> {
  try {
    const res = await fetch(SONOMA_URL, { signal });
    if (!res.ok) return [];
    const html = await res.text();
    return parseSonomaCounty(html);
  } catch {
    return [];
  }
}

export function parseSonomaCounty(html: string): LiveBeachReading[] {
  const readings: LiveBeachReading[] = [];
  // Find each <table>...</table>
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/g;
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableRe.exec(html)) !== null) {
    const tableBody = tableMatch[1];
    // First row's first cell holds the beach name (per the Sonoma page format)
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const rows: string[][] = [];
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRe.exec(tableBody)) !== null) {
      const cells: string[] = [];
      const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
        cells.push(stripHtml(cellMatch[1]));
      }
      rows.push(cells);
    }
    if (rows.length < 2) continue;

    // Beach name is the first row's first cell — but skip "legend" or
    // header-only tables (which start with "Total Coliform:" or similar).
    const name = rows[0][0]?.trim() ?? '';
    if (!name || name.endsWith(':')) continue;

    let sampleDate = '';
    let rawStatus = '';
    for (const row of rows) {
      const label = (row[0] ?? '').toLowerCase();
      const value = (row[1] ?? '').trim();
      if (label.includes('date collected') && value) sampleDate = normalizeDate(value);
      if (label.includes('beach status') && value) rawStatus = value;
    }
    if (!sampleDate || !rawStatus) continue;

    readings.push({
      beachName: name,
      sampleDate,
      rawStatus,
      status: normalizeStatus(rawStatus),
      source: 'Sonoma County Env. Health',
    });
  }
  return readings;
}

// ───────────────────────────────────────────────────────────────────────────
// SFPUC — undocumented JSON API behind their public beach map.
// Response shape (one per station):
//   { stationid, stationname, cso, s_color, posted, p_color,
//     sample_date: 'MM/DD/YY', lat, lon }
// Status interpretation, inferred from the data + UI:
//   s_color=null & posted=null → open
//   s_color='W'                → caution (warning marker on the map)
//   posted has a non-null value → closed (active posting)
// ───────────────────────────────────────────────────────────────────────────

interface SfpucStation {
  stationid: string;
  stationname: string;
  cso: string | null;
  s_color: string | null;
  posted: string | null;
  p_color: string | null;
  sample_date: string;
  lat: string;
  lon: string;
}

const SFPUC_URL = 'https://infrastructure.sfwater.org/lims.asmx/getBeaches';

export async function fetchSFPUC(signal?: AbortSignal): Promise<LiveBeachReading[]> {
  try {
    const res = await fetch(SFPUC_URL, { signal });
    if (!res.ok) return [];
    const text = await res.text();
    return parseSFPUC(text);
  } catch {
    return [];
  }
}

export function parseSFPUC(soapWrappedJson: string): LiveBeachReading[] {
  // SFPUC's lims.asmx wraps a JSON string inside an XML <string> element.
  const stringMatch = soapWrappedJson.match(/<string[^>]*>([\s\S]*?)<\/string>/);
  const jsonText = (stringMatch?.[1] ?? soapWrappedJson)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
  let stations: SfpucStation[];
  try {
    stations = JSON.parse(jsonText) as SfpucStation[];
  } catch {
    return [];
  }
  return stations.map((s) => {
    let status: LiveBeachReading['status'] = 'open';
    const rawParts: string[] = [];
    if (s.posted) {
      status = 'closed';
      rawParts.push(`Posted: ${s.posted}`);
    } else if (s.s_color && s.s_color !== 'G') {
      status = 'caution';
      rawParts.push(`Status: ${s.s_color}`);
    }
    return {
      beachName: s.stationname,
      sampleDate: normalizeDate(s.sample_date),
      status,
      rawStatus: rawParts.length ? rawParts.join(', ') : 'Open',
      source: 'SFPUC Beach Monitoring',
    };
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Aggregate fetch — runs all wired sources in parallel, indexes by beach
// name for fast lookup. Beach names match what's encoded in waterQuality.ts
// spot → beach mappings.
// ───────────────────────────────────────────────────────────────────────────

export async function fetchAllLiveWaterQuality(
  signal?: AbortSignal,
): Promise<Record<string, LiveBeachReading>> {
  // Import lazily to avoid a circular type-only cycle (SM module imports
  // LiveBeachReading from this file).
  const { fetchSanMateo } = await import('./waterQualitySanMateo');
  const [sonoma, sfpuc, sanMateo] = await Promise.all([
    fetchSonomaCounty(signal),
    fetchSFPUC(signal),
    fetchSanMateo(signal),
  ]);
  const out: Record<string, LiveBeachReading> = {};
  for (const r of [...sonoma, ...sfpuc, ...sanMateo]) out[r.beachName] = r;
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Coerce assorted date formats to YYYY-MM-DD.
 *   "May 4, 2026"   → "2026-05-04"
 *   "5/4/2026"      → "2026-05-04"
 *   "05/04/26"      → "2026-05-04" */
function normalizeDate(input: string): string {
  const s = input.trim();
  // "Month Day, Year"
  const wordMatch = s.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (wordMatch) {
    const [, monthName, day, year] = wordMatch;
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const m = months.indexOf(monthName.slice(0, 3).toLowerCase()) + 1;
    if (m > 0) return `${year}-${String(m).padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // M/D/YYYY or M/D/YY
  const slashMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const [, mo, day, year] = slashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${mo.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return s;
}

function normalizeStatus(raw: string): LiveBeachReading['status'] {
  const lower = raw.toLowerCase();
  if (lower.includes('closed') || lower.includes('post')) return 'closed';
  if (lower.includes('caution') || lower.includes('advis') || lower.includes('warn')) return 'caution';
  return 'open';
}
