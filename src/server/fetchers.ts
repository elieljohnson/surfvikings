// Upstream fetchers: NOAA NDBC buoys, Open-Meteo Marine + Weather, NOAA CO-OPS tides.
// Pure async functions — no framework. Normalize units here (meters → ft, m/s → kts).

import { BUOY_MAP_BY_SPOT } from '../lib/buoyMapping';
import { SPOTS, type Spot } from '../lib/data';

export const M_TO_FT = 3.28084;
export const MS_TO_KTS = 1.94384;

/** One swell partition extracted from the NDBC directional spectrum.
 *  Multiple trains can coexist (e.g. 1.7ft @ 17s SW groundswell + 4ft @ 7s WNW
 *  windswell at the same buoy at the same moment). Trains are sorted longest
 *  period first so trains[0] is the cleanest groundswell. */
export interface SwellTrain {
  height: number;     // ft (Hs computed from spectral variance in this band)
  period: number;     // s (1 / peak frequency)
  direction?: number; // deg "FROM" (when .swdir is available — alpha1 at peak bin)
}

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
  /** Multi-train decomposition from .data_spec, if available. */
  swellTrains?: SwellTrain[];
  /** Wave energy flux (kW per meter of wave crest), if .data_spec available. */
  energyKwPerM?: number;
  status: 'online' | 'offline' | 'stale';
}

export interface TidePrediction {
  stationId: string;
  samples: Array<{ t: number; v: number }>; // t = epoch ms, v = feet MLLW
}

