// Labs #10 — Swell Origin Map.
//
// The regional view: where today's energy is marching from. A grid of points
// across the Northeast Pacific, each showing the dominant swell as an arrow
// in its direction of travel, colored by period, over a stylized coastline.
// The swell hitting Ocean Beach was born by a storm days away and out to
// sea. This is the brand picture, not the decision tool — a sketch, kept a
// sketch on purpose.
//
// Engineering note: batch, don't loop (the N+1 trap). The naive version
// fetches each of the 16 grid points in its own request — 16 round trips.
// useSwellOriginField sends one request with all 16 coordinates. Same
// instinct applies to databases and model calls: when you call a remote
// thing once per item, ask whether it takes a list.

import React, { useMemo } from 'react';
import { degToCardinal } from '../../lib/data';
import { useSwellOriginField } from '../data';
import { featuredSpots } from '../spots';
import { VizFrame, GradientLegend, VizStatus } from '../vizKit';
import { LABS, MONO, seqPeriod, periodColor } from '../theme';

// A hand-traced California coastline — crude on purpose. The real version
// wants a Stadia-hosted Stamen Toner basemap; this is the sketch.
const COAST: Array<[number, number]> = [
  [-124.7, 48.4], [-124.1, 46.2], [-124.0, 43.3], [-124.4, 42.0], [-124.2, 40.8], [-123.8, 40.0],
  [-123.7, 38.9], [-122.9, 38.0], [-122.5, 37.8], [-122.4, 37.0], [-121.9, 36.6], [-120.7, 35.2],
  [-120.5, 34.5], [-119.7, 34.4], [-118.5, 34.0], [-117.3, 33.3],
];

const VB_W = 720, VB_H = 760, PAD = 44;
const LON0 = -136, LON1 = -120.5, LAT0 = 33, LAT1 = 48.5;

