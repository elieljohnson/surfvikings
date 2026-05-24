// Labs #02 — Quality-Score Window Grid.
//
// Tufte small multiples. Hour-of-day across day-of-week, one identical grid
// per spot, so the eye compares breaks at a glance. Cell color is the app's
// own quality score on a single-hue green ramp — deuteranopia-safe, no
// traffic-light red/green.
//
// This is the view that validates the scoring weights. If a cell says
// "great" on a day you know was junk, the weights are wrong, and you see it
// instantly. That is why the spec says build this one first.

import React, { useMemo, useState } from 'react';
import SunCalc from 'suncalc';
import { ForecastHour, findBestWindows } from '../../lib/data';
import { useLabsConditions } from '../data';
import { LabsSpot } from '../spots';
import { VizFrame, GradientLegend, VizStatus, dayTick } from '../vizKit';
import { ScoreBreakdownPanel } from '../ScoreBreakdownPanel';
import { LABS, MONO, seqGreen } from '../theme';

const DAYS = 7;
const HOURS = 24;

interface Cell { hour: ForecastHour }
type SpotGrid = (Cell | null)[][]; // [day][hourOfDay]

interface HoverState { spotId: string; day: number; hod: number }

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty'];
const numWord = (n: number) => (n >= 0 && n <= 20 ? NUM_WORDS[n] : String(n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const timeLabel = (hod: number) => `${((hod + 11) % 12) + 1}${hod >= 12 ? 'pm' : 'am'}`;

export default function WindowGrid() {
  const { spots, timelines, loading, error, anchorMs } = useLabsConditions();
  const [hover, setHover] = useState<HoverState | null>(null);

  // Bin every forecast hour into a [day][hourOfDay] grid per spot.
  const grids = useMemo(() => {
    const day0 = new Date(anchorMs); day0.setHours(0, 0, 0, 0);
    const day0Ms = day0.getTime();
    const out: Record<string, SpotGrid> = {};
    for (const spot of spots) {
      const grid: SpotGrid = Array.from({ length: DAYS }, () => new Array(HOURS).fill(null));
      const tl = timelines[spot.id] ?? [];
      for (const h of tl) {
        const t = anchorMs + h.hour * 3600_000;
        const d = new Date(t); d.setHours(0, 0, 0, 0);
        const day = Math.round((d.getTime() - day0Ms) / 86400_000);
        if (day < 0 || day >= DAYS) continue;
        grid[day][new Date(t).getHours()] = { hour: h };
      }
      out[spot.id] = grid;
    }
    return out;
  }, [spots, timelines, anchorMs]);

  // The single best cell across all spots — the callout ring + panel default.
  const best = useMemo(() => {
    let top: { spotId: string; day: number; hod: number; score: number } | null = null;
    for (const spot of spots) {
      const grid = grids[spot.id];
      if (!grid) continue;
      for (let d = 0; d < DAYS; d++) for (let h = 0; h < HOURS; h++) {
        const c = grid[d][h];
        if (c && (!top || c.hour.score > top.score)) {
          top = { spotId: spot.id, day: d, hod: h, score: c.hour.score };
        }
      }
    }
    return top;
  }, [spots, grids]);

  // Data-driven finding — no hardcoded claim that could be false.
  const finding = useMemo(() => {
    if (!spots.length || loading) return 'Reading the week ahead across six NorCal breaks…';
    let windows = 0, goodish = 0, dawnish = 0;
    for (const spot of spots) {
      const tl = timelines[spot.id] ?? [];
      windows += findBestWindows(tl).filter((w) => w.peak >= 55).length;
      for (const h of tl.slice(0, DAYS * HOURS)) {
        if (h.score >= 50) {
          goodish++;
          const hod = new Date(anchorMs + h.hour * 3600_000).getHours();
          if (hod >= 5 && hod < 9) dawnish++;
        }
      }
    }
    if (windows === 0) return 'No window crosses the surfable line this week — across all six breaks, the forecast stays flat.';
    const dawnHeavy = goodish > 0 && dawnish / goodish > 0.5;
    const w = windows === 1 ? 'window' : 'windows';
    return `${cap(numWord(windows))} surfable ${w} across six breaks this week`
      + (dawnHeavy ? ', and most of them are dawn patrols.' : '.');
  }, [spots, timelines, anchorMs, loading]);

  const detail = hover ?? (best ? { spotId: best.spotId, day: best.day, hod: best.hod } : null);
  const detailSpot = detail ? spots.find((s) => s.id === detail.spotId) ?? null : null;
  const detailCell = detail && detailSpot ? grids[detailSpot.id]?.[detail.day]?.[detail.hod] ?? null : null;
  const detailWhen = detail ? `${dayTick(anchorMs, detail.day)} ${timeLabel(detail.hod)}` : '';

  return (
    <VizFrame
      kicker="02 · Window Grid"
      finding={finding}
      question="When and where do swell, wind and tide converge into something worth paddling out for? Each grid is one break; each cell, one hour."
      source="Open-Meteo Marine + NOAA tide & wind · scored live by the Surf Vikings engine"
      legend={<GradientLegend ramp={seqGreen} lowLabel="flat" highLabel="epic" title="Quality 0–100" />}
      method={
        <>
          The color is <strong style={{ color: LABS.ink }}>computeScore</strong> — the forecast app's
          own engine, not a second one built for this chart. It weighs swell direction (30),
          period (20), size (15) and wind (30), adds a tide score (13), then subtracts penalties
          for chop and hazards. Point at any cell to open the full breakdown on the right: every
          component, every penalty, in plain English. A composite score with no shown method is
          untrustworthy — so the method is one hover away, always.
        </>
      }
    >
      {loading && <VizStatus kind="loading" message="Fetching the 7-day forecast…" />}
      {error && !loading && <VizStatus kind="error" message={`Forecast unavailable — ${error}`} />}
      {!loading && !error && (
        <div style={{
          display: 'grid', gap: 18,
          gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 280px)',
        }}>
          <div style={{
            display: 'grid', gap: 12,
            gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))',
            alignContent: 'start',
          }}>
            {spots.map((spot) => (
              <SpotFacet
                key={spot.id}
                spot={spot}
                grid={grids[spot.id]}
                anchorMs={anchorMs}
                hover={hover?.spotId === spot.id ? hover : null}
                best={best?.spotId === spot.id ? best : null}
                onHover={setHover}
              />
            ))}
          </div>
          <div style={{ position: 'sticky', top: 78, alignSelf: 'start' }}>
            <ScoreBreakdownPanel
              spot={detailSpot}
              hour={detailCell?.hour ?? null}
              whenLabel={detailWhen}
              caption={hover ? 'Hovered hour' : 'Best window this week'}
            />
          </div>
        </div>
      )}
    </VizFrame>
  );
}

