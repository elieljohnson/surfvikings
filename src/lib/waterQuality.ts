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

/** Per-spot water-quality info. Spots not listed here fall back to the
 *  default monitor source for their region (see defaultMonitor() below).
 *  Phase 2 will fill in station-based data; Phase 3 will fill in live
 *  status from CA Beach Watch.
 *
 *  An entry here OVERRIDES the regional default — either with a known
 *  concern (permanentAdvisory / rainSensitive) or with an explicit
 *  notMonitored flag for spots outside any county's sampling list. */
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
  // Sonoma Coast: Salt Point / Fort Ross stretch is not on the county's
  // 7-beach monitoring list. Nearest sampled beach is Stillwater Cove.
  'secrets':     { proxyName: 'Stillwater Cove', proxyMiles: 3 },
  'timber-cove': { proxyName: 'Stillwater Cove', proxyMiles: 4 },
  'mystos':      { proxyName: 'Stillwater Cove', proxyMiles: 1 },
};

/** Default monitor source for a spot's region. Counties run their own
 *  monitoring programs and submit to the state. Returns undefined for
 *  regions outside any county's regular sampling (those rely on a
 *  proxyName + proxyMiles override in WATER_QUALITY above). */
export function defaultMonitor(region: string): string | undefined {
  switch (region) {
    case 'sonoma':       return 'Sonoma County Env. Health';
    case 'pt-reyes':
    case 'marin':        return 'Marin County Env. Health';
    case 'sf':           return 'SFPUC Beach Monitoring';
    case 'sm-north':
    case 'sm-south':     return 'San Mateo County Health';
    case 'sc':           return 'Santa Cruz County Env. Health';
    default:             return undefined;
  }
}

export function getWaterQuality(spotId: string): WaterQualityInfo | undefined {
  return WATER_QUALITY[spotId];
}

/** Threshold (mm) above which a rain-sensitive spot triggers a caution.
 *  5mm ≈ 0.2 inches — modest rain, enough to produce runoff into nearshore
 *  waters at most CA spots. Below this, the spot reads as fine. */
export const RECENT_RAIN_THRESHOLD_MM = 5;

/** Status states for the water-quality panel.
 *  'caution' = known concern (amber); always renders when triggered.
 *  'monitored' = county samples this stretch, no known year-round concern;
 *               source attribution surfaced even when "clean."
 *  'not-monitored' = outside any county's regular sampling list; show the
 *               nearest sampled beach as a proxy (Salt Point stretch).
 *  'closed' = Phase 3 — active closure from live CA Beach Watch (red). */
export type WaterQualityStatus = 'caution' | 'monitored' | 'not-monitored' | 'closed';

export interface WaterQualityState {
  status: WaterQualityStatus;
  /** Human-written description of the concern (caution) or scope of
   *  monitoring. Empty for 'monitored' (no concern, just attribution). */
  text: string;
  /** Source attribution for the panel footer. Always shown when present. */
  source?: string;
  /** Set on 'not-monitored' status. Renders as 'Nearest sampled beach:
   *  Stillwater Cove (~3 mi)' below the main copy. */
  proxy?: { name: string; miles: number };
}

/** Compute the active water-quality state for a spot, given an explicit
 *  WaterQualityInfo override (or none), the spot's region (for default
 *  monitor source), and how much rain has fallen in the last 48h. */
export function stateFor(
  info: WaterQualityInfo | undefined,
  region: string,
  recentRainMm = 0,
): WaterQualityState | undefined {
  const source = defaultMonitor(region);
  // Permanent advisory always wins
  if (info?.permanentAdvisory) {
    return { status: 'caution', text: info.permanentAdvisory, source };
  }
  // Rain-sensitive caution gated on actual recent rain
  if (info?.rainSensitive && recentRainMm >= RECENT_RAIN_THRESHOLD_MM) {
    return {
      status: 'caution',
      text: `${info.rainSensitive} · ${recentRainMm.toFixed(1)}mm fell in past 48h`,
      source,
    };
  }
  // Explicit "not monitored" entry (Salt Point stretch)
  if (info?.proxyName && info?.proxyMiles !== undefined) {
    return {
      status: 'not-monitored',
      text: 'Not on the county sampling list',
      proxy: { name: info.proxyName, miles: info.proxyMiles },
      source,
    };
  }
  // Spot is in a monitored region but has no known concern. No body text —
  // the 'Clean' status pill in the UI is the message; supplementary copy
  // would be redundant.
  if (source) {
    return { status: 'monitored', text: '', source };
  }
  return undefined;
}
