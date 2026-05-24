// Labs #08 — Swell Bloom.
//
// At any moment the ocean is carrying several wave trains at once, arriving
// from different directions at different periods. Each is a luminous lobe on
// a compass: angle is the direction it comes from, length is wave height,
// color is period. Press play and the field morphs across the forecast — a
// clean long-period groundswell and a messy local windsea separate into two
// differently-colored petals leaning different ways. That separation is the
// true, usually-invisible thing.
//
// Runs on the app's own per-spot timeline — primary groundswell + wind wave,
// the two trains the app already resolves. No extra fetch.
//
// Engineering note: interpolating angles is not interpolating numbers. A
// swell swinging 350°→10° is a 20° nudge, but averaging the numbers sweeps
// the lobe 340° the wrong way. lerpAngle takes the shortest arc.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ForecastHour, degToCardinal } from '../../lib/data';
import { useLabsConditions } from '../data';
import { VizFrame, GradientLegend, VizStatus } from '../vizKit';
import { LABS, MONO, seqPeriod, periodColor } from '../theme';

interface Train { label: string; ft: number; dir: number; per: number }
interface Frame { time: Date; components: Train[] }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Shortest-arc angle interpolation — angles live on a circle. */
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
};

export default function SwellBloom() {
  const { spots, timelines, loading, error } = useLabsConditions();
  const [spotId, setSpotId] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const raf = useRef(0);
  const last = useRef<number | null>(null);

  const pickedId = spotId ?? (spots.find((s) => s.id === 'ocean-beach')?.id ?? spots[0]?.id ?? '');
  const spot = spots.find((s) => s.id === pickedId) ?? null;

  // Each forecast hour → up to two wave trains: groundswell + windsea.
  const frames = useMemo<Frame[]>(() => {
    const tl = spot ? timelines[spot.id] ?? [] : [];
    return tl.map((h: ForecastHour) => {
      const comps: Train[] = [
        { label: 'Groundswell', ft: h.swellHeight, dir: h.swellDirection, per: h.swellPeriod },
        { label: 'Windsea', ft: h.windWaveHeight, dir: h.windWaveDirection, per: h.windWavePeriod },
      ].filter((c) => c.ft > 0.25);
      return { time: new Date(Date.now() + h.hour * 3600_000), components: comps };
    });
  }, [spot, timelines]);

  // reset the playhead when the spot changes
  useEffect(() => { setFrame(0); setPlaying(true); }, [pickedId]);

  // animation loop
  useEffect(() => {
    if (!frames.length || !playing) return;
    const tick = (ts: number) => {
      if (last.current != null) {
        const dt = (ts - last.current) / 1000;
        setFrame((f) => {
          const next = f + dt * 1.6;            // ~1.6 forecast-hours / sec
          return next >= frames.length - 1 ? 0 : next;
        });
      }
      last.current = ts;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf.current); last.current = null; };
  }, [frames, playing]);

  // interpolate the current moment
  const now = useMemo<Frame | null>(() => {
    if (!frames.length) return null;
    const i = Math.min(Math.floor(frame), frames.length - 1);
    const j = Math.min(i + 1, frames.length - 1);
    const t = frame - i;
    const A = frames[i], B = frames[j];
    const labels = [...new Set([...A.components, ...B.components].map((c) => c.label))];
    const components = labels.map((label) => {
      const a = A.components.find((c) => c.label === label);
      const b = B.components.find((c) => c.label === label);
      if (a && b) return { label, ft: lerp(a.ft, b.ft, t), dir: lerpAngle(a.dir, b.dir, t), per: lerp(a.per, b.per, t) };
      const solo = (a || b)!;
      return { label, ft: solo.ft * (a ? 1 - t : t), dir: solo.dir, per: solo.per };
    }).filter((c) => c.ft > 0.2);
    return { time: new Date(lerp(A.time.getTime(), B.time.getTime(), t)), components };
  }, [frames, frame]);

  const maxFt = useMemo(() => Math.max(3, ...frames.flatMap((f) => f.components.map((c) => c.ft))), [frames]);

  // geometry
  const VB = 600, C = VB / 2, R = VB / 2 - 64;
  const lenScale = (ft: number) => (Math.max(0, ft) / maxFt) * R * 0.94;
  const ringStep = maxFt <= 4 ? 1 : maxFt <= 9 ? 2 : 3;
  const rings: number[] = [];
  for (let v = ringStep; v <= maxFt; v += ringStep) rings.push(v);

  const petalPath = (bearing: number, ft: number) => {
    const L = lenScale(ft), spread = 40;
    const pts: string[] = [];
    for (let da = -86; da <= 86; da += 3.5) {
      const r = L * Math.exp(-Math.pow(da / spread, 2));
      const ang = ((bearing + da - 90) * Math.PI) / 180; // -90 → North up
      pts.push(`${(C + r * Math.cos(ang)).toFixed(1)},${(C + r * Math.sin(ang)).toFixed(1)}`);
    }
    return `M${C},${C} L${pts.join(' L')} Z`;
  };

  const primary = now?.components.find((c) => c.label === 'Groundswell') ?? now?.components[0];

  return (
    <VizFrame
      kicker="08 · Swell Bloom"
      finding="The ocean is never one wave — a clean groundswell and a local windsea arrive from different directions at the same moment."
      question="What no surf app shows: the sea as a spectrum of wave trains, each with its own direction, height and period. Press play and watch it morph across the week."
      source="Open-Meteo Marine · primary groundswell + wind wave · 7-day hourly"
      legend={<GradientLegend ramp={seqPeriod} lowLabel="4s" highLabel="19s+" title="Period" />}
      method={
        <>
          Each lobe is a wave train this spot is receiving: angle is the direction it comes
          from, length its height, color its period. Animation tweens between hourly frames —
          and direction is interpolated along the <strong style={{ color: LABS.ink }}>shortest
          arc</strong>, because a heading swinging across the 360°/0° seam is a small nudge, not
          a sweep the long way round. A train below knee-high is dropped so the dial shows
          signal, not noise.
        </>
      }
    >
      {loading && <VizStatus kind="loading" message="Reading the swell spectrum…" />}
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

          <div style={{ position: 'relative', width: '100%', maxWidth: 540, margin: '0 auto', aspectRatio: '1 / 1' }}>
            {now && (
              <svg viewBox={`0 0 ${VB} ${VB}`} style={{ width: '100%', height: '100%', display: 'block' }}>
                <defs>
                  <filter id="bloomGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="7" />
                  </filter>
                </defs>
                {rings.map((v) => (
                  <g key={v}>
                    <circle cx={C} cy={C} r={lenScale(v)} fill="none" stroke={LABS.line} strokeWidth={1} />
                    <text x={C + 4} y={C - lenScale(v) - 3} fontSize={10} fontFamily={MONO} fill={LABS.inkMute}>{v} ft</text>
                  </g>
                ))}
                {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([lbl, deg]) => {
                  const ang = ((Number(deg) - 90) * Math.PI) / 180;
                  return (
                    <text key={lbl} x={C + (R + 26) * Math.cos(ang)} y={C + (R + 26) * Math.sin(ang)}
                      fontSize={13} fontFamily={MONO} fill={LABS.inkDim}
                      textAnchor="middle" dominantBaseline="middle">{lbl}</text>
                  );
                })}
                <g filter="url(#bloomGlow)" opacity={0.6}>
                  {now.components.map((c) => (
                    <path key={c.label + 'g'} d={petalPath(c.dir, c.ft)}
                      fill={periodColor(c.per)} style={{ mixBlendMode: 'screen' }} />
                  ))}
                </g>
                <g>
                  {now.components.map((c) => (
                    <path key={c.label} d={petalPath(c.dir, c.ft)}
                      fill={periodColor(c.per)} fillOpacity={0.6}
                      stroke={periodColor(c.per)} strokeOpacity={0.55} strokeWidth={1}
                      style={{ mixBlendMode: 'screen' }} />
                  ))}
                </g>
                <circle cx={C} cy={C} r={2.5} fill={LABS.cyanHi} />
              </svg>
            )}
            {primary && now && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', textAlign: 'center',
              }}>
                <div style={{ fontSize: 'clamp(34px,7vw,56px)', fontWeight: 700, color: LABS.ink, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
                  {primary.ft.toFixed(1)}<span style={{ fontFamily: MONO, fontSize: 15, color: LABS.inkDim, marginLeft: 4 }}>ft</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 13, color: LABS.inkDim, marginTop: 8 }}>
                  {primary.per.toFixed(0)}s · from {degToCardinal(primary.dir)}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: LABS.inkMute, marginTop: 5 }}>
                  {now.time.toLocaleString('en-US', { weekday: 'short', hour: 'numeric' })}
                </div>
              </div>
            )}
          </div>

          {frames.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
              <button onClick={() => setPlaying((p) => !p)}
                style={{
                  width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                  background: LABS.panel2, color: LABS.cyan, border: `1px solid ${LABS.line}`,
                  fontFamily: MONO, fontSize: 12,
                }}>{playing ? '❚❚' : '▶'}</button>
              <input type="range" min={0} max={frames.length - 1} step={0.01} value={frame}
                onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }}
                style={{ flex: 1, accentColor: LABS.cyan }} />
            </div>
          )}
        </div>
      )}
    </VizFrame>
  );
}
