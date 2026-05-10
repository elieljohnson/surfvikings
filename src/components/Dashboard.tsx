import React, { useMemo, useState } from 'react';
import { TOKENS, scoreColor, qualityColor } from '../lib/tokens';
import {
  SPOTS, FAVORITES, Spot, ForecastHour, BestWindow,
  findBestWindows, scoreToRating,
  hourLabel, degToCardinal, angleDelta, metricQuality,
  wetsuitForWaterF,
} from '../lib/data';
import { BUOY_MAP_BY_SPOT } from '../lib/buoyMapping';
import { useConditions } from '../hooks/useConditions';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useNow } from '../hooks/useNow';
import { useDriveTimes } from '../hooks/useDriveTimes';
import { greetingForHour, formatHeaderDate } from '../lib/greeting';
import { geocode, type HomeBase } from '../lib/routing';
import { Screen, ScoreBadge, ScoreSpark, Stat } from './Primitives';

// Reset the UA's default <button> chrome so it looks like plain text but still
// gets the touch-target + a11y benefits of a real button.
const RESET_BUTTON: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  appearance: 'none',
  WebkitTapHighlightColor: 'transparent',
};

// Tiny inline text editor. Autofocuses, selects all, commits on Enter/blur,
// cancels on Escape. Swaps in place for a label so the header never jumps.
function InlineEdit({
  initial,
  placeholder,
  onCommit,
  onCancel,
  style,
}: {
  initial: string;
  placeholder?: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type="text"
      defaultValue={initial}
      placeholder={placeholder}
      autoFocus
      // iOS mobile keyboard niceties
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="done"
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => onCommit(e.currentTarget.value.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      style={{
        background: 'transparent',
        border: `1px dashed ${TOKENS.border}`,
        borderRadius: 6,
        padding: '2px 6px',
        color: TOKENS.text,
        outline: 'none',
        ...style,
      }}
    />
  );
}

interface DashboardProps {
  onOpenSpot: (id: string) => void;
}

export function Dashboard({ onOpenSpot }: DashboardProps) {
  const favorites = FAVORITES.map((id) => SPOTS.find((s) => s.id === id)).filter(Boolean) as Spot[];
  const tracked = useMemo(() => [...FAVORITES, 'mavericks'], []);
  const { timelines, response, loading, error, stale } = useConditions(tracked);

  // Live clock, updates every minute.
  const now = useNow(60_000);
  const greeting = greetingForHour(now.getHours());
  const headerDate = formatHeaderDate(now);

  // User prefs persist in localStorage. Tap either to edit inline.
  const [name, setName] = useLocalStorage<string>('sv:user:name', '');
  const [home, setHome] = useLocalStorage<HomeBase | null>('sv:user:home', null);
  // Legacy string label, kept for the case where the user opened the app
  // before we had coords. We'll geocode it lazily on first render.
  const [homeLoc, setHomeLoc] = useLocalStorage<string>('sv:user:location', 'Mill Valley');
  const [editingName, setEditingName] = useState(false);
  const [editingLoc, setEditingLoc] = useState(false);

  // If we have a label but no coords yet, kick off a one-time geocode.
  React.useEffect(() => {
    if (home || !homeLoc) return;
    let cancelled = false;
    geocode(homeLoc).then((g) => { if (!cancelled && g) setHome(g); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const driveTime = useDriveTimes(home);

  // Commit a new home-base label: update the display string immediately,
  // geocode in the background, then store coords (which triggers the
  // matrix refetch in useDriveTimes).
  const commitHomeBase = (label: string) => {
    setHomeLoc(label);
    geocode(label).then((g) => { if (g) setHome(g); });
  };

  const ranked = [...favorites].sort(
    (a, b) => (timelines[b.id]?.[0]?.score ?? 0) - (timelines[a.id]?.[0]?.score ?? 0)
  );

  const mavTimeline = timelines['mavericks'] ?? [];
  const mavScore = mavTimeline[0]?.score ?? 0;
  // Find the largest peak in the next 72h to drive the watch panel copy.
  // Falls back to current hour if the timeline is empty (still loading).
  const mavPeak = mavTimeline.length
    ? mavTimeline.reduce((best, h) => (h.swellHeight > best.swellHeight ? h : best), mavTimeline[0])
    : null;
  const mavHeadline = mavPeak
    ? mavPeak.hour === 0
      ? `${Math.round(mavPeak.swellHeight)}ft now`
      : `Building to ${Math.round(mavPeak.swellHeight)}ft+ by ${hourLabel(mavPeak.hour)}`
    : '—';
  const mavSubline = mavPeak
    ? `${Math.round(mavPeak.swellPeriod)}s ${degToCardinal(mavPeak.swellDirection)} groundswell · Spectator advisory`
    : 'Loading';

  const allWindows: (BestWindow & { spot: Spot })[] = favorites
    .flatMap((s) => {
      const tl = timelines[s.id];
      if (!tl?.length) return [];
      return findBestWindows(tl).slice(0, 1).map((w) => ({ ...w, spot: s }));
    })
    .sort((a, b) => b.peak - a.peak)
    .slice(0, 4);

  const tp = ranked[0];
  const now0 = timelines[tp.id]?.[0];
  const swellQ = now0 ? metricQuality(tp, now0, 'swellHeight') : 0.5;
  const dirQ = now0 ? Math.max(0, 1 - angleDelta(now0.swellDirection, tp.optimalSwell) / 180) : 0.5;
  const windQ = now0 ? metricQuality(tp, now0, 'windSpeed') : 0.5;
  const tideQ = now0 ? metricQuality(tp, now0, 'tideHeight') : 0.5;

  const updatedAgoMin = response ? Math.max(0, Math.round((Date.now() - response.updatedAt) / 60000)) : null;
  // Pin the buoy + tide station to the top-pick spot's mapping rather than
  // grabbing whichever happened to be first in the response. The header
  // copy says "FIT FOR PATCH" — the IDs alongside it should match.
  const tpMapping = BUOY_MAP_BY_SPOT[tp.id];
  const buoyId = tpMapping?.primaryBuoy ?? Object.keys(response?.buoys ?? {})[0] ?? '46026';
  const tideId = tpMapping?.tideStation ?? Object.keys(response?.tides ?? {})[0] ?? '9414958';

  // Local weather readout in the header: air temp from the nearest buoy,
  // wind from the top-ranked favorite (same regional conditions as the user).
  // Air temp falls through to any buoy that reports it — most NDBC offshore
  // buoys (46026, 46237, 46042) lack met sensors and only report waves and
  // water temp. Coastal air temp varies little across the 30-mile region.
  const buoyAirF = response?.buoys[buoyId]?.airTempF
    ?? Object.values(response?.buoys ?? {}).find((b) => typeof b.airTempF === 'number')?.airTempF;
  const localTempStr = typeof buoyAirF === 'number' ? `${Math.round(buoyAirF)}°F` : '—°F';
  const localWindStr = now0 ? `${degToCardinal(now0.windDirection)} ${Math.round(now0.windSpeed)}kts` : '';
  const dataBadge = loading ? 'SYNCING' : error ? 'OFFLINE' : stale ? 'STALE' : response?.meta.source === 'partial' ? 'PARTIAL' : 'LIVE';
  const dataBadgeColor = loading ? TOKENS.textDim : error || stale ? TOKENS.fair : response?.meta.source === 'partial' ? TOKENS.good : TOKENS.phosphor;

  return (
    <Screen>
      {/* Hero header */}
      <div style={{ padding: '52px 20px 4px', background: `linear-gradient(180deg, ${TOKENS.surface} 0%, ${TOKENS.bg} 100%)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.2em', color: TOKENS.textMute, textTransform: 'uppercase' }}>{headerDate}</div>
            {editingName ? (
              <InlineEdit
                initial={name}
                placeholder="Your name"
                onCommit={(v) => { setName(v); setEditingName(false); }}
                onCancel={() => setEditingName(false)}
                style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 6, width: '100%' }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                aria-label={name ? 'Change your name' : 'Set your name'}
                style={{
                  ...RESET_BUTTON,
                  fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 6,
                  color: TOKENS.text, textAlign: 'left', width: '100%',
                }}
              >
                {name ? `${greeting}, ${name}.` : `${greeting}. Tap to add name`}
              </button>
            )}
          </div>
          <div style={{ textAlign: 'right', minWidth: 0 }}>
            {editingLoc ? (
              <InlineEdit
                initial={homeLoc}
                placeholder="Home base"
                onCommit={(v) => { if (v) commitHomeBase(v); setEditingLoc(false); }}
                onCancel={() => setEditingLoc(false)}
                style={{
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
                  textAlign: 'right', width: 160,
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingLoc(true)}
                aria-label="Change your home base"
                style={{
                  ...RESET_BUTTON,
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 13, letterSpacing: '0.12em',
                  color: TOKENS.textMute, textTransform: 'uppercase',
                }}
              >
                {homeLoc}
              </button>
            )}
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 14, fontWeight: 500, color: TOKENS.text, marginTop: 4 }}>
              {localTempStr}{localWindStr ? ` · ${localWindStr}` : ''}
            </div>
          </div>
        </div>

      </div>

      <TopPickCard
        spot={ranked[0]}
        timeline={timelines[ranked[0].id]}
        driveMin={driveTime(ranked[0])}
        waterTempF={response?.buoys[BUOY_MAP_BY_SPOT[ranked[0].id]?.primaryBuoy ?? '']?.waterTempF}
        swellQ={swellQ} dirQ={dirQ} windQ={windQ} tideQ={tideQ}
        buoyId={buoyId} tideId={tideId} updatedAgoMin={updatedAgoMin}
        dataBadge={dataBadge} dataBadgeColor={dataBadgeColor}
        onOpen={() => onOpenSpot(ranked[0].id)}
      />

      <BestWindowsStrip windows={allWindows} onOpen={onOpenSpot}/>

      <div style={{ padding: '16px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>My Spots · Ranked</div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textDim }}>{favorites.length} tracked</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ranked.slice(1).map((s) => (
            <SpotRow key={s.id} spot={s} timeline={timelines[s.id]} onClick={() => onOpenSpot(s.id)}/>
          ))}
        </div>
      </div>

      {mavScore >= 30 && (
        <div style={{ padding: '8px 20px 16px' }}>
          <div onClick={() => onOpenSpot('mavericks')} style={{
            background: TOKENS.surface,
            border: `1px solid ${mavScore >= 75 ? TOKENS.maverick : TOKENS.border}`,
            borderLeft: `3px solid ${mavScore >= 75 ? TOKENS.maverick : TOKENS.good}`,
            borderRadius: 10, padding: 16, cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.2em', color: mavScore >= 75 ? TOKENS.maverick : TOKENS.good, textTransform: 'uppercase' }}>
                  {mavScore >= 75 ? '⚡ Mavericks Firing' : '◉ Mavericks Watch'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>{mavHeadline}</div>
                <div style={{ fontSize: 13, color: TOKENS.textDim, marginTop: 2 }}>{mavSubline}</div>
              </div>
              <ScoreBadge score={mavScore} watchOnly/>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 100 }}/>
    </Screen>
  );
}

function TopPickCard({
  spot, timeline, driveMin, waterTempF,
  swellQ, dirQ, windQ, tideQ,
  buoyId, tideId, updatedAgoMin, dataBadge, dataBadgeColor,
  onOpen,
}: {
  spot: Spot; timeline: ForecastHour[]; driveMin: number; waterTempF?: number;
  swellQ: number; dirQ: number; windQ: number; tideQ: number;
  buoyId: string; tideId: string; updatedAgoMin: number | null;
  dataBadge: string; dataBadgeColor: string;
  onOpen: () => void;
}) {
  const waterStr = typeof waterTempF === 'number' ? Math.round(waterTempF).toString() : '—';
  const wetsuit = wetsuitForWaterF(waterTempF) ?? '—';
  const current = timeline[0];
  const rating = scoreToRating(current.score, spot.watchOnly);
  const best = findBestWindows(timeline)[0];
  const color = scoreColor(current.score);
  return (
    <div onClick={onOpen} style={{
      margin: '18px 20px 10px', background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
      borderRadius: 14, padding: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.2em', color: TOKENS.textMute, textTransform: 'uppercase', lineHeight: 1 }}>
            Top Pick
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.2em', color: TOKENS.textMute, textTransform: 'uppercase', lineHeight: 1, marginTop: 6 }}>
            {driveMin} min drive
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8 }}>{spot.regionLabel} · {spot.name}</div>
          <div style={{ fontSize: 13, color: TOKENS.textDim, marginTop: 2 }}>{spot.subtitle}</div>
        </div>
        <ScoreBadge score={current.score} rating={rating.label} size="lg"/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '12px 0', borderTop: `1px solid ${TOKENS.border}`, borderBottom: `1px solid ${TOKENS.border}` }}>
        <Stat label="Swell" value={current.swellHeight.toFixed(1)} unit="ft" hint={`${Math.round(current.swellPeriod)}s`} color={qualityColor(swellQ)}/>
        <Stat label="Dir"   value={degToCardinal(current.swellDirection)} hint={`${Math.round(current.swellDirection)}°`} color={qualityColor(dirQ)}/>
        <Stat label="Wind"  value={Math.round(current.windSpeed)} unit="kts" hint={degToCardinal(current.windDirection)} color={qualityColor(windQ)}/>
        <Stat label="Tide"  value={current.tideHeight.toFixed(1)} unit="ft" hint={current.tideRising ? 'rising ↑' : 'falling ↓'} color={qualityColor(tideQ)}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.2em', color: TOKENS.phosphor, textTransform: 'uppercase', marginBottom: 3 }}>
            ◉ GO NOW · Best window
          </div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {best ? `${hourLabel(best.start)} → ${hourLabel(best.end + 1)}` : 'Building overnight'}
          </div>
          <div style={{ fontSize: 12, color: TOKENS.textDim, marginTop: 2 }}>
            peak {Math.round(best ? best.peak : current.score)} at {hourLabel(best ? best.peakHour : 0)}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textDim, marginTop: 6, letterSpacing: '0.08em' }}>
            WATER {waterStr}°F · {wetsuit}
          </div>
        </div>
        <ScoreSpark timeline={timeline} width={120} height={38}/>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 14, paddingTop: 10, borderTop: `1px solid ${TOKENS.border}`,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textMute, letterSpacing: '0.1em',
      }}>
        <span>BUOY {buoyId}{updatedAgoMin !== null ? ` · ${updatedAgoMin}m AGO` : ''}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dataBadgeColor }}/>
          {dataBadge} · TIDE {tideId}
        </span>
      </div>
    </div>
  );
}

function BestWindowsStrip({ windows, onOpen }: { windows: (BestWindow & { spot: Spot })[]; onOpen: (id: string) => void }) {
  if (!windows.length) return null;
  return (
    <div style={{ padding: '12px 20px 4px' }}>
      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase', marginBottom: 10 }}>
        Best Windows · Next 48h
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 0 4px', margin: '0 -20px', paddingLeft: 20, paddingRight: 20 }}>
        {windows.map((w, i) => (
          <div key={i} onClick={() => onOpen(w.spot.id)} style={{
            minWidth: 130, background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
            borderRadius: 10, padding: 12, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{w.spot.name}</span>
              <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 14, fontWeight: 500, color: scoreColor(w.peak) }}>
                {Math.round(w.peak)}
              </span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textDim, letterSpacing: '0.05em' }}>
              {hourLabel(w.start)}–{hourLabel(w.end + 1)}
            </div>
            <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
              {Array.from({ length: Math.min(w.end - w.start + 1, 8) }).map((_, j) => (
                <div key={j} style={{ flex: 1, height: 3, background: scoreColor(w.peak), opacity: 0.3 + 0.08 * j, borderRadius: 1 }}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpotRow({ spot, timeline, onClick }: { spot: Spot; timeline: ForecastHour[]; onClick: () => void }) {
  const current = timeline[0];
  const rating = scoreToRating(current.score, spot.watchOnly);
  const color = scoreColor(current.score, spot.watchOnly);
  const best = findBestWindows(timeline)[0];
  return (
    <div onClick={onClick} style={{
      background: TOKENS.surface, border: `1px solid ${TOKENS.border}`, borderLeft: `3px solid ${color}`,
      borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{spot.name}</span>
          <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textMute, letterSpacing: '0.1em' }}>{spot.regionLabel.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textDim }}>
          <span style={{ color: TOKENS.cData }}>{current.swellHeight.toFixed(1)}ft · {Math.round(current.swellPeriod)}s {degToCardinal(current.swellDirection)}</span>
          <span style={{ color: TOKENS.cData }}>{Math.round(current.windSpeed)}kts {degToCardinal(current.windDirection)}</span>
        </div>
        {best && (
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color, marginTop: 3, letterSpacing: '0.05em' }}>
            ◉ PEAK {Math.round(best.peak)} @ {hourLabel(best.peakHour)}
          </div>
        )}
      </div>
      <ScoreSpark timeline={timeline} width={60} height={24}/>
      <ScoreBadge score={current.score} rating={rating.label} size="sm"/>
    </div>
  );
}
