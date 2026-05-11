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

/** Severity tier of a water-quality entry — used by the UI to pick color
 *  treatment. 'advisory' > 'caution' > undefined (no panel rendered). */
export type WaterQualityTier = 'advisory' | 'caution';

export function tierOf(info: WaterQualityInfo): WaterQualityTier | undefined {
  if (info.permanentAdvisory) return 'advisory';
  if (info.rainSensitive) return 'caution';
  return undefined;
}