// ── one spot's small multiple ───────────────────────────────────────────

const CW = 13, CH = 13, LG = 34, TP = 5, BA = 17;
const GRID_W = HOURS * CW, GRID_H = DAYS * CH;
const SVG_W = LG + GRID_W + 4, SVG_H = TP + GRID_H + BA;

function SpotFacet({
  spot, grid, anchorMs, hover, best, onHover,
}: {
  spot: LabsSpot;
  grid: SpotGrid | undefined;
  anchorMs: number;
  hover: HoverState | null;
  best: { day: number; hod: number } | null;
  onHover: (h: HoverState | null) => void;
}) {
  if (!grid) return null;
  return (
    <div
      style={{ background: LABS.panel2, border: `1px solid ${LABS.line}`, borderRadius: 10, padding: '10px 10px 6px' }}
      onMouseLeave={() => onHover(null)}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: LABS.ink, marginBottom: 2 }}>{spot.name}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: LABS.inkMute, marginBottom: 6 }}>
        {spot.regionLabel} · wants {spot.viz.idealSwellDir}°
      </div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', display: 'block' }}>
        {/* day labels */}
        {Array.from({ length: DAYS }, (_, d) => (
          <text key={d} x={LG - 6} y={TP + d * CH + CH / 2 + 3} textAnchor="end"
            fontSize={8.5} fontFamily={MONO} fill={LABS.inkMute}>
            {dayTick(anchorMs, d)}
          </text>
        ))}
        {/* hour ticks */}
        {[0, 6, 12, 18].map((hod) => (
          <text key={hod} x={LG + hod * CW} y={SVG_H - 5} textAnchor="middle"
            fontSize={8} fontFamily={MONO} fill={LABS.inkMute}>
            {timeLabel(hod)}
          </text>
        ))}
        {/* cells */}
        {grid.map((row, d) => row.map((cell, h) => {
          const x = LG + h * CW, y = TP + d * CH;
          const isHover = hover?.day === d && hover?.hod === h;
          if (!cell) {
            return <rect key={`${d}-${h}`} x={x} y={y} width={CW - 1} height={CH - 1}
              fill="transparent" stroke={LABS.grid} strokeWidth={0.5} />;
          }
          return (
            <rect
              key={`${d}-${h}`}
              x={x} y={y} width={CW - 1} height={CH - 1}
              fill={seqGreen(Math.max(0.05, cell.hour.score / 100))}
              stroke={isHover ? LABS.cyanHi : 'none'}
              strokeWidth={isHover ? 1.5 : 0}
              onMouseEnter={() => onHover({ spotId: spot.id, day: d, hod: h })}
              style={{ cursor: 'pointer' }}
            />
          );
        }))}
        {/* sunrise reference — a faint tick per day */}
        {Array.from({ length: DAYS }, (_, d) => {
          const noon = new Date(anchorMs + d * 86400_000); noon.setHours(12, 0, 0, 0);
          const sr = SunCalc.getTimes(noon, spot.lat, spot.lng).sunrise;
          if (!sr || isNaN(sr.getTime())) return null;
          const frac = sr.getHours() + sr.getMinutes() / 60;
          const x = LG + frac * CW;
          return <line key={`sr-${d}`} x1={x} y1={TP + d * CH} x2={x} y2={TP + d * CH + CH - 1}
            stroke={LABS.accent} strokeWidth={0.7} strokeDasharray="1.5 1.5" opacity={0.55} />;
        })}
        {/* best-window callout ring */}
        {best && (
          <rect x={LG + best.hod * CW - 1.5} y={TP + best.day * CH - 1.5}
            width={CW + 2} height={CH + 2} fill="none"
            stroke={LABS.accent} strokeWidth={1.5} rx={2} />
        )}
      </svg>
    </div>
  );
}
