import React, { useMemo, useState } from 'react';
import { TOKENS, scoreColor } from '../lib/tokens';
import {
  SPOTS, Spot, ForecastHour, findBestWindows,
  scoreToRating, hourLabel, degToCardinal, angleDelta, MetricKey,
} from '../lib/data';
import { useConditions } from '../hooks/useConditions';
import { Screen, ScoreBadge, ScoreTimeline, Stat, DifficultyPips, ForecastChart, BackButton, useResponsiveWidth } from './Primitives';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useDriveTimes } from '../hooks/useDriveTimes';
import type { HomeBase } from '../lib/routing';

interface SpotDetailProps {
  spotId: string;
  onBack: () => void;
}

export function SpotDetail({ spotId, onBack }: SpotDetailProps) {
  const spot = SPOTS.find((s) => s.id === spotId)!;
  const [subBreak, setSubBreak] = useState(spotId);
  const activeSpot = SPOTS.find((s) => s.id === subBreak) || spot;
  // Read the same home-base + drive-matrix cache the dashboard writes.
  const [home] = useLocalStorage<HomeBase | null>('sv:user:home', null);
  const driveTime = useDriveTimes(home);
  const isBolinasSpot = spot.region === 'bolinas' && spot.id.startsWith('bolinas');
  const requestedSpots = useMemo(
    () => (isBolinasSpot ? SPOTS.filter((s) => s.id.startsWith('bolinas')).map((s) => s.id) : [activeSpot.id]),
    [isBolinasSpot, activeSpot.id]
  );
  const { timelines } = useConditions(requestedSpots);
  const timeline = timelines[activeSpot.id] ?? [];
  const current = timeline[0];
  const rating = scoreToRating(current.score, activeSpot.watchOnly);
  const windows = findBestWindows(timeline);
  const color = scoreColor(current.score, activeSpot.watchOnly);

  const bolinasSubs = SPOTS.filter((s) => s.id.startsWith('bolinas'));
  const isBolinas = isBolinasSpot;

  return (
    <Screen>
      {/* Hero */}
      <div style={{
        padding: '50px 20px 16px',
        background: `linear-gradient(180deg, ${TOKENS.surface2} 0%, ${TOKENS.bg} 100%)`,
        borderBottom: `1px solid ${TOKENS.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <BackButton onClick={onBack}/>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>
            {activeSpot.regionLabel} · {driveTime(activeSpot)}min drive
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{activeSpot.name}</div>
            <div style={{ fontSize: 13, color: TOKENS.textDim, marginTop: 3 }}>{activeSpot.subtitle}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <DifficultyPips level={activeSpot.difficulty} color={color}/>
              <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textDim, letterSpacing: '0.1em' }}>
                DIFF {activeSpot.difficulty}/10 · {activeSpot.type}
              </span>
            </div>
          </div>
          <ScoreBadge score={current.score} rating={rating.label} size="lg" watchOnly={activeSpot.watchOnly}/>
        </div>
      </div>

      {/* Bolinas sub-break tabs */}
      {isBolinas && (
        <div style={{ display: 'flex', borderBottom: `1px solid ${TOKENS.border}`, padding: '0 16px', gap: 0 }}>
          {bolinasSubs.map((s) => {
            const t = timelines[s.id] ?? [];
            const peakScore = t[0]?.score ?? 0;
            const c = scoreColor(peakScore);
            const on = s.id === subBreak;
            return (
              <button key={s.id} onClick={() => setSubBreak(s.id)} style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '14px 6px 12px',
                borderBottom: on ? `2px solid ${c}` : '2px solid transparent',
                color: on ? TOKENS.text : TOKENS.textDim,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 13, fontWeight: on ? 600 : 400 }}>{s.name.replace('The ', '')}</span>
                <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 14, color: c, fontWeight: 500 }}>{Math.round(peakScore)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Quality timeline */}
      <div style={{ padding: '18px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>Quality · 48h</div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textDim }}>
            now <span style={{ color }}>{Math.round(current.score)}</span> · peak{' '}
            <span style={{ color: scoreColor(Math.max(...timeline.map((t) => t.score))) }}>
              {Math.round(Math.max(...timeline.map((t) => t.score)))}
            </span>
          </div>
        </div>
        <ScoreTimeline timeline={timeline}/>
      </div>

      {/* Best window */}
      {windows.length > 0 && (
        <div style={{ padding: '4px 20px 14px' }}>
          <div style={{
            background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
            borderLeft: `3px solid ${scoreColor(windows[0].peak)}`,
            borderRadius: 8, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.2em', color: scoreColor(windows[0].peak), textTransform: 'uppercase' }}>
                  ◉ Optimal Window
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>
                  {hourLabel(windows[0].start)} → {hourLabel(windows[0].end + 1)}
                </div>
                <div style={{ fontSize: 13, color: TOKENS.textDim, marginTop: 2 }}>
                  {windows[0].end - windows[0].start + 1}h window · peak {Math.round(windows[0].peak)} @ {hourLabel(windows[0].peakHour)}
                </div>
              </div>
              <ScoreBadge score={windows[0].peak} size="md"/>
            </div>
          </div>
          {windows.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {windows.slice(1, 4).map((w, i) => (
                <div key={i} style={{
                  flex: 1, background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 6,
                  padding: 8, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textDim,
                }}>
                  <div style={{ color: scoreColor(w.peak), fontSize: 13, fontWeight: 500 }}>{Math.round(w.peak)}</div>
                  <div>{hourLabel(w.start)}–{hourLabel(w.end + 1)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ScoreBreakdown spot={activeSpot} current={current}/>

      <div style={{ padding: '4px 20px 14px' }}>
        <ChartRow label="Swell" unit="ft" spot={activeSpot} current={current.swellHeight} timeline={timeline} metric="swellHeight"/>
        <ChartRow label="Wind" unit="kts" spot={activeSpot} current={current.windSpeed} timeline={timeline} metric="windSpeed"/>
        <ChartRow label="Tide" unit="ft" spot={activeSpot} current={current.tideHeight} timeline={timeline} metric="tideHeight"/>
      </div>

      {activeSpot.bathymetry && <BathymetrySection spot={activeSpot}/>}
      <LocalInsight spot={activeSpot}/>

      <div style={{ height: 100 }}/>
    </Screen>
  );
}

function ScoreBreakdown({ spot, current }: { spot: Spot; current: ForecastHour }) {
  const dirDelta = angleDelta(current.swellDirection, spot.optimalSwell);
  const dirScore = Math.max(0, 30 - dirDelta * 0.7);
  const [pMin, pMax] = spot.optimalPeriod;
  const pScore = current.swellPeriod >= pMin && current.swellPeriod <= pMax ? 20
    : current.swellPeriod < pMin ? Math.max(0, 20 - (pMin - current.swellPeriod) * 3)
    : Math.max(0, 20 - (current.swellPeriod - pMax) * 2);
  const [sMin, sMax] = spot.optimalSize;
  const sCenter = (sMin + sMax) / 2;
  const sScore = Math.max(0, 15 - Math.pow((current.swellHeight - sCenter) / ((sMax - sMin) / 2 + 1), 2) * 10);
  const windDirScore = Math.max(0, 15 - angleDelta(current.windDirection, spot.offshore) * 0.09);
  const tideScore = (() => {
    const bands: Record<string, [number, number]> = { low:[0,2], mid:[2,4], high:[4,6], rising:[1.5,5] };
    const [lo, hi] = bands[spot.optimalTide] || [0, 6];
    return current.tideHeight >= lo && current.tideHeight <= hi
      ? 10
      : Math.max(0, 10 - Math.min(Math.abs(current.tideHeight - lo), Math.abs(current.tideHeight - hi)) * 3);
  })();

  const rows = [
    { label: 'Direction', score: dirScore, max: 30, hint: `${Math.round(current.swellDirection)}° · opt ${spot.optimalSwell}°` },
    { label: 'Period', score: pScore, max: 20, hint: `${Math.round(current.swellPeriod)}s · opt ${pMin}-${pMax}s` },
    { label: 'Size', score: sScore, max: 15, hint: `${current.swellHeight.toFixed(1)}ft · opt ${sMin}-${sMax}ft` },
    { label: 'Wind dir', score: windDirScore, max: 15, hint: `${degToCardinal(current.windDirection)} · off ${degToCardinal(spot.offshore)}` },
    { label: 'Tide', score: tideScore, max: 10, hint: `${current.tideHeight.toFixed(1)}ft · opt ${spot.optimalTide}` },
  ];

  return (
    <div style={{ padding: '4px 20px 16px' }}>
      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase', marginBottom: 10 }}>Why this score</div>
      <div style={{
        background: TOKENS.surface, border: `1px solid ${TOKENS.borderHi}`,
        borderRadius: 12, padding: 12,
        display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 24px -12px rgba(0,0,0,0.6)',
      }}>
        {rows.map((r) => {
          const pct = r.score / r.max;
          const barColor = pct > 0.7 ? TOKENS.epic : pct > 0.4 ? TOKENS.good : TOKENS.poor;
          return (
            <div key={r.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: TOKENS.surface2,
              border: `1px solid ${TOKENS.border}`, borderLeft: `2px solid ${barColor}`,
              borderRadius: 8,
            }}>
              <div style={{ width: 62, fontSize: 13, color: TOKENS.text, fontWeight: 500, letterSpacing: '-0.01em' }}>{r.label}</div>
              <div style={{ flex: 1, position: 'relative', height: 6, background: TOKENS.surface3, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', inset: 0, width: `${pct * 100}%`,
                  background: barColor,
                  boxShadow: pct > 0.7 ? `0 0 8px ${barColor}66` : 'none',
                  borderRadius: 3,
                }}/>
              </div>
              <div style={{ width: 54, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: barColor, fontWeight: 500 }}>{Math.round(r.score)}</span>
                <span style={{ color: TOKENS.textMute }}>/{r.max}</span>
              </div>
              <div style={{ width: 104, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textDim, textAlign: 'right' }}>{r.hint}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartRow({
  label, unit, spot, current, timeline, metric,
}: { label: string; unit: string; spot: Spot; current: number; timeline: ForecastHour[]; metric: MetricKey }) {
  const values = timeline.map((t) => t[metric] as number);
  const max = Math.max(...values);
  const min = Math.min(...values);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>{label}</span>
          <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 16, color: TOKENS.text, fontWeight: 500 }}>{current.toFixed(1)}</span>
          <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textDim }}>{unit}</span>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textMute }}>
          lo {min.toFixed(1)} · hi {max.toFixed(1)}
        </div>
      </div>
      <ForecastChart timeline={timeline} metric={metric} spot={spot} height={40}/>
    </div>
  );
}

// Shared y-axis cap (in meters) for clusters of comparable spots. Without
// this each chart auto-normalizes to its own deepest point, which hides
// the fact that the Patch is shallower than the Groin. Per-cluster: extend
// here when other regions get bathymetry profiles.
const SHARED_DEPTH_BY_REGION: Partial<Record<Spot['region'], number>> = {
  bolinas: 25,
};

function BathymetrySection({ spot }: { spot: Spot }) {
  const b = spot.bathymetry!;
  const sharedMaxDepth = SHARED_DEPTH_BY_REGION[spot.region];
  return (
    <div style={{ padding: '4px 20px 16px' }}>
      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase', marginBottom: 10 }}>
        Bathymetry · Bottom profile
      </div>
      <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 10, padding: 14 }}>
        <BathymetryCrossSection depths={b.depth} distances={b.distance} maxDepthOverride={sharedMaxDepth}/>
        <div style={{ fontSize: 13, color: TOKENS.textDim, marginTop: 10, lineHeight: 1.5 }}>{b.label}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${TOKENS.border}` }}>
          <Stat label="Bottom" value={spot.bottom.split(' ')[0]} hint={spot.bottom}/>
          <Stat label="Shadow fctr" value={typeof spot.shadowFactor === 'number' ? spot.shadowFactor.toFixed(2) : '—'} hint="swell filter"/>
          <Stat label="Sand mob." value={typeof spot.sandMobility === 'number' ? spot.sandMobility.toFixed(2) : '—'} hint="contour shift"/>
        </div>
      </div>
    </div>
  );
}

