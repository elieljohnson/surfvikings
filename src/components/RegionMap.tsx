import React, { useMemo, useState } from 'react';
import { TOKENS, scoreColor } from '../lib/tokens';
import { SPOTS, Spot, buildTimeline, RegionId } from '../lib/data';
import { useConditions } from '../hooks/useConditions';

type Filter = 'all' | 'beginner' | 'intermediate' | 'advanced';

interface RegionMeta {
  id: RegionId;
  label: string;
  buoy: string;
}

const REGIONS: RegionMeta[] = [
  { id: 'sonoma',   label: 'Sonoma Coast',      buoy: '46013' },
  { id: 'pt-reyes', label: 'Point Reyes',       buoy: '46013' },
  { id: 'marin',    label: 'Marin',             buoy: '46026' },
  { id: 'sf',       label: 'SF',                buoy: '46026' },
  { id: 'sm-north', label: 'San Mateo N',       buoy: '46012' },
  { id: 'sm-south', label: 'Hwy 1 South',       buoy: '46042' },
  { id: 'sc',       label: 'Santa Cruz',        buoy: '46042' },
];

interface RegionMapProps {
  onOpenSpot: (id: string) => void;
}

export function RegionMap({ onOpenSpot }: RegionMapProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const allIds = useMemo(() => SPOTS.map((s) => s.id), []);
  const { timelines } = useConditions(allIds);
  const spotScores = useMemo(
    () =>
      Object.fromEntries(
        SPOTS.map((s) => {
          const tl = timelines[s.id];
          const score = tl?.[0]?.score ?? buildTimeline(s)[0].score;
          return [s.id, score];
        })
      ),
    [timelines]
  );

  const passesFilter = (s: Spot) => {
    if (filter === 'beginner') return s.difficulty <= 3;
    if (filter === 'intermediate') return s.difficulty >= 4 && s.difficulty <= 6;
    if (filter === 'advanced') return s.difficulty >= 7;
    return true;
  };

  const visible = SPOTS.filter(passesFilter);

  return (
    <div style={{ width: '100%', height: '100%', background: TOKENS.bg, color: TOKENS.text, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        padding: '52px 20px 12px',
        background: 'rgba(8,9,11,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${TOKENS.border}`,
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>Coastline</div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>Salt Point → Santa Cruz</div>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textDim, letterSpacing: '0.1em' }}>
            {visible.length} / {SPOTS.length} SPOTS
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'all' as Filter, l: 'All' },
            { id: 'beginner' as Filter, l: 'Beginner' },
            { id: 'intermediate' as Filter, l: 'Int' },
            { id: 'advanced' as Filter, l: 'Adv' },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              flex: 1, padding: '6px 8px', borderRadius: 6,
              background: filter === f.id ? TOKENS.surface3 : TOKENS.surface,
              border: `1px solid ${filter === f.id ? TOKENS.borderHi : TOKENS.border}`,
              color: filter === f.id ? TOKENS.text : TOKENS.textDim,
              fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, letterSpacing: '0.1em',
              cursor: 'pointer', textTransform: 'uppercase',
            }}>{f.l}</button>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', top: 118, bottom: 0, left: 0, right: 0, overflow: 'auto' }}>
        <div style={{ padding: '16px 0 0' }}>
          {REGIONS.map((r, ri) => {
            const regionSpots = SPOTS.filter((s) => s.region === r.id);
            const show = regionSpots.filter(passesFilter);
            return (
              <div key={r.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 8px' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.2em', color: TOKENS.textMute, textTransform: 'uppercase' }}>
                    R{ri + 1} · {r.label}
                  </div>
                  <div style={{ flex: 1, height: 1, background: TOKENS.border }}/>
                  <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textMute, letterSpacing: '0.12em' }}>
                    BUOY {r.buoy}
                  </div>
                </div>
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {show.map((s) => (
                    <MapSpotPin key={s.id} spot={s} score={spotScores[s.id]} onClick={() => onOpenSpot(s.id)}/>
                  ))}
                  {!show.length && (
                    <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textMute, padding: 8, textAlign: 'center' }}>
                      — no spots match filter —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ height: 120 }}/>
        </div>
      </div>
    </div>
  );
}

function MapSpotPin({ spot, score, onClick }: { spot: Spot; score: number; onClick: () => void }) {
  const color = scoreColor(score, spot.watchOnly);
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: TOKENS.surface, border: `1px solid ${TOKENS.border}`,
      borderLeft: `3px solid ${color}`, borderRadius: 6,
      padding: '8px 10px', cursor: 'pointer',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: 4, background: color,
        boxShadow: score >= 75 ? `0 0 10px ${color}` : 'none',
      }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spot.name}</div>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textMute, letterSpacing: '0.05em' }}>
          D{spot.difficulty} · {spot.type.split('·')[0].trim()}
        </div>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 16, color, fontWeight: 500 }}>
        {Math.round(score)}
      </div>
    </div>
  );
}
