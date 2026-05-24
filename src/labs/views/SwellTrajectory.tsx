// Labs #04 — Connected-Scatter Swell Trajectory.
//
// Bostock's connected scatter. x is period, y is height, and the line itself
// is time — so a single swell event traces a loop: long-period forerunners
// lift the period first, height follows, the swell peaks, then both collapse.
// The path color is wind quality, clean offshore bleeding to blown-out
// onshore.
//
// A connected scatter is unreadable without heavy labeling — that isn't
// optional, it's the technique. So the building / peak / fading moments are
// called out directly on the path.
//
// Note on honesty: the spec wants measured buoy data for a day you surfed.
// NDBC's archive isn't reachable from the browser (no CORS), so this runs on
// the live Open-Meteo forecast and isolates the week's dominant swell event.
// It is a forecast trajectory, and the source line says so.

import React, { useMemo, useState } from 'react';
import { ForecastHour, metricQuality } from '../../lib/data';
import { useLabsConditions } from '../data';
import { VizFrame, GradientLegend, VizStatus, dayTick } from '../vizKit';
import { ScoreBreakdownPanel } from '../ScoreBreakdownPanel';
import { LABS, MONO, ramp } from '../theme';

const VB_W = 680, VB_H = 432;
const M = { l: 50, r: 20, t: 26, b: 46 };
const PW = VB_W - M.l - M.r, PH = VB_H - M.t - M.b;
const EVENT_HALF = 42;   // hours either side of the height peak

/** Wind quality ramp — blown-out onshore (warm) → clean offshore (cyan). */
const windRamp = (q: number) => ramp(['#E5893C', '#C99A52', '#69ADBA', '#62E4CC'], q);

/** Centered moving average — denoises the diurnal wiggle so the swell's
 *  trend line reads. Wind color stays raw; the afternoon blow-out is data. */
function smooth(arr: number[], win: number): number[] {
  const half = Math.floor(win / 2);
  return arr.map((_, i) => {
    let s = 0, c = 0;
    for (let j = i - half; j <= i + half; j++) if (j >= 0 && j < arr.length) { s += arr[j]; c++; }
    return s / c;
  });
}

interface Pt { x: number; y: number; period: number; height: number; windQ: number; hour: ForecastHour }
interface TrajModel {
  pts: Pt[]; pMin: number; pMax: number; hMax: number;
  xs: (p: number) => number; ys: (h: number) => number; peakIdx: number;
}

function hourLabel(anchorMs: number, h: number): string {
  const d = new Date(anchorMs + h * 3600_000);
  const hr = d.getHours();
  return `${dayTick(anchorMs, Math.floor(h / 24))} ${((hr + 11) % 12) + 1}${hr >= 12 ? 'pm' : 'am'}`;
}

