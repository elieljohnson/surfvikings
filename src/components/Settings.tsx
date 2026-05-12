import React, { useState } from 'react';
import { TOKENS, scoreColor } from '../lib/tokens';
import { Screen, InlineEdit } from './Primitives';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useFavorites } from '../hooks/useFavorites';
import { SPOTS, DEFAULT_FAVORITES } from '../lib/data';
import { geocode, type HomeBase as HomeBaseGeo } from '../lib/routing';

/** Canonical north-to-south region order for the Favorites editor.
 *  Matches how surfers think about the coast — Salt Point at the top,
 *  Santa Cruz at the bottom — rather than alphabetical. */
const REGION_ORDER: { id: string; label: string }[] = [
  { id: 'sonoma',   label: 'Sonoma · Salt Point' },
  { id: 'pt-reyes', label: 'Point Reyes' },
  { id: 'marin',    label: 'Marin' },
  { id: 'sf',       label: 'San Francisco' },
  { id: 'sm-north', label: 'Pacifica · HMB' },
  { id: 'sm-south', label: 'Hwy 1 South' },
  { id: 'sc',       label: 'Santa Cruz' },
];

/** Default min score threshold — chips below this are hidden from the
 *  dashboard. Set to 25 (effectively "show almost everything") so new
 *  visitors evaluating the app — recruiters, interviewers, surfers
 *  curious what it does — see populated chips even on flat days.
 *  Returning users with their own preference set in localStorage are
 *  unaffected; this only changes the first-load experience. */
export const DEFAULT_MIN_SCORE = 25;

