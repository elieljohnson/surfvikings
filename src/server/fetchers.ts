// Upstream fetchers: NOAA NDBC buoys, Open-Meteo Marine + Weather, NOAA CO-OPS tides.
// Pure async functions — no framework. Normalize units here (meters → ft, m/s → kts).

import { BUOY_MAP_BY_SPOT } from '../lib/buoyMapping';
import { SPOTS, type Spot } from '../lib/data';

export const M_TO_FT = 3.28084;
export const MS_TO_KTS = 1.94384;

export interface BuoyObservation {
  buoyId: string;
  timestamp: number;
  waveHeight?: number;       // ft
  dominantPeriod?: number;   // s
  averagePeriod?: number;    // s
  meanWaveDir?: number;      // deg
  windDir?: number;          // deg
  windSpeed?: number;        // kts
  windGust?: number;         // kts
  airTempF?: number;
  waterTempF?: number;
  status: 'online' | 'offline' | 'stale';
}

export interface TidePrediction {
  stationId: string;
  samples: Array<{ t: number; v: number }>; // t = epoch ms, v = feet MLLW
}

export interface MarineHour {
  t: number;                // epoch ms
  swellHeight: number;      // ft (primary swell)
  swellPeriod: number;      // s
  swellDirection: number;   // deg
  windSpeed: number;        // kts
  windDirection: number;    // deg
  windGust: number;         // kts
}

// ───────────────────────────────────────────────────────────────────────────
// NOAA NDBC Standard Meteorological
// https://www.ndbc.noaa.gov/data/realtime2/<id>.txt
// Columns (fixed): #YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
// "MM" = missing data.
// ───────────────────────────────────────────────────────────────────────────
export async function fetchBuoy(buoyId: string, signal?: AbortSignal): Promise<BuoyObservation> {
  const url = `https://www.ndbc.noaa.gov/data/realtime2/${buoyId}.txt`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return { buoyId, timestamp: Date.now(), status: 'offline' };
    const text = await res.text();
    return parseBuoy(buoyId, text);
  } catch {
    return { buoyId, timestamp: Date.now(), status: 'offline' };
  }
}