export default function SwellTrajectory() {
  const { spots, timelines, loading, error, anchorMs } = useLabsConditions();
  const [spotId, setSpotId] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  // Default to the spot with the widest height swing — the most dramatic loop.
  const defaultId = useMemo(() => {
    let best = spots[0]?.id ?? '';
    let span = -1;
    for (const s of spots) {
      const tl = timelines[s.id] ?? [];
      if (!tl.length) continue;
      const hs = tl.map((h) => h.swellHeight);
      const sp = Math.max(...hs) - Math.min(...hs);
      if (sp > span) { span = sp; best = s.id; }
    }
    return best;
  }, [spots, timelines]);

  const pickedId = spotId ?? defaultId;
  const spot = spots.find((s) => s.id === pickedId);

  const model = useMemo<TrajModel | null>(() => {
    const s = spots.find((x) => x.id === pickedId);
    if (!s) return null;
    const tl = timelines[s.id] ?? [];
    if (tl.length < 10) return null;
    let peakI = 0;
    tl.forEach((h, i) => { if (h.swellHeight > tl[peakI].swellHeight) peakI = i; });
    const lo = Math.max(0, peakI - EVENT_HALF);
    const hi = Math.min(tl.length - 1, peakI + EVENT_HALF);
    const event = tl.slice(lo, hi + 1);

    const heights = smooth(event.map((h) => h.swellHeight), 5);
    const periods = smooth(event.map((h) => h.swellPeriod), 5);
    const pMin = Math.min(...periods) - 0.8, pMax = Math.max(...periods) + 0.8;
    const hMax = Math.max(...heights) * 1.12 + 0.3;
    const xs = (p: number) => M.l + ((p - pMin) / (pMax - pMin || 1)) * PW;
    const ys = (h: number) => M.t + PH - ((h - 0) / (hMax || 1)) * PH;

    const pts: Pt[] = event.map((h, i) => ({
      x: xs(periods[i]), y: ys(heights[i]),
      period: periods[i], height: heights[i],
      windQ: metricQuality(s, h, 'windSpeed'), hour: h,
    }));
    let peakIdx = 0;
    pts.forEach((p, i) => { if (p.height > pts[peakIdx].height) peakIdx = i; });
    return { pts, pMin, pMax, hMax, xs, ys, peakIdx };
  }, [pickedId, spots, timelines]);

  const finding = useMemo(() => {
    if (!spot || !model) return 'Tracing the life-shape of this week’s dominant swell…';
    const peak = model.pts[model.peakIdx];
    const endQ = model.pts[model.pts.length - 1].windQ;
    const fate = endQ < 0.4 ? 'the afternoon wind tears it apart' : 'it eases off clean';
    return `${spot.name}’s swell builds to ${peak.height.toFixed(1)}ft at ${Math.round(peak.period)}s, then ${fate}.`;
  }, [spot, model]);

  return (
    <VizFrame
      kicker="04 · Swell Trajectory"
      finding={finding}
      question="A swell isn’t a number, it’s an event with a shape — it builds, peaks, and blows itself out. What does that life look like?"
      source="Open-Meteo Marine forecast · the week’s dominant swell event, 5-hour smoothed"
      legend={<GradientLegend ramp={windRamp} lowLabel="blown" highLabel="clean" title="Wind quality along the path" />}
      method={
        <>
          The path is period (x) against height (y); the line is time, hour by hour. Height and
          period are smoothed with a 5-hour centered mean so the swell trend reads through the
          diurnal wiggle. Color is <strong style={{ color: LABS.ink }}>metricQuality</strong>'s
          wind term — the app's own offshore/onshore test, raw and unsmoothed, because the
          afternoon blow-out is the story. Hover any point to score that exact hour.
        </>
      }
    >
      {loading && <VizStatus kind="loading" message="Fetching the swell event…" />}
      {error && !loading && <VizStatus kind="error" message={`Forecast unavailable — ${error}`} />}
      {!loading && !error && spot && model && (
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 280px)' }}>
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {spots.map((s) => (
                <button key={s.id} onClick={() => { setSpotId(s.id); setHover(null); }}
                  style={{
                    fontFamily: MONO, fontSize: 11, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                    background: s.id === pickedId ? LABS.cyan : LABS.panel2,
                    color: s.id === pickedId ? LABS.bg : LABS.inkDim,
                    border: `1px solid ${s.id === pickedId ? LABS.cyan : LABS.line}`,
                  }}>{s.name}</button>
              ))}
            </div>
            <TrajectoryChart model={model} anchorMs={anchorMs} hover={hover} onHover={setHover} />
          </div>
          <div style={{ position: 'sticky', top: 78, alignSelf: 'start' }}>
            <ScoreBreakdownPanel
              spot={spot}
              hour={model.pts[hover ?? model.peakIdx].hour}
              whenLabel={hourLabel(anchorMs, model.pts[hover ?? model.peakIdx].hour.hour)}
              caption={hover != null ? 'Hovered hour' : 'Swell peak'}
            />
          </div>
        </div>
      )}
    </VizFrame>
  );
}

