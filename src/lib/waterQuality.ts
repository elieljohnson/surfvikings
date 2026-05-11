// Water quality intel per spot. Phase 1 of the water quality feature —
// hand-encoded permanent advisories and rain-sensitive flags drawn from
// the source-triangulation pass and the California county research in
// docs/water-quality-sources.md.
//
// Phase 2 (separate work) wires in the CA Open Data Portal Beach Watch
// CSVs for live advisory and bacteria data. Phase 3 wires the live
// status into the Dashboard / Map list as warning indicators.
//
// Per-exception UX: only spots in this map render a WaterQualityPanel.
// Safe spots (the majority) get no chrome at all.

export interface WaterQualityInfo {
  /** Always-on red advisory: spot is adjacent to a permanently-posted
   *  creek mouth, sewage outfall, or other runoff hazard. Per Santa Cruz
   *  County's permanent-posting list (see docs/water-quality-sources.md
   *  Tier 3 → Santa Cruz). Renders regardless of recent weather. */
  permanentAdvisory?: string;

  /** Yellow caution: spot is known to degrade after rain but is not
   *  permanently posted. Renders as a passive year-round note today;
   *  Phase 2 will gate it on actual recent precipitation (we already
   *  have precipitation + precipitationProb in the forecast pipeline). */
  rainSensitive?: string;

  /** Phase 2: opaque CA Beach Watch monitoring station ID. */
  beachId?: string;
  beachName?: string;

  /** Phase 2: when the spot itself isn't sampled, the nearest sampled
   *  beach's name and distance (Salt Point → Stillwater Cove ~8 mi).
   *  Honest fallback for the spots in unmonitored stretches. */
  proxyName?: string;
  proxyMiles?: number;
}

/** Per-spot water-quality info. Spots not listed here have no known
 *  always-on advisory or rain sensitivity — Phase 2 will fill in
 *  station-based data; Phase 3 will fill in live status. */
export const WATER_QUALITY: Record<string, WaterQualityInfo> = {
  // Santa Cruz County permanent postings (per SCCEH; never lifted)
  'cowell': {
    permanentAdvisory: 'Neary Lagoon outfall — bacterial contamination present year-round',
  },
  'rivermouth': {
    permanentAdvisory: 'San Lorenzo River — direct outflow at the break',
  },
  'capitola': {
    permanentAdvisory: 'Soquel Creek outflow adjacent — caution especially after rain',
  },
  'capitola-rivermouth': {
    permanentAdvisory: 'Soquel Creek — direct outflow at the break',
  },
  // Rain-sensitive runoff spots (flagged during the May data pass; documented
  // in Surfline / Stormrider notes but not on county permanent-posting lists)
  'mitchells-cove': {
    rainSensitive: 'Sewage outfall just offshore — caution after heavy rain',
  },
  '26th-ave': {
    rainSensitive: 'Sand sensitive to rain runoff — caution after heavy rain',
  },
};

export function getWaterQuality(spotId: string): WaterQualityInfo | undefined {
  return WATER_QUALITY[spotId];
}

/** Severity tier — used by the UI to pick color treatment.
 *  'caution' = known concern, amber (permanent posting OR active rain runoff)
 *  'closed'  = active beach closure from live county/state data — red.
 *              Phase 3 will introduce this from CA Beach Watch advisories.
 *
 *  Red is intentionally reserved for "don't surf" only. Permanent postings
 *  at spots people surf year-round (Cowells, Rivermouth, Capitola) read as
 *  caution-tier — be aware, not stop. */
export type WaterQualityTier = 'caution' | 'closed';

/** Threshold (mm) above which a rain-sensitive spot triggers a caution.
 *  5mm ≈ 0.2 inches — modest rain, enough to produce runoff into nearshore
 *  waters at most CA spots. Below this, the spot reads as fine. */
export const RECENT_RAIN_THRESHOLD_MM = 5;

/** Active tier given the spot's info and how much rain has actually
 *  fallen in the last 48h.
 *
 *  Permanent advisories always render as 'caution' (amber, always-on
 *  awareness — people still surf these spots, the panel is informational).
 *
 *  Rain-sensitive flips to 'caution' only when recentRainMm exceeds the
 *  threshold — quiet on dry days. */
export function tierOf(info: WaterQualityInfo, recentRainMm = 0): WaterQualityTier | undefined {
  if (info.permanentAdvisory) return 'caution';
  if (info.rainSensitive && recentRainMm >= RECENT_RAIN_THRESHOLD_MM) return 'caution';
  return undefined;
}
