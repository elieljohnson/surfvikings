import React from 'react';
import { TOKENS, scoreColor } from '../lib/tokens';
import {
  ForecastHour, Spot, MetricKey, metricQuality, hourLabel,
  degToCardinal, angleDelta,
} from '../lib/data';
import { qualityColor } from '../lib/tokens';

// Tracks the rendered width of a wrapper div so SVG charts can fill their
// container instead of using a hard-coded width. Returns [ref, width].
// `fallback` is used until the first measurement settles.
export function useResponsiveWidth(fallback: number) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(fallback);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// Five evenly spaced ticks across a 48h timeline, anchored so the first and
// last labels never run off the SVG edges and the middles stay centered.
const AXIS_TICKS: ReadonlyArray<{ h: number; anchor: 'start' | 'middle' | 'end' }> = [
  { h: 0,  anchor: 'start'  },
  { h: 12, anchor: 'middle' },
  { h: 24, anchor: 'middle' },
  { h: 36, anchor: 'middle' },
  { h: 47, anchor: 'end'    },
];

export function BackButton({ onClick }: { onClick: () => void }) {
  const setOpacity = (o: string) => (e: React.SyntheticEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.opacity = o;
  };
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      style={{
        // 44×44 tap target via negative margin + padding so layout stays tight
        flexShrink: 0,
        width: 44,
        height: 44,
        margin: '-10px 0 -10px -12px',
        padding: 0,
        background: 'none',
        border: 'none',
        color: TOKENS.text,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 120ms ease',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseDown={setOpacity('0.55')}
      onMouseUp={setOpacity('1')}
      onMouseLeave={setOpacity('1')}
      onTouchStart={setOpacity('0.55')}
      onTouchEnd={setOpacity('1')}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

export function DifficultyPips({ level, color }: { level: number; color?: string }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} style={{
          width: 3, height: 10,
          background: i < level ? (color || TOKENS.text) : TOKENS.border,
          borderRadius: 1,
        }}/>
      ))}
    </div>
  );
}

export function ScoreBadge({
  score, rating, size = 'md', watchOnly,
}: { score: number; rating?: string; size?: 'sm' | 'md' | 'lg'; watchOnly?: boolean }) {
  const color = scoreColor(score, watchOnly);
  const dims = size === 'lg'
    ? { n: 56, d: 22, l: 13 }
    : size === 'sm'
      ? { n: 26, d: 0, l: 12 }
      : { n: 36, d: 14, l: 13 };
  const showDenom = dims.d > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'baseline',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        color, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ fontWeight: 700, fontSize: dims.n }}>{Math.round(score)}</span>
        {showDenom && (
          <span style={{ fontWeight: 500, fontSize: dims.d, opacity: 0.7 }}>/100</span>
        )}
      </span>
      {rating && (
        <span style={{
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: dims.l, color, letterSpacing: '0.14em', marginTop: 4, fontWeight: 500,
        }}>{rating}</span>
      )}
    </div>
  );
}

export function DirectionArrow({ deg, size = 14, color }: { deg: number; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{
      transform: `rotate(${deg}deg)`, transition: 'transform 0.3s ease',
    }}>
      <path d="M8 1.5 L12 12 L8 10 L4 12 Z" fill={color || TOKENS.pacific}/>
    </svg>
  );
}

let _sparkUid = 0;
export function ScoreSpark({
  timeline, width = 140, height = 32, highlight = 0,
}: { timeline: ForecastHour[]; width?: number; height?: number; highlight?: number }) {
  const idRef = React.useRef(++_sparkUid);
  const slice = timeline.slice(0, 24);
  const max = 100;
  const pts = slice.map((t, i) => {
    const x = (i / Math.max(1, slice.length - 1)) * width;
    const y = height - (t.score / max) * height;
    return [x, y] as const;
  });
  const areaPath = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ')
    + ` L${width},${height} L0,${height} Z`;
  const gid = `spk-${idRef.current}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TOKENS.pacific} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={TOKENS.pacific} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`}/>
      {/* Per-segment color: each segment between two hours uses the average
       * score of its endpoints, so the line communicates quality the same
       * way bars do on the larger Quality chart. */}
      {pts.slice(0, -1).map(([x1, y1], i) => {
        const [x2, y2] = pts[i + 1];
        const segScore = (slice[i].score + slice[i + 1].score) / 2;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={scoreColor(segScore)} strokeWidth="1.75" strokeLinecap="round"/>
        );
      })}
      {highlight > 0 && pts[highlight] && (
        <circle cx={pts[highlight][0]} cy={pts[highlight][1]} r="3" fill={scoreColor(slice[highlight].score)} stroke={TOKENS.bg} strokeWidth="2"/>
      )}
    </svg>
  );
}

