import React, { useMemo, useState } from 'react';
import { TOKENS, scoreColor, qualityColor } from '../lib/tokens';
import {
  SPOTS, Spot, ForecastHour, findBestWindows,
  scoreToRating, hourLabel, degToCardinal, MetricKey,
  swellDirectionScore, windDirectionScore,
} from '../lib/data';
import { BUOY_MAP_BY_SPOT } from '../lib/buoyMapping';
import { getWaterQuality, stateFor, type WaterQualityState } from '../lib/waterQuality';
import { sunriseSunset, moonPhase, formatTime } from '../lib/celestial';
import { useConditions } from '../hooks/useConditions';
import { Screen, ScoreBadge, ScoreTimeline, Stat, DifficultyPips, ForecastChart, BackButton, useResponsiveWidth, VectorsPanel, MoonPhaseIcon } from './Primitives';
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
  const isBolinasSpot = spot.region === 'marin' && spot.id.startsWith('bolinas');
  const requestedSpots = useMemo(
    () => (isBolinasSpot ? SPOTS.filter((s) => s.id.startsWith('bolinas')).map((s) => s.id) : [activeSpot.id]),
    [isBolinasSpot, activeSpot.id]
  );
  const { timelines, response } = useConditions(requestedSpots);
  // useConditions fetches 7 days (168h) but Spot Detail intentionally shows
  // only the next 48h. Keeps this view distinct from the Forecast tab's
  // 7-day plan-the-week framing — Spot Detail is "should I go today / tonight
  // / tomorrow." All downstream consumers (charts, heatmap, best window,
  // peak score) use the trimmed timeline.
  const timeline = (timelines[activeSpot.id] ?? []).slice(0, 48);
  const buoyId = BUOY_MAP_BY_SPOT[activeSpot.id]?.primaryBuoy;
  const buoy = buoyId ? response?.buoys[buoyId] : undefined;
  const nwsZone = BUOY_MAP_BY_SPOT[activeSpot.id]?.nwsZone;
  const nws = nwsZone ? response?.nwsForecasts?.[nwsZone] : undefined;
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

      <ScoreBreakdown spot={activeSpot} current={current} timeline={timeline}/>

      <div style={{ padding: '4px 20px 14px' }}>
        <ChartRow
          label="Swell"
          unit="ft"
          spot={activeSpot}
          current={current.swellHeight}
          secondary={
            current.windWaveHeight > 0.5
              ? { value: current.windWaveHeight, unit: 'ft', label: 'chop' }
              : undefined
          }
          timeline={timeline}
          metric="swellHeight"
        />
        <ChartRow label="Wind" unit="kts" spot={activeSpot} current={current.windSpeed} timeline={timeline} metric="windSpeed"/>
        <ChartRow label="Tide" unit="ft" spot={activeSpot} current={current.tideHeight} timeline={timeline} metric="tideHeight"/>
      </div>

      {buoy?.swellTrains && buoy.swellTrains.length > 0 && (
        <SpectralPanel buoyId={buoyId!} buoy={buoy}/>
      )}
      {nws && nws.periods.length > 0 && <NwsPanel nws={nws}/>}
      {activeSpot.bathymetry && <BathymetrySection spot={activeSpot}/>}
      <VectorsPanel spot={activeSpot} current={current}/>
      {(() => {
        const recentRainMm = response?.spotMeta?.[activeSpot.id]?.recentRainMm ?? 0;
        const wq = stateFor(
          getWaterQuality(activeSpot.id),
          activeSpot.region,
          recentRainMm,
          response?.waterQuality ?? {},
        );
        return wq ? <WaterQualityPanel state={wq}/> : null;
      })()}
      <SunMoonPanel spot={activeSpot}/>
      <LocalInsight spot={activeSpot}/>

      <div style={{ height: 100 }}/>
    </Screen>
  );
}

