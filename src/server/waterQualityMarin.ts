// Marin County beach water quality — public ArcGIS Feature Service.
//
// Marin's beach data publishes through ArcGIS, refreshed every Thursday
// evening. Endpoint provided directly by Daniel Myers (Marin IT, Advanced
// Systems Engineer) after we emailed asking for an automated path —
// see docs/water-quality-sources.md for the conversation.
//
// This replaces the screenshot-fed manual fixture in waterQualityMarinManual.ts
// that we shipped while waiting on the data team. Same shape, real data flow.
//
// Field model:
//   beach_name             — station name, ALL CAPS in source. We title-case
//                            so existing spot mappings stay stable.
//   inspection_week_date   — epoch ms, the week's anchor date
//   inspection_day_of      — 'MONDAY' or 'TUESDAY' (sampling cadence)
//   inspection_result      — 'OK' / 'AVOID' / 'N/A'
//   is_latest_inspection   — 1 for most-recent sample per station

import type { LiveBeachReading } from './waterQualityLive';

const MARIN_URL =
  'https://services6.arcgis.com/T8eS7sop5hLmgRRH/arcgis/rest/services/a64e0b/FeatureServer/0/query'
  + '?where=is_latest_inspection%3D1'
  + '&outFields=beach_name,inspection_week_date,inspection_result'
  + '&f=json'
  + '&resultRecordCount=2000';

export async function fetchMarin(signal?: AbortSignal): Promise<LiveBeachReading[]> {
  try {
    const res = await fetch(MARIN_URL, { signal });
    if (!res.ok) return [];
    const text = await res.text();
    return parseMarinJson(text);
  } catch {
    return [];
  }
}

interface MarinFeature {
  attributes: {
    beach_name?: string;
    inspection_week_date?: number;
    inspection_result?: string;
  };
}

interface MarinResponse {
  features?: MarinFeature[];
  error?: unknown;
}

/** Marin's result strings map cleanly to our tier model. AVOID = the
 *  county has posted an advisory; surfers can still enter the water at
 *  their own risk (consistent with Sonoma's Caution, SM's Posted, etc.).
 *  N/A = station wasn't sampled this week — drop rather than guess. */
function resultToStatus(r: string | undefined): { status: LiveBeachReading['status']; raw: string } | undefined {
  switch ((r ?? '').trim().toUpperCase()) {
    case 'OK':    return { status: 'open',    raw: 'No advisory posted' };
    case 'AVOID': return { status: 'caution', raw: 'Water quality advisory — avoid contact' };
    case 'N/A':   return undefined;
    default:      return undefined; // Unknown result — drop rather than guess
  }
}

/** "BOLINAS BEACH" → "Bolinas Beach". Marin returns all-caps names but
 *  our spot mappings use title case to read better in code. Splits on
 *  whitespace; preserves trailing punctuation on each word. */
function titleCase(name: string): string {
  return name.toLowerCase().replace(/(^|\s|-)([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

export function parseMarinJson(text: string): LiveBeachReading[] {
  let payload: MarinResponse;
  try {
    payload = JSON.parse(text);
  } catch {
    return [];
  }
  if (payload.error || !payload.features) return [];

  const readings: LiveBeachReading[] = [];
  for (const feat of payload.features) {
    const a = feat.attributes ?? {};
    const name = (a.beach_name ?? '').trim();
    if (!name) continue;
    const mapped = resultToStatus(a.inspection_result);
    if (!mapped) continue;
    const ts = a.inspection_week_date;
    const sampleDate = typeof ts === 'number' && Number.isFinite(ts)
      ? new Date(ts).toISOString().slice(0, 10)
      : '';
    readings.push({
      beachName: titleCase(name),
      sampleDate,
      status: mapped.status,
      rawStatus: mapped.raw,
      source: 'Marin County Env. Health',
    });
  }
  return readings;
}
