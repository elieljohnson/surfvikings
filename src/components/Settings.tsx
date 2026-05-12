import React from 'react';
import { TOKENS, scoreColor } from '../lib/tokens';
import { Screen } from './Primitives';
import { useLocalStorage } from '../hooks/useLocalStorage';

/** Default min score threshold — chips below this are hidden from the
 *  dashboard. 55 is "fair" on our score scale; below that conditions
 *  aren't worth the drive for most surfers. */
export const DEFAULT_MIN_SCORE = 55;

interface HomeBase {
  lat: number;
  lng: number;
  label: string;
}

export function Settings() {
  // User prefs persist in localStorage — per-browser, per-visitor. No
  // server, no auth, no cross-device sync. Each visitor gets their own
  // copy; visitors can't change Eliel's app.
  const [units, setUnits] = useLocalStorage<'imperial' | 'metric'>('sv:units', 'imperial');
  const [notifyEpic, setNotifyEpic] = useLocalStorage<boolean>('sv:notifyEpic', true);
  const [minScore, setMinScore] = useLocalStorage<number>('sv:minScore', DEFAULT_MIN_SCORE);

  // Display-only: home base is set via dashboard inline-edit, we just
  // mirror the truth here so Settings doesn't lie about it.
  const [home] = useLocalStorage<HomeBase | null>('sv:user:home', null);
  const [homeLoc] = useLocalStorage<string>('sv:user:location', 'Mill Valley');
  const homeLabel = home?.label ?? homeLoc ?? 'Mill Valley, CA';

  return (
    <Screen>
      <div style={{ padding: '52px 20px 14px', borderBottom: `1px solid ${TOKENS.border}` }}>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>Settings</div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>Surf Vikings</div>
        <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 6, lineHeight: 1.5 }}>
          Preferences are saved to this browser only. No account, no sync, no tracking.
        </div>
      </div>

      <Group title="Home base">
        <Row label="Location" value={homeLabel} hint="Tap the dashboard header to edit" mono/>
      </Group>

      <Group title="Alerts">
        <Toggle label="Epic window alerts" hint="Notify when a tracked spot hits 75+" on={notifyEpic} onChange={setNotifyEpic}/>
        <Slider label="Min score threshold" hint="Hide chips below this score on the dashboard" value={minScore} onChange={setMinScore} min={30} max={85}/>
        {/* Mavericks watch toggle removed pending push-notifications infra
            (backlog item: push notifications). Restore when notifications
            actually have a delivery path. */}
      </Group>

      <Group title="Units">
        <Segmented label="System" value={units} onChange={setUnits} options={[['imperial', 'Imperial'], ['metric', 'Metric']]}/>
        <Row label="Swell" value={units === 'imperial' ? 'ft · s' : 'm · s'} mono/>
        <Row label="Wind" value={units === 'imperial' ? 'knots' : 'm/s'} mono/>
        <Row label="Temp" value={units === 'imperial' ? '°F' : '°C'} mono/>
        <Row label="Coming soon" value="Views still display imperial" hint="Setting saves; thread-through is a follow-up"/>
      </Group>

      <Group title="Data sources">
        <Row label="NOAA NDBC buoys" value="7 stations" mono/>
        <Row label="CO-OPS tide stations" value="6 stations" mono/>
        <Row label="NWS coastal forecast" value="Active" mono color={TOKENS.phosphor}/>
        <Row label="Open-Meteo Marine" value="Active" mono color={TOKENS.phosphor}/>
        <Row label="Water quality" value="5 counties" mono/>
        <Row label="Cache TTL" value="1h · 48h offline" mono/>
      </Group>

      <Group title="About">
        <Row label="Version" value="2.0.1" mono/>
        <Row label="Built in" value="Mill Valley, CA"/>
        <Row label="Data" value="100% public NOAA, Open-Meteo + county EH"/>
      </Group>

      <div style={{ height: 100 }}/>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
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
        <div style={{ fontSize: 14, color: TOKENS.text }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{
        fontFamily: mono ? 'JetBrains Mono, ui-monospace, monospace' : 'inherit',
        fontSize: 13, color: color || TOKENS.textDim,
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
        <div style={{ fontSize: 14, color: TOKENS.text }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>{hint}</div>}
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

function Slider({ label, hint, value, onChange, min, max }: { label: string; hint?: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${TOKENS.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 14, color: TOKENS.text }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 14, color: scoreColor(value), fontWeight: 500 }}>{value}</span>
      </div>
      {hint && <div style={{ fontSize: 12, color: TOKENS.textMute, marginBottom: 8 }}>{hint}</div>}
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
      <span style={{ fontSize: 14, color: TOKENS.text }}>{label}</span>
      <div style={{ display: 'flex', background: TOKENS.surface2, borderRadius: 6, padding: 2, border: `1px solid ${TOKENS.border}` }}>
        {options.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)} style={{
            padding: '4px 10px', borderRadius: 4,
            background: value === v ? TOKENS.surface3 : 'transparent',
            border: 'none', color: value === v ? TOKENS.text : TOKENS.textDim,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, letterSpacing: '0.1em',
            cursor: 'pointer', textTransform: 'uppercase',
          }}>{l}</button>
        ))}
      </div>
    </div>
  );
}
