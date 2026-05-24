// Labs #09 — Ridgeline Forecast.
//
// A joyplot of the week: each day is a ridge of wave height through the
// hours, drawn so a big day literally rises into the day above it. A lot of
// data that reads as one calm image. The quiet counterweight to the Swell
// Bloom — same family, opposite volume.
//
// Engineering note: draw order is the whole effect (the painter's
// algorithm). The ridges render back-to-front, so a nearer ridge paints over
// the one behind and the overlap reads as depth. SVG has no z-index — later
// elements simply sit on top. Order is the layering.

import React, { useMemo, useState } from 'react';
import { ForecastHour } from '../../lib/data';
import { useLabsConditions } from '../data';
import { VizFrame, GradientLegend, VizStatus, dayTick, smoothPath } from '../vizKit';
import { LABS, MONO, seqPeriod, periodColor } from '../theme';

interface DayData { dayIdx: number; pts: Array<{ hod: number; ft: number; per: number }> }

const W = 720, ROW_H = 54, PAD_L = 58, PAD_R = 20, PAD_T = 26;
const PLOT_W = W - PAD_L - PAD_R;
const AMP = ROW_H * 1.95;            // how far a ridge climbs into the row above

export default function Ridgeline() {
  const { spots, timelines, loading, error, anchorMs } = useLabsConditions();
  const [spotId, setSpotId] = useState<string | null>(null);

  const pickedId = spotId ?? (spots.find((s) => s.id === 'ocean-beach')?.id ?? spots[0]?.id ?? '');
  const spot = spots.find((s) => s.id === pickedId) ?? null;

  const days = useMemo<DayData[]>(() => {
    if (!spot) return [];
    const day0 = new Date(anchorMs); day0.setHours(0, 0, 0, 0);
    const byDay: Record<number, DayData> = {};
    for (const h of timelines[spot.id] ?? []) {
      const t = anchorMs + h.hour * 3600_000;
      const d = new Date(t); const hod = d.getHours();
      d.setHours(0, 0, 0, 0);
      const idx = Math.round((d.getTime() - day0.getTime()) / 86400_000);
      if (idx < 0 || idx > 6) continue;
      (byDay[idx] ||= { dayIdx: idx, pts: [] }).pts.push({
        hod, ft: (h as ForecastHour).swellHeight, per: (h as ForecastHour).swellPeriod,
      });
    }
    return Object.values(byDay)
      .map((d) => ({ ...d, pts: d.pts.sort((a, b) => a.hod - b.hod) }))
      .sort((a, b) => a.dayIdx - b.dayIdx);
  }, [spot, timelines, anchorMs]);

  const maxFt = useMemo(
    () => Math.max(4, ...days.flatMap((d) => d.pts.map((p) => p.ft))),
    [days]);

  const finding = useMemo(() => {
    if (!spot || loading || !days.length) return 'Stacking the week into one quiet image…';
    let peakDay = days[0], peakFt = 0;
    for (const d of days) {
      const m = Math.max(...d.pts.map((p) => p.ft));
      if (m > peakFt) { peakFt = m; peakDay = d; }
    }
    return `${spot.name} peaks ${dayTick(anchorMs, peakDay.dayIdx)} around ${peakFt.toFixed(1)}ft — the one ridge that rises clear of the week.`;
  }, [spot, days, anchorMs, loading]);

  const H = PAD_T + 7 * ROW_H + 34;
  const x = (hod: number) => PAD_L + (hod / 23) * PLOT_W;
  const yFor = (rowTop: number, ft: number) => rowTop + ROW_H - (ft / maxFt) * AMP;

  return (
    <VizFrame
      kicker="09 · Ridgeline Forecast"
      finding={finding}
      question="Seven days of wave height, stacked. A lot of numbers that should still read as one calm shape — and let the big days announce themselves."
      source="Open-Meteo Marine · at-the-break swell height, 7-day hourly"
      legend={<GradientLegend ramp={seqPeriod} lowLabel="4s" highLabel="19s+" title="Period" />}
      method={
        <>
          Each ridge is one day's wave height across the 24 hours; the ridges overlap upward,
          so a tall day visibly rises into the day above. They are drawn{' '}
          <strong style={{ color: LABS.ink }}>back-to-front</strong> — the painter's algorithm —
          so the nearer ridge sits over the one behind and the overlap reads as depth. Line
          color is the day's mean period; each ridge's peak height is labeled.
        </>
      }
    >
      {loading && <VizStatus kind="loading" message="Reading the swell…" />}
      {error && !loading && <VizStatus kind="error" message={`Forecast unavailable — ${error}`} />}
      {!loading && !error && spot && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {spots.map((s) => (
              <button key={s.id} onClick={() => setSpotId(s.id)}
                style={{
                  fontFamily: MONO, fontSize: 11, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                  background: s.id === pickedId ? LABS.cyan : LABS.panel2,
                  color: s.id === pickedId ? LABS.bg : LABS.inkDim,
                  border: `1px solid ${s.id === pickedId ? LABS.cyan : LABS.line}`,
                }}>{s.name}</button>
            ))}
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
            {/* draw furthest day first, nearest last — painter's algorithm */}
            {[...days].reverse().map((d) => {
              const rowTop = PAD_T + d.dayIdx * ROW_H;
              if (d.pts.length < 2) return null;
              const top: Array<[number, number]> = d.pts.map((p) => [x(p.hod), yFor(rowTop, p.ft)]);
              const meanPer = d.pts.reduce((s, p) => s + p.per, 0) / d.pts.length;
              const col = periodColor(meanPer);
              const peak = d.pts.reduce((a, b) => (b.ft > a.ft ? b : a));
              const baseY = rowTop + ROW_H;
              const lineD = smoothPath(top);
              const areaD = `${lineD} L ${top[top.length - 1][0]} ${baseY} L ${top[0][0]} ${baseY} Z`;
              return (
                <g key={d.dayIdx}>
                  <text x={PAD_L - 12} y={rowTop + ROW_H - 6} textAnchor="end"
                    fontSize={12} fontFamily={MONO} fill={LABS.inkDim}>{dayTick(anchorMs, d.dayIdx)}</text>
                  <text x={PAD_L - 12} y={rowTop + ROW_H + 7} textAnchor="end"
                    fontSize={9} fontFamily={MONO} fill={LABS.inkMute}>
                    {new Date(anchorMs + d.dayIdx * 86400_000).getDate()}
                  </text>
                  <path d={areaD} fill={col} fillOpacity={0.16} />
                  <path d={lineD} fill="none" stroke={col} strokeWidth={2}
                    style={{ filter: `drop-shadow(0 0 5px ${col}77)` }} />
                  <text x={x(peak.hod)} y={yFor(rowTop, peak.ft) - 6} textAnchor="middle"
                    fontSize={10} fontFamily={MONO} fill={col}>{peak.ft.toFixed(1)}</text>
                </g>
              );
            })}
            {[0, 6, 12, 18].map((h) => (
              <text key={h} x={x(h)} y={H - 12} textAnchor="middle"
                fontSize={9} fontFamily={MONO} fill={LABS.inkMute}>
                {h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
              </text>
            ))}
          </svg>
        </div>
      )}
    </VizFrame>
  );
}