function BathymetryCrossSection({ depths, distances, maxDepthOverride }: { depths: number[]; distances: number[]; maxDepthOverride?: number }) {
  const [wrapRef, width] = useResponsiveWidth(305);
  const height = 110;
  // When several spots in a region share a y-axis we override the per-chart
  // normalization so depth differences are directly comparable.
  const maxDepth = maxDepthOverride ?? Math.max(...depths);
  const maxDist = distances[0];
  const pts = depths.map((d, i) => {
    const x = width - (distances[i] / maxDist) * width;
    const y = (d / maxDepth) * (height - 30) + 14;
    return [x, y] as const;
  });
  // First label sits at x=0 (offshore-most point) — anchor "start" so it
  // doesn't clip off the left edge. Last label is at x=width — "end".
  const labelTicks: { i: number; anchor: 'start' | 'middle' | 'end' }[] = [
    { i: 0, anchor: 'start'  },
    { i: 2, anchor: 'middle' },
    { i: 4, anchor: 'middle' },
    { i: 5, anchor: 'end'    },
  ];
  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="bath-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TOKENS.pacific} stopOpacity="0.14"/>
            <stop offset="100%" stopColor={TOKENS.pacific} stopOpacity="0.04"/>
          </linearGradient>
          <linearGradient id="bath-bottom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TOKENS.surface3}/>
            <stop offset="100%" stopColor={TOKENS.surface2}/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#bath-water)"/>
        <line x1="0" y1="6" x2={width} y2="6" stroke={TOKENS.pacific} strokeWidth="1" opacity="0.8"/>
        <text x="4" y="4" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="7" fill={TOKENS.pacific} opacity="0.8">MLLW 0.0</text>
        <path
          d={`M${pts[0][0]},${pts[0][1]} ${pts.slice(1).map(([x, y]) => `L${x},${y}`).join(' ')} L${width},${height} L0,${height} Z`}
          fill="url(#bath-bottom)" stroke={TOKENS.borderHi} strokeWidth="1"
        />
        <path
          d={`M${pts[2][0]},${pts[2][1] - 4} Q${pts[3][0]},${pts[3][1] - 14} ${pts[4][0]},${pts[4][1] - 6} T${pts[5][0]},${pts[5][1]}`}
          stroke={TOKENS.pacific} strokeWidth="1.5" fill="none" opacity="0.9"
        />
        {labelTicks.map(({ i, anchor }) => (
          <text key={i} x={pts[i][0]} y={height - 3} textAnchor={anchor} fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="7" fill={TOKENS.textMute}>
            {distances[i]}m
          </text>
        ))}
        <text x={width - 4} y={pts[0][1] + 3} textAnchor="end" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="7" fill={TOKENS.textDim}>-{depths[0]}m</text>
        <text x={pts[4][0] - 4} y={pts[4][1] + 3} textAnchor="end" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="7" fill={TOKENS.phosphor}>break zone</text>
      </svg>
    </div>
  );
}

