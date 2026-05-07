// Free, keyless drive-time data sources.
// - Nominatim (OpenStreetMap) for geocoding home-base text -> coords.
// - OSRM public demo (router.project-osrm.org) for one-shot distance matrix.
//
// Both are public services with fair-use terms. We hit them at most once
// per home-base change (geocode) and once per home-base coord change (matrix).

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface HomeBase extends GeoPoint {
  label: string;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM_TABLE = 'https://router.project-osrm.org/table/v1/driving';

// Geocode a free-text place name. Returns null on failure (network, no
// match, malformed input). Callers should fall back to the cached value
// or the static estimate.
export async function geocode(query: string): Promise<HomeBase | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  try {
    const url = `${NOMINATIM}?q=${encodeURIComponent(trimmed)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!json.length) return null;
    const top = json[0];
    const lat = parseFloat(top.lat);
    const lng = parseFloat(top.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { label: trimmed, lat, lng };
  } catch {
    return null;
  }
}

// One-shot all-from-origin drive-time matrix. Caller passes the origin and
// a list of destinations; we get back a Record<id, minutes> for each
// destination that returned a valid duration. OSRM expects "lng,lat" order
// in the URL — easy to flip backwards, so the helper below normalizes.
export async function driveMatrix(
  origin: GeoPoint,
  destinations: Array<{ id: string; lat: number; lng: number }>,
): Promise<Record<string, number> | null> {
  if (!destinations.length) return {};
  try {
    // Coords are origin first, then each destination, joined by ";".
    const coords = [origin, ...destinations]
      .map((p) => `${p.lng},${p.lat}`)
      .join(';');
    // sources=0 (only the origin), destinations=1..N (all the rest).
    const dests = destinations.map((_, i) => i + 1).join(';');
    const url = `${OSRM_TABLE}/${coords}?sources=0&destinations=${dests}&annotations=duration`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { code: string; durations?: number[][] };
    if (json.code !== 'Ok' || !json.durations || !json.durations[0]) return null;
    const row = json.durations[0]; // seconds, indexed by destination
    const out: Record<string, number> = {};
    destinations.forEach((d, i) => {
      const sec = row[i];
      if (typeof sec === 'number' && Number.isFinite(sec)) {
        out[d.id] = Math.round(sec / 60);
      }
    });
    return out;
  } catch {
    return null;
  }
}