/** Plain-English explanation of why a score row came out the way it did.
 *  Pure function of the row's inputs — no React, no async. Returns 2-3
 *  short sentences ready to render. Kept here (not in lib/) because the
 *  copy is tightly coupled to the UI's level of detail. */
function explainRow(
  label: string, score: number, max: number,
  spot: Spot, current: ForecastHour, timeline: ForecastHour[],
): string[] {
  const pct = Math.round((score / max) * 100);
  if (label === 'Direction') {
    // Smallest signed angle between current and optimal, on a 360° circle.
    const raw = current.swellDirection - spot.optimalSwell;
    const delta = ((raw + 540) % 360) - 180;
    const offBy = Math.round(Math.abs(delta));
    const side = delta > 0 ? 'east' : 'west';
    return [
      `${offBy}° off optimal (${spot.optimalSwell}°). Cosine² falloff puts this at ${pct}% of max.`,
      offBy <= 15
        ? 'Lined up with the break — energy hits the bottom contour at the right angle.'
        : offBy <= 45
        ? `Swell is rotated ${side} of ideal — still working, just refracting harder onto the bar.`
        : `Too far ${side} of the break's window — most energy walks past instead of focusing.`,
    ];
  }
  if (label === 'Period') {
    const p = current.swellPeriod;
    const [pMin, pMax] = spot.optimalPeriod;
    // Wave energy scales with T² at fixed height. Rough rule of thumb — a 12s
    // wave carries ~4× the energy of a 6s wave at the same face height.
    const energyVs12 = Math.round((p * p) / (12 * 12) * 100);
    const kind = p < 8 ? 'local wind swell' : p < 12 ? 'short-period groundswell' : 'long-period groundswell';
    const windowMsg = p >= pMin && p <= pMax
      ? `Inside this spot's ${pMin}-${pMax}s window.`
      : p < pMin
      ? `${(pMin - p).toFixed(1)}s short of the ${pMin}-${pMax}s window — penalty is 3 pts per second under.`
      : `${(p - pMax).toFixed(1)}s over the ${pMin}-${pMax}s window — long-period swells lose 2 pts per second over.`;
    return [
      `${p.toFixed(0)}s = ${kind}. Carries about ${energyVs12}% the energy of a 12s wave at the same face height.`,
      windowMsg,
    ];
  }
  if (label === 'Size') {
    const shadow = spot.shadowFactor ?? 1.0;
    const reaches = current.swellHeight;
    const openOcean = shadow < 1 ? reaches / shadow : reaches;
    const [sMin, sMax] = spot.optimalSize;
    const windowMsg = reaches >= sMin && reaches <= sMax
      ? `Inside your ${sMin}-${sMax}ft window — ${
          reaches < (sMin + sMax) / 2 ? 'closer to the low end' : 'closer to the top'
        }.`
      : reaches < sMin
      ? `${(sMin - reaches).toFixed(1)}ft below the ${sMin}-${sMax}ft window.`
      : `${(reaches - sMax).toFixed(1)}ft above the ${sMin}-${sMax}ft window.`;
    return shadow < 1
      ? [
          `Open-ocean buoy reads ${openOcean.toFixed(1)}ft. shadowFactor ${shadow.toFixed(2)} for this break → ${reaches.toFixed(1)}ft actually reaches it.`,
          windowMsg,
        ]
      : [
          `${reaches.toFixed(1)}ft at the break (no coastal sheltering applied).`,
          windowMsg,
        ];
  }
  if (label === 'Wind dir') {
    // Signed delta between wind direction and the offshore bearing.
    const raw = current.windDirection - spot.offshore;
    const delta = ((raw + 540) % 360) - 180;
    const offBy = Math.abs(delta);
    const kind = offBy <= 45 ? 'offshore'
      : offBy <= 90 ? 'side-shore'
      : offBy <= 135 ? 'side-onshore'
      : 'onshore';
    // Find when wind drops below 5kt in the next 12h, if it does.
    const easeIdx = timeline.slice(1, 13).findIndex((h) => h.windSpeed <= 5);
    const easeMsg = easeIdx >= 0
      ? `Forecast eases to ${Math.round(timeline[easeIdx + 1].windSpeed)}kt by ${hourLabel(easeIdx + 1)} — penalty drops, direction stays the same.`
      : null;
    return [
      `Wind ${Math.round(offBy)}° off offshore (${degToCardinal(spot.offshore)}) — effectively ${kind}.`,
      kind === 'offshore'
        ? 'Clean faces, holds shape longer.'
        : kind === 'side-shore'
        ? 'Texture on the face, not destroyed.'
        : 'Surface chop — waves lose definition before they break.',
      easeMsg,
    ].filter((s): s is string => !!s);
  }
  if (label === 'Tide') {
    // Walk the next 12 hours to find the next high/low pivot.
    const next = (() => {
      for (let i = 1; i < Math.min(timeline.length - 1, 13); i++) {
        const prev = timeline[i - 1].tideHeight;
        const cur = timeline[i].tideHeight;
        const nxt = timeline[i + 1].tideHeight;
        if (cur >= prev && cur >= nxt) return { kind: 'high', hours: i, height: cur };
        if (cur <= prev && cur <= nxt) return { kind: 'low', hours: i, height: cur };
      }
      return null;
    })();
    const trend = timeline[1] && timeline[1].tideHeight > current.tideHeight ? 'Rising' : 'Falling';
    const nextMsg = next
      ? `${trend}. Next ${next.kind} ${next.height.toFixed(1)}ft in about ${next.hours}h.`
      : `${trend}.`;
    return [
      `${current.tideHeight.toFixed(1)}ft now — this break favors ${spot.optimalTide} tide.`,
      nextMsg,
    ];
  }
  return [];
}