function TrajectoryChart({
  model, anchorMs, hover, onHover,
}: {
  model: TrajModel;
  anchorMs: number;
  hover: number | null;
  onHover: (i: number | null) => void;
}) {
  const { pts, pMin, pMax, hMax, peakIdx } = model;
  const pTicks = axisTicks(pMin, pMax, 5);
  const hTicks = axisTicks(0, hMax, 5);

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', display: 'block' }}>
      {pTicks.map((p) => {
        const x = model.xs(p);
        return <g key={`px${p}`}>
          <line x1={x} y1={M.t} x2={x} y2={M.t + PH} stroke={LABS.grid} strokeWidth={0.6} />
          <text x={x} y={M.t + PH + 16} textAnchor="middle" fontSize={9} fontFamily={MONO} fill={LABS.inkMute}>{p}s</text>
        </g>;
      })}
      {hTicks.map((h) => {
        const y = model.ys(h);
        return <g key={`hy${h}`}>
          <line x1={M.l} y1={y} x2={M.l + PW} y2={y} stroke={LABS.grid} strokeWidth={0.6} />
          <text x={M.l - 8} y={y + 3} textAnchor="end" fontSize={9} fontFamily={MONO} fill={LABS.inkMute}>{h}ft</text>
        </g>;
      })}
      <text x={M.l + PW / 2} y={VB_H - 6} textAnchor="middle" fontSize={10} fontFamily={MONO} fill={LABS.inkDim}>
        swell period →
      </text>
      <text x={14} y={M.t + PH / 2} textAnchor="middle" fontSize={10} fontFamily={MONO} fill={LABS.inkDim}
        transform={`rotate(-90 14 ${M.t + PH / 2})`}>swell height →</text>

      {/* the trajectory — one colored segment per hour */}
      {pts.slice(1).map((p, i) => {
        const a = pts[i];
        return <line key={i} x1={a.x} y1={a.y} x2={p.x} y2={p.y}
          stroke={windRamp((a.windQ + p.windQ) / 2)} strokeWidth={2.4} strokeLinecap="round" />;
      })}

      {/* time dots every 6h */}
      {pts.map((p, i) => (i % 6 === 0 || i === pts.length - 1)
        ? <circle key={i} cx={p.x} cy={p.y} r={2.4} fill={LABS.bg} stroke={windRamp(p.windQ)} strokeWidth={1.4} />
        : null)}

      {/* hover hit-targets + marker */}
      {pts.map((p, i) => (
        <circle key={`hit${i}`} cx={p.x} cy={p.y} r={7} fill="transparent"
          onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)} style={{ cursor: 'pointer' }} />
      ))}
      {hover != null && (
        <circle cx={pts[hover].x} cy={pts[hover].y} r={4.5} fill="none" stroke={LABS.cyanHi} strokeWidth={1.6} />
      )}

      {/* direct annotations — the technique, not decoration */}
      <Anno x={pts[0].x} y={pts[0].y} label="Building" sub={hourLabel(anchorMs, pts[0].hour.hour)} side="below" />
      <Anno x={pts[peakIdx].x} y={pts[peakIdx].y}
        label={`Peak · ${pts[peakIdx].height.toFixed(1)}ft @ ${Math.round(pts[peakIdx].period)}s`}
        sub={hourLabel(anchorMs, pts[peakIdx].hour.hour)} side="above" />
      <Anno x={pts[pts.length - 1].x} y={pts[pts.length - 1].y}
        label={pts[pts.length - 1].windQ < 0.4 ? 'Blown out' : 'Fading'}
        sub={hourLabel(anchorMs, pts[pts.length - 1].hour.hour)} side="below" />
      <circle cx={pts[0].x} cy={pts[0].y} r={3.6} fill={LABS.bg} stroke={LABS.ink} strokeWidth={1.4} />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3.8} fill={LABS.ink} />
    </svg>
  );
}

function Anno({ x, y, label, sub, side }: { x: number; y: number; label: string; sub: string; side: 'above' | 'below' }) {
  const dy = side === 'above' ? -10 : 20;
  const anchor = x > VB_W - 120 ? 'end' : x < 120 ? 'start' : 'middle';
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + (side === 'above' ? -6 : 6)} stroke={LABS.lineHi} strokeWidth={1} />
      <text x={x} y={y + dy} textAnchor={anchor} fontSize={11} fontWeight={700} fontFamily={MONO} fill={LABS.ink}>{label}</text>
      <text x={x} y={y + dy + 11} textAnchor={anchor} fontSize={9} fontFamily={MONO} fill={LABS.inkMute}>{sub}</text>
    </g>
  );
}

/** Nice round axis ticks across [lo,hi]. */
function axisTicks(lo: number, hi: number, count: number): number[] {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag;
  const start = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += step) out.push(Math.round(v * 10) / 10);
  return out;
}
