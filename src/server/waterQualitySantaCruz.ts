// Santa Cruz County Environmental Health — public ArcGIS Feature Service.
//
// SC publishes their full sampling dataset behind an ArcGIS Experience
// Builder app. The underlying Feature Service is public, supports query,
// and exposes a MostRecent flag for the latest sample per station — built
// for exactly this use case.
//
// Why SC is the best of our 5 sources:
//   - Four-tier status model (Acceptable / Caution / Health Advisory /
//     Serious Risk), richer than any other county
//   - Per-station collection date (we get the real "Tested 5/4" line)
//   - 21 coastal Ocean stations + creek-mouth stations, fresh weekly
//   - First source that can produce a 'closed' tier reading via Serious
//     Risk — finally exercises the red UI tier we built months ago

import type { LiveBeachReading } from './waterQualityLive';

// MostRecent=1 returns one row per station (the latest sample). We pull all
// fields needed: name, date string, status category. resultRecordCount=2000
// is well above the ~188 total stations to ensure no pagination needed.
const SC_URL =
  'https://sccgis.santacruzcountyca.gov/server/rest/services/waterquality/MapServer/0/query'
  + '?where=MostRecent%3D1'
  + '&outFields=LocationDescription,CollectDateTimeString,Category,StaNumTypeDescription'
  + '&f=json'
  + '&resultRecordCount=2000';

export async function fetchSantaCruz(signal?: AbortSignal): Promise<LiveBeachReading[]> {
  try {
    const res = await fetch(SC_URL, { signal });
    if (!res.ok) return [];
    const text = await res.text();
    return parseSantaCruzJson(text);
  } catch {
    return [];
  }
}

interface ScFeature {
  attributes: {
    LocationDescription?: string;
    CollectDateTimeString?: string;
    Category?: string;
    StaNumTypeDescription?: string;
  };
}

interface ScResponse {
  features?: ScFeature[];
  error?: unknown;
}

/** Map SC's 4-tier Category to our normalized status. Caution and Health
 *  Advisory both render amber — they share the same UI tier — but we
 *  differentiate in rawStatus text so the panel reads informatively.
 *  Serious Risk is our first source-produced 'closed' tier; until now
 *  the red state existed in the type system but no fetcher emitted it. */
function categoryToStatus(cat: string | undefined): { status: LiveBeachReading['status']; raw: string } | undefined {
  switch ((cat ?? '').trim()) {
    case 'Acceptable':      return { status: 'open',    raw: 'No advisory posted' };
    case 'Caution':         return { status: 'caution', raw: 'Bacteria elevated — caution advised' };
    case 'Health Advisory': return { status: 'caution', raw: 'Health advisory — bacterial threshold exceeded' };
    case 'Serious Risk':    return { status: 'closed',  raw: 'Serious risk — bacterial levels significantly elevated' };
    default: return undefined; // Unknown category — drop rather than guess
  }
}

export function parseSantaCruzJson(text: string): LiveBeachReading[] {
  let payload: ScResponse;
  try {
    payload = JSON.parse(text);
  } catch {
    return [];
  }
  if (payload.error || !payload.features) return [];

  const readings: LiveBeachReading[] = [];
  for (const feat of payload.features) {
    const a = feat.attributes ?? {};
    const name = (a.LocationDescription ?? '').trim();
    if (!name) continue;
    const mapped = categoryToStatus(a.Category);
    if (!mapped) continue;
    // SC's date string is "YYYY-MM-DD HH:MM" — take the date portion.
    const dateRaw = (a.CollectDateTimeString ?? '').trim();
    const sampleDate = /^\d{4}-\d{2}-\d{2}/.test(dateRaw) ? dateRaw.slice(0, 10) : '';
    readings.push({
      beachName: name,
      sampleDate,
      status: mapped.status,
      rawStatus: mapped.raw,
      source: 'Santa Cruz County Env. Health',
    });
  }
  return readings;
}
