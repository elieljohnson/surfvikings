// Labs #05 — Convergence Timeline.
//
// Tide, swell energy and wind are three independent clocks. A surfable
// window is when all three happen to agree. This view stacks them as horizon
// bands — a dense time-series form that trades a little precision for a lot
// of density — and calls out the columns where they actually converge.
//
// Horizon chart: each variable's range is sliced into 3 bands, folded to one
// baseline, each band darker than the last. Three bands, never more — past
// that, nobody can read it cold.

import React, { useMemo, useState } from 'react';
import SunCalc from 'suncalc';
import { ForecastHour } from '../../lib/data';
import { useLabsConditions } from '../data';
import { LabsSpot } from '../spots';
import { VizFrame, Legend, VizStatus, dayTick } from '../vizKit';
import { LABS, MONO, seqTide, seqCyan, ramp } from '../theme';

const CONVERGE = 55;           // the "worth the drive" threshold — tunable
const BANDS = 3;
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen', 'twenty'];
const numWord = (n: number) => (n >= 0 && n <= 20 ? NUM[n] : String(n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Wind reads as a penalty, so its ramp runs dark → warm: more wind, more heat.
const windRamp = (t: number) => ramp(['#1A2026', '#5A4322', '#9A6B1E', '#E0962E'], t);

export default function ConvergenceTimeline() {
  const { spots, timelines, loading, error, anchorMs } = useLabsConditions();

  // Shared maxima across all spots so the rows compare honestly.
  const scale = useMemo(() => {
    let tide = 6, energy = 1, wind = 10;
    for (const spot of spots) {
      for (const h of timelines[spot.id] ?? []) {
        tide = Math.max(tide, h.tideHeight);
        energy = Math.max(energy, h.swellHeight * h.swellPeriod);
        wind = Math.max(wind, h.windSpeed);
      }
    }
    return { tide, energy, wind };
  }, [spots, timelines]);

  const finding = useMemo(() => {
    if (!spots.length || loading) return 'Lining up tide, swell and wind across the week…';
    let runs = 0;
    for (const spot of spots) {
      let inRun = false;
      for (const h of timelines[spot.id] ?? []) {
        if (h.score >= CONVERGE) { if (!inRun) { runs++; inRun = true; } }
        else inRun = false;
      }
    }
    if (runs === 0) return 'Across six breaks and seven days, the three clocks never quite agree — no window opens.';
    return `Across six breaks this week, tide, swell and wind line up into a real window just ${numWord(runs)} ${runs === 1 ? 'time' : 'times'}.`;
  }, [spots, timelines, loading]);

  return (
    <VizFrame
      kicker="05 · Convergence Timeline"
      finding={cap(finding)}
      question="Three independent variables, three separate rhythms. Where on the week do they actually align into a window?"
      source="Open-Meteo Marine + NOAA tide + NWS wind · 7-day hourly"
      legend={<Legend items={[
        { color: seqTide(0.85), label: 'Tide' },
        { color: seqCyan(0.85), label: 'Wave energy' },
        { color: windRamp(0.9), label: 'Wind' },
        { color: LABS.accent, label: 'Convergence' },
      ]} />}
      method={
        <>
          Each row is one break. Within it, three horizon strips: tide height, wave energy
          (height × period) and wind speed. A horizon strip folds a series into{' '}
          <strong style={{ color: LABS.ink }}>{BANDS} bands</strong> stacked on one baseline —
          taller, darker stacks mean higher values. The amber columns are where the quality
          score crosses <strong style={{ color: LABS.ink }}>{CONVERGE}</strong> — the personal
          "worth the drive" line. Night is shaded faintly behind each row.
        </>
      }
    >
      {loading && <VizStatus kind="loading" message="Fetching tide, swell and wind…" />}
      {error && !loading && <VizStatus kind="error" message={`Forecast unavailable — ${error}`} />}
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {spots.map((spot) => (
            <SpotRow key={spot.id} spot={spot} timeline={timelines[spot.id] ?? []}
              anchorMs={anchorMs} scale={scale} />
          ))}
        </div>
      )}
    </VizFrame>
  );
}