export interface MarineHour {
  t: number;                // epoch ms
  swellHeight: number;      // ft (primary groundswell only)
  swellPeriod: number;      // s
  swellDirection: number;   // deg
  windWaveHeight: number;   // ft (local wind-generated, separate from groundswell)
  windWavePeriod: number;   // s
  windWaveDirection: number;// deg
  combinedHeight: number;   // ft (groundswell + wind wave + chop, total sea state)
  combinedPeriod: number;   // s
  combinedDirection: number;// deg
  windSpeed: number;        // kts
  windDirection: number;    // deg
  windGust: number;         // kts
  cloudcover: number;       // % (0-100)
  precipitation: number;    // mm/h
  precipitationProb: number;// % (0-100)
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
// NOAA NDBC Spectral Wave Density — full energy spectrum decomposed into
// distinct swell trains. Lets us see e.g. 1.7ft 17s SW groundswell hiding
// under a bigger 4ft 7s WNW windswell. The .txt file's "dominant period"
// only reports the single highest-energy bin; .data_spec reports all 47.
//
// Format (per https://www.ndbc.noaa.gov/measdes.shtml):
//   #YY MM DD hh mm Sep_Freq spec_1 (freq_1) spec_2 (freq_2) ...
//   2026 05 11 16 50  .203  0.05 (.0325) 0.10 (.0375) ...
// Frequencies span 0.0325 Hz (30.8s period) to 0.485 Hz (2.06s). Energy is
// in m²/Hz (variance spectral density).
// ───────────────────────────────────────────────────────────────────────────

export interface SpectralObservation {
  buoyId: string;
  timestamp: number;
  trains: SwellTrain[];
  /** Wave energy flux density in kW per meter of wave crest:
   *  P = ρ·g²·Hs²·Tₑ / (64π). Surfers read this as "how much water is moving"
   *  — a single relative magnitude across all swell trains combined. */
  energyKwPerM?: number;
  status: 'online' | 'offline' | 'stale';
}

export async function fetchSpectral(buoyId: string, signal?: AbortSignal): Promise<SpectralObservation> {
  const specUrl = `https://www.ndbc.noaa.gov/data/realtime2/${buoyId}.data_spec`;
  const dirUrl = `https://www.ndbc.noaa.gov/data/realtime2/${buoyId}.swdir`;
  try {
    // Both files run in parallel. .swdir frequently lags or is missing on
    // smaller buoys — that's fine, we degrade to direction-less trains.
    const [specRes, dirRes] = await Promise.all([
      fetch(specUrl, { signal }),
      fetch(dirUrl, { signal }).catch(() => null),
    ]);
    if (!specRes.ok) return { buoyId, timestamp: Date.now(), trains: [], status: 'offline' };
    const specText = await specRes.text();
    const dirText = dirRes && dirRes.ok ? await dirRes.text() : '';
    return parseSpectral(buoyId, specText, dirText);
  } catch {
    return { buoyId, timestamp: Date.now(), trains: [], status: 'offline' };
  }
}

export function parseSpectral(
  buoyId: string,
  specText: string,
  dirText = '',
): SpectralObservation {
  const lines = specText.split('\n').filter((l) => l && !l.startsWith('#'));
  if (!lines.length) return { buoyId, timestamp: Date.now(), trains: [], status: 'offline' };

  // Most recent observation is the first non-header line
  const line = lines[0].trim();
  const tokens = line.split(/\s+/);
  // [0..4] YY MM DD hh mm · [5] Sep_Freq · then alternating energy / (freq)
  const [yy, mm, dd, hh, mi] = tokens.slice(0, 5).map(Number);
  const timestamp = Date.UTC(yy, mm - 1, dd, hh, mi);
  const now = Date.now();
  const status: SpectralObservation['status'] =
    now - timestamp > 3 * 3600e3 ? 'stale' : 'online';

  // Parse energy/freq pairs starting at index 6
  const bins: Array<{ freq: number; energy: number; direction?: number }> = [];
  for (let i = 6; i + 1 < tokens.length; i += 2) {
    const energy = parseFloat(tokens[i]);
    const freqStr = tokens[i + 1].replace(/[()]/g, '');
    const freq = parseFloat(freqStr);
    if (Number.isFinite(energy) && Number.isFinite(freq) && energy >= 0) {
      bins.push({ freq, energy });
    }
  }

  // Optional .swdir overlay — alpha1 mean direction at each frequency bin.
  // Same row format as .data_spec but values are degrees instead of energy.
  if (dirText) {
    const dirLines = dirText.split('\n').filter((l) => l && !l.startsWith('#'));
    if (dirLines.length) {
      const dirTokens = dirLines[0].trim().split(/\s+/);
      const dirByFreq = new Map<number, number>();
      for (let i = 6; i + 1 < dirTokens.length; i += 2) {
        const dir = parseFloat(dirTokens[i]);
        const freq = parseFloat(dirTokens[i + 1].replace(/[()]/g, ''));
        if (Number.isFinite(dir) && Number.isFinite(freq) && dir >= 0 && dir <= 360) {
          dirByFreq.set(freq, dir);
        }
      }
      for (const b of bins) {
        const d = dirByFreq.get(b.freq);
        if (typeof d === 'number') b.direction = d;
      }
    }
  }

  const trains = decomposeSwellTrains(bins);
  const energyKwPerM = computeWaveEnergyFlux(bins);
  return { buoyId, timestamp, trains, energyKwPerM, status };
}

/** Wave energy flux density (kW per meter of wave crest) from spectral
 *  variance. Standard oceanographic formula:
 *     P = ρ·g²·m₀·Tₑ / (16π)
 *  where m₀ = ∫S(f)df is total variance and Tₑ = m_{-1}/m₀ is the energy
 *  period. Surfers see this as a single "how much water is moving" number
 *  across all swell trains combined.
 *  Result is in kW/m (divide W/m by 1000). */
function computeWaveEnergyFlux(
  bins: Array<{ freq: number; energy: number }>,
): number | undefined {
  if (bins.length < 5) return undefined;
  const sorted = [...bins].sort((a, b) => a.freq - b.freq);
  let m0 = 0;      // total variance (m²)
  let mNeg1 = 0;   // first negative moment (used to compute Tₑ)
  for (let i = 0; i < sorted.length; i++) {
    const dF =
      i === sorted.length - 1
        ? sorted[i].freq - sorted[i - 1].freq
        : i === 0
          ? sorted[i + 1].freq - sorted[i].freq
          : (sorted[i + 1].freq - sorted[i - 1].freq) / 2;
    const e = sorted[i].energy * Math.abs(dF);
    m0 += e;
    if (sorted[i].freq > 0) mNeg1 += e / sorted[i].freq;
  }
  if (m0 <= 0) return undefined;
  const Te = mNeg1 / m0;                      // energy period (s)
  const RHO = 1025;                            // seawater density kg/m³
  const G = 9.81;                              // gravity m/s²
  const P_w_per_m = (RHO * G * G * m0 * Te) / (16 * Math.PI);
  return P_w_per_m / 1000;                    // kW/m
}

/** Peak-finding decomposition: locate local maxima in the smoothed spectrum,
 *  integrate variance in a ±2-bin window around each, convert to Hs = 4·√σ². */
function decomposeSwellTrains(
  bins: Array<{ freq: number; energy: number; direction?: number }>,
): SwellTrain[] {
  if (bins.length < 5) return [];
  // Sort by frequency ascending (period descending — long swell first)
  bins.sort((a, b) => a.freq - b.freq);

  // 3-point moving average smoothing — suppresses single-bin noise while
  // keeping real peaks intact.
  const smoothed = bins.map((b, i) => {
    if (i === 0 || i === bins.length - 1) return b.energy;
    return (bins[i - 1].energy + b.energy * 2 + bins[i + 1].energy) / 4;
  });

  // Local-max detection. Threshold is tiny (1e-4 m²/Hz) just to filter the
  // flat tail; Hs filter below culls anything not surfable.
  const peaks: number[] = [];
  for (let i = 1; i < smoothed.length - 1; i++) {
    if (
      smoothed[i] > smoothed[i - 1] &&
      smoothed[i] > smoothed[i + 1] &&
      smoothed[i] > 1e-4
    ) {
      peaks.push(i);
    }
  }

  // For each peak, integrate variance in ±2-bin window:
  //   variance ≈ Σ E(f) · Δf
  //   Hs (m)   = 4·√variance
  const trains: SwellTrain[] = [];
  for (const peakIdx of peaks) {
    let totalVar = 0;
    const start = Math.max(0, peakIdx - 2);
    const end = Math.min(bins.length - 1, peakIdx + 2);
    for (let j = start; j <= end; j++) {
      const dF =
        j === bins.length - 1
          ? bins[j].freq - bins[j - 1].freq
          : j === 0
            ? bins[j + 1].freq - bins[j].freq
            : (bins[j + 1].freq - bins[j - 1].freq) / 2;
      totalVar += smoothed[j] * Math.abs(dF);
    }
    const hsM = 4 * Math.sqrt(Math.max(0, totalVar));
    const hsFt = hsM * M_TO_FT;
    const period = 1 / bins[peakIdx].freq;
    const direction = bins[peakIdx].direction;
    if (hsFt > 0.3) trains.push({ height: hsFt, period, direction });
  }

  // Longest-period first (primary groundswell at trains[0])
  trains.sort((a, b) => b.period - a.period);
  return trains.slice(0, 4);
}

// ───────────────────────────────────────────────────────────────────────────
// NOAA NWS Coastal Waters Forecast (CWF) — marine narrative text.
//
// The standard /zones/forecast endpoint explicitly does not support marine
// zones (returns MarineForecastNotSupported). The CWF text product is the
// closest replacement — issued ~4×/day by the local NWS office, contains
// per-zone period sections like:
//
//   .TODAY...NW wind 20 to 25 kt. Seas 7 to 9 ft.
//   Wave Detail: NW 9 ft at 9 seconds and S 2 ft at 16 seconds.
//
// Two-step fetch: GET the index, take the latest ID, GET the product text.
// Office MTR covers Pt Arena south to Pt Piedras Blancas — all our zones.
// ───────────────────────────────────────────────────────────────────────────

export interface NwsPeriod {
  name: string;       // e.g. 'Today', 'Tonight', 'Tuesday'
  text: string;       // forecaster narrative for the period
}

export interface NwsZoneForecast {
  zone: string;       // e.g. 'PZZ545'
  description: string;// e.g. 'Waters from Pt Arena to Pt Reyes 10-60 NM'
  issuedAt: number;   // epoch ms of product issuance
  advisories: string[]; // any ...ADVISORY... lines for this zone
  periods: NwsPeriod[];
}

const USER_AGENT = 'SurfVikings/1.0 (eliel.johnson@gmail.com)';

export async function fetchNwsCwf(office = 'MTR', signal?: AbortSignal): Promise<Record<string, NwsZoneForecast>> {
  try {
    const idxRes = await fetch(
      `https://api.weather.gov/products/types/CWF/locations/${office}`,
      { signal, headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' } },
    );
    if (!idxRes.ok) return {};
    const idx = (await idxRes.json()) as { '@graph'?: Array<{ id: string; issuanceTime: string }> };
    const latest = idx['@graph']?.[0];
    if (!latest) return {};
    const prodRes = await fetch(`https://api.weather.gov/products/${latest.id}`, {
      signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
    });
    if (!prodRes.ok) return {};
    const prod = (await prodRes.json()) as { productText?: string; issuanceTime?: string };
    if (!prod.productText) return {};
    return parseCwf(prod.productText, Date.parse(prod.issuanceTime ?? latest.issuanceTime));
  } catch {
    return {};
  }
}

/** Parse a Coastal Waters Forecast text bulletin into per-zone period maps.
 *  The text format is well-defined and stable: zone blocks separated by `$$`,
 *  periods within a zone starting with `.NAME...text...` (continuation lines
 *  belong to the previous period until the next `.NAME...` or `$$`). */
export function parseCwf(text: string, issuedAt: number): Record<string, NwsZoneForecast> {
  const out: Record<string, NwsZoneForecast> = {};
  // Split on $$ separators to get one block per zone.
  const blocks = text.split(/\n\$\$\n?/);
  for (const block of blocks) {
    // Zone header looks like: PZZ545-120430- (zone code with VTEC time suffix)
    const zoneMatch = block.match(/\n(PZZ\d{3})-\d{6}-\n([^\n]+?)-?\n/);
    if (!zoneMatch) continue;
    const zone = zoneMatch[1];
    const description = zoneMatch[2].trim();
    // Slice from after the zone header to extract the body.
    const body = block.slice(block.indexOf(zoneMatch[0]) + zoneMatch[0].length);

    // Advisory lines look like: ...SMALL CRAFT ADVISORY IN EFFECT...
    const advisories: string[] = [];
    for (const advMatch of body.matchAll(/^\.\.\.([^.\n]+(?:\.[^.\n]+)*)\.\.\.$/gm)) {
      advisories.push(advMatch[1].trim());
    }

    // Periods: `.NAME...content` running until next `.NAME...` or end-of-block.
    const periods: NwsPeriod[] = [];
    const periodRe = /\n\.([A-Z][A-Z .]+?)\.\.\.([\s\S]*?)(?=\n\.[A-Z][A-Z .]+?\.\.\.|\n\.\.\.|$)/g;
    for (const m of body.matchAll(periodRe)) {
      const name = m[1].trim().replace(/\s+/g, ' ');
      // Skip section headers like ".SYNOPSIS" which use the same syntax
      // but aren't day-period forecasts.
      if (/^(SYNOPSIS|FORECAST|SEAS|SURF)$/.test(name)) continue;
      const periodText = m[2]
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (periodText) periods.push({ name: toTitleCase(name), text: periodText });
    }

    out[zone] = { zone, description, issuedAt, advisories, periods };
  }
  return out;
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
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
    swell_wave_height?: number[];      // m — primary groundswell only
    swell_wave_period?: number[];      // s
    swell_wave_direction?: number[];   // deg
    wind_wave_height?: number[];       // m — local wind-generated only
    wind_wave_period?: number[];       // s
    wind_wave_direction?: number[];    // deg
    wave_height?: number[];            // m — combined sea state (groundswell + wind wave)
    wave_period?: number[];            // s
    wave_direction?: number[];         // deg
  };
}

interface OpenMeteoWeatherResponse {
  latitude: number | number[];
  longitude: number | number[];
  hourly: {
    time: string[];
    wind_speed_10m?: number[];          // kn (when unit=kn)
    wind_direction_10m?: number[];      // deg
    wind_gusts_10m?: number[];          // kn
    cloudcover?: number[];              // %, 0-100
    precipitation?: number[];           // mm/h
    precipitation_probability?: number[]; // %, 0-100
  };
}

export interface SpotMarine {
  spotId: string;
  hours: MarineHour[];
}

export async function fetchMarineBatch(spots: Spot[], forecastDays = 7, signal?: AbortSignal): Promise<SpotMarine[]> {
  if (!spots.length) return [];
  const lats = spots.map((s) => s.lat).join(',');
  const lngs = spots.map((s) => s.lng).join(',');

  const marineParams = new URLSearchParams({
    latitude: lats,
    longitude: lngs,
    hourly: 'swell_wave_height,swell_wave_period,swell_wave_direction,wind_wave_height,wind_wave_period,wind_wave_direction,wave_height,wave_period,wave_direction',
    forecast_days: String(forecastDays),
    length_unit: 'metric',
    timeformat: 'unixtime',
  });
  const weatherParams = new URLSearchParams({
    latitude: lats,
    longitude: lngs,
    hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloudcover,precipitation,precipitation_probability',
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
      // Primary groundswell — falls back to combined if Open-Meteo doesn't
      // decompose for this lat/lng (rare; the fallback preserves prior behavior
      // rather than zeroing out).
      const swellM = mh?.swell_wave_height?.[h] ?? mh?.wave_height?.[h] ?? 0;
      const swellP = mh?.swell_wave_period?.[h] ?? mh?.wave_period?.[h] ?? 0;
      const swellD = mh?.swell_wave_direction?.[h] ?? mh?.wave_direction?.[h] ?? 0;
      // Local wind wave — separate signal, no fallback (0 means no chop, not missing data)
      const windWaveM = mh?.wind_wave_height?.[h] ?? 0;
      const windWaveP = mh?.wind_wave_period?.[h] ?? 0;
      const windWaveD = mh?.wind_wave_direction?.[h] ?? 0;
      // Combined sea state (groundswell + wind wave) — the "5ft of mess" total
      const combinedM = mh?.wave_height?.[h] ?? swellM;
      const combinedP = mh?.wave_period?.[h] ?? swellP;
      const combinedD = mh?.wave_direction?.[h] ?? swellD;
      const windS = wh?.wind_speed_10m?.[h] ?? 0;
      const windD = wh?.wind_direction_10m?.[h] ?? 0;
      const windG = wh?.wind_gusts_10m?.[h] ?? windS;
      const cloud = wh?.cloudcover?.[h] ?? 0;
      const precip = wh?.precipitation?.[h] ?? 0;
      const precipProb = wh?.precipitation_probability?.[h] ?? 0;
      return {
        t,
        swellHeight: (swellM || 0) * M_TO_FT,
        swellPeriod: swellP || 0,
        swellDirection: swellD || 0,
        windWaveHeight: (windWaveM || 0) * M_TO_FT,
        windWavePeriod: windWaveP || 0,
        windWaveDirection: windWaveD || 0,
        combinedHeight: (combinedM || 0) * M_TO_FT,
        combinedPeriod: combinedP || 0,
        combinedDirection: combinedD || 0,
        windSpeed: windS || 0,
        windDirection: windD || 0,
        windGust: windG || 0,
        cloudcover: cloud,
        precipitation: precip,
        precipitationProb: precipProb,
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
  /** NWS Coastal Waters Forecast periods, keyed by zone (PZZ540 etc.). */
  nwsForecasts: Record<string, NwsZoneForecast>;
  meta: { source: 'live' | 'partial'; errors?: string[] };
}

export async function buildConditions(spotIds: string[], signal?: AbortSignal): Promise<ConditionsPayload> {
  const spots = spotIds.map((id) => SPOTS.find((s) => s.id === id)).filter(Boolean) as Spot[];
  const buoyIds = Array.from(new Set(spots.map((s) => BUOY_MAP_BY_SPOT[s.id]?.primaryBuoy).filter(Boolean)));
  const tideIds = Array.from(new Set(spots.map((s) => BUOY_MAP_BY_SPOT[s.id]?.tideStation).filter(Boolean)));

  const errors: string[] = [];
  const [buoyList, spectralList, tideList, marineList, nwsForecasts] = await Promise.all([
    Promise.all(buoyIds.map((id) => fetchBuoy(id, signal))),
    Promise.all(buoyIds.map((id) => fetchSpectral(id, signal))),
    // Tides extend ~7d/168h to cover the marine forecast horizon.
    Promise.all(tideIds.map((id) => fetchTides(id, 168, signal))),
    fetchMarineBatch(spots, 7, signal).catch((e) => {
      errors.push(`openmeteo: ${e.message ?? e}`);
      return [] as SpotMarine[];
    }),
    // NWS Coastal Waters Forecast — all our zones are MTR office.
    fetchNwsCwf('MTR', signal).catch((e) => {
      errors.push(`nws: ${e.message ?? e}`);
      return {} as Record<string, NwsZoneForecast>;
    }),
  ]);

  // Merge spectral observations (trains + energy) into each buoy
  const spectralByBuoy: Record<string, SpectralObservation> = Object.fromEntries(
    spectralList.map((s) => [s.buoyId, s]),
  );
  const buoys: Record<string, BuoyObservation> = Object.fromEntries(
    buoyList.map((b) => {
      const spec = spectralByBuoy[b.buoyId];
      return [b.buoyId, { ...b, swellTrains: spec?.trains, energyKwPerM: spec?.energyKwPerM }];
    }),
  );
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
    nwsForecasts,
    meta: { source: errors.length ? 'partial' : 'live', errors: errors.length ? errors : undefined },
  };
}