export function ForecastChart({
  timeline, metric, spot, height = 56, width, showAxis = true,
}: {
  timeline: ForecastHour[]; metric: MetricKey; spot?: Spot;
  height?: number; width?: number; showAxis?: boolean;
}) {
  // If no explicit width: measure the container so the chart fills it.
  const [wrapRef, measuredW] = useResponsiveWidth(320);
  const renderW = width ?? measuredW;
  const values = timeline.map((t) => t[metric] as number);
  const max = Math.max(...values) * 1.15;
  const min = metric === 'tideHeight' ? Math.min(...values) * 0.9 : 0;
  const range = max - min || 1;
  const barW = renderW / timeline.length;
  const lastIdx = Math.max(0, timeline.length - 1);
  return (
    <div ref={wrapRef} style={{ width: width ? undefined : '100%', minWidth: 0, overflow: 'hidden' }}>
      <svg width={renderW} height={height + (showAxis ? 22 : 0)} style={{ display: 'block' }}>
        {timeline.map((t, i) => {
          const v = t[metric] as number;
          const h = ((v - min) / range) * height;
          const x = i * barW;
          const y = height - h;
          const q = spot ? metricQuality(spot, t, metric) : 0.6;
          const fill = spot ? qualityColor(q) : TOKENS.pacific;
          const op = i === 0 ? 1 : 0.55 + (1 - i / timeline.length) * 0.35;
          return (
            <rect key={i} x={x + 0.5} y={y} width={barW - 1} height={h} fill={fill} opacity={op}/>
          );
        })}
        {showAxis && AXIS_TICKS.map(({ h, anchor }) => {
          const tickH = Math.min(h, lastIdx);
          return (
            <text key={h} x={tickH * barW + barW / 2} y={height + 18}
              textAnchor={anchor}
              fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="12" fill={TOKENS.textMute}>
              {hourLabel(tickH)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function ScoreTimeline({
  timeline, width, height = 90,
}: { timeline: ForecastHour[]; width?: number; height?: number }) {
  const [wrapRef, measuredW] = useResponsiveWidth(320);
  const renderW = width ?? measuredW;
  const barW = renderW / timeline.length;
  const lastIdx = Math.max(1, timeline.length - 1);
  return (
    <div ref={wrapRef} style={{ width: width ? undefined : '100%', minWidth: 0, overflow: 'hidden' }}>
      <svg width={renderW} height={height + 22} style={{ display: 'block' }}>
        {/* Per-hour bars colored by scoreColor — same palette as the metric
         * bar charts below, so green/yellow/red mean the same thing. */}
        {timeline.map((t, i) => {
          const h = (t.score / 100) * height;
          const x = i * barW;
          const y = height - h;
          const fill = scoreColor(t.score, false);
          // Slight fade into the future to draw the eye to "now."
          const op = i === 0 ? 1 : 0.55 + (1 - i / timeline.length) * 0.4;
          return (
            <rect key={i} x={x + 0.5} y={y} width={Math.max(1, barW - 1)} height={h} fill={fill} opacity={op}/>
          );
        })}
        {AXIS_TICKS.map(({ h, anchor }) => {
          const tickH = Math.min(h, lastIdx);
          return (
            <text key={h} x={tickH * barW + barW / 2} y={height + 18}
              textAnchor={anchor}
              fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="12" fill={TOKENS.textMute}>
              {hourLabel(tickH)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function Stat({
  label, value, unit, hint, align = 'left', color,
}: { label: string; value: React.ReactNode; unit?: string; hint?: string; align?: 'left' | 'right'; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        {color && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }}/>}
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.12em', color: TOKENS.textMute, textTransform: 'uppercase' }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 500, fontSize: 20, color: color || TOKENS.text, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {unit && <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textDim }}>{unit}</span>}
      </div>
      {hint && <div style={{ fontSize: 13, color: TOKENS.textMute }}>{hint}</div>}
    </div>
  );
}

export function Rule({ label }: { label?: string }) {
  if (!label) return <div style={{ height: 1, background: TOKENS.border }}/>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: TOKENS.border }}/>
      <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.15em', color: TOKENS.textMute, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: TOKENS.border }}/>
    </div>
  );
}

export type TabId = 'dashboard' | 'map' | 'forecast' | 'settings';

// Stylized cresting wave — line-drawn, currentColor so it inherits the
// active/inactive tab text color.
const WaveIcon = (
  <svg width="22" height="16" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 11 C 4.5 6, 9 4, 13 7 C 16 9, 18 9, 20 7"/>
    <path d="M14 7 C 16 5, 19 4, 22 6"/>
    <path d="M2 14 L 22 14" opacity="0.4"/>
  </svg>
);

export function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Today',    icon: '◉' },
    { id: 'map',       label: 'Breaks',   icon: WaveIcon },
    { id: 'forecast',  label: 'Forecast', icon: '≋' },
    { id: 'settings',  label: 'Settings', icon: '⊙' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'rgba(8,9,11,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${TOKENS.border}`,
      padding: '8px 4px 24px', display: 'flex', zIndex: 10,
    }}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
            color: on ? TOKENS.text : TOKENS.textMute,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return `M${cx},${cy} L${start.x},${start.y} A${r},${r} 0 ${large} 0 ${end.x},${end.y} Z`;
}

export function CompassRose({
  size = 36, swellDir, windDir, offshore, optimalSwell,
  swellDirColor, windDirColor,
}: {
  size?: number; swellDir?: number; windDir?: number;
  /** Offshore wind direction. Renders a target wedge for the wind arrow. */
  offshore?: number;
  /** Optimal swell direction. Renders a target wedge for the swell arrow. */
  optimalSwell?: number;
  /** Color for the swell arrow AND the optimal-swell wedge (default
   * TOKENS.pacific). Pass a qualityColor() output to make both communicate
   * match quality together — when the swell aims at its wedge, both turn
   * green; when wildly off, both turn red. */
  swellDirColor?: string;
  /** Color for the wind arrow AND the offshore wedge (default TOKENS.cData). */
  windDirColor?: string;
}) {
  const r = size / 2;
  const swellColor = swellDirColor ?? TOKENS.pacific;
  const windColor = windDirColor ?? TOKENS.cData;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - 1} fill="none" stroke={TOKENS.border} strokeWidth="1"/>
      <circle cx={r} cy={r} r={r - 7} fill="none" stroke={TOKENS.border} strokeWidth="0.5"/>
      <text x={r} y="7" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="6" fill={TOKENS.textMute}>N</text>
      {optimalSwell !== undefined && (
        <path d={describeArc(r, r, r - 3, optimalSwell - 30, optimalSwell + 30)} fill={swellColor} opacity="0.22"/>
      )}
      {offshore !== undefined && (
        <path d={describeArc(r, r, r - 3, offshore - 30, offshore + 30)} fill={windColor} opacity="0.22"/>
      )}
      {swellDir !== undefined && (
        <g transform={`rotate(${swellDir} ${r} ${r})`}>
          <line x1={r} y1={r} x2={r} y2="4" stroke={swellColor} strokeWidth="1.5"/>
          <polygon points={`${r - 2},6 ${r + 2},6 ${r},2`} fill={swellColor}/>
        </g>
      )}
      {windDir !== undefined && (
        <g transform={`rotate(${windDir} ${r} ${r})`}>
          {/* Match the swell's reach (a 6px stub was invisible). Use a small
           * dot at the tip to differentiate from the swell's arrowhead. */}
          <line x1={r} y1={r} x2={r} y2="6" stroke={windColor} strokeWidth="2" strokeDasharray="3 2"/>
          <circle cx={r} cy="5" r="2" fill={windColor}/>
        </g>
      )}
      <circle cx={r} cy={r} r="1.5" fill={TOKENS.text}/>
    </svg>
  );
}

/** Compass rose + 4-cell stat grid showing the spot's current swell + wind
 * directions vs its optimal/offshore reference. Used on Forecast and SpotDetail
 * so both surfaces render identical visuals from the same component. */
export function VectorsPanel({
  spot, current, title = 'Swell & wind vectors · now',
}: { spot: Spot; current: ForecastHour; title?: string }) {
  // Direction-only quality (independent of size/period/speed) so the colors
  // here read "is this direction good?" rather than "is the metric good?".
  // Optimal + Offshore stay green as constant per-spot reference labels;
  // live values + their target wedges pick up qualityColor together.
  const swellDirQ = Math.max(0, 1 - angleDelta(current.swellDirection, spot.optimalSwell) / 180);
  const windDirQ  = Math.max(0, 1 - angleDelta(current.windDirection,  spot.offshore)     / 180);
  return (
    <div style={{ padding: '0 20px 16px' }}>
      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase', marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <CompassRose size={92} swellDir={current.swellDirection} windDir={current.windDirection} offshore={spot.offshore} optimalSwell={spot.optimalSwell} swellDirColor={qualityColor(swellDirQ)} windDirColor={qualityColor(windDirQ)}/>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Stat label="Swell dir" value={degToCardinal(current.swellDirection)} hint={`${Math.round(current.swellDirection)}°`}                       color={qualityColor(swellDirQ)}/>
          <Stat label="Optimal"   value={degToCardinal(spot.optimalSwell)}      hint={`${spot.optimalSwell}°`}                                       color={TOKENS.phosphor}/>
          <Stat label="Wind"      value={degToCardinal(current.windDirection)}  unit={`${Math.round(current.windSpeed)}kts`} hint={`${Math.round(current.windDirection)}°`} color={qualityColor(windDirQ)}/>
          <Stat label="Offshore"  value={degToCardinal(spot.offshore)}          hint={`${spot.offshore}°`}                                           color={TOKENS.phosphor}/>
        </div>
      </div>
    </div>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: TOKENS.bg, color: TOKENS.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif',
      overflow: 'auto', position: 'relative', fontSize: 14,
    }}>
      {children}
    </div>
  );
}
