// Client-side API fetcher for /api/conditions.
// Merges live upstream data with the spot profile + scoring engine.

import {
  SPOTS, Spot, ForecastHour, computeScore, buildTimeline,
} from './data';

export interface MergedHourWire {
  t: number;
  swellHeight: number;
  swellPeriod: number;
  swellDirection: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  tideHeight: number;
  tideRising: boolean;
}

export interface ConditionsResponse {
  updatedAt: number;
  spots: Record<string, MergedHourWire[]>;
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
    status: 'online' | 'offline' | 'stale';
  }>;
  tides: Record<string, { stationId: string; samples: Array<{ t: number; v: number }> }>;
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
export function hoursToTimeline(spot: Spot, wire: MergedHourWire[], hoursWanted = 48): ForecastHour[] {
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
  return slice.map((h, i) => {
    const score = computeScore(spot, {
      swellHeight: h.swellHeight,
      swellPeriod: h.swellPeriod,
      swellDirection: h.swellDirection,
      windSpeed: h.windSpeed,
      windDirection: h.windDirection,
      tideHeight: h.tideHeight,
      tideRising: h.tideRising,
    });
    return {
      hour: i,
      swellHeight: h.swellHeight,
      swellPeriod: h.swellPeriod,
      swellDirection: h.swellDirection,
      windSpeed: h.windSpeed,
      windDirection: h.windDirection,
      windGust: h.windGust,
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
    windSpeed: f.windSpeed,
    windDirection: f.windDirection,
    windGust: f.windGust,
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
    out[id] = wire.length ? hoursToTimeline(spot, wire, 48) : buildTimeline(spot);
  }
  return out;
}
