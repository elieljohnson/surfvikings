// Labs #06 — Watercolor Mood Map.
//
// The range-demonstrator. Same forecast data as every other view, read in a
// different register: evocative instead of analytical. A painterly basemap,
// and a hand-drawn wave glyph per break.
//
// The glyph still encodes real values — that is the discipline. Decoration
// pretending to be data is the failure mode; here the mapping is honest:
//   • stroke count + size  → wave height
//   • raggedness of line   → wind (glassy and smooth, or blown and broken)
//   • hue                  → quality
//
// Basemap note: Stamen Watercolor (via Stadia) is keyless on localhost but
// needs a key off-localhost. The map background is a warm paper tone, so if
// the tiles don't load the glyphs still sit on "paper" and the piece holds.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ForecastHour, metricQuality } from '../../lib/data';
import { featuredSpots, LabsSpot } from '../spots';
import { useLabsConditions, FLOW_BBOX } from '../data';
import { VizFrame, GradientLegend, VizStatus } from '../vizKit';
import { LABS, ramp } from '../theme';

const PAPER = '#ECE3D0';
const SERIF = "'Iowan Old Style', Georgia, 'Times New Roman', serif";

/** Painterly quality ramp — cool slate → teal → warm ochre. Deliberately
 *  NOT the analytical green ramp; this is the humanistic register. */
const moodHue = (q: number) => ramp(['#6E7C88', '#3F94A4', '#2E9B7C', '#B6862B'], q);

const BASEMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    paper: {
      type: 'raster',
      tiles: ['https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg'],
      tileSize: 256,
      attribution: '© Stamen Design, © Stadia Maps, © OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': PAPER } },
    { id: 'paper', type: 'raster', source: 'paper' },
  ],
};

