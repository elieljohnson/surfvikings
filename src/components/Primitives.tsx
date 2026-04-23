import React from 'react';
import { TOKENS, scoreColor } from '../lib/tokens';
import {
  ForecastHour, Spot, MetricKey, metricQuality, hourLabel,
} from '../lib/data';
import { qualityColor } from '../lib/tokens';

export function BackButton({ onClick }: { onClick: () => void }) {
  const setPress = (pressed: boolean) => (e: React.SyntheticEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.transform = pressed ? 'scale(0.92)' : 'scale(1)';
  };
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      style={{
        flexShrink: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        background: TOKENS.surface2,
        border: `1px solid ${TOKENS.borderHi}`,
        color: TOKENS.text,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'transform 120ms ease, background 120ms ease',
      }}
      onMouseDown={setPress(true)}
      onMouseUp={setPress(false)}
      onMouseLeave={setPress(false)}
      onTouchStart={setPress(true)}
      onTouchEnd={setPress(false)}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  const max = 100;
  const pts = timeline.slice(0, 24).map((t, i) => {
    const x = (i / 23) * width;
    const y = height - (t.score / max) * height;
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  const gid = `spk-${idRef.current}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TOKENS.pacific} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={TOKENS.pacific} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`}/>
      <path d={path} stroke={TOKENS.pacific} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {highlight > 0 && pts[highlight] && (
        <circle cx={pts[highlight][0]} cy={pts[highlight][1]} r="3" fill={TOKENS.pacific} stroke={TOKENS.bg} strokeWidth="2"/>
      )}
    </svg>
  );
}

export function ForecastChart({
  timeline, metric, spot, height = 56, width = 320, showAxis = true, baseHour = 6,
}: {
  timeline: ForecastHour[]; metric: MetricKey; spot?: Spot;
  height?: number; width?: number; showAxis?: boolean; baseHour?: number;
}) {
  const values = timeline.map((t) => t[metric] as number);
  const max = Math.max(...values) * 1.15;
  const min = metric === 'tideHeight' ? Math.min(...values) * 0.9 : 0;
  const range = max - min || 1;
  const barW = width / timeline.length;
  return (
    <svg width={width} height={height + (showAxis ? 14 : 0)} style={{ display: 'block' }}>
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
      {showAxis && [0, 6, 12, 18, 24, 30, 36, 42].map((h) => (
        <text key={h} x={h * barW} y={height + 11}
          fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="12" fill={TOKENS.textMute}>
          {hourLabel(h, baseHour)}
        </text>
      ))}
    </svg>
  );
}

export function ScoreTimeline({
  timeline, width = 320, height = 90, baseHour = 6,
}: { timeline: ForecastHour[]; width?: number; height?: number; baseHour?: number }) {
  const pts = timeline.map((t, i) => {
    const x = (i / (timeline.length - 1)) * width;
    const y = height - (t.score / 100) * height;
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  const epicY = height - 0.75 * height;
  const goodY = height - 0.55 * height;
  return (
    <svg width={width} height={height + 14} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="score-ln" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TOKENS.pacific} stopOpacity="0.5"/>
          <stop offset="100%" stopColor={TOKENS.pacific} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <line x1="0" x2={width} y1={epicY} y2={epicY} stroke={TOKENS.epic} strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5"/>
      <line x1="0" x2={width} y1={goodY} y2={goodY} stroke={TOKENS.good} strokeWidth="0.5" strokeDasharray="2 3" opacity="0.35"/>
      <text x={width - 2} y={epicY - 2} textAnchor="end" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="11" fill={TOKENS.epic} opacity="0.8">EPIC 75</text>
      <text x={width - 2} y={goodY - 2} textAnchor="end" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="11" fill={TOKENS.good} opacity="0.65">GOOD 55</text>
      <path d={areaPath} fill="url(#score-ln)"/>
      <path d={path} stroke={TOKENS.pacific} strokeWidth="1.75" fill="none" strokeLinecap="round"/>
      <circle cx={pts[0][0]} cy={pts[0][1]} r="3.5" fill={TOKENS.pacific} stroke={TOKENS.bg} strokeWidth="2"/>
      {[0, 6, 12, 18, 24, 30, 36, 42].map((h) => (
        <text key={h} x={(h / (timeline.length - 1)) * width} y={height + 11}
          fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="12" fill={TOKENS.textMute}>
          {hourLabel(h, baseHour)}
        </text>
      ))}
    </svg>
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

export function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Today',    icon: '◉' },
    { id: 'map',       label: 'Map',      icon: '◎' },
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
  size = 36, swellDir, windDir, offshore,
}: { size?: number; swellDir?: number; windDir?: number; offshore?: number }) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - 1} fill="none" stroke={TOKENS.border} strokeWidth="1"/>
      <circle cx={r} cy={r} r={r - 7} fill="none" stroke={TOKENS.border} strokeWidth="0.5"/>
      <text x={r} y="7" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="6" fill={TOKENS.textMute}>N</text>
      {offshore !== undefined && (
        <path d={describeArc(r, r, r - 3, offshore - 30, offshore + 30)} fill={TOKENS.phosphor} opacity="0.18"/>
      )}
      {swellDir !== undefined && (
        <g transform={`rotate(${swellDir} ${r} ${r})`}>
          <line x1={r} y1={r} x2={r} y2="4" stroke={TOKENS.pacific} strokeWidth="1.5"/>
          <polygon points={`${r - 2},6 ${r + 2},6 ${r},2`} fill={TOKENS.pacific}/>
        </g>
      )}
      {windDir !== undefined && (
        <g transform={`rotate(${windDir} ${r} ${r})`}>
          <line x1={r} y1={r} x2={r} y2={r - 6} stroke={TOKENS.cData} strokeWidth="1"/>
        </g>
      )}
      <circle cx={r} cy={r} r="1.5" fill={TOKENS.text}/>
    </svg>
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