function ScoreBreakdown({ spot, current, timeline }: { spot: Spot; current: ForecastHour; timeline: ForecastHour[] }) {
  // Tap a row → expand it. Tap again → collapse. Only one open at a time
  // (simpler than tracking a Set; easier to scan visually).
  const [expanded, setExpanded] = useState<string | null>(null);
  // Direction-score functions are imported from data.ts so this panel and
  // computeScore can never drift apart. Period/size/tide are inlined here
  // because their per-spot range params would make a shared helper awkward.
  const dirScore = swellDirectionScore(current.swellDirection, spot.optimalSwell);
  const [pMin, pMax] = spot.optimalPeriod;
  const pScore = current.swellPeriod >= pMin && current.swellPeriod <= pMax ? 20
    : current.swellPeriod < pMin ? Math.max(0, 20 - (pMin - current.swellPeriod) * 3)
    : Math.max(0, 20 - (current.swellPeriod - pMax) * 2);
  const [sMin, sMax] = spot.optimalSize;
  const sCenter = (sMin + sMax) / 2;
  const sScore = Math.max(0, 15 - Math.pow((current.swellHeight - sCenter) / ((sMax - sMin) / 2 + 1), 2) * 10);
  const windDirScore = windDirectionScore(current.windDirection, spot.offshore);
  const tideScore = (() => {
    const bands: Record<string, [number, number]> = { low:[0,2], mid:[2,4], high:[4,6], rising:[1.5,5] };
    const [lo, hi] = bands[spot.optimalTide] || [0, 6];
    return current.tideHeight >= lo && current.tideHeight <= hi
      ? 10
      : Math.max(0, 10 - Math.min(Math.abs(current.tideHeight - lo), Math.abs(current.tideHeight - hi)) * 3);
  })();

  const rows = [
    { label: 'Direction', score: dirScore,     max: 30, now: `${Math.round(current.swellDirection)}°`,        opt: `opt ${spot.optimalSwell}°` },
    { label: 'Period',    score: pScore,       max: 20, now: `${Math.round(current.swellPeriod)}s`,           opt: `opt ${pMin}-${pMax}s` },
    { label: 'Size',      score: sScore,       max: 15, now: `${current.swellHeight.toFixed(1)}ft`,           opt: `opt ${sMin}-${sMax}ft` },
    { label: 'Wind dir',  score: windDirScore, max: 15, now: degToCardinal(current.windDirection),            opt: `off ${degToCardinal(spot.offshore)}` },
    { label: 'Tide',      score: tideScore,    max: 10, now: `${current.tideHeight.toFixed(1)}ft`,            opt: `opt ${spot.optimalTide}` },
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
          // Match the hero card's 6-band qualityColor scale so green/yellow/red
          // mean the same thing across surfaces. Was a 3-band local mapping that
          // skipped fair/mediocre/meh and snapped 5/15 wind dir to red.
          const barColor = qualityColor(pct);
          const isOpen = expanded === r.label;
          const explanation = isOpen ? explainRow(r.label, r.score, r.max, spot, current, timeline) : null;
          return (
            <div key={r.label} style={{
              background: TOKENS.surface2,
              border: `1px solid ${TOKENS.border}`, borderLeft: `2px solid ${barColor}`,
              borderRadius: 8, overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : r.label)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '12px 14px', background: 'transparent', border: 0,
                  color: 'inherit', textAlign: 'left', cursor: 'pointer',
                  font: 'inherit',
                }}
              >
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
                <div style={{ width: 104, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.2 }}>
                  <span style={{ color: TOKENS.text }}>{r.now}</span>
                  <span style={{ color: TOKENS.textMute }}>{r.opt}</span>
                </div>
                <span style={{
                  width: 14, color: TOKENS.textMute, fontSize: 14,
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 140ms ease',
                  display: 'inline-block', textAlign: 'center',
                }}>›</span>
              </button>
              {isOpen && explanation && (
                <div style={{
                  padding: '0 14px 12px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  fontSize: 13, lineHeight: 1.45, color: TOKENS.textDim,
                  borderTop: `1px solid ${TOKENS.border}`, paddingTop: 10, marginTop: 2,
                }}>
                  {explanation.map((line, i) => <div key={i}>{line}</div>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartRow({
  label, unit, spot, current, secondary, timeline, metric,
}: {
  label: string; unit: string; spot: Spot; current: number;
  /** Optional muted addendum (e.g. '+1.4ft chop' next to the primary swell). */
  secondary?: { value: number; unit: string; label: string };
  timeline: ForecastHour[]; metric: MetricKey;
}) {
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
          {secondary && (
            <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textMute, marginLeft: 4 }}>
              +{secondary.value.toFixed(1)}{secondary.unit} {secondary.label}
            </span>
          )}
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
  marin: 25,
};

// Spectral wave-train decomposition from NDBC .data_spec. Lets the user see
// e.g. a clean 1.7ft @ 17s SW groundswell hiding under a bigger 4ft @ 7s WNW
// windswell that's masquerading as the "primary" in our Open-Meteo forecast.
// Longest period is rendered first and tagged GROUNDSWELL.
function SpectralPanel({
  buoyId,
  buoy,
}: {
  buoyId: string;
  buoy: NonNullable<ReturnType<typeof useConditions>['response']>['buoys'][string];
}) {
  const trains = buoy.swellTrains ?? [];
  const ageMin = Math.max(0, Math.round((Date.now() - buoy.timestamp) / 60000));
  return (
    <div style={{ padding: '4px 20px 16px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: 13, letterSpacing: '0.18em',
          color: TOKENS.textMute, textTransform: 'uppercase',
        }}>
          Spectral · Buoy {buoyId} · {ageMin}m ago
        </div>
        {typeof buoy.energyKwPerM === 'number' && (
          <div style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 13, letterSpacing: '0.12em',
            color: TOKENS.textDim, textTransform: 'uppercase',
          }}>
            {Math.round(buoy.energyKwPerM)} kW/m
          </div>
        )}
      </div>
      <div style={{
        background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
        borderRadius: 10, padding: 14,
      }}>
        {trains.map((t, i) => {
          const isGroundswell = i === 0 && t.period >= 11;
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i < trains.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 22, fontWeight: 500,
                  color: isGroundswell ? TOKENS.phosphor : TOKENS.text,
                  minWidth: 56,
                }}>
                  {t.period.toFixed(1)}<span style={{ fontSize: 13, color: TOKENS.textDim, marginLeft: 2 }}>s</span>
                </span>
                <span style={{
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 15, color: TOKENS.text,
                }}>
                  {t.height.toFixed(1)}<span style={{ fontSize: 12, color: TOKENS.textDim, marginLeft: 2 }}>ft</span>
                </span>
                {typeof t.direction === 'number' && (
                  <span style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    fontSize: 13, color: TOKENS.textDim,
                  }}>
                    {degToCardinal(t.direction)}<span style={{ marginLeft: 4 }}>{Math.round(t.direction)}°</span>
                  </span>
                )}
              </div>
              {isGroundswell && (
                <span style={{
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 11, letterSpacing: '0.18em',
                  color: TOKENS.phosphor, textTransform: 'uppercase',
                }}>
                  Groundswell
                </span>
              )}
              {!isGroundswell && t.period < 8 && (
                <span style={{
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 11, letterSpacing: '0.18em',
                  color: TOKENS.textMute, textTransform: 'uppercase',
                }}>
                  Windswell
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Format a YYYY-MM-DD sample date as e.g. "5/4 · 7d ago". */
function formatSampleDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);  // noon avoids TZ-edge off-by-one
  if (Number.isNaN(d.getTime())) return iso;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  const ageStr = days === 0 ? 'today' : days === 1 ? '1d ago' : `${days}d ago`;
  return `${d.getMonth() + 1}/${d.getDate()} · ${ageStr}`;
}

// Water-quality panel — renders for every spot with a known monitor or
// concern. Status-pill UI: ● Clean (green) / ⚠ Caution (amber) /
// ◌ Not Monitored (dim) / ⚠ Closed (red, Phase 3).
//
// Live test-date is queued for the next preview iteration — wiring the
// CA Beach Watch CSV server-side then plumbing per-spot last-sample
// dates through the conditions payload. UI shape is set so when that
// data lands it slots into the placeholder line below the status.
function WaterQualityPanel({ state }: { state: WaterQualityState }) {
  const isClosed = state.status === 'closed';
  const isCaution = state.status === 'caution';
  const isMonitored = state.status === 'monitored';
  const isNotMonitored = state.status === 'not-monitored';

  const dotColor = isClosed
    ? TOKENS.poor
    : isCaution
      ? TOKENS.mediocre
      : isMonitored
        ? TOKENS.epic           // green ● for the all-clear
        : TOKENS.textDim;       // dim ◌ for not-monitored
  const statusLabel = isClosed
    ? 'Closed'
    : isCaution
      ? 'Caution'
      : isMonitored
        ? 'Clean'
        : 'Not monitored';
  const borderColor = isCaution || isClosed ? dotColor : TOKENS.border;
  const bg = isClosed
    ? 'rgba(239, 68, 68, 0.08)'
    : isCaution
      ? 'rgba(234, 179, 8, 0.08)'
      : TOKENS.surface;

  return (
    <div style={{ padding: '4px 20px 16px' }}>
      <div style={{
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 13, letterSpacing: '0.18em',
        color: TOKENS.textMute, textTransform: 'uppercase', marginBottom: 8,
      }}>
        Water Quality
      </div>
      <div style={{
        background: bg, border: `1px solid ${borderColor}`,
        borderRadius: 8, padding: '12px 14px',
      }}>
        {/* Status row: colored dot + status word + (when a live county
         * reading is matched) "Tested 5/4 · 7d ago". State CSV approach
         * was abandoned because it's historical-only (May 2026 dig); now
         * driven by per-county scrapers in src/server/waterQualityLive.ts. */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: dotColor, flexShrink: 0, marginRight: 4,
            transform: 'translateY(-1px)',
          }}/>
          <span style={{ fontSize: 16, fontWeight: 500, color: dotColor }}>
            {statusLabel}
          </span>
          {state.sampleDate && (
            <span style={{
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              fontSize: 12, color: TOKENS.textDim,
            }}>
              · Tested {formatSampleDate(state.sampleDate)}
            </span>
          )}
        </div>

        {/* Context: concern text (caution) or scope description (others) */}
        {state.text && (
          <div style={{ fontSize: 13, lineHeight: 1.5, color: TOKENS.text }}>
            {state.text}
          </div>
        )}
        {state.proxy && (
          <div style={{ fontSize: 12, color: TOKENS.textDim, marginTop: 4 }}>
            Nearest sampled beach: {state.proxy.name} (~{state.proxy.miles} mi)
          </div>
        )}

        {state.source && (
          <div style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 11, letterSpacing: '0.12em',
            color: TOKENS.textMute, textTransform: 'uppercase',
            marginTop: 10, paddingTop: 8,
            borderTop: `1px solid ${TOKENS.border}`,
          }}>
            Source · {state.source}
          </div>
        )}
      </div>
    </div>
  );
}

