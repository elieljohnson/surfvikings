import React, { useState } from 'react';
import { TOKENS, scoreColor } from '../lib/tokens';
import { Screen } from './Primitives';

export function Settings() {
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');
  const [notifyEpic, setNotifyEpic] = useState(true);
  const [notifyMavs, setNotifyMavs] = useState(true);
  const [minScore, setMinScore] = useState(55);

  return (
    <Screen>
      <div style={{ padding: '52px 20px 14px', borderBottom: `1px solid ${TOKENS.border}` }}>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>Settings</div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>Surf Vikings</div>
      </div>

      <Group title="Home base">
        <Row label="Location" value="Mill Valley, CA" mono/>
        <Row label="Drive radius" value="60 min" mono/>
      </Group>

      <Group title="Alerts">
        <Toggle label="Epic window alerts" hint="Notify when a tracked spot hits 75+" on={notifyEpic} onChange={setNotifyEpic}/>
        <Toggle label="Mavericks watch" hint="Big wave advisory (15ft+ groundswell)" on={notifyMavs} onChange={setNotifyMavs}/>
        <Slider label="Min score threshold" value={minScore} onChange={setMinScore} min={30} max={85}/>
      </Group>

      <Group title="Units">
        <Segmented label="System" value={units} onChange={setUnits} options={[['imperial', 'Imperial'], ['metric', 'Metric']]}/>
        <Row label="Swell" value={units === 'imperial' ? 'ft · s' : 'm · s'} mono/>
        <Row label="Wind" value={units === 'imperial' ? 'knots' : 'm/s'} mono/>
        <Row label="Temp" value={units === 'imperial' ? '°F' : '°C'} mono/>
      </Group>

      <Group title="Data sources">
        <Row label="NOAA NDBC buoys" value="5 stations" mono/>
        <Row label="CO-OPS tide stations" value="6 stations" mono/>
        <Row label="Open-Meteo Marine" value="Active" mono color={TOKENS.phosphor}/>
        <Row label="Cache TTL" value="1h · 48h offline" mono/>
        <Row label="Last sync" value="4 min ago" mono/>
      </Group>

      <Group title="About">
        <Row label="Version" value="2.0.1" mono/>
        <Row label="Built in" value="Mill Valley, CA"/>
        <Row label="Data" value="100% public NOAA + Open-Meteo"/>
      </Group>

      <div style={{ height: 100 }}/>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 10 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, hint, mono, color }: { label: string; value: React.ReactNode; hint?: string; mono?: boolean; color?: string }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderBottom: `1px solid ${TOKENS.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: 13, color: TOKENS.text }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: TOKENS.textMute, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{
        fontFamily: mono ? 'JetBrains Mono, ui-monospace, monospace' : 'inherit',
        fontSize: 12, color: color || TOKENS.textDim,
      }}>{value}</div>
    </div>
  );
}

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{
      padding: '12px 14px', borderBottom: `1px solid ${TOKENS.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: TOKENS.text }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: TOKENS.textMute, marginTop: 2 }}>{hint}</div>}
      </div>
      <div onClick={() => onChange(!on)} style={{
        width: 38, height: 22, borderRadius: 11,
        background: on ? TOKENS.pacific : TOKENS.surface3,
        border: `1px solid ${on ? TOKENS.pacific : TOKENS.borderHi}`,
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 1, left: on ? 17 : 1,
          width: 18, height: 18, borderRadius: 9,
          background: TOKENS.text, transition: 'left 0.2s',
        }}/>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${TOKENS.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: TOKENS.text }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: scoreColor(value), fontWeight: 500 }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: TOKENS.pacific }}/>
    </div>
  );
}

function Segmented<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${TOKENS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13, color: TOKENS.text }}>{label}</span>
      <div style={{ display: 'flex', background: TOKENS.surface2, borderRadius: 6, padding: 2, border: `1px solid ${TOKENS.border}` }}>
        {options.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)} style={{
            padding: '4px 10px', borderRadius: 4,
            background: value === v ? TOKENS.surface3 : 'transparent',
            border: 'none', color: value === v ? TOKENS.text : TOKENS.textDim,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, letterSpacing: '0.1em',
            cursor: 'pointer', textTransform: 'uppercase',
          }}>{l}</button>
        ))}
      </div>
    </div>
  );
}
