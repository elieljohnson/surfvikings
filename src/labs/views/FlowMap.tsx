// Labs #01 — Swell-Arrival Flow Map.
//
// The showpiece, and the hardest. A particle field over the coast: each
// particle rides the swell-direction vector, its speed carries the period
// (period is energy — long-period swell is fast and powerful), its color
// carries the wave height. The featured breaks are fixed glyphs — the
// anchors the energy is aimed at, or misses.
//
// Two real gotchas, both handled here:
//  1. Thousands of particles kill SVG — the particle layer is a <canvas>.
//  2. The canvas overlay and the MapLibre map must share one projection.
//     Particles are stored in lon/lat; every frame re-projects them through
//     map.project(). Pan and zoom therefore need no special handling — the
//     re-projection IS the sync.
//
// Honesty test (Tufte): particle speed maps to a real variable (period),
// not decorative motion. Fudged, it's a screensaver; kept honest, it's truth.
//
// Basemap note: the spec calls for Stamen Toner via Stadia, which needs an
// API key off-localhost. To keep the deployed preview rendering, this uses
// CARTO's keyless dark basemap — same intent (a stark dark field that leaves
// the whole color budget for the data). Swap the `base` source for Stadia's
// Stamen Toner once a key is wired.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { angleDelta } from '../../lib/data';
import { featuredSpots } from '../spots';
import { useWaveField, FLOW_BBOX, WaveField } from '../data';
import { VizFrame, GradientLegend, VizStatus } from '../vizKit';
import { LABS, MONO, seqCyan } from '../theme';

const PARTICLES = 900;

const BASEMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
        'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#070A0E' } },
    { id: 'base', type: 'raster', source: 'base', paint: { 'raster-opacity': 0.62 } },
  ],
};

interface Particle { lon: number; lat: number; age: number; maxAge: number }