export function Settings() {
  // User prefs persist in localStorage — per-browser, per-visitor. No
  // server, no auth, no cross-device sync. Each visitor gets their own
  // copy; visitors can't change Eliel's app.
  const [units, setUnits] = useLocalStorage<'imperial' | 'metric'>('sv:units', 'imperial');
  const [notifyEpic, setNotifyEpic] = useLocalStorage<boolean>('sv:notifyEpic', true);
  const [minScore, setMinScore] = useLocalStorage<number>('sv:minScore', DEFAULT_MIN_SCORE);
  const { favorites, toggle: toggleFavorite, reset: resetFavorites, isFavorite } = useFavorites();

  // Home base is editable here AND from the dashboard header — both
  // write to the same localStorage keys, so changing it from either
  // surface is reflected on the other. Geocoding runs in the background
  // on commit so the home coords stay in sync with the label string.
  const [home, setHome] = useLocalStorage<HomeBaseGeo | null>('sv:user:home', null);
  const [homeLoc, setHomeLoc] = useLocalStorage<string>('sv:user:location', 'Mill Valley');
  const [editingHome, setEditingHome] = useState(false);
  const homeLabel = home?.label ?? homeLoc ?? 'Mill Valley, CA';

  const commitHome = (label: string) => {
    setEditingHome(false);
    if (!label) return;
    setHomeLoc(label);
    geocode(label).then((g) => { if (g) setHome(g); });
  };

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
        <EditableRow
          label="Location"
          value={homeLabel}
          editing={editingHome}
          onEditStart={() => setEditingHome(true)}
          onCommit={commitHome}
          onCancel={() => setEditingHome(false)}
        />
      </Group>

      <FavoritesEditor
        favorites={favorites}
        toggle={toggleFavorite}
        reset={resetFavorites}
        isFavorite={isFavorite}
      />

      <Group title="Alerts">
        <Toggle label="Epic window alerts" hint="Notify when a tracked spot hits 75+" on={notifyEpic} onChange={setNotifyEpic}/>
        <Slider label="Min score threshold" hint="Hide chips below this score on the dashboard" value={minScore} onChange={setMinScore} min={0} max={100}/>
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

/** Row variant where the whole row is a tap target that swaps the value
 *  cell to an InlineEdit. Used for the Home base location. Hint stays
 *  short ("Tap to edit") because the whole row is the affordance —
 *  no need to direct the user elsewhere. */
function EditableRow({
  label, value, editing, onEditStart, onCommit, onCancel,
}: {
  label: string;
  value: string;
  editing: boolean;
  onEditStart: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const content = (
    <>
      {/* Label cell shrinks first when the row gets tight so the value
          on the right stays on one line. Hint will wrap if needed. */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, color: TOKENS.text }}>{label}</div>
        {!editing && (
          <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>Tap to edit</div>
        )}
      </div>
      {editing ? (
        <InlineEdit
          initial={value}
          placeholder="Home base"
          onCommit={onCommit}
          onCancel={onCancel}
          style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 13, textAlign: 'right', minWidth: 140,
          }}
        />
      ) : (
        <div style={{
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: 13, color: TOKENS.textDim,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>{value}</div>
      )}
    </>
  );

  const baseStyle: React.CSSProperties = {
    padding: '12px 14px',
    borderBottom: `1px solid ${TOKENS.border}`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12,
  };

  // Editing: render as plain div so taps inside the input don't re-trigger
  // edit mode. Not editing: render as a full-row button for the affordance.
  if (editing) {
    return <div style={baseStyle}>{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={onEditStart}
      aria-label={`Edit ${label.toLowerCase()}`}
      style={{
        ...baseStyle,
        width: '100%', background: 'none', border: 'none',
        borderBottom: `1px solid ${TOKENS.border}`,
        textAlign: 'left', cursor: 'pointer',
        font: 'inherit', color: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
    >{content}</button>
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

interface FavoritesEditorProps {
  favorites: string[];
  toggle: (id: string) => void;
  reset: () => void;
  isFavorite: (id: string) => boolean;
}

/** Collapsed-by-region favorites editor. Each region row shows the
 *  region name, total spot count, and how many are favorited. Tap to
 *  expand a per-spot toggle list. "Reset to defaults" in the section
 *  header restores DEFAULT_FAVORITES — useful after experimenting. */
function FavoritesEditor({ favorites, toggle, reset, isFavorite }: FavoritesEditorProps) {
  // Each region's collapsed/expanded state is local UI, not persisted —
  // every visit starts collapsed so the page stays scannable.
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({});

  const isDefault = favorites.length === DEFAULT_FAVORITES.length
    && favorites.every((id) => DEFAULT_FAVORITES.includes(id));

  return (
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 8, gap: 8,
      }}>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>
          Favorites · {favorites.length}/{SPOTS.length}
        </div>
        {!isDefault && (
          <button onClick={reset} style={{
            background: 'none', border: 'none', padding: 0,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: TOKENS.pacific, cursor: 'pointer',
          }}>Reset to defaults</button>
        )}
      </div>
      <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderRadius: 10, overflow: 'hidden' }}>
        {REGION_ORDER.map(({ id: regionId, label }) => {
          const regionSpots = SPOTS.filter((s) => s.region === regionId);
          if (regionSpots.length === 0) return null;
          const favCount = regionSpots.filter((s) => isFavorite(s.id)).length;
          const isOpen = !!openRegions[regionId];
          return (
            <div key={regionId}>
              <button
                onClick={() => setOpenRegions((prev) => ({ ...prev, [regionId]: !prev[regionId] }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderBottom: `1px solid ${TOKENS.border}`,
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  color: TOKENS.text,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11,
                    color: TOKENS.textMute, width: 10, display: 'inline-block',
                  }}>{isOpen ? '▾' : '▸'}</span>
                  {/* Regions with at least one favorite render bolder + brighter
                      so users can scan and see where their picks live without
                      expanding every section. */}
                  <span style={{
                    fontSize: 14,
                    fontWeight: favCount > 0 ? 600 : 400,
                    color: favCount > 0 ? TOKENS.text : TOKENS.textDim,
                  }}>{label}</span>
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12,
                  fontWeight: favCount > 0 ? 600 : 400,
                  color: favCount > 0 ? TOKENS.pacific : TOKENS.textDim,
                }}>
                  {favCount}/{regionSpots.length}
                </div>
              </button>
              {isOpen && regionSpots.map((s) => (
                <div key={s.id} onClick={() => toggle(s.id)} style={{
                  padding: '10px 14px 10px 32px',
                  borderBottom: `1px solid ${TOKENS.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: TOKENS.text }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>{s.subtitle}</div>
                  </div>
                  <Checkbox on={isFavorite(s.id)}/>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Checkbox({ on }: { on: boolean }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 5,
      border: `1.5px solid ${on ? TOKENS.pacific : TOKENS.borderHi}`,
      background: on ? TOKENS.pacific : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {on && (
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 6.5L5 9.5L10 3.5" stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      )}
    </div>
  );
}
