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
   *  permanently posted. Gated by recentRainMm at runtime. */
  rainSensitive?: string;

  /** Live-data lookup key — the beach name as it appears in the source's
   *  feed (Sonoma County HTML table caption, or SFPUC stationname). When
   *  set, server-side fetches the latest reading and merges it into the
   *  panel. Without this the panel can't show a fresh date or live status,
   *  so it hides entirely (per Eliel: 'only display the card when we have
   *  data wired'). */
  liveBeachName?: string;

  /** When the spot itself isn't sampled, the nearest sampled beach's
   *  name and distance (Salt Point → Stillwater Cove ~8 mi). Honest
   *  fallback for the spots in unmonitored stretches. */
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
  // Structural water-quality concerns — always amber regardless of rain
  // (the underlying issue is present year-round, not weather-dependent).
  'mitchells-cove': {
    permanentAdvisory: 'Sewage outfall just offshore — baseline fair, worse after rain',
  },
  // Rain-sensitive runoff spots — baseline is OK, only elevated post-rain.
  // Per Surfline, 26th Ave's water quality is "decent" except after storms.
  '26th-ave': {
    rainSensitive: 'Sand sensitive to rain runoff — caution after heavy rain',
  },
  // Sonoma Coast: Salt Point / Fort Ross stretch is not on the county's
  // 7-beach monitoring list. Nearest sampled beach is Stillwater Cove.
  'secrets':     { proxyName: 'Stillwater Cove', proxyMiles: 3 },
  'timber-cove': { proxyName: 'Stillwater Cove', proxyMiles: 4 },
  'mystos':      { proxyName: 'Stillwater Cove', proxyMiles: 1 },

  // ─────────────────────────────────────────────────────────────────────
  // Live-data spot → beach name mappings. Strings here must match the
  // source's beach name exactly so the merge in /api/conditions can join.
  // ─────────────────────────────────────────────────────────────────────

  // Sonoma County (HTML scrape)
  'russian-rivermouth': { liveBeachName: 'Goat Rock State Beach' },
  'salmon-creek':       { liveBeachName: 'Salmon Creek State Beach' },
  'doran-beach':        { liveBeachName: 'Doran Regional Park Beach' },

  // SFPUC (JSON API). Multiple OB stations exist — picked the geographically
  // nearest match for each spot. Fort Point uses Crissy Field West (~500m
  // east of the actual surf spot, but it's the closest SFPUC station).
  'fort-point':          { liveBeachName: 'Crissy Field Beach West' },
  'kellys-cove':         { liveBeachName: 'Ocean Beach at Balboa Street' },
  'ocean-beach-north':   { liveBeachName: 'Ocean Beach at Balboa Street' },
  'ocean-beach':         { liveBeachName: 'Ocean Beach at Lincoln Way' },
  'ocean-beach-south':   { liveBeachName: 'Ocean Beach at Sloat Boulevard' },
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
  /** Source attribution for the panel footer. */
  source?: string;
  /** Set on 'not-monitored' status. Renders as 'Nearest sampled beach:
   *  Stillwater Cove (~3 mi)' below the main copy. */
  proxy?: { name: string; miles: number };
  /** ISO date (YYYY-MM-DD) of the most recent county sample, when a live
   *  reading was matched. UI renders 'Tested 5/4 · 7d ago' next to status. */
  sampleDate?: string;
}

/** Minimal shape of a live reading needed by stateFor. Server-side type
 *  is LiveBeachReading in src/server/waterQualityLive.ts. */
export interface LiveReading {
  beachName: string;
  sampleDate: string;
  status: 'open' | 'caution' | 'closed';
  rawStatus: string;
  source: string;
}

/** Compute the active water-quality state for a spot.
 *
 *  Per Eliel's spec: "only display the card when we have data wired."
 *  The panel renders only when there's either a hand-encoded concern
 *  (permanent advisory / rain-sensitive / not-monitored proxy) OR a
 *  live reading matched via liveBeachName. Spots with neither return
 *  undefined and skip the panel entirely. */
export function stateFor(
  info: WaterQualityInfo | undefined,
  region: string,
  recentRainMm = 0,
  liveReadings: Record<string, LiveReading> = {},
): WaterQualityState | undefined {
  // Permanent advisory always wins, with or without live data
  if (info?.permanentAdvisory) {
    const fallbackSource = defaultMonitor(region);
    const reading = info.liveBeachName ? liveReadings[info.liveBeachName] : undefined;
    return {
      status: 'caution',
      text: info.permanentAdvisory,
      source: reading?.source ?? fallbackSource,
      sampleDate: reading?.sampleDate,
    };
  }
  // Rain-sensitive: always render (it's a known concern). Escalate to
  // caution when recent rain crosses the threshold; otherwise stay
  // informational ('monitored') so surfers see the rain-sensitivity note
  // year-round without an amber dot on dry days.
  if (info?.rainSensitive) {
    const fallbackSource = defaultMonitor(region);
    const reading = info.liveBeachName ? liveReadings[info.liveBeachName] : undefined;
    const wet = recentRainMm >= RECENT_RAIN_THRESHOLD_MM;
    return {
      status: wet ? 'caution' : 'monitored',
      text: wet
        ? `${info.rainSensitive} · ${recentRainMm.toFixed(1)}mm fell in past 48h`
        : info.rainSensitive,
      source: reading?.source ?? fallbackSource,
      sampleDate: reading?.sampleDate,
    };
  }
  // Explicit "not monitored" entry (Salt Point stretch). Always show —
  // the proxy info IS the value, fresh data is irrelevant by definition.
  if (info?.proxyName && info?.proxyMiles !== undefined) {
    return {
      status: 'not-monitored',
      text: 'Not on the county sampling list',
      proxy: { name: info.proxyName, miles: info.proxyMiles },
      source: defaultMonitor(region),
    };
  }
  // Live reading available — map to status/Clean and show the date
  if (info?.liveBeachName) {
    const reading = liveReadings[info.liveBeachName];
    if (reading) {
      const status: WaterQualityStatus =
        reading.status === 'closed' ? 'closed'
          : reading.status === 'caution' ? 'caution'
            : 'monitored';
      return {
        status,
        text: reading.status === 'open' ? '' : reading.rawStatus,
        source: reading.source,
        sampleDate: reading.sampleDate,
      };
    }
  }
  // No hand-encoded concern AND no live data wired — hide the panel.
  return undefined;
}
