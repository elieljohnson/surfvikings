// Labs #07 — Stoke Field.
//
// Wave quality is not one number — it is period, direction, size and wind
// agreeing at the same moment. This lays one spot's surfable week out as a
// field of those composite scores and states the actual best window in the
// headline, not the topic.
//
// The score is the app's own computeScore. The build spec shipped its own
// quality() with hand-tuned weights — but that would be a third definition
// of "good" next to computeScore and the score the rest of Labs already
// uses. The intellectual content the spec is reaching for — a legible,
// additive, decomposable score — already lives in computeScore +
// scoreBreakdown. Hover any cell and it shows its work.

import React, { useMemo, useState } from 'react';
import { ForecastHour } from '../../lib/data';
import { useLabsConditions } from '../data';
import { VizFrame, GradientLegend, VizStatus, dayTick } from '../vizKit';
import { ScoreBreakdownPanel } from '../ScoreBreakdownPanel';
import { LABS, MONO, seqGreen } from '../theme';

const DAYS = 7;
const DAYLIGHT = [5, 19] as const;            // surfable hours shown
const HOURS = Array.from({ length: DAYLIGHT[1] - DAYLIGHT[0] + 1 }, (_, i) => DAYLIGHT[0] + i);

const CW = 28, CH = 24, LG = 44, TP = 6, BA = 20;
const GRID_W = HOURS.length * CW, GRID_H = DAYS * CH;
const SVG_W = LG + GRID_W + 4, SVG_H = TP + GRID_H + BA;

const timeLabel = (h: number) => `${((h + 11) % 12) + 1}${h >= 12 ? 'pm' : 'am'}`;

interface Cell { hour: ForecastHour }
type Grid = (Cell | null)[][];

