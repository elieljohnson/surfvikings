// San Mateo County beach water quality — Google MyMaps KML scrape.
//
// SM publishes status (Posted / Not Posted / Not Sampled) via a Google
// MyMaps document. Per-station sample dates and counts live in a separate
// Google Drive folder of CSVs (not scraped here — see note below).
//
// KML status is encoded as a hex color baked into the icon-style href:
//   highlight=ff000000,0F9D58   → Not Posted (open / clean)
//   highlight=ff000000,A52714   → Posted    (advisory sign up → caution)
//   highlight=ff000000,757575   → Not Sampled (skip — no signal)
//   highlight=ff000000,FFA500   → Not Sampled, Posted (per legend → caution)
//
// "Posted" maps to our 'caution' tier — surfers can still enter the water
// at their own risk; it's an advisory, not a physical closure. This keeps
// the SM tier consistent with Sonoma's 'Caution' and SFPUC's s_color='W'.
//
// Sample-date trade-off: KML carries no per-station date, and pulling the
// Drive CSVs would mean 40+ extra fetches per refresh. v1 ships without
// dates — the panel just shows "Source: San Mateo County" with no
// "Tested X days ago" line. Honest about what we have.

import type { LiveBeachReading } from './waterQualityLive';

// Without forcekml=1 this endpoint returns a KMZ (zipped KML), which we'd
// have to unzip server-side. forcekml=1 returns raw XML — fits naturally
// into the per-county scraper pattern.
const KML_URL =
  'https://www.google.com/maps/d/u/0/kml?mid=1Y0U-5M0-ej_PnH8i1mJYFaXBlok-8fE&forcekml=1';

export async function fetchSanMateo(signal?: AbortSignal): Promise<LiveBeachReading[]> {
  try {
    const res = await fetch(KML_URL, { signal });
    if (!res.ok) return [];
    const text = await res.text();
    return parseSanMateoKML(text);
  } catch {
    return [];
  }
}

/** Map an icon hex color to our normalized status tier. */
function colorToStatus(hex: string): { status: LiveBeachReading['status']; raw: string } | undefined {
  const h = hex.toUpperCase();
  if (h === '0F9D58') return { status: 'open',    raw: 'No advisory posted' };
  if (h === 'A52714') return { status: 'caution', raw: 'Water quality advisory posted' };
  if (h === 'FFA500') return { status: 'caution', raw: 'Water quality advisory posted (last sample missed)' };
  // 757575 (gray / Not Sampled) and anything unknown — drop the reading,
  // we'd rather hide than guess.
  return undefined;
}

export function parseSanMateoKML(kml: string): LiveBeachReading[] {
  // Two paths to the color, primary first:
  //   1. styleUrl name embeds it — Google MyMaps names styles like
  //      `icon-1701-0F9D58-labelson-nodesc`, so the hex is just there.
  //   2. Top-level <Style id="..."><IconStyle><color>AABBGGRR</color>…,
  //      which is KML's reversed-RGB convention (alpha+B+G+R).
  // Path 1 alone is sufficient for the live feed; path 2 is the safety
  // net for future MyMaps style changes and for the test fixture.
  const styleColor: Record<string, string> = {};
  const styleRe = /<Style\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/Style>/g;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRe.exec(kml)) !== null) {
    const id = styleMatch[1];
    const body = styleMatch[2];
    // Try the styleUrl naming convention first (path 1 stored against id)
    const idHex = id.match(/-([A-Fa-f0-9]{6})(?:-|$)/);
    if (idHex) { styleColor[id] = idHex[1]; continue; }
    // <color>AABBGGRR</color> — reverse the RGB
    const colorTag = body.match(/<color>([A-Fa-f0-9]{8})<\/color>/);
    if (colorTag) {
      const c = colorTag[1];
      styleColor[id] = (c.slice(6, 8) + c.slice(4, 6) + c.slice(2, 4)).toUpperCase();
      continue;
    }
    // Last-resort: explicit highlight= URL parameter (legacy format)
    const hrefMatch = body.match(/<href>([\s\S]*?)<\/href>/);
    if (hrefMatch) {
      const hexMatch = hrefMatch[1].match(/highlight=[A-Fa-f0-9]{6,8},([A-Fa-f0-9]{6})/);
      if (hexMatch) styleColor[id] = hexMatch[1];
    }
  }

  const readings: LiveBeachReading[] = [];
  const placemarkRe = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/g;
  let pm: RegExpExecArray | null;
  while ((pm = placemarkRe.exec(kml)) !== null) {
    const body = pm[1];
    const nameMatch = body.match(/<name>([\s\S]*?)<\/name>/);
    if (!nameMatch) continue;
    const name = decodeXml(nameMatch[1]).trim();
    if (!name) continue;

    let color: string | undefined;
    const styleUrlMatch = body.match(/<styleUrl>#?([^<]+)<\/styleUrl>/);
    if (styleUrlMatch) {
      const ref = styleUrlMatch[1].trim();
      // Try direct hex in the styleUrl name (live feed path)
      const direct = ref.match(/-([A-Fa-f0-9]{6})(?:-|$)/);
      if (direct) color = direct[1];
      // Fall back to the style map (test-fixture path)
      else color = styleColor[ref];
    }
    if (!color) continue;

    const mapped = colorToStatus(color);
    if (!mapped) continue;

    readings.push({
      beachName: name,
      sampleDate: '', // KML doesn't carry per-station dates
      status: mapped.status,
      rawStatus: mapped.raw,
      source: 'San Mateo County',
    });
  }
  return readings;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
