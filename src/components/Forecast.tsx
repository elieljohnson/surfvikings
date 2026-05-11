import React, { useState } from 'react';
import { TOKENS, scoreColor, qualityColor } from '../lib/tokens';
import {
  SPOTS, FAVORITES, Spot, ForecastHour, MetricKey,
  hourLabel, degToCardinal, metricQuality, angleDelta,
} from '../lib/data';
import { useConditions } from '../hooks/useConditions';
import { Screen, Stat, ForecastChart, VectorsPanel } from './Primitives';

interface ForecastProps {
  onOpenSpot?: (id: string) => void;
}

export function Forecast(_props: ForecastProps) {
  const favorites = FAVORITES.map((id) => SPOTS.find((s) => s.id === id)).filter(Boolean) as Spot[];
  const { timelines } = useConditions(FAVORITES);
  const [spotId, setSpotId] = useState(favorites[0].id);
  const spot = favorites.find((s) => s.id === spotId)!;
  const timeline = timelines[spotId] ?? [];

  return (
    <Screen>
      <div style={{ padding: '52px 20px 14px', borderBottom: `1px solid ${TOKENS.border}` }}>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>Forecast · 7 days</div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>Outlook</div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '12px 20px 10px', overflowX: 'auto' }}>
        {favorites.map((s) => {
          const score = timelines[s.id]?.[0]?.score ?? 0;
          const on = s.id === spotId;
          return (
            <button key={s.id} onClick={() => setSpotId(s.id)} style={{
              padding: '6px 10px', borderRadius: 6,
              background: on ? TOKENS.surface3 : TOKENS.surface,
              border: `1px solid ${on ? TOKENS.borderHi : TOKENS.border}`,
              color: on ? TOKENS.text : TOKENS.textDim,
              cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: on ? 500 : 400 }}>{s.name.replace('The ', '')}</span>
              <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: scoreColor(score), fontWeight: 500 }}>{Math.round(score)}</span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '8px 20px 16px' }}>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase', marginBottom: 10 }}>
          Hourly quality · {spot.name}
        </div>
        <HourlyHeatmap timeline={timeline}/>
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Conditions · next 7 days
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.textDim, whiteSpace: 'nowrap' }}>
            Fit for {spot.name.replace('The ', '')}
          </div>
        </div>
        <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 10, padding: 14 }}>
          <MiniMetric label="Swell" metric="swellHeight" unit="ft" spot={spot} timeline={timeline}/>
          <MiniMetric label="Period" metric="swellPeriod" unit="s" spot={spot} timeline={timeline}/>
          <MiniMetric label="Wind" metric="windSpeed" unit="kts" spot={spot} timeline={timeline}/>
          <MiniMetric label="Tide" metric="tideHeight" unit="ft" spot={spot} timeline={timeline} last/>
        </div>
      </div>

      <VectorsPanel spot={spot} current={timeline[0]}/>

      <div style={{ height: 100 }}/>
    </Screen>
  );
}

function HourlyHeatmap({ timeline }: { timeline: ForecastHour[] }) {
  // Row labels derive from real local time so they're correct any day of
  // the week, not hardcoded. Renders up to 7 days (168 hours) of forecast.
  const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const today = new Date().getDay();
  const dayCount = Math.min(7, Math.ceil(timeline.length / 24));
  const rows = Array.from({ length: dayCount }, (_, di) => ({
    label: DAYS[(today + di) % 7],
    data: timeline.slice(di * 24, (di + 1) * 24),
  }));
  return (
    <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(24, 1fr)', gap: 1, marginBottom: 4 }}>
        <div/>
        {[0, 6, 12, 18].map((h) => (
          <div key={h} style={{
            gridColumn: 'span 6',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textMute,
            letterSpacing: '0.1em',
          }}>{h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`}</div>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '36px repeat(24, 1fr)', gap: 1, marginBottom: 2 }}>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textDim, letterSpacing: '0.1em', display: 'flex', alignItems: 'center' }}>{row.label}</div>
          {row.data.map((t, i) => {
            const color = scoreColor(t.score);
            const opacity = 0.25 + (t.score / 100) * 0.75;
            const isNow = ri === 0 && i === 0;
            return (
              <div key={i} title={`${hourLabel(ri * 24 + i)}: ${Math.round(t.score)}`} style={{
                height: 18, background: color, opacity,
                border: isNow ? `1px solid ${TOKENS.text}` : 'none',
                borderRadius: 1,
              }}/>
            );
          })}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textMute, letterSpacing: '0.1em' }}>
        <span>FLAT</span>
        <div style={{ flex: 1, height: 6, background: `linear-gradient(90deg, ${TOKENS.flat}, ${TOKENS.poor}, ${TOKENS.fair}, ${TOKENS.good}, ${TOKENS.epic})`, borderRadius: 1 }}/>
        <span>EPIC</span>
      </div>
    </div>
  );
}

function MiniMetric({
  label, metric, unit, spot, timeline, last,
}: { label: string; metric: MetricKey; unit: string; spot: Spot; timeline: ForecastHour[]; last?: boolean }) {
  const values = timeline.map((t) => t[metric] as number);
  const current = values[0];
  const max = Math.max(...values), min = Math.min(...values);
  const nowQ = metricQuality(spot, timeline[0], metric);
  const nowColor = qualityColor(nowQ);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0',
      borderBottom: last ? 'none' : `1px solid ${TOKENS.border}`,
    }}>
      <div style={{ width: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: nowColor, flexShrink: 0 }}/>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.1em', color: TOKENS.textMute, textTransform: 'uppercase' }}>{label}</div>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 14, color: TOKENS.text, fontWeight: 500, marginTop: 2 }}>
          {current.toFixed(1)}<span style={{ fontSize: 12, color: TOKENS.textDim, marginLeft: 2 }}>{unit}</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <ForecastChart timeline={timeline} metric={metric} spot={spot} height={28} showAxis={false}/>
      </div>
      <div style={{ width: 50, textAlign: 'right', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textMute }}>
        {min.toFixed(1)}–{max.toFixed(1)}
      </div>
    </div>
  );
}