/** Tiny deterministic RNG so a spot's glyph jitter is stable across renders. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build the hand-drawn wave glyph for one spot's current conditions. */
function glyphSVG(spot: LabsSpot, hour: ForecastHour): string {
  const height01 = Math.min(1, hour.swellHeight / 8);
  const glassy = metricQuality(spot, hour, 'windSpeed');     // 1 = glassy, 0 = blown
  const quality = Math.max(0.05, hour.score / 100);
  const hue = moodHue(quality);

  const strokeCount = 1 + Math.round(height01 * 4);          // 1–5 lines
  const size = 40 + height01 * 22;
  const seed = spot.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = rng(seed);
  const N = 18;
  const amp = 2.2 + height01 * 3.4;
  const jitter = (1 - glassy) * 5.2;                          // ragged when blown
  const cx = size / 2;
  const cy = size * 0.62;
  const gap = 5.4;

  let lines = '';
  for (let l = 0; l < strokeCount; l++) {
    const baseY = cy - l * gap;
    const pts: string[] = [];
    for (let k = 0; k <= N; k++) {
      const x = 6 + (k / N) * (size - 12);
      const wave = Math.sin((k / N) * Math.PI * 2.3 + l * 0.7) * amp;
      const j = (rand() - 0.5) * jitter;
      pts.push(`${x.toFixed(1)},${(baseY + wave + j).toFixed(1)}`);
    }
    const d = 'M ' + pts.join(' L ');
    const dash = glassy < 0.4 ? `stroke-dasharray="${5 + (1 - glassy) * 4} ${2 + (1 - glassy) * 3}"` : '';
    // pale paper halo first, then the colored stroke — drawn-on-paper feel.
    lines += `<path d="${d}" fill="none" stroke="${PAPER}" stroke-width="4.4" `
      + `stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>`;
    lines += `<path d="${d}" fill="none" stroke="${hue}" stroke-width="2.1" `
      + `stroke-linecap="round" stroke-linejoin="round" ${dash}/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" `
    + `style="overflow:visible">${lines}`
    + `<circle cx="${cx}" cy="${cy + 4}" r="2.1" fill="${hue}"/></svg>`;
}

export default function WatercolorMap() {
  const { spots, timelines, loading, error } = useLabsConditions();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  const allSpots = useMemo(() => featuredSpots(), []);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [(FLOW_BBOX.west + FLOW_BBOX.east) / 2, (FLOW_BBOX.south + FLOW_BBOX.north) / 2],
      zoom: 8.2,
      attributionControl: false,
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.on('load', () => {
      map.fitBounds(
        [[FLOW_BBOX.west, FLOW_BBOX.south], [FLOW_BBOX.east, FLOW_BBOX.north]],
        { padding: 30, duration: 0 });
      setMapReady(true);
    });
    map.on('click', () => setSel(null));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Glyph markers — rebuilt whenever the forecast updates.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const markers: maplibregl.Marker[] = [];
    for (const spot of allSpots) {
      const hour = (timelines[spot.id] ?? [])[0];
      if (!hour) continue;
      const el = document.createElement('div');
      el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;';
      el.innerHTML = glyphSVG(spot, hour)
        + `<span style="font:italic 600 12px ${SERIF};color:#2A2520;`
        + `text-shadow:0 1px 2px ${PAPER},0 0 4px ${PAPER};margin-top:-2px;white-space:nowrap">`
        + `${spot.name}</span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); setSel(spot.id); });
      markers.push(new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([spot.lng, spot.lat]).addTo(map));
    }
    return () => markers.forEach((m) => m.remove());
  }, [mapReady, timelines, allSpots]);

  const selSpot = sel ? allSpots.find((s) => s.id === sel) : null;
  const selHour = selSpot ? (timelines[selSpot.id] ?? [])[0] : null;

  return (
    <VizFrame
      kicker="06 · Watercolor Mood Map"
      finding="Today’s coast, felt before it’s measured."
      question="Can the very same forecast read as evocative instead of analytical? Working in two registers is itself the point."
      source="Open-Meteo Marine + NOAA · today’s snapshot · basemap © Stamen / Stadia Maps"
      legend={<GradientLegend ramp={moodHue} lowLabel="flat" highLabel="epic" title="Glyph hue — quality" />}
      method={
        <>
          One hand-drawn wave glyph per break, all on live data. Stroke count and size carry
          wave <strong style={{ color: LABS.ink }}>height</strong> (one line for ankle-slappers,
          five for overhead). The line is smooth and whole when the wind is glassy, ragged and
          broken when it's blown — that's <strong style={{ color: LABS.ink }}>metricQuality</strong>'s
          wind term again. Hue is the quality score. This is the one view that spends some
          data-ink on register — but the mapping is still real. Click a glyph to read it.
        </>
      }
    >
      {loading && <VizStatus kind="loading" message="Mixing today’s conditions…" />}
      {error && !loading && <VizStatus kind="error" message={`Forecast unavailable — ${error}`} />}
      <div style={{ display: loading || error ? 'none' : 'block' }}>
        <div style={{ position: 'relative', width: '100%', height: 'clamp(380px, 56vh, 560px)', borderRadius: 10, overflow: 'hidden' }}>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
          {selSpot && selHour && (
            <div style={{
              position: 'absolute', top: 12, right: 12, width: 200,
              background: 'rgba(236,227,208,0.96)', border: '1px solid #B9AB8C',
              borderRadius: 9, padding: '12px 14px',
            }}>
              <div style={{ font: `italic 700 16px ${SERIF}`, color: '#2A2520', marginBottom: 6 }}>
                {selSpot.name}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 13, color: '#4A4034', lineHeight: 1.65 }}>
                {selHour.swellHeight.toFixed(1)} ft of swell at {Math.round(selHour.swellPeriod)} seconds,
                {' '}{metricQuality(selSpot, selHour, 'windSpeed') > 0.6 ? 'a glassy' : 'a wind-bothered'} morning.
                {' '}The break is scoring {Math.round(selHour.score)} out of 100.
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 10, fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: LABS.inkDim }}>
          Six breaks, one tide of light. Tap a wave to hear what it’s saying.
        </div>
      </div>
    </VizFrame>
  );
}