// NWS Coastal Waters Forecast — human-written marine narrative from the
// local NWS office. Different feel from our model numbers: prose like
// 'Seas 7 to 9 ft. Wave Detail: NW 9 ft at 9 seconds and S 2 ft at 16
// seconds.' Plus any active marine advisories.
function NwsPanel({ nws }: {
  nws: NonNullable<ReturnType<typeof useConditions>['response']>['nwsForecasts'][string];
}) {
  // Show the next 3 periods so the panel doesn't dominate the page.
  const periods = nws.periods.slice(0, 3);
  const ageHr = Math.max(0, Math.round((Date.now() - nws.issuedAt) / 3600000));
  return (
    <div style={{ padding: '4px 20px 16px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: 13, letterSpacing: '0.18em',
          color: TOKENS.textMute, textTransform: 'uppercase',
        }}>
          NWS Marine Forecast · {ageHr}h ago
        </div>
        <div style={{
          fontSize: 12, color: TOKENS.textDim, marginTop: 3,
        }}>
          {nws.description}
        </div>
      </div>
      <div style={{
        background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
        borderRadius: 10, padding: 14,
      }}>
        {nws.advisories.map((adv, i) => (
          <div key={i} style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 12, letterSpacing: '0.08em',
            color: TOKENS.poor, textTransform: 'uppercase',
            padding: '6px 8px', marginBottom: 10,
            background: 'rgba(255, 80, 80, 0.06)',
            border: `1px solid ${TOKENS.poor}`,
            borderRadius: 6,
          }}>
            ⚠ {adv}
          </div>
        ))}
        {periods.map((p, i) => (
          <div key={i} style={{
            padding: '10px 0',
            borderBottom: i < periods.length - 1 ? `1px solid ${TOKENS.border}` : 'none',
          }}>
            <div style={{
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              fontSize: 12, letterSpacing: '0.15em',
              color: TOKENS.phosphor, textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              {p.name}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: TOKENS.text }}>
              {p.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sunrise / sunset for today + tonight's moon, computed entirely client-
// side from the spot's lat/lng + current date. No API call.
function SunMoonPanel({ spot }: { spot: Spot }) {
  const now = new Date();
  const { sunrise, sunset } = sunriseSunset(now, spot.lat, spot.lng);
  const moon = moonPhase(now);
  const dayLengthMin = Math.round((sunset.getTime() - sunrise.getTime()) / 60000);
  const dayLengthStr = `${Math.floor(dayLengthMin / 60)}h ${dayLengthMin % 60}m`;
  return (
    <div style={{ padding: '4px 20px 16px' }}>
      <div style={{
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 13, letterSpacing: '0.18em',
        color: TOKENS.textMute, textTransform: 'uppercase', marginBottom: 10,
      }}>
        Sun & Moon · Today
      </div>
      <div style={{
        background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
        borderRadius: 10, padding: 14,
        // Sunrise/Sunset/Moon stretch (1fr); Phase column collapses to
        // just the icon's width so the icon sits tight against the Moon
        // data rather than floating in its own empty quarter of the row.
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8,
      }}>
        <Stat dot={false} label="Sunrise" value={formatTime(sunrise)} hint="" color={TOKENS.text}/>
        <Stat dot={false} label="Sunset"  value={formatTime(sunset)}  hint={dayLengthStr} color={TOKENS.text}/>
        <Stat dot={false} label="Moon"    value={`${Math.round(moon.illumination * 100)}%`} hint={moon.label.toLowerCase()} color={TOKENS.text}/>
        {/* Phase cell renders as just the moon icon — no label, no caption.
            The Moon stat to its left already carries the textual phase data;
            the icon is the at-a-glance visual. Centered vertically inside
            the grid cell to balance against the label+value stacks. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <MoonPhaseIcon phase={moon.phase} size={48}/>
        </div>
      </div>
    </div>
  );
}

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
  'sharp-park': 'Two miles of heavy beachbreak fronting Pacifica, north of Linda Mar. Holds size — the pier sandbar on the north side keeps shape on bigger days. Low to mid tide, east winds offshore. Picks up swell from any direction.',
  'linda-mar': 'The NorCal learning wave. South end is the beginner zone; north end near the point has more shape and power.',
  'pedro-point': 'Big-wave left at the south end of Linda Mar (Little Pedro Point). The goofyfoot\'s Mavericks alternative — paddle-in scale. Starts firing at 6ft, holds 25ft+ on clean winter swells with SE wind. High tide. Limited parking through parkland — be polite.',
  'rockaway': 'Heavier and less forgiving than Linda Mar. Better surfers come here to escape the Linda Mar crowd.',
  'montara': 'Less-crowded alternative to Linda Mar. Can be heavy and punishing when the swell is up.',
  'princeton': 'Small SW-wedge next to the jetty. Most days playful — and Mavericks viewing zone from the parking lot.',
  'mavericks': 'One of the most dangerous waves on Earth. Only breaks a few times per year. This is a spectator advisory — not a "go surf" recommendation.',
  'francis-beach': 'Half Moon Bay\'s 4-mile crescent of beachbreak south of Pillar Point Harbor. "Too exposed" most days but mind-bogglingly good when conditions align — small clean W swell, E or glassy wind, high tide. Pay parking keeps the crowds down.',
  'martins': 'Beautiful cove, contested public access. Check current access status before the drive.',
  'ano-nuevo': 'The elephant seal colony makes this the highest shark-risk spot on the list. Wave quality can be excellent but risk calculus is different here.',
  'waddell': 'Workhorse of the Santa Cruz north coast. Reefs and beach break for any swell up to double-overhead. Watch for kites.',
  'scott-creek': 'North-end rocky point produces a consistent right on NW swells. Less crowded than anything in Santa Cruz proper.',
  'davenport': 'Scenic reef break. SW swells produce the best shape. Less consistent but higher quality when it’s on.',
  'four-mile': 'Less-crowded Santa Cruz beach break. Quality peaks on the right swell.',
  'steamer-point': 'The outside peak at the tip of Lighthouse Point. Heaviest wave at Steamer Lane — hollow thick rights with elevator drops. Best on a S swell or medium-low tide; gets backwash at high tide. Hyper-competitive take-off zone.',
  'steamer-middle': 'A cluster of submerged reefs (First, Second, Third) between The Point and The Slot. Best on N-NW swells. Heavy elevator drops with softer right shoulders; the lefts are steeper and hollower. Handles any size but the line-up shifts.',
  'steamer-indicators': 'Inside Middle Peak. A long classic right with speed sections and lips — the photogenic peak you see in magazines. Needs a lined-up W-NW swell and medium-low tide.',
  'steamer-slot': 'The innermost peak, take-off practically under the cliff with the gallery of onlookers above. Weepy right best on W swells and medium-low tide. Good for tubes and aerials but tends to close out.',
  'cowell': 'Santa Cruz’s learner wave. Very protected — usually tiny. When S swells arrive in summer, it can actually have shape.',
  'pleasure-sewer': 'Top of the point. Top-to-bottom barrel over a rock shelf — the most famous and most competitive section. Lefts are decent but rights are cleaner and longer. Heavily surfed by excellent shortboarders. Best with S and W swells and low tide.',
  'pleasure-first': 'Further down the point from Sewer. A utility right — predictable, surfable on a variety of swell angles and tides. Very crowded. Shifts around and can offer long slopey walls on a big day.',
  'pleasure-second': 'Further down again. Less of a peak, more of a lined-up wall than First. Not as stellar as Sewer, but it has its days. Popular with the grommet pack.',
  'pleasure-insides': 'Aka Middle Peak. Directly in front of Jack O\'Neill\'s house. A mushy reef peak occupied by longboarder cruisers and beginners. Best with lower mid tides to minimize backwash; kelp clogs the inside on big lows.',
  'jacks': '38th Avenue. On big winter swells and the occasional macking S swell, transforms into a world-class wave. On the biggest swells, you can ride from First Peak Pleasure Point all the way through Jack\'s.',
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
  'sharp-park': ['Heavy shorebreak', 'Rips', 'Sharks'],
  'linda-mar': ['Crowd', 'Rips'],
  'pedro-point': ['Big waves', 'Drowning risk', 'Rocks'],
  'rockaway': ['Strong currents', 'Rocks', 'Sharks'],
  'montara': ['Heavy shorebreak', 'Rips', 'Sharks'],
  'princeton': ['Jetty rocks', 'Crowd'],
  'mavericks': ['50ft+ waves', 'Rocks', 'Sharks', 'Drowning risk'],
  'francis-beach': ['Rips', 'Heavy shorebreak', 'Sharks'],
  'martins': ['Rocks', 'Access disputes'],
  'ano-nuevo': ['Great whites', 'Isolation', 'Rocks'],
  'waddell': ['Rocks', 'Rivermouth rips', 'Kites'],
  'scott-creek': ['Rocks', 'Rips'],
  'davenport': ['Rocks', 'Urchins'],
  'four-mile': ['Rocks', 'Rips', 'Sharks'],
  'steamer-point': ['Heavy localism', 'Big drops', 'Kelp', 'Backwash'],
  'steamer-middle': ['Heavy localism', 'Submerged reef', 'Kelp'],
  'steamer-indicators': ['Heavy localism', 'Crowds', 'Kelp'],
  'steamer-slot': ['Crowds', 'Close-outs', 'Cliff exposure', 'Kelp'],
  'cowell': ['Crowds', 'Kelp'],
  'pleasure-sewer': ['Rocks', 'Kelp', 'Heavy localism', 'Crowds'],
  'pleasure-first': ['Rocks', 'Kelp', 'Crowds'],
  'pleasure-second': ['Rocks', 'Kelp', 'Crowds'],
  'pleasure-insides': ['Kelp', 'Inside rocks', 'Backwash'],
  'jacks': ['Kelp', 'Long lulls', 'Sea otters', 'Crowds'],
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
        {/* Forecast caveat: explicit "the model doesn't know about X"
            note from surfers on the ground. Different visual flavor
            from the character note above so users understand it's
            actionable now (read this when reading the score) rather
            than reference info (what the spot is in general). */}
        {spot.localNote && (
          <div style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${TOKENS.border}`,
          }}>
            <div style={{
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: TOKENS.pacific, marginBottom: 6,
            }}>Forecast note</div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: TOKENS.text }}>
              {spot.localNote}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