export function parseBuoy(buoyId: string, text: string): BuoyObservation {
  const lines = text.split('\n').filter((l) => l && !l.startsWith('#'));
  if (!lines.length) return { buoyId, timestamp: Date.now(), status: 'offline' };
  const cols = lines[0].trim().split(/\s+/);
  // [0..4] YY MM DD hh mm · [5] WDIR · [6] WSPD m/s · [7] GST · [8] WVHT m · [9] DPD · [10] APD · [11] MWD · …
  const num = (i: number): number | undefined => {
    const v = cols[i];
    if (!v || v === 'MM' || v === 'MMM') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const [yy, mm, dd, hh, mi] = cols.slice(0, 5).map(Number);
  const timestamp = Date.UTC(yy, mm - 1, dd, hh, mi);
  const now = Date.now();
  const status = now - timestamp > 3 * 3600e3 ? 'stale' : 'online';

  const waveHeightM = num(8);
  const windSpeedMs = num(6);
  const windGustMs = num(7);
  const airTempC = num(13);
  const waterTempC = num(14);

  return {
    buoyId,
    timestamp,
    status,
    waveHeight: waveHeightM !== undefined ? waveHeightM * M_TO_FT : undefined,
    dominantPeriod: num(9),
    averagePeriod: num(10),
    meanWaveDir: num(11),
    windDir: num(5),
    windSpeed: windSpeedMs !== undefined ? windSpeedMs * MS_TO_KTS : undefined,
    windGust: windGustMs !== undefined ? windGustMs * MS_TO_KTS : undefined,
    airTempF: airTempC !== undefined ? airTempC * 9 / 5 + 32 : undefined,
    waterTempF: waterTempC !== undefined ? waterTempC * 9 / 5 + 32 : undefined,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// NOAA CO-OPS tide predictions
// api.tidesandcurrents.noaa.gov/api/prod/datagetter
// ───────────────────────────────────────────────────────────────────────────
export async function fetchTides(stationId: string, hours = 72, signal?: AbortSignal): Promise<TidePrediction> {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const end = new Date(now.getTime() + hours * 3600e3);
  const params = new URLSearchParams({
    product: 'predictions',
    application: 'SurfVikings',
    begin_date: fmt(now),
    end_date: fmt(end),
    datum: 'MLLW',
    station: stationId,
    time_zone: 'lst_ldt',
    units: 'english',
    interval: 'h',
    format: 'json',
  });
  try {
    const res = await fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params}`, { signal });
    if (!res.ok) return { stationId, samples: [] };
    const json = (await res.json()) as { predictions?: Array<{ t: string; v: string }> };
    const samples = (json.predictions ?? []).map((p) => ({
      t: Date.parse(p.t.replace(' ', 'T') + 'Z'),
      v: Number(p.v),
    }));
    return { stationId, samples };
  } catch {
    return { stationId, samples: [] };
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Open-Meteo Marine + Weather — batched across many lat/lon in one call.
// ───────────────────────────────────────────────────────────────────────────
interface OpenMeteoResponse {
  latitude: number | number[];
  longitude: number | number[];
  hourly: {
    time: string[];
    swell_wave_height?: number[];      // m
    swell_wave_period?: number[];      // s
    swell_wave_direction?: number[];   // deg
    wave_height?: number[];            // m
    wave_period?: number[];            // s
    wave_direction?: number[];         // deg
  };
}

interface OpenMeteoWeatherResponse {
  latitude: number | number[];
  longitude: number | number[];
  hourly: {
    time: string[];
    wind_speed_10m?: number[];         // kn (when unit=kn)
    wind_direction_10m?: number[];     // deg
    wind_gusts_10m?: number[];         // kn
  };
}

export interface SpotMarine {
  spotId: string;
  hours: MarineHour[];
}

export async function fetchMarineBatch(spots: Spot[], forecastDays = 3, signal?: AbortSignal): Promise<SpotMarine[]> {
  if (!spots.length) return [];
  const lats = spots.map((s) => s.lat).join(',');
  const lngs = spots.map((s) => s.lng).join(',');

  const marineParams = new URLSearchParams({
    latitude: lats,
    longitude: lngs,
    hourly: 'swell_wave_height,swell_wave_period,swell_wave_direction,wave_height,wave_period,wave_direction',
    forecast_days: String(forecastDays),
    length_unit: 'metric',
    timeformat: 'unixtime',
  });
  const weatherParams = new URLSearchParams({
    latitude: lats,
    longitude: lngs,
    hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    wind_speed_unit: 'kn',
    forecast_days: String(forecastDays),
    timeformat: 'unixtime',
  });

  const [marineResRaw, weatherResRaw] = await Promise.all([
    fetch(`https://marine-api.open-meteo.com/v1/marine?${marineParams}`, { signal }),
    fetch(`https://api.open-meteo.com/v1/forecast?${weatherParams}`, { signal }),
  ]);
  if (!marineResRaw.ok || !weatherResRaw.ok) throw new Error('open-meteo: upstream error');

  const marineRes = await marineResRaw.json();
  const weatherRes = await weatherResRaw.json();

  const marineArr: OpenMeteoResponse[] = Array.isArray(marineRes) ? marineRes : [marineRes];
  const weatherArr: OpenMeteoWeatherResponse[] = Array.isArray(weatherRes) ? weatherRes : [weatherRes];

  return spots.map((spot, i) => {
    const mh = marineArr[i]?.hourly;
    const wh = weatherArr[i]?.hourly;
    const times = mh?.time ?? [];
    const hours: MarineHour[] = times.map((tRaw, h) => {
      const t = Number(tRaw) * 1000;
      const swellM = mh?.swell_wave_height?.[h] ?? mh?.wave_height?.[h] ?? 0;
      const swellP = mh?.swell_wave_period?.[h] ?? mh?.wave_period?.[h] ?? 0;
      const swellD = mh?.swell_wave_direction?.[h] ?? mh?.wave_direction?.[h] ?? 0;
      const windS = wh?.wind_speed_10m?.[h] ?? 0;
      const windD = wh?.wind_direction_10m?.[h] ?? 0;
      const windG = wh?.wind_gusts_10m?.[h] ?? windS;
      return {
        t,
        swellHeight: (swellM || 0) * M_TO_FT,
        swellPeriod: swellP || 0,
        swellDirection: swellD || 0,
        windSpeed: windS || 0,
        windDirection: windD || 0,
        windGust: windG || 0,
      };
    });
    return { spotId: spot.id, hours };
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Merge: combine marine hours with tide predictions per spot.
// ───────────────────────────────────────────────────────────────────────────
export interface MergedHour extends MarineHour {
  tideHeight: number;
  tideRising: boolean;
}

export function mergeTidesIntoMarine(marine: MarineHour[], tide: TidePrediction): MergedHour[] {
  if (!marine.length) return [];
  if (!tide.samples.length) {
    return marine.map((h) => ({ ...h, tideHeight: 2.8, tideRising: true }));
  }
  const s = tide.samples;
  return marine.map((h, i) => {
    // nearest tide sample
    let lo = 0, hi = s.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (s[mid].t < h.t) lo = mid;
      else hi = mid;
    }
    const a = s[lo], b = s[hi];
    const frac = (h.t - a.t) / Math.max(1, b.t - a.t);
    const v = a.v + (b.v - a.v) * Math.max(0, Math.min(1, frac));
    const next = marine[i + 1];
    // tide direction from adjacent predictions
    let rising = b.v >= a.v;
    if (next) {
      const nlo = s.findIndex((x) => x.t >= next.t);
      if (nlo > 0) rising = s[nlo].v >= v;
    }
    return { ...h, tideHeight: v, tideRising: rising };
  });
}

// Main entry — given spot IDs, return everything needed to score.
export interface ConditionsPayload {
  updatedAt: number;
  spots: Record<string, MergedHour[]>;
  buoys: Record<string, BuoyObservation>;
  tides: Record<string, TidePrediction>;
  meta: { source: 'live' | 'partial'; errors?: string[] };
}

export async function buildConditions(spotIds: string[], signal?: AbortSignal): Promise<ConditionsPayload> {
  const spots = spotIds.map((id) => SPOTS.find((s) => s.id === id)).filter(Boolean) as Spot[];
  const buoyIds = Array.from(new Set(spots.map((s) => BUOY_MAP_BY_SPOT[s.id]?.primaryBuoy).filter(Boolean)));
  const tideIds = Array.from(new Set(spots.map((s) => BUOY_MAP_BY_SPOT[s.id]?.tideStation).filter(Boolean)));

  const errors: string[] = [];
  const [buoyList, tideList, marineList] = await Promise.all([
    Promise.all(buoyIds.map((id) => fetchBuoy(id, signal))),
    Promise.all(tideIds.map((id) => fetchTides(id, 72, signal))),
    fetchMarineBatch(spots, 3, signal).catch((e) => {
      errors.push(`openmeteo: ${e.message ?? e}`);
      return [] as SpotMarine[];
    }),
  ]);

  const buoys: Record<string, BuoyObservation> = Object.fromEntries(buoyList.map((b) => [b.buoyId, b]));
  const tides: Record<string, TidePrediction> = Object.fromEntries(tideList.map((t) => [t.stationId, t]));
  const marineByspot: Record<string, MarineHour[]> = Object.fromEntries(marineList.map((m) => [m.spotId, m.hours]));

  const spotData: Record<string, MergedHour[]> = {};
  for (const s of spots) {
    const marine = marineByspot[s.id] ?? [];
    const mapping = BUOY_MAP_BY_SPOT[s.id];
    const tide = tides[mapping?.tideStation] ?? { stationId: '', samples: [] };
    spotData[s.id] = mergeTidesIntoMarine(marine, tide);
  }

  return {
    updatedAt: Date.now(),
    spots: spotData,
    buoys,
    tides,
    meta: { source: errors.length ? 'partial' : 'live', errors: errors.length ? errors : undefined },
  };
}