const INSIGHTS: Record<string, string> = {
  'bolinas-patch': 'Long, slow reef peeler. Sits in the lee of Duxbury Reef — the largest intertidal reef in N. America. Predictable shape, great for improving bottom turns.',
  'bolinas-jetty': 'Mellow beach break with a jetty wedge. Shifting sandbars mean the same spot is a different wave week to week. Best beginner wave in Marin.',
  'bolinas-groin': 'Performance wave, but watch the lagoon outflow. Only surf on a rising tide — falling tide creates a rip that makes it unsurfable.',
  'stinson': 'Exposed beach — wind degrades it fast. Dawn patrol is critical. On a WNW groundswell this place delivers punchy, powerful peaks.',
  'muir-beach': 'Small cove beach between Mt Tam and the headlands. Steep sand bottom — punchy and closes out fast in bigger swell. N winds blocked by Mt Tam are offshore here. Best on small-medium W swell, mid tide. Rocky points at both ends.',
  'rodeo': 'The most unpredictable spot in Marin — the cove catches swell from every direction. Even experienced locals can’t call it from the parking lot.',
  'kellys-cove': 'Sheltered nook at the north end of Ocean Beach below the historic Cliff House. Rock formations to the north block afternoon NW winds. SW-facing — picks up S swell well. Most reliable peaks on the OB stretch.',
  'ocean-beach-north': 'North end of Ocean Beach (Lawton to Lincoln). Smaller and more reliable than the middle on average — generally easier paddle-outs and less localism. Same buoy and tide as the rest of OB.',
  'ocean-beach': 'The canonical OB — central avenues. Three miles of shifty beachbreak biggest in the middle. Open to swell from N, W, and S. Tide swing through the Golden Gate dislocates sandbars hour to hour. Paddle-outs are survival exercises on solid days.',
  'ocean-beach-south': 'Sloat end of Ocean Beach. Less crowded than central but still heavy when it\'s on. The "E, NE" offshore window per Surfline pulls slightly differently than the middle. Same shifting bars, same tide chaos.',
  'secrets': 'Remote Sonoma reef left. No cell service — bring a buddy. Works when most spots are maxed out because the cove offers shelter.',
  'timber-cove': 'Low-tide right at the north end of the cove. Only breaks on bigger NW swells. Privately-owned access through the campground — small day-use fee. Submerged rocks at any size.',
  'mystos': 'Craggy right-hand reef near Fort Ross Campground. Rare beast — needs a big south swell and higher tides. Sheltered from N winds. Shallow, uneven reef. Expert only.',
  'russian-rivermouth': 'Sandbar right-barrel that fires on summer/autumn SW-W pulses with rising tide and east wind. Big swells kill it. Slave to the river\'s sand flow — different bar every storm. Watch the seal pup haul-out and the river runoff.',
  'doran-beach': 'South-facing crescent inside Bodega Bay. The fallback when bigger NW is closing out everywhere else — sheltered behind the headland with NW winds offshore. Closes out without high tide. Beginner-friendly when it\'s tame.',
  'salmon-creek': 'Most popular Sonoma spot. Can be punishing in winter. Dawn glass-off is critical — fully exposed to wind.',
  'point-reyes': 'Consistent but deadly. Great white territory. The 11-mile beach shifts constantly — never surf alone here.',
  'drakes-estero': 'Sandbar at the mouth of the Estero on the south side of the Pt Reyes peninsula. About a mile walk in from Drakes Beach. Summer/late-spring spot — needs a S swell, N wind, incoming tide. Sharks galore.',
  'dillon-beach': 'Always smaller than nearby spots. Good fallback when Point Reyes is maxed. Tomales Bay outflow creates odd currents.',
  'fort-point': 'One of the only NE-facing waves in California. Needs a huge NW groundswell to wrap into the cove. Golden Gate tidal exchange is the real hazard.',
  'deadmans': 'Big-swell rocky lefthander on the Lands End cliffs near Sutro Baths. Needs 6+ft NW winter groundswell on low tide. Submerged rocks and rips make the take-off serious. Heavy local scene — park up on the bluff overlook.',
  'linda-mar': 'The NorCal learning wave. South end is the beginner zone; north end near the point has more shape and power.',
  'rockaway': 'Heavier and less forgiving than Linda Mar. Better surfers come here to escape the Linda Mar crowd.',
  'montara': 'Less-crowded alternative to Linda Mar. Can be heavy and punishing when the swell is up.',
  'princeton': 'Small SW-wedge next to the jetty. Most days playful — and Mavericks viewing zone from the parking lot.',
  'mavericks': 'One of the most dangerous waves on Earth. Only breaks a few times per year. This is a spectator advisory — not a "go surf" recommendation.',
  'hmb-jetty': 'Consistent and relatively uncrowded. Normal humans surf here when Mavericks is too big.',
  'martins': 'Beautiful cove, contested public access. Check current access status before the drive.',
  'ano-nuevo': 'The elephant seal colony makes this the highest shark-risk spot on the list. Wave quality can be excellent but risk calculus is different here.',
  'waddell': 'Workhorse of the Santa Cruz north coast. Reefs and beach break for any swell up to double-overhead. Watch for kites.',
  'scott-creek': 'North-end rocky point produces a consistent right on NW swells. Less crowded than anything in Santa Cruz proper.',
  'davenport': 'Scenic reef break. SW swells produce the best shape. Less consistent but higher quality when it’s on.',
  'four-mile': 'Less-crowded Santa Cruz beach break. Quality peaks on the right swell.',
  'steamer-lane': 'The most famous wave in Santa Cruz and one of the most localized spots in California. Multiple sections: Point, Slot, Indicators, Middle Peak.',
  'cowell': 'Santa Cruz’s learner wave. Very protected — usually tiny. When S swells arrive in summer, it can actually have shape.',
  'pleasure-point': 'Multiple sections: Sewer Peak, 1st Peak, 2nd Peak, and several reefs east. Sewer Peak on a solid NW swell is one of the best rights in California.',
  'capitola': 'Perfect longboard wave when conditions allow. Charming village vibe. Good fallback when Santa Cruz proper is too heavy.',
  'the-hook': 'Classic Santa Cruz right-hander. Kelp beds slow the wave face. A step up from Capitola without the intensity of Steamer Lane.',
};