export default function StokeField() {
  const { spots, timelines, loading, error, anchorMs } = useLabsConditions();
  const [spotId, setSpotId] = useState<string | null>(null);
  const [hover, setHover] = useState<{ day: number; hod: number } | null>(null);

  const pickedId = spotId ?? (spots.find((s) => s.id === 'ocean-beach')?.id ?? spots[0]?.id ?? '');
  const spot = spots.find((s) => s.id === pickedId) ?? null;

  const grid = useMemo<Grid>(() => {
    const g: Grid = Array.from({ length: DAYS }, () => new Array(HOURS.length).fill(null));
    if (!spot) return g;
    const day0 = new Date(anchorMs); day0.setHours(0, 0, 0, 0);
    for (const h of timelines[spot.id] ?? []) {
      const t = anchorMs + h.hour * 3600_000;
      const hod = new Date(t).getHours();
      if (hod < DAYLIGHT[0] || hod > DAYLIGHT[1]) continue;
      const d = new Date(t); d.setHours(0, 0, 0, 0);
      const day = Math.round((d.getTime() - day0.getTime()) / 86400_000);
      if (day >= 0 && day < DAYS) g[day][hod - DAYLIGHT[0]] = { hour: h };
    }
    return g;
  }, [spot, timelines, anchorMs]);

  const best = useMemo(() => {
    // Plain loops, not nested forEach closures — TypeScript only tracks a
    // let-reassignment for narrowing when it isn't deferred into a closure.
    let top: { day: number; hod: number; hour: ForecastHour } | null = null;
    for (let d = 0; d < DAYS; d++) {
      for (let i = 0; i < HOURS.length; i++) {
        const c = grid[d][i];
        if (c && (!top || c.hour.score > top.hour.score)) top = { day: d, hod: HOURS[i], hour: c.hour };
      }
    }
    return top;
  }, [grid]);

  const finding = useMemo(() => {
    if (!spot || loading) return 'Scoring the surfable week, hour by hour…';
    if (!best) return `${spot.name} stays flat all week — no window worth the paddle out.`;
    const b: { day: number; hod: number; hour: ForecastHour } = best;
    return `${spot.name}'s best window is ${dayTick(anchorMs, b.day)} ${timeLabel(b.hod)}`
      + ` — ${b.hour.swellHeight.toFixed(1)}ft @ ${Math.round(b.hour.swellPeriod)}s, scoring ${Math.round(b.hour.score)}.`;
  }, [spot, best, anchorMs, loading]);

  const detail = hover ?? (best ? { day: best.day, hod: best.hod } : null);
  const detailCell = detail ? grid[detail.day]?.[detail.hod - DAYLIGHT[0]] ?? null : null;

  return (
    <VizFrame
      kicker="07 · Stoke Field"
      finding={finding}
      question="Every other surf app shows period, size, swell and wind as four separate charts and leaves you to do the integration in your head. This designs the integration itself."
      source="Open-Meteo Marine + NOAA tide & wind · scored live by the Surf Vikings engine"
      legend={<GradientLegend ramp={seqGreen} lowLabel="poor" highLabel="firing" title="Quality 0–100" />}
      method={
        <>
          One spot, the surfable hours (5am–7pm) of the next seven days. Cell color is{' '}
          <strong style={{ color: LABS.ink }}>computeScore</strong> — an additive score, built
          as separable terms (direction, period, size, wind, tide) summed at the end. That is
          deliberate: an opaque single formula would score just as well and explain nothing.
          Because the terms are separable, hovering any cell decomposes it back into its parts.
          Legibility is the architecture, not a label.
        </>
      }
    >
      {loading && <VizStatus kind="loading" message="Scoring the week…" />}
      {error && !loading && <VizStatus kind="error" message={`Forecast unavailable — ${error}`} />}
      {!loading && !error && spot && (
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
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', display: 'block' }}
              onMouseLeave={() => setHover(null)}>
              {Array.from({ length: DAYS }, (_, d) => (
                <text key={d} x={LG - 8} y={TP + d * CH + CH / 2 + 3} textAnchor="end"
                  fontSize={10} fontFamily={MONO} fill={LABS.inkMute}>{dayTick(anchorMs, d)}</text>
              ))}
              {HOURS.map((h, i) => (h % 3 === 0
                ? <text key={h} x={LG + i * CW + CW / 2} y={SVG_H - 6} textAnchor="middle"
                    fontSize={8.5} fontFamily={MONO} fill={LABS.inkMute}>{timeLabel(h)}</text>
                : null))}
              {grid.map((row, d) => row.map((cell, i) => {
                const x = LG + i * CW, y = TP + d * CH;
                const isHover = hover?.day === d && hover?.hod === HOURS[i];
                const isBest = best?.day === d && best?.hod === HOURS[i];
                if (!cell) return <rect key={`${d}-${i}`} x={x} y={y} width={CW - 2} height={CH - 2}
                  fill="transparent" stroke={LABS.grid} strokeWidth={0.5} />;
                return (
                  <g key={`${d}-${i}`}>
                    <rect x={x} y={y} width={CW - 2} height={CH - 2} rx={2}
                      fill={seqGreen(Math.max(0.05, cell.hour.score / 100))}
                      stroke={isHover ? LABS.cyanHi : 'none'} strokeWidth={isHover ? 1.6 : 0}
                      onMouseEnter={() => setHover({ day: d, hod: HOURS[i] })}
                      style={{ cursor: 'pointer' }} />
                    {isBest && (
                      <rect x={x - 1.5} y={y - 1.5} width={CW + 1} height={CH + 1} rx={3} fill="none"
                        stroke={LABS.accent} strokeWidth={2} pointerEvents="none" />
                    )}
                  </g>
                );
              }))}
            </svg>
          </div>
          <div style={{ position: 'sticky', top: 78, alignSelf: 'start' }}>
            <ScoreBreakdownPanel
              spot={spot}
              hour={detailCell?.hour ?? null}
              whenLabel={detail ? `${dayTick(anchorMs, detail.day)} ${timeLabel(detail.hod)}` : ''}
              caption={hover ? 'Hovered hour' : 'Best window'}
            />
          </div>
        </div>
      )}
    </VizFrame>
  );
}
