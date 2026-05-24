// Labs #03 — The Swell Rose.
//
// A polar chart, compass-oriented: N at top, clockwise, the way a surfer
// reads a forecast. Each petal is a 22.5° slice of the horizon; its reach is
// how many forecast hours bring swell from that direction this week; its
// color is how good those hours score. Behind the petals, a translucent
// wedge marks the window this break actually wants — local knowledge drawn
// as geometry.
//
// Petal AREA is proportional to hour count (radius scales as the square
// root), because a polar chart's outer rings cover more area per degree —
// radius-proportional bars would lie.

import React, { useMemo, useState } from 'react';
import { ForecastHour } from '../../lib/data';
import { useLabsConditions } from '../data';
import { LabsSpot } from '../spots';
import { angleDelta } from '../../lib/data';
import { VizFrame, GradientLegend, VizStatus } from '../vizKit';
import { ScoreBreakdownPanel } from '../ScoreBreakdownPanel';
import { LABS, MONO, seqGreen } from '../theme';

const BINS = 16;            // 22.5° compass sectors
const BIN_DEG = 360 / BINS;

interface Bin {
  hours: ForecastHour[];
  meanQuality: number;       // 0..1
  best: ForecastHour | null;
}
interface HoverState { spotId: string; bin: number }

const CARD = (deg: number) => {
  const c = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return c[Math.round(deg / 22.5) % 16];
};

/** Polar → cartesian. Compass convention: 0° = up (N), clockwise. */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}
/** Filled wedge from the center spanning [deg1, deg2]. */
function wedge(cx: number, cy: number, r: number, deg1: number, deg2: number): string {
  const [x1, y1] = polar(cx, cy, r, deg1);
  const [x2, y2] = polar(cx, cy, r, deg2);
  const large = deg2 - deg1 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

export default function SwellRose() {
  const { spots, timelines, loading, error } = useLabsConditions();
  const [hover, setHover] = useState<HoverState | null>(null);

  // Per spot: 16 direction bins + the fraction of hours inside the window.
  const data = useMemo(() => {
    const bySpot: Record<string, { bins: Bin[]; inWindow: number }> = {};
    let maxCount = 1;
    for (const spot of spots) {
      const bins: Bin[] = Array.from({ length: BINS }, () => ({ hours: [], meanQuality: 0, best: null }));
      const tl = timelines[spot.id] ?? [];
      let inWin = 0;
      for (const h of tl) {
        const b = Math.round(h.swellDirection / BIN_DEG) % BINS;
        bins[b].hours.push(h);
        if (angleDelta(h.swellDirection, spot.viz.idealSwellDir) <= spot.viz.swellWindow) inWin++;
      }
      for (const bin of bins) {
        if (!bin.hours.length) continue;
        bin.meanQuality = bin.hours.reduce((s, h) => s + h.score, 0) / bin.hours.length / 100;
        bin.best = bin.hours.reduce((a, h) => (h.score > a.score ? h : a), bin.hours[0]);
        if (bin.hours.length > maxCount) maxCount = bin.hours.length;
      }
      bySpot[spot.id] = { bins, inWindow: tl.length ? inWin / tl.length : 0 };
    }
    return { bySpot, maxCount };
  }, [spots, timelines]);

  const finding = useMemo(() => {
    if (!spots.length || loading) return 'Reading where this week’s swell is actually pointed…';
    const ranked = spots
      .map((s) => ({ name: s.name, frac: data.bySpot[s.id]?.inWindow ?? 0 }))
      .sort((a, b) => b.frac - a.frac);
    const top = ranked[0], bottom = ranked[ranked.length - 1];
    if (top.frac < 0.02) return 'This week the swell sits outside every break’s window — a flat, ill-aimed forecast.';
    return `The swell favors ${top.name} this week (${Math.round(top.frac * 100)}% of hours on-window) `
      + `and slips right past ${bottom.name} (${Math.round(bottom.frac * 100)}%) — same ocean, different windows.`;
  }, [spots, data, loading]);

  const detail = hover;
  const detailSpot = detail ? spots.find((s) => s.id === detail.spotId) ?? null : null;
  const detailBest = detail && detailSpot ? data.bySpot[detailSpot.id]?.bins[detail.bin]?.best ?? null : null;

  return (
    <VizFrame
      kicker="03 · Swell Rose"
      finding={finding}
      question="How often does the swell actually point the right way for a given break? Most people outside surfing have no idea this is even a constraint."
      source="Open-Meteo Marine 7-day swell direction · binned to 22.5° compass sectors"
      legend={<GradientLegend ramp={seqGreen} lowLabel="flat" highLabel="epic" title="Mean quality of those hours" />}
      method={
        <>
          Every forecast hour is dropped into one of sixteen compass bins by swell direction.
          A petal's <strong style={{ color: LABS.ink }}>area</strong> — not its radius — is
          proportional to the hour count, so the square-root radius scale doesn't let the outer
          rings exaggerate. The cyan wedge is <strong style={{ color: LABS.ink }}>idealSwellDir
          ± swellWindow</strong> from the spot contract: the window heuristic is narrow for picky
          reefs and points, wide for open beaches. Hover a petal to score its best hour.
        </>
      }
    >
      {loading && <VizStatus kind="loading" message="Fetching swell directions…" />}
      {error && !loading && <VizStatus kind="error" message={`Forecast unavailable — ${error}`} />}
      {!loading && !error && (
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 280px)' }}>
          <div style={{
            display: 'grid', gap: 12,
            gridTemplateColumns: 'repeat(auto-fill, minmax(192px, 1fr))', alignContent: 'start',
          }}>
            {spots.map((spot) => (
              <RoseFacet
                key={spot.id}
                spot={spot}
                bins={data.bySpot[spot.id]?.bins ?? []}
                maxCount={data.maxCount}
                inWindow={data.bySpot[spot.id]?.inWindow ?? 0}
                hoverBin={hover?.spotId === spot.id ? hover.bin : null}
                onHover={setHover}
              />
            ))}
          </div>
          <div style={{ position: 'sticky', top: 78, alignSelf: 'start' }}>
            {detailSpot && detailBest ? (
              <ScoreBreakdownPanel
                spot={detailSpot}
                hour={detailBest}
                whenLabel={`Best hour from the ${CARD(hover!.bin * BIN_DEG)}`}
                caption={`${detailSpot.name} · ${CARD(hover!.bin * BIN_DEG)} swell`}
              />
            ) : (
              <ScoreBreakdownPanel spot={null} hour={null} whenLabel="" caption="Swell direction" />
            )}
          </div>
        </div>
      )}
    </VizFrame>
  );
}

