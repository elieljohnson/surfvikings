// Labs — Foundation C: the data layer.
//
// Two shapes of data, two sources, per the spec:
//
//  • POINT data — per-spot hourly timelines. The app already owns this:
//    useConditions() hits /api/conditions, scores every hour through
//    computeScore, and hands back ForecastHour[] per spot. The per-spot
//    views (#2, #3, #4, #5, #6) all consume it via useLabsConditions().
//
//  • FIELD data — a grid of wave values over open water. The app has no
//    such thing (/api/conditions is per-spot), so useWaveField() fetches
//    Open-Meteo Marine directly from the browser. Open-Meteo sends CORS
//    headers and needs no key. Only the Flow Map (#1) needs this.
//
// "Field data wants maps; point data wants charts." We never fake one from
// the other.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ForecastHour } from '../lib/data';
import { useConditions } from '../hooks/useConditions';
import { LabsSpot, featuredSpots, FEATURED_SPOT_IDS } from './spots';

// ─────────────────────────────────────────────────────────────────────────
// POINT data — per-spot timelines
// ─────────────────────────────────────────────────────────────────────────

export interface LabsConditions {
  spots: LabsSpot[];
  timelines: Record<string, ForecastHour[]>;
  loading: boolean;
  error: string | null;
  stale: boolean;
  /** ms epoch the cursor maps hour 0 to — the top of the current hour. */
  anchorMs: number;
}

/** Live per-spot timelines for the featured set. Thin wrapper over the
 *  app's own useConditions so Labs and the PWA share one fetch + one cache. */
export function useLabsConditions(): LabsConditions {
  const spots = useMemo(() => featuredSpots(), []);
  const ids = useMemo(() => [...FEATURED_SPOT_IDS], []);
  const { timelines, loading, error, stale } = useConditions(ids);
  const anchorMs = useMemo(() => Math.floor(Date.now() / 3600_000) * 3600_000, []);
  return { spots, timelines, loading, error, stale, anchorMs };
}

// ─────────────────────────────────────────────────────────────────────────
// FIELD data — the wave grid for the Flow Map
// ─────────────────────────────────────────────────────────────────────────

/** The coastal box the Flow Map frames — offshore of Marin → Half Moon Bay.
 *  Mostly open water; the eastern edge clips the coastline and those grid
 *  points come back as no-data, which the sampler handles. */
export const FLOW_BBOX = { west: -123.08, east: -122.46, south: 37.46, north: 38.02 };
const GRID_NX = 12; // longitude columns
const GRID_NY = 10; // latitude rows

export interface WaveCell { height: number; dir: number; period: number }

export interface WaveField {
  bbox: typeof FLOW_BBOX;
  nx: number;
  ny: number;
  lons: number[];
  lats: number[];
  /** Epoch ms for each hour index. */
  hours: number[];
  /** cells[hourIdx][row * nx + col] — null where the grid point is on land. */
  cells: (WaveCell | null)[][];
  /** Bilinear sample at an arbitrary lon/lat for one hour. Direction is
   *  interpolated as a vector so it never wraps wrong at the 0/360 seam.
   *  Returns null only when all four surrounding grid points are land. */
  sample(lon: number, lat: number, hourIdx: number): WaveCell | null;
  /** Max wave height across the whole field — for normalizing color. */
  maxHeight: number;
}

interface MarineLoc {
  hourly?: {
    time: string[];
    wave_height: (number | null)[];
    wave_direction: (number | null)[];
    wave_period: (number | null)[];
  };
}

function buildGrid(): { lons: number[]; lats: number[] } {
  const lons: number[] = [];
  const lats: number[] = [];
  for (let i = 0; i < GRID_NX; i++) {
    lons.push(FLOW_BBOX.west + (FLOW_BBOX.east - FLOW_BBOX.west) * (i / (GRID_NX - 1)));
  }
  for (let j = 0; j < GRID_NY; j++) {
    lats.push(FLOW_BBOX.south + (FLOW_BBOX.north - FLOW_BBOX.south) * (j / (GRID_NY - 1)));
  }
  return { lons, lats };
}

async function fetchMarineBatch(coords: Array<[number, number]>): Promise<MarineLoc[]> {
  const lat = coords.map((c) => c[1].toFixed(3)).join(',');
  const lon = coords.map((c) => c[0].toFixed(3)).join(',');
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}`
    + `&hourly=wave_height,wave_direction,wave_period&forecast_days=7&timezone=GMT&length_unit=imperial`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo Marine ${res.status}`);
  const json = await res.json();
  // One coord → object; many coords → array. Normalize to an array.
  return Array.isArray(json) ? json : [json];
}

