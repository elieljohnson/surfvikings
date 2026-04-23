import React, { useMemo } from 'react';
import { TOKENS, scoreColor, qualityColor } from '../lib/tokens';
import {
  SPOTS, FAVORITES, Spot, ForecastHour, BestWindow,
  findBestWindows, scoreToRating,
  hourLabel, degToCardinal, angleDelta, metricQuality,
} from '../lib/data';
import { useConditions } from '../hooks/useConditions';
import { Screen, ScoreBadge, ScoreSpark, Stat } from './Primitives';

interface DashboardProps {
  onOpenSpot: (id: string) => void;
}

export function Dashboard({ onOpenSpot }: DashboardProps) {
  const favorites = FAVORITES.map((id) => SPOTS.find((s) => s.id === id)).filter(Boolean) as Spot[];
  const tracked = useMemo(() => [...FAVORITES, 'mavericks'], []);
  const { timelines, response, loading, error, stale } = useConditions(tracked);

  const ranked = [...favorites].sort(
    (a, b) => (timelines[b.id]?.[0]?.score ?? 0) - (timelines[a.id]?.[0]?.score ?? 0)
  );

  const mavTimeline = timelines['mavericks'] ?? [];
  const mavScore = mavTimeline[0]?.score ?? 0;

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
  const buoyId = response ? Object.keys(response.buoys)[0] ?? '46026' : '46026';
  const tideId = response ? Object.keys(response.tides)[0] ?? '9414958' : '9414958';
  const dataBadge = loading ? 'SYNCING' : error ? 'OFFLINE' : stale ? 'STALE' : response?.meta.source === 'partial' ? 'PARTIAL' : 'LIVE';
  const dataBadgeColor = loading ? TOKENS.textDim : error || stale ? TOKENS.fair : response?.meta.source === 'partial' ? TOKENS.good : TOKENS.phosphor;

  return (
    <Screen>
      {/* Hero header */}
      <div style={{ padding: '52px 20px 20px', background: `linear-gradient(180deg, ${TOKENS.surface} 0%, ${TOKENS.bg} 100%)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.2em', color: TOKENS.textMute, textTransform: 'uppercase' }}>Thu · Apr 22 · 06:14</div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 6 }}>Morning, Eliel.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.12em', color: TOKENS.textMute, textTransform: 'uppercase' }}>Mill Valley</div>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 14, fontWeight: 500, color: TOKENS.text, marginTop: 4 }}>58°F · NE 6kts</div>
          </div>
        </div>

        <div style={{
          background: TOKENS.surface2, border: `1px solid ${TOKENS.border}`, borderRadius: 12,
          padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
        }}>
          <Stat label="Swell" value={now0 ? now0.swellHeight.toFixed(1) : '—'} unit="ft" hint={now0 ? `${Math.round(now0.swellPeriod)}s` : ''} color={qualityColor(swellQ)}/>
          <Stat label="Dir" value={now0 ? degToCardinal(now0.swellDirection) : '—'} hint={now0 ? `${Math.round(now0.swellDirection)}°` : ''} color={qualityColor(dirQ)}/>
          <Stat label="Wind" value={now0 ? Math.round(now0.windSpeed) : '—'} unit="kts" hint={now0 ? degToCardinal(now0.windDirection) : ''} color={qualityColor(windQ)}/>
          <Stat label="Tide" value={now0 ? now0.tideHeight.toFixed(1) : '—'} unit="ft" hint={now0 ? (now0.tideRising ? 'rising ↑' : 'falling ↓') : ''} color={qualityColor(tideQ)}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textMute, letterSpacing: '0.1em' }}>
          <span>BUOY {buoyId}{updatedAgoMin !== null ? ` · ${updatedAgoMin}m AGO` : ''} · FIT FOR {tp.name.replace('The ', '').toUpperCase()}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: dataBadgeColor }}/>
            {dataBadge} · TIDE {tideId}
          </span>
        </div>
      </div>

      <TopPickCard spot={ranked[0]} timeline={timelines[ranked[0].id]} onOpen={() => onOpenSpot(ranked[0].id)}/>

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
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>Building to 20ft+ by Friday 4am</div>
                <div style={{ fontSize: 13, color: TOKENS.textDim, marginTop: 2 }}>18s NW groundswell · Spectator advisory</div>
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

function TopPickCard({ spot, timeline, onOpen }: { spot: Spot; timeline: ForecastHour[]; onOpen: () => void }) {
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
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.2em', color: TOKENS.textMute, textTransform: 'uppercase' }}>
            Top Pick · {spot.driveMin} min drive
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{spot.regionLabel} · {spot.name}</div>
          <div style={{ fontSize: 13, color: TOKENS.textDim, marginTop: 2 }}>{spot.subtitle}</div>
        </div>
        <ScoreBadge score={current.score} rating={rating.label} size="lg"/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '12px 0', borderTop: `1px solid ${TOKENS.border}`, borderBottom: `1px solid ${TOKENS.border}` }}>
        <Stat label="Swell" value={current.swellHeight.toFixed(1)} unit="ft" hint={`${Math.round(current.swellPeriod)}s ${degToCardinal(current.swellDirection)}`}/>
        <Stat label="Wind" value={Math.round(current.windSpeed)} unit="kts" hint={`${degToCardinal(current.windDirection)} • offshore`}/>
        <Stat label="Tide" value={current.tideHeight.toFixed(1)} unit="ft" hint={current.tideRising ? 'rising ↑' : 'falling ↓'}/>
        <Stat label="Water" value="54" unit="°F" hint="4/3 mm"/>
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
        </div>
        <ScoreSpark timeline={timeline} width={120} height={38}/>
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