export default function SwellOriginMap() {
  const { points, loading, error } = useSwellOriginField();

  // three coastal anchors, drawn from the gallery's own featured set
  const anchors = useMemo(() => {
    const want = ['bolinas-patch', 'ocean-beach', 'montara'];
    return featuredSpots().filter((s) => want.includes(s.id));
  }, []);

  const x = (lon: number) => PAD + ((lon - LON0) / (LON1 - LON0)) * (VB_W - 2 * PAD);
  const y = (lat: number) => (VB_H - PAD) - ((lat - LAT0) / (LAT1 - LAT0)) * (VB_H - 2 * PAD);

  const maxFt = useMemo(() => Math.max(3, ...(points ?? []).map((p) => p.ft)), [points]);
  const lenFor = (ft: number) => Math.sqrt(Math.max(0, ft) / maxFt) * 58;

  const finding = useMemo(() => {
    if (loading) return 'Mapping where the ocean is sending its energy…';
    if (!points || !points.length) return 'The Northeast Pacific is quiet today — barely a swell on the grid.';
    let vx = 0, vy = 0, perSum = 0;
    for (const p of points) {
      vx += Math.sin((p.dir * Math.PI) / 180);
      vy += Math.cos((p.dir * Math.PI) / 180);
      perSum += p.per;
    }
    const meanDir = ((Math.atan2(vx, vy) * 180) / Math.PI + 360) % 360;
    return `Today's energy is marching in from the ${degToCardinal(meanDir)} at roughly ${Math.round(perSum / points.length)}s — born by weather days out to sea.`;
  }, [points, loading]);

  const coastPath = 'M' + COAST.map(([lo, la]) => `${x(lo).toFixed(1)},${y(la).toFixed(1)}`).join(' L');
  const landPath = `${coastPath} L${VB_W - PAD},${y(LAT0)} L${VB_W - PAD},${y(LAT1)} Z`;

  return (
    <VizFrame
      kicker="10 · Swell Origin Map"
      finding={finding}
      question="The swell that hits the coast was made somewhere else — by a storm, days ago, far out to sea. Where is today's energy coming from?"
      source="Open-Meteo Marine · 16-point NE-Pacific grid, current hour, one batched request"
      legend={<GradientLegend ramp={seqPeriod} lowLabel="4s" highLabel="19s+" title="Period" />}
      method={
        <>
          Sixteen points across the Northeast Pacific, each fetched in a{' '}
          <strong style={{ color: LABS.ink }}>single batched request</strong> rather than
          sixteen. Every arrow points the way the swell <em>travels</em> — the incoming
          bearing plus 180° — its length scaled to wave height, its color to period. The
          coastline is hand-traced and deliberately crude: this is the regional brand image,
          a sketch, not the decision tool.
        </>
      }
    >
      {loading && <VizStatus kind="loading" message="Mapping the ocean…" />}
      {error && !loading && <VizStatus kind="error" message={`Wave field unavailable — ${error}`} />}
      {!loading && !error && points && (
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', maxWidth: 540, display: 'block', margin: '0 auto' }}>
          {/* graticule */}
          {[-135, -130, -125].map((lo) => (
            <line key={lo} x1={x(lo)} y1={PAD} x2={x(lo)} y2={VB_H - PAD} stroke={LABS.line} strokeOpacity={0.5} />
          ))}
          {[35, 40, 45].map((la) => (
            <line key={la} x1={PAD} y1={y(la)} x2={VB_W - PAD} y2={y(la)} stroke={LABS.line} strokeOpacity={0.5} />
          ))}
          {[-135, -130, -125].map((lo) => (
            <text key={`lx${lo}`} x={x(lo)} y={VB_H - PAD + 14} textAnchor="middle"
              fontSize={9} fontFamily={MONO} fill={LABS.inkMute}>{Math.abs(lo)}°W</text>
          ))}
          {[35, 40, 45].map((la) => (
            <text key={`ly${la}`} x={PAD - 8} y={y(la) + 3} textAnchor="end"
              fontSize={9} fontFamily={MONO} fill={LABS.inkMute}>{la}°N</text>
          ))}

          {/* land */}
          <path d={landPath} fill={LABS.panel2} fillOpacity={0.9} />
          <path d={coastPath} fill="none" stroke={LABS.lineHi} strokeWidth={1.5} />

          {/* swell arrows */}
          {points.map((p, i) => {
            const travel = ((p.dir + 180) % 360) * Math.PI / 180;
            const L = lenFor(p.ft);
            const x0 = x(p.lon), y0 = y(p.lat);
            const x1 = x0 + L * Math.sin(travel), y1 = y0 - L * Math.cos(travel);
            const ah = 7, lft = travel + Math.PI - 0.4, rgt = travel + Math.PI + 0.4;
            const col = periodColor(p.per);
            return (
              <g key={i} style={{ filter: `drop-shadow(0 0 4px ${col}77)` }}>
                <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={col} strokeLinecap="round"
                  strokeWidth={1 + (p.ft / maxFt) * 2.5} strokeOpacity={0.92} />
                <path d={`M${x1},${y1} L${x1 + ah * Math.sin(lft)},${y1 - ah * Math.cos(lft)} `
                  + `L${x1 + ah * Math.sin(rgt)},${y1 - ah * Math.cos(rgt)} Z`} fill={col} />
                <circle cx={x0} cy={y0} r={1.6} fill={col} opacity={0.8} />
              </g>
            );
          })}

          {/* coastal anchors */}
          {anchors.map((s) => (
            <g key={s.id}>
              <circle cx={x(s.lng)} cy={y(s.lat)} r={3.5} fill={LABS.cyanHi}
                stroke={LABS.bg} strokeWidth={1} />
              <text x={x(s.lng) + 8} y={y(s.lat) + 3} fontSize={10.5} fontFamily={MONO} fill={LABS.ink}>
                {s.name}
              </text>
            </g>
          ))}
        </svg>
      )}
    </VizFrame>
  );
}