// ── one spot's rose ─────────────────────────────────────────────────────

const VB = 168, C = VB / 2, R = 60;

function RoseFacet({
  spot, bins, maxCount, inWindow, hoverBin, onHover,
}: {
  spot: LabsSpot;
  bins: Bin[];
  maxCount: number;
  inWindow: number;
  hoverBin: number | null;
  onHover: (h: HoverState | null) => void;
}) {
  const ideal = spot.viz.idealSwellDir;
  const win = spot.viz.swellWindow;
  return (
    <div
      style={{ background: LABS.panel2, border: `1px solid ${LABS.line}`, borderRadius: 10, padding: '10px 8px 6px' }}
      onMouseLeave={() => onHover(null)}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: LABS.ink, marginBottom: 2 }}>{spot.name}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: LABS.inkMute, marginBottom: 4 }}>
        on-window {Math.round(inWindow * 100)}% of the week
      </div>
      <svg viewBox={`0 0 ${VB} ${VB}`} style={{ width: '100%', display: 'block' }}>
        {/* radial grid rings */}
        {[0.5, 1].map((f) => (
          <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke={LABS.grid} strokeWidth={0.6} />
        ))}
        {/* ideal-window wedge — drawn behind the petals */}
        <path d={wedge(C, C, R + 6, ideal - win, ideal + win)}
          fill={LABS.cyan} opacity={0.13} />
        <path d={wedge(C, C, R + 6, ideal - win, ideal + win)}
          fill="none" stroke={LABS.cyan} strokeWidth={0.8} opacity={0.5} strokeDasharray="2 2" />
        {/* compass spokes + labels */}
        {[0, 90, 180, 270].map((deg) => {
          const [lx, ly] = polar(C, C, R + 15, deg);
          const [sx, sy] = polar(C, C, R, deg);
          return (
            <g key={deg}>
              <line x1={C} y1={C} x2={sx} y2={sy} stroke={LABS.grid} strokeWidth={0.6} />
              <text x={lx} y={ly + 3} textAnchor="middle" fontSize={9} fontFamily={MONO} fill={LABS.inkMute}>
                {['N', 'E', 'S', 'W'][deg / 90]}
              </text>
            </g>
          );
        })}
        {/* petals */}
        {bins.map((bin, i) => {
          if (!bin.hours.length) return null;
          const r = R * Math.sqrt(bin.hours.length / maxCount);
          const center = i * BIN_DEG;
          const isHover = hoverBin === i;
          return (
            <path
              key={i}
              d={wedge(C, C, r, center - BIN_DEG / 2 + 1.6, center + BIN_DEG / 2 - 1.6)}
              fill={seqGreen(Math.max(0.08, bin.meanQuality))}
              stroke={isHover ? LABS.cyanHi : LABS.panel}
              strokeWidth={isHover ? 1.6 : 0.6}
              onMouseEnter={() => onHover({ spotId: spot.id, bin: i })}
              style={{ cursor: 'pointer' }}
            />
          );
        })}
        {/* ideal direction tick */}
        {(() => {
          const [ix, iy] = polar(C, C, R + 6, ideal);
          return <line x1={C} y1={C} x2={ix} y2={iy} stroke={LABS.cyan} strokeWidth={1.2} />;
        })()}
        <circle cx={C} cy={C} r={2} fill={LABS.inkDim} />
      </svg>
    </div>
  );
}