export default function FlowMap() {
  const { field, loading, error } = useWaveField();
  const [hourIdx, setHourIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selSpot, setSelSpot] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hourRef = useRef(0);
  const fieldRef = useRef<WaveField | null>(null);
  hourRef.current = hourIdx;
  fieldRef.current = field;

  const spots = useMemo(() => featuredSpots(), []);

  // ── init the map once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [(FLOW_BBOX.west + FLOW_BBOX.east) / 2, (FLOW_BBOX.south + FLOW_BBOX.north) / 2],
      zoom: 8.2,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map.fitBounds(
        [[FLOW_BBOX.west, FLOW_BBOX.south], [FLOW_BBOX.east, FLOW_BBOX.north]],
        { padding: 24, duration: 0 },
      );
      setMapReady(true);
    });
    map.on('click', () => setSelSpot(null));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── spot glyphs as map markers ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const markers = spots.map((spot) => {
      const el = document.createElement('div');
      el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;';
      el.innerHTML =
        `<span style="width:11px;height:11px;border-radius:11px;background:#070A0E;`
        + `border:2px solid ${LABS.cyanHi};box-shadow:0 0 7px ${LABS.cyan}"></span>`
        + `<span style="font:600 10px ${MONO};color:${LABS.ink};`
        + `text-shadow:0 1px 3px #000,0 0 4px #000;white-space:nowrap">${spot.name}</span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); setSelSpot(spot.id); });
      return new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([spot.lng, spot.lat]).addTo(map);
    });
    return () => markers.forEach((m) => m.remove());
  }, [mapReady, spots]);

  // ── the particle engine ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas || !mapReady || !field) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const { width, height } = map.getContainer().getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    map.on('resize', resize);

    const { west, east, south, north } = field.bbox;
    const wetSpawn = (): Particle => {
      for (let tries = 0; tries < 10; tries++) {
        const lon = west + Math.random() * (east - west);
        const lat = south + Math.random() * (north - south);
        if (field.sample(lon, lat, hourRef.current)) {
          return { lon, lat, age: Math.random() * 60, maxAge: 70 + Math.random() * 110 };
        }
      }
      return { lon: (west + east) / 2, lat: (south + north) / 2, age: 0, maxAge: 1 };
    };
    const particles: Particle[] = Array.from({ length: PARTICLES }, wetSpawn);

    let raf = 0;
    const tick = () => {
      const cssW = canvas.width / dpr, cssH = canvas.height / dpr;
      // Fade existing trails toward transparent — destination-out keeps the
      // basemap visible underneath rather than darkening the canvas.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';

      const hour = hourRef.current;
      const f = fieldRef.current;
      if (f) {
        for (const p of particles) {
          const s = f.sample(p.lon, p.lat, hour);
          if (!s || p.age > p.maxAge) { Object.assign(p, wetSpawn()); continue; }
          const before = map.project([p.lon, p.lat]);
          // Wave direction is "FROM"; energy travels toward dir + 180.
          const heading = ((s.dir + 180) * Math.PI) / 180;
          const spd = 0.00065 + (s.period / 22) * 0.0027;
          const cosLat = Math.cos((p.lat * Math.PI) / 180) || 1;
          p.lon += (Math.sin(heading) * spd) / cosLat;
          p.lat += Math.cos(heading) * spd;
          p.age++;
          const after = map.project([p.lon, p.lat]);
          const env = Math.min(1, p.age / 12, (p.maxAge - p.age) / 18);
          ctx.strokeStyle = seqCyan(Math.min(1, s.height / f.maxHeight));
          ctx.globalAlpha = Math.max(0, env) * 0.9;
          ctx.lineWidth = 0.9 + Math.min(1, s.height / f.maxHeight) * 1.3;
          ctx.beginPath();
          ctx.moveTo(before.x, before.y);
          ctx.lineTo(after.x, after.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      map.off('resize', resize);
    };
  }, [mapReady, field]);

  // ── time autoplay ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || !field) return;
    const id = window.setInterval(
      () => setHourIdx((h) => (h + 1) % field.hours.length), 1150);
    return () => window.clearInterval(id);
  }, [playing, field]);

  // ── data-driven finding for the current hour ───────────────────────────
  const finding = useMemo(() => {
    if (!field) return 'Tracing where the swell energy is pointed…';
    const aim = spots.map((spot) => {
      const s = field.sample(spot.lng, spot.lat, hourIdx);
      if (!s) return { name: spot.name, score: 0 };
      const align = Math.max(0, 1 - angleDelta(s.dir, spot.viz.idealSwellDir) / 90);
      return { name: spot.name, score: align * Math.min(1, s.height / 3) };
    }).sort((a, b) => b.score - a.score);
    const best = aim[0], worst = aim[aim.length - 1];
    if (best.score < 0.05) return 'Right now the swell is pointed at none of these breaks — a flat, ill-aimed window.';
    return `Right now the swell is aimed at ${best.name} — and sliding right past ${worst.name}.`;
  }, [field, hourIdx, spots]);

  const sel = selSpot ? spots.find((s) => s.id === selSpot) : null;
  const selSample = sel && field ? field.sample(sel.lng, sel.lat, hourIdx) : null;

  return (
    <VizFrame
      kicker="01 · Flow Map"
      finding={finding}
      question="Where is the wave energy actually going right now — and which of these breaks catches it?"
      source="Open-Meteo Marine forecast · wave field sampled on a coastal grid · basemap © CARTO"
      legend={<GradientLegend ramp={seqCyan} lowLabel="small" highLabel="big" title="Wave height" />}
      method={
        <>
          Open-Meteo Marine is sampled on a grid across the coastal box, then bilinearly
          interpolated. {PARTICLES} particles ride the swell-direction field; each particle's
          speed is set by wave <strong style={{ color: LABS.ink }}>period</strong> — the honest
          encoding, since period really is the energy term — and its color by wave height. The
          canvas redraws every frame through MapLibre's own projection, so pan and zoom stay
          locked to the flow. Click a glyph for the swell sampled right at that break.
        </>
      }
    >
      {loading && <VizStatus kind="loading" message="Fetching the offshore wave field…" />}
      {error && !loading && <VizStatus kind="error" message={`Wave field unavailable — ${error}`} />}
      <div style={{ display: loading || error ? 'none' : 'block' }}>
        <div style={{ position: 'relative', width: '100%', height: 'clamp(380px, 56vh, 560px)', borderRadius: 10, overflow: 'hidden' }}>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
          {sel && (
            <div style={{
              position: 'absolute', top: 12, right: 12, width: 188,
              background: 'rgba(14,20,26,0.95)', border: `1px solid ${LABS.lineHi}`,
              borderRadius: 9, padding: '11px 13px', fontFamily: MONO,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: LABS.ink, marginBottom: 5 }}>{sel.name}</div>
              {selSample ? (
                <div style={{ fontSize: 11, color: LABS.inkDim, lineHeight: 1.7 }}>
                  <div>swell {selSample.height.toFixed(1)} ft @ {Math.round(selSample.period)} s</div>
                  <div>from {Math.round(selSample.dir)}° · wants {sel.viz.idealSwellDir}°</div>
                  <div style={{ color: angleDelta(selSample.dir, sel.viz.idealSwellDir) <= sel.viz.swellWindow ? LABS.cyanHi : LABS.accent }}>
                    {angleDelta(selSample.dir, sel.viz.idealSwellDir) <= sel.viz.swellWindow
                      ? 'on-window — aimed here' : 'off-window — energy slides past'}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: LABS.inkMute }}>no wave data at this point</div>
              )}
            </div>
          )}
        </div>

        {/* time scrubber */}
        {field && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setPlaying((p) => !p)}
              style={{
                fontFamily: MONO, fontSize: 11, padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                background: LABS.panel2, color: LABS.cyan, border: `1px solid ${LABS.line}`, flexShrink: 0,
              }}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
            <input
              type="range" min={0} max={field.hours.length - 1} value={hourIdx}
              onChange={(e) => { setPlaying(false); setHourIdx(Number(e.target.value)); }}
              style={{ flex: 1, accentColor: LABS.cyan }}
            />
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: LABS.inkDim, minWidth: 96, textAlign: 'right' }}>
              {scrubLabel(field, hourIdx)}
            </span>
          </div>
        )}
      </div>
    </VizFrame>
  );
}

function scrubLabel(field: WaveField, idx: number): string {
  const d = new Date(field.hours[idx] ?? Date.now());
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  const hr = d.getHours();
  return `${day} ${((hr + 11) % 12) + 1}${hr >= 12 ? 'pm' : 'am'}`;
}
