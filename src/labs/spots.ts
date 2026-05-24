// Labs — Foundation A: the spot contract.
//
// The viz layer is a CONSUMER of the app's spot data, never a second author.
// `src/lib/data.ts` owns the 64-spot registry; this file imports it and
// derives the handful of extra fields the visualizations need. Nothing here
// is canonical — if a number is wrong, the fix is in data.ts, not here.
//
// Two copies of "truth" always drift. So the rule: read SPOTS, never restate
// it. The derived `viz` block is explicitly namespaced so it can never be
// mistaken for source data.

import { SPOTS, Spot } from '../lib/data';
import { BUOY_MAP_BY_SPOT } from '../lib/buoyMapping';

/** The extra fields the viz layer needs, all DERIVED from canonical Spot
 *  fields. Each derivation is documented so the reasoning is auditable. */
export interface VizContract {
  /** Direction the break wants, deg FROM. Direct alias of spot.optimalSwell. */
  idealSwellDir: number;
  /** +/- deg tolerance around idealSwellDir. The app has no explicit window
   *  (computeScore uses a smooth cos² decay), so this is a Labs heuristic
   *  keyed off break type: exposed beaches eat a wide swell window, picky
   *  reefs and points a narrow one. [CONFIRM] tune from your own knowledge. */
  swellWindow: number;
  /** Outward shore normal — the compass direction the beach faces, deg.
   *  Reciprocal of spot.offshore (offshore wind blows FROM the land, so the
   *  beach faces offshore + 180). Used to draw beach orientation, not to
   *  score wind — computeScore already owns the wind test. */
  shoreNormal: number;
  /** Center of the size sweet spot, ft. Midpoint of spot.optimalSize. */
  optimalHeight: number;
  /** Size spread, ft. Mirrors computeScore's sSpread = (max-min)/2 + 1 so a
   *  Gaussian drawn with this matches the scoring engine's quadratic falloff. */
  heightSigma: number;
  /** Numeric center of the categorical optimalTide band, ft MLLW. */
  optimalTideFt: number;
  /** Half-width of that tide band, ft. */
  tideSigma: number;
  /** Nearest NDBC station id, or null if unmapped. */
  buoy: string | null;
}

export interface LabsSpot extends Spot {
  viz: VizContract;
}

// Categorical tide band → [centerFt, sigmaFt]. The bands themselves are
// data.ts's tideMatch() bands — kept in sync by hand; if tideMatch's bands
// change this should follow. Small enough table that a test isn't worth it.
const TIDE_NUMERIC: Record<Spot['optimalTide'], [number, number]> = {
  low:    [1.0, 1.0],
  mid:    [3.0, 1.0],
  high:   [5.0, 1.0],
  rising: [3.25, 1.75],
};

/** Swell-window half-angle (deg) by break type. A reef or point is fussy
 *  about direction; an open beach is forgiving. Heuristic, Labs-layer only. */
function swellWindowFor(type: string): number {
  const t = type.toLowerCase();
  if (t.includes('reef') || t.includes('point')) return 32;
  if (t.includes('cove') || t.includes('jetty')) return 38;
  if (t.includes('beach')) return 52;
  return 45;
}

/** Derive the viz contract for one spot. Pure — same spot in, same out. */
export function vizContract(spot: Spot): VizContract {
  const [sMin, sMax] = spot.optimalSize;
  const [tideC, tideS] = TIDE_NUMERIC[spot.optimalTide] ?? [3, 1.5];
  return {
    idealSwellDir: spot.optimalSwell,
    swellWindow: swellWindowFor(spot.type),
    shoreNormal: (spot.offshore + 180) % 360,
    optimalHeight: (sMin + sMax) / 2,
    heightSigma: (sMax - sMin) / 2 + 1,
    optimalTideFt: tideC,
    tideSigma: tideS,
    buoy: BUOY_MAP_BY_SPOT[spot.id]?.primaryBuoy ?? null,
  };
}

/** Attach the viz contract to a spot. */
export function toLabsSpot(spot: Spot): LabsSpot {
  return { ...spot, viz: vizContract(spot) };
}

// The curated set the Labs views run on. The app tracks 64 spots; faceting a
// heatmap across 64 is noise. These six are a deliberate spread: a sheltered
// picky reef (Patch), an open beach (Stinson), a cove (Rodeo), the NorCal
// powerhouse (Ocean Beach), a forgiving beginner beach (Linda Mar), and an
// exposed beach (Montara) — all inside one coastal box so they also share
// the Flow Map's frame. [CONFIRM] swap freely; the views adapt.
export const FEATURED_SPOT_IDS = [
  'bolinas-patch',
  'stinson',
  'rodeo',
  'ocean-beach',
  'linda-mar',
  'montara',
] as const;

/** Featured spots as LabsSpots, north→south, silently dropping any id that
 *  isn't in the registry (so a typo degrades instead of throwing). */
export function featuredSpots(): LabsSpot[] {
  return FEATURED_SPOT_IDS
    .map((id) => SPOTS.find((s) => s.id === id))
    .filter((s): s is Spot => Boolean(s))
    .map(toLabsSpot);
}

/** One featured spot by id, or undefined. */
export function labsSpot(id: string): LabsSpot | undefined {
  const s = SPOTS.find((x) => x.id === id);
  return s ? toLabsSpot(s) : undefined;
}
