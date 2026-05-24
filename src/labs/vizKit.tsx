// Labs — shared visualization chrome.
//
// Every Labs view wears the same frame so the set reads as a system, not six
// one-offs. The frame encodes the spec's editorial schema:
//   • finding-as-title — the headline states the answer, NYT-style
//   • the editorial question underneath — what the chart is for
//   • a source line — honesty doesn't get a day off
//   • an optional method note — a composite score with no shown method is
//     untrustworthy, so any view with a derived number can open it up
//
// Views supply the chart; VizFrame supplies everything around it.

import React, { useEffect, useRef, useState } from 'react';
import { LABS, MONO, SANS } from './theme';

/** Width of an element, tracked live via ResizeObserver — lets SVG charts
 *  be fully responsive without a CSS framework. Returns [ref, width]. */
export function useMeasure<T extends HTMLElement = HTMLDivElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

interface VizFrameProps {
  /** The register label — "01 · Flow Map" etc. */
  kicker: string;
  /** The finding. A claim, not a topic. This is the title. */
  finding: string;
  /** The editorial question the chart answers. */
  question: string;
  /** Source attribution — always shown. */
  source: string;
  /** Optional methodology disclosure, collapsed by default. */
  method?: React.ReactNode;
  /** Optional legend node, rendered top-right of the chart panel. */
  legend?: React.ReactNode;
  children: React.ReactNode;
}

export function VizFrame({ kicker, finding, question, source, method, legend, children }: VizFrameProps) {
  const [methodOpen, setMethodOpen] = useState(false);
  return (
    <div style={{ fontFamily: SANS }}>
      <div style={{
        fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: LABS.cyan, marginBottom: 14,
      }}>{kicker}</div>

      <h2 style={{
        margin: 0, fontSize: 'clamp(22px, 3.4vw, 31px)', lineHeight: 1.16, fontWeight: 700,
        letterSpacing: '-0.02em', color: LABS.ink, maxWidth: 760,
      }}>{finding}</h2>

      <p style={{
        margin: '12px 0 0', fontSize: 15, lineHeight: 1.55, color: LABS.inkDim, maxWidth: 620,
      }}>{question}</p>

      <div style={{
        marginTop: 22, background: LABS.panel, border: `1px solid ${LABS.line}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {legend && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0',
          }}>{legend}</div>
        )}
        <div style={{ padding: 16 }}>{children}</div>
      </div>

      <div style={{
        marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: '6px 18px',
        alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: LABS.inkMute, letterSpacing: '0.03em' }}>
          Source — {source}
        </div>
        {method && (
          <button
            onClick={() => setMethodOpen((o) => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: MONO, fontSize: 11, color: LABS.cyan, letterSpacing: '0.03em',
            }}
          >{methodOpen ? '− Hide method' : '+ How this is computed'}</button>
        )}
      </div>

      {method && methodOpen && (
        <div style={{
          marginTop: 10, padding: '14px 16px', background: LABS.panel2,
          border: `1px solid ${LABS.line}`, borderRadius: 10,
          fontSize: 13.5, lineHeight: 1.6, color: LABS.inkDim, maxWidth: 680,
        }}>{method}</div>
      )}
    </div>
  );
}

/** Discrete-swatch legend. */
export function Legend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontFamily: MONO, fontSize: 11 }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: LABS.inkDim }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: it.color, flexShrink: 0 }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Continuous-ramp legend — a gradient bar with end labels. */
export function GradientLegend({
  ramp, lowLabel, highLabel, title,
}: { ramp: (t: number) => string; lowLabel: string; highLabel: string; title: string }) {
  const stops = Array.from({ length: 12 }, (_, i) => ramp(i / 11));
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, color: LABS.inkDim }}>
      <div style={{ marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase', color: LABS.inkMute }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{lowLabel}</span>
        <span style={{
          width: 120, height: 9, borderRadius: 5,
          background: `linear-gradient(to right, ${stops.join(',')})`,
        }} />
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

/** Centered status block — loading / error / empty. */
export function VizStatus({ kind, message }: { kind: 'loading' | 'error'; message: string }) {
  return (
    <div style={{
      minHeight: 220, display: 'flex', flexDirection: 'column', gap: 8,
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      fontFamily: MONO, fontSize: 12.5,
      color: kind === 'error' ? LABS.accent : LABS.inkMute,
    }}>
      <div style={{
        width: 9, height: 9, borderRadius: 9,
        background: kind === 'error' ? LABS.accent : LABS.cyan,
        opacity: kind === 'loading' ? 0.9 : 1,
        animation: kind === 'loading' ? 'labsPulse 1.1s ease-in-out infinite' : undefined,
      }} />
      {message}
      <style>{'@keyframes labsPulse{0%,100%{opacity:.25}50%{opacity:1}}'}</style>
    </div>
  );
}

/** Format an hour offset from an anchor as a short local label. */
export function hourTick(anchorMs: number, h: number): string {
  const d = new Date(anchorMs + h * 3600_000);
  const hr = d.getHours();
  const disp = ((hr + 11) % 12) + 1;
  return `${disp}${hr >= 12 ? 'p' : 'a'}`;
}

/** Short weekday label for a day offset. */
export function dayTick(anchorMs: number, dayOffset: number): string {
  const d = new Date(anchorMs + dayOffset * 86400_000);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

/** A smooth SVG path through a set of points (Catmull-Rom → cubic Bézier).
 *  Hand-rolled so the Labs views stay d3-free and consistent with the rest
 *  of the gallery. The curve passes *through* every point, unlike a B-spline
 *  — honest for a data line where the points are real measurements. */
export function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0]} ${pts[0][1]}` : '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