const HAZARDS: Record<string, string[]> = {
  'bolinas-patch': ['Exposed reef', 'Sea urchins', 'Sharks'],
  'bolinas-jetty': ['Sharks', 'Localism', 'Shifting bars'],
  'bolinas-groin': ['Strong lagoon rip', 'Rocks', 'Sharks'],
  'stinson': ['Sharks', 'Heavy shorebreak', 'Rip currents'],
  'muir-beach': ['Heavy shorebreak', 'Rocks', 'Sharks'],
  'rodeo': ['Undertow', 'Rocks', 'Sharks'],
  'kellys-cove': ['Crowd', 'Sharks'],
  'ocean-beach-north': ['Strong rips', 'Cold water', 'Sharks'],
  'ocean-beach': ['Heavy waves', 'Strong rips', 'Cold water', 'Sharks'],
  'ocean-beach-south': ['Heavy waves', 'Strong rips', 'Cold water', 'Sharks'],
  'secrets': ['Rocks', 'Isolation', 'Urchins'],
  'timber-cove': ['Submerged rocks', 'Sharks', 'Isolation'],
  'mystos': ['Shallow reef', 'Uneven rocks', 'Sharks'],
  'russian-rivermouth': ['Sharks', 'Strong currents', 'Water quality'],
  'doran-beach': ['Sharks', 'Closeouts'],
  'salmon-creek': ['Heavy shorebreak', 'Rips', 'Sharks'],
  'point-reyes': ['Extreme rips', 'Sharks', 'Shifty break'],
  'drakes-estero': ['Sharks', 'Strong currents', '1-mile hike'],
  'dillon-beach': ['Tomales currents', 'Sharks'],
  'fort-point': ['Extreme currents', 'Rocks', 'Shipping'],
  'deadmans': ['Submerged rocks', 'Rips', 'Sharks'],
  'linda-mar': ['Crowd', 'Rips'],
  'rockaway': ['Heavy waves', 'Rocks'],
  'montara': ['Heavy shorebreak', 'Rips'],
  'princeton': ['Jetty rocks'],
  'mavericks': ['50ft+ waves', 'Rocks', 'Sharks', 'Drowning risk'],
  'hmb-jetty': ['Rips', 'Rocks'],
  'martins': ['Rocks', 'Access disputes'],
  'ano-nuevo': ['Great whites', 'Isolation', 'Rocks'],
  'waddell': ['Rocks', 'Rivermouth rips', 'Kites'],
  'scott-creek': ['Rocks', 'Rips'],
  'davenport': ['Rocks', 'Urchins'],
  'four-mile': ['Rocks', 'Rips', 'Sharks'],
  'steamer-lane': ['Rocks', 'Heavy localism', 'Kelp'],
  'cowell': ['Crowds', 'Kelp'],
  'pleasure-point': ['Rocks', 'Kelp', 'Localism'],
  'capitola': ['Crowds', 'Rocks'],
  'the-hook': ['Rocks', 'Kelp', 'Localism'],
};

function LocalInsight({ spot }: { spot: Spot }) {
  const text = INSIGHTS[spot.id] || 'Local knowledge pending.';
  const h = HAZARDS[spot.id] || ['Sharks', 'Rip currents'];
  return (
    <div style={{ padding: '4px 20px 16px' }}>
      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase', marginBottom: 10 }}>Local intel</div>
      <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: TOKENS.text }}>{text}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {h.map((hz) => (
            <span key={hz} style={{
              fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.1em',
              color: TOKENS.red, background: 'rgba(255,93,93,0.08)',
              border: '1px solid rgba(255,93,93,0.25)',
              padding: '3px 7px', borderRadius: 4, textTransform: 'uppercase',
            }}>⚠ {hz}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
