// Client-side API fetcher for /api/conditions.
// Merges live upstream data with the spot profile + scoring engine.

import {
  SPOTS, Spot, ForecastHour, computeScore, buildTimeline,
} from './data';
import { BUOY_MAP_BY_SPOT } from './buoyMapping';

/** Minimal shape of a buoy observation the timeline builder needs. Subset
 *  of ConditionsResponse['buoys'][string] — kept narrow so tests can pass
 *  fixtures without filling in every field. */
interface BuoyForOverride {
  status: 'online' | 'offline' | 'stale';
  swellTrains?: Array<{ height: number; period: number; direction?: number }>;
}

/** Pick the dominant swell train by energy-flux proxy (H²·T). Standard
 *  surf-forecast convention — matches what NDBC and LOTUS use to call
 *  "primary swell" out of a multi-modal spectrum. H²T is proportional to
 *  the full wave-power formula P = ρg²H²T / (64π) so the ranking is
 *  identical without dragging the constants around.
 *  Returns `undefined` for empty/missing input so callers can fall back. */
export function pickDominantPeak<T extends { height: number; period: number; direction?: number }>(
  trains: T[] | undefined,
): T | undefined {
  if (!trains || trains.length === 0) return undefined;
  let best = trains[0];
  let bestScore = best.height * best.height * best.period;
  for (let i = 1; i < trains.length; i++) {
    const t = trains[i];
    const s = t.height * t.height * t.period;
    if (s > bestScore) { best = t; bestScore = s; }
  }
  return bestScore > 0 ? best : undefined;
}

export interface MergedHourWire {
  t: number;
  swellHeight: number;        // primary groundswell only
  swellPeriod: number;
  swellDirection: number;
  windWaveHeight: number;     // local wind-generated, separate from groundswell
  windWavePeriod: number;
  windWaveDirection: number;
  combinedHeight: number;     // groundswell + wind wave + chop total
  combinedPeriod: number;
  combinedDirection: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  cloudcover: number;          // % 0-100
  precipitation: number;       // mm/h
  precipitationProb: number;   // % 0-100
  tideHeight: number;
  tideRising: boolean;
}

export interface ConditionsResponse {
  updatedAt: number;
  spots: Record<string, MergedHourWire[]>;
  /** Per-spot summary fields (recent rain total for water-quality gating). */
  spotMeta?: Record<string, { recentRainMm: number }>;
  buoys: Record<string, {
    buoyId: string;
    timestamp: number;
    waveHeight?: number;
    dominantPeriod?: number;
    meanWaveDir?: number;
    windDir?: number;
    windSpeed?: number;
    windGust?: number;
    waterTempF?: number;
    airTempF?: number;
    /** Multi-train decomposition from NDBC .data_spec — longest period first.
     *  direction is deg "FROM" (when .swdir is available for that buoy). */
    swellTrains?: Array<{ height: number; period: number; direction?: number }>;
    /** Wave energy flux in kW per meter of wave crest, from .data_spec. */
    energyKwPerM?: number;
    status: 'online' | 'offline' | 'stale';
  }>;
  tides: Record<string, { stationId: string; samples: Array<{ t: number; v: number }> }>;
  /** NWS Coastal Waters Forecast text periods, keyed by zone (PZZ545 etc.). */
  nwsForecasts: Record<string, {
    zone: string;
    description: string;
    issuedAt: number;
    advisories: string[];
    periods: Array<{ name: string; text: string }>;
  }>;
  /** Live water-quality readings keyed by source-side beach name.
   *  Client looks up by waterQuality info's liveBeachName. */
  waterQuality?: Record<string, {
    beachName: string;
    sampleDate: string;
    status: 'open' | 'caution' | 'closed';
    rawStatus: string;
    source: string;
  }>;
  meta: { source: 'live' | 'partial'; errors?: string[] };
}

export async function fetchConditions(spotIds: string[], signal?: AbortSignal): Promise<ConditionsResponse> {
  const qs = new URLSearchParams({ spots: spotIds.join(',') });
  const res = await fetch(`/api/conditions?${qs}`, { signal });
  if (!res.ok) throw new Error(`conditions: ${res.status}`);
  return res.json();
}