// ── one spot row ────────────────────────────────────────────────────────

const VB_W = 720, LG = 64, RPAD = 10;
const CHART_W = VB_W - LG - RPAD;
const STRIP_H = 21, STRIP_GAP = 3, TOP = 6;
const ROW_H = TOP + STRIP_H * 3 + STRIP_GAP * 2 + 16;

/** Horizon band areas — band b drawn from baseline, height = the clamped
 *  excess (v − b·step) scaled so one step fills the strip. */
function horizonPaths(vals: number[], vmax: number, baseY: number): string[] {
  const step = vmax / BANDS || 1;
  const x = (i: number) => LG + (i / Math.max(1, vals.length - 1)) * CHART_W;
  const paths: string[] = [];
  for (let b = 0; b < BANDS; b++) {
    let d = `M ${x(0)} ${baseY}`;
    for (let i = 0; i < vals.length; i++) {
      const h = Math.max(0, Math.min(step, vals[i] - b * step)) / step * STRIP_H;
      d += ` L ${x(i).toFixed(1)} ${(baseY - h).toFixed(1)}`;
    }
    d += ` L ${x(vals.length - 1)} ${baseY} Z`;
    paths.push(d);
  }
  return paths;
}

function SpotRow({
  spot, timeline, anchorMs, scale,
}: {
  spot: LabsSpot;
  timeline: ForecastHour[];
  anchorMs: number;
  scale: { tide: number; energy: number; wind: number };
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = timeline.length;
  const xAt = (i: number) => LG + (i / Math.max(1, n - 1)) * CHART_W;

  const strips = useMemo(() => {
    if (!n) return null;
    const tide = timeline.map((h) => h.tideHeight);
    const energy = timeline.map((h) => h.swellHeight * h.swellPeriod);
    const wind = timeline.map((h) => h.windSpeed);
    return [
      { label: 'Tide', y: TOP + STRIP_H, paths: horizonPaths(tide, scale.tide, TOP + STRIP_H), ramp: seqTide },
      { label: 'Energy', y: TOP + STRIP_H * 2 + STRIP_GAP, paths: horizonPaths(energy, scale.energy, TOP + STRIP_H * 2 + STRIP_GAP), ramp: seqCyan },
      { label: 'Wind', y: TOP + STRIP_H * 3 + STRIP_GAP * 2, paths: horizonPaths(wind, scale.wind, TOP + STRIP_H * 3 + STRIP_GAP * 2), ramp: windRamp },
    ];
  }, [timeline, scale, n]);

  // Contiguous convergence runs.
  const runs = useMemo(() => {
    const out: Array<{ s: number; e: number }> = [];
    let start = -1;
    timeline.forEach((h, i) => {
      if (h.score >= CONVERGE) { if (start < 0) start = i; }
      else if (start >= 0) { out.push({ s: start, e: i - 1 }); start = -1; }
    });
    if (start >= 0) out.push({ s: start, e: n - 1 });
    return out;
  }, [timeline, n]);

  // Night shading — one rect per night, between sunset and next sunrise.
  const nights = useMemo(() => {
    if (!n) return [] as Array<{ x1: number; x2: number }>;
    const segs: Array<{ x1: number; x2: number }> = [];
    for (let i = 1; i < n; i++) {
      const t = new Date(anchorMs + timeline[i].hour * 3600_000);
      const day = new Date(t); day.setHours(12, 0, 0, 0);
      const { sunrise, sunset } = SunCalc.getTimes(day, spot.lat, spot.lng);
      const isNight = t < sunrise || t > sunset;
      const prev = segs[segs.length - 1];
      if (isNight) {
        if (prev && prev.x2 >= xAt(i - 1) - 0.1) prev.x2 = xAt(i);
        else segs.push({ x1: xAt(i - 1), x2: xAt(i) });
      }
    }
    return segs;
  }, [timeline, anchorMs, spot.lat, spot.lng, n]);

  if (!strips) return null;
  const hv = hover != null ? timeline[hover] : null;
  const baseEnd = TOP + STRIP_H * 3 + STRIP_GAP * 2;

  return (
    <div style={{ background: LABS.panel2, border: `1px solid ${LABS.line}`, borderRadius: 10, padding: '8px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: LABS.ink }}>{spot.name}</span>
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: hv ? LABS.ink : LABS.inkMute }}>
          {hv
            ? `${dayTick(anchorMs, Math.floor(hv.hour / 24))} · tide ${hv.tideHeight.toFixed(1)}ft · ${hv.swellHeight.toFixed(1)}ft@${Math.round(hv.swellPeriod)}s · wind ${Math.round(hv.windSpeed)}kt · score ${Math.round(hv.score)}`
            : `${runs.length} convergence ${runs.length === 1 ? 'window' : 'windows'}`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${VB_W} ${ROW_H}`}
        style={{ width: '100%', display: 'block' }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const fx = ((e.clientX - r.left) / r.width) * VB_W;
          const i = Math.round(((fx - LG) / CHART_W) * (n - 1));
          setHover(i >= 0 && i < n ? i : null);
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* night shading */}
        {nights.map((seg, i) => (
          <rect key={i} x={seg.x1} y={TOP} width={Math.max(0, seg.x2 - seg.x1)} height={STRIP_H * 3 + STRIP_GAP * 2}
            fill="#000000" opacity={0.22} />
        ))}
        {/* convergence columns */}
        {runs.map((run, i) => (
          <g key={i}>
            <rect x={xAt(run.s)} y={TOP} width={Math.max(1.5, xAt(run.e) - xAt(run.s))}
              height={STRIP_H * 3 + STRIP_GAP * 2} fill={LABS.accent} opacity={0.16} />
            <rect x={xAt(run.s)} y={TOP} width={Math.max(1.5, xAt(run.e) - xAt(run.s))}
              height={STRIP_H * 3 + STRIP_GAP * 2} fill="none" stroke={LABS.accent} strokeWidth={0.7} opacity={0.6} />
            <text x={xAt(run.s)} y={TOP - 1} fontSize={7.5} fontFamily={MONO} fill={LABS.accent}>
              {dayTick(anchorMs, Math.floor(timeline[run.s].hour / 24))}
            </text>
          </g>
        ))}
        {/* horizon strips */}
        {strips.map((strip) => (
          <g key={strip.label}>
            {strip.paths.map((d, b) => (
              <path key={b} d={d} fill={strip.ramp(0.3 + (b / (BANDS - 1)) * 0.65)} />
            ))}
            <line x1={LG} y1={strip.y} x2={LG + CHART_W} y2={strip.y} stroke={LABS.line} strokeWidth={0.6} />
            <text x={LG - 8} y={strip.y - STRIP_H / 2 + 3} textAnchor="end"
              fontSize={8.5} fontFamily={MONO} fill={LABS.inkMute}>{strip.label}</text>
          </g>
        ))}
        {/* day ticks */}
        {Array.from({ length: 7 }, (_, d) => {
          const i = timeline.findIndex((h) => Math.floor(h.hour / 24) === d);
          if (i < 0) return null;
          return (
            <text key={d} x={xAt(i)} y={ROW_H - 4} fontSize={8} fontFamily={MONO} fill={LABS.inkMute}>
              {dayTick(anchorMs, d)}
            </text>
          );
        })}
        {/* hover cursor */}
        {hover != null && (
          <line x1={xAt(hover)} y1={TOP} x2={xAt(hover)} y2={baseEnd}
            stroke={LABS.cyanHi} strokeWidth={1} opacity={0.85} />
        )}
      </svg>
    </div>
  );
}