function makeField(locs: MarineLoc[], lons: number[], lats: number[]): WaveField {
  const nx = lons.length;
  const ny = lats.length;
  // Hours come from the first location that actually returned data.
  const ref = locs.find((l) => l.hourly?.time?.length);
  const hours = (ref?.hourly?.time ?? []).map((t) => Date.parse(t + 'Z'));
  const H = hours.length;

  const cells: (WaveCell | null)[][] = [];
  for (let h = 0; h < H; h++) {
    const frame: (WaveCell | null)[] = new Array(nx * ny).fill(null);
    for (let idx = 0; idx < locs.length; idx++) {
      const hr = locs[idx].hourly;
      if (!hr) continue;
      const ht = hr.wave_height[h];
      const dr = hr.wave_direction[h];
      const pd = hr.wave_period[h];
      if (ht == null || dr == null || pd == null) continue;
      frame[idx] = { height: ht, dir: dr, period: pd };
    }
    cells.push(frame);
  }

  let maxHeight = 0.5;
  for (const frame of cells) for (const c of frame) if (c && c.height > maxHeight) maxHeight = c.height;

  const at = (col: number, row: number, h: number): WaveCell | null => {
    if (col < 0 || col >= nx || row < 0 || row >= ny || h < 0 || h >= cells.length) return null;
    return cells[h][row * nx + col];
  };

  const sample = (lon: number, lat: number, hourIdx: number): WaveCell | null => {
    const fx = ((lon - lons[0]) / (lons[nx - 1] - lons[0])) * (nx - 1);
    const fy = ((lat - lats[0]) / (lats[ny - 1] - lats[0])) * (ny - 1);
    const c0 = Math.floor(fx), r0 = Math.floor(fy);
    const tx = fx - c0, ty = fy - r0;
    const corners = [
      { c: at(c0, r0, hourIdx), w: (1 - tx) * (1 - ty) },
      { c: at(c0 + 1, r0, hourIdx), w: tx * (1 - ty) },
      { c: at(c0, r0 + 1, hourIdx), w: (1 - tx) * ty },
      { c: at(c0 + 1, r0 + 1, hourIdx), w: tx * ty },
    ].filter((x) => x.c) as Array<{ c: WaveCell; w: number }>;
    if (!corners.length) return null;
    const wsum = corners.reduce((s, x) => s + x.w, 0) || 1;
    let h = 0, p = 0, vx = 0, vy = 0;
    for (const { c, w } of corners) {
      h += c.height * w;
      p += c.period * w;
      // Direction as a unit vector so interpolation never wraps wrong.
      const rad = (c.dir * Math.PI) / 180;
      vx += Math.sin(rad) * w;
      vy += Math.cos(rad) * w;
    }
    const dir = ((Math.atan2(vx, vy) * 180) / Math.PI + 360) % 360;
    return { height: h / wsum, period: p / wsum, dir };
  };

  return { bbox: FLOW_BBOX, nx, ny, lons, lats, hours, cells, sample, maxHeight };
}

interface WaveFieldState {
  field: WaveField | null;
  loading: boolean;
  error: string | null;
}

/** Fetch the Open-Meteo Marine wave field over the Flow Map's coastal box.
 *  Grid points are batched into a couple of multi-location requests. */
export function useWaveField(): WaveFieldState {
  const [state, setState] = useState<WaveFieldState>({ field: null, loading: true, error: null });
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    let cancelled = false;

    (async () => {
      try {
        const { lons, lats } = buildGrid();
        // Row-major coord list — index = row * nx + col, matching the field.
        const coords: Array<[number, number]> = [];
        for (let r = 0; r < lats.length; r++) {
          for (let c = 0; c < lons.length; c++) coords.push([lons[c], lats[r]]);
        }
        const CHUNK = 60;
        const batches: Array<Array<[number, number]>> = [];
        for (let i = 0; i < coords.length; i += CHUNK) batches.push(coords.slice(i, i + CHUNK));
        const results = await Promise.all(batches.map(fetchMarineBatch));
        const locs = results.flat();
        if (cancelled) return;
        const field = makeField(locs, lons, lats);
        if (!field.hours.length) throw new Error('Open-Meteo returned no hours');
        setState({ field, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        setState({ field: null, loading: false, error: err instanceof Error ? err.message : String(err) });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return state;
}