// Convert an API payload for one spot into the ForecastHour[] the UI expects,
// running each hour through the PRD scoring engine. `startIdx` aligns hour 0
// to "now" (first hour >= Date.now()).
export function hoursToTimeline(
  spot: Spot,
  wire: MergedHourWire[],
  hoursWanted = 168,
  buoy?: BuoyForOverride,
): ForecastHour[] {
  if (!wire.length) return buildTimeline(spot, hoursWanted);
  const now = Date.now();
  let startIdx = wire.findIndex((h) => h.t >= now);
  if (startIdx < 0) startIdx = 0;
  const slice = wire.slice(startIdx, startIdx + hoursWanted);
  if (slice.length < hoursWanted) {
    // Pad with mock if upstream gave us less than 48h
    const mock = buildTimeline(spot, hoursWanted);
    while (slice.length < hoursWanted) slice.push(wireFromMock(mock[slice.length]));
  }
  // Open-Meteo returns open-ocean wave height at the spot's lat/lng. Each spot
  // has a shadowFactor (0-1) describing how much of that open-ocean energy
  // actually reaches the break after coastal sheltering — Bolinas sits at
  // ~0.45-0.55 because Duxbury Reef filters incoming swell. Multiply once
  // here so both scoring and display use the realistic at-the-break height.
  const shadow = spot.shadowFactor ?? 1.0;
  // Hour-0 override: Open-Meteo's `swell_wave_period` collapses multi-modal
  // seas into a single number that can land closer to the windswell than the
  // groundswell (Bolinas 2026-05-19: buoy showed 14.7s @ 3.8ft groundswell
  // but Open-Meteo reported 7s). When the spot has a mapped buoy and the
  // observation is live (not stale), prefer the dominant spectral peak for
  // hour 0's period + direction inputs. Height stays from Open-Meteo because
  // shadowFactor already handles at-the-break conversion; the buoy's raw
  // spectral height is open-ocean and would double-discount.
  const peak = buoy?.status === 'online' ? pickDominantPeak(buoy.swellTrains) : undefined;
  return slice.map((h, i) => {
    const swellHeight = h.swellHeight * shadow;
    const overridePeriod = i === 0 && peak ? peak.period : h.swellPeriod;
    const overrideDirection = i === 0 && peak && typeof peak.direction === 'number'
      ? peak.direction
      : h.swellDirection;
    const score = computeScore(spot, {
      swellHeight,
      swellPeriod: overridePeriod,
      swellDirection: overrideDirection,
      windWaveHeight: h.windWaveHeight,
      windSpeed: h.windSpeed,
      windDirection: h.windDirection,
      tideHeight: h.tideHeight,
      tideRising: h.tideRising,
    });
    return {
      hour: i,
      swellHeight,
      swellPeriod: overridePeriod,
      swellDirection: overrideDirection,
      windWaveHeight: h.windWaveHeight,
      windWavePeriod: h.windWavePeriod,
      windWaveDirection: h.windWaveDirection,
      combinedHeight: h.combinedHeight,
      combinedPeriod: h.combinedPeriod,
      combinedDirection: h.combinedDirection,
      windSpeed: h.windSpeed,
      windDirection: h.windDirection,
      windGust: h.windGust,
      cloudcover: h.cloudcover,
      precipitation: h.precipitation,
      precipitationProb: h.precipitationProb,
      tideHeight: h.tideHeight,
      tideRising: h.tideRising,
      score,
    };
  });
}

function wireFromMock(f: ForecastHour): MergedHourWire {
  return {
    t: Date.now() + f.hour * 3600_000,
    swellHeight: f.swellHeight,
    swellPeriod: f.swellPeriod,
    swellDirection: f.swellDirection,
    windWaveHeight: f.windWaveHeight,
    windWavePeriod: f.windWavePeriod,
    windWaveDirection: f.windWaveDirection,
    combinedHeight: f.combinedHeight,
    combinedPeriod: f.combinedPeriod,
    combinedDirection: f.combinedDirection,
    windSpeed: f.windSpeed,
    windDirection: f.windDirection,
    windGust: f.windGust,
    cloudcover: f.cloudcover,
    precipitation: f.precipitation,
    precipitationProb: f.precipitationProb,
    tideHeight: f.tideHeight,
    tideRising: f.tideRising,
  };
}

export function timelinesFromResponse(
  spotIds: string[],
  res: ConditionsResponse | null,
): Record<string, ForecastHour[]> {
  const out: Record<string, ForecastHour[]> = {};
  for (const id of spotIds) {
    const spot = SPOTS.find((s) => s.id === id);
    if (!spot) continue;
    const wire = res?.spots?.[id] ?? [];
    // Look up the spot's mapped buoy (already-fetched observation in the same
    // response). Used to override hour-0 swell period/direction with the live
    // spectral peak — see hoursToTimeline for the rationale.
    const buoyId = BUOY_MAP_BY_SPOT[id]?.primaryBuoy;
    const buoy = buoyId ? res?.buoys?.[buoyId] : undefined;
    out[id] = wire.length ? hoursToTimeline(spot, wire, 168, buoy) : buildTimeline(spot, 168);
  }
  return out;
}
