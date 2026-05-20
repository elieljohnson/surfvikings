import React, { useState } from 'react';
import { TOKENS, scoreColor, qualityColor } from '../lib/tokens';
import {
  SPOTS, Spot, ForecastHour, MetricKey,
  hourLabel, degToCardinal, metricQuality, angleDelta,
} from '../lib/data';
import { useConditions } from '../hooks/useConditions';
import { useFavorites } from '../hooks/useFavorites';
import { Screen, Stat, ForecastChart, VectorsPanel } from './Primitives';
import { useGridScrub } from '../hooks/useGridScrub';

interface ForecastProps {
  onOpenSpot?: (id: string) => void;
}

export function Forecast(_props: ForecastProps) {
  const { favorites: favoriteIds } = useFavorites();
  const favorites = favoriteIds.map((id) => SPOTS.find((s) => s.id === id)).filter(Boolean) as Spot[];
  const { timelines } = useConditions(favoriteIds);
  // User's tab pick. If they un-favorite the currently-selected spot,
  // spot falls back to favorites[0] but spotId stays — re-derive the
  // active highlight from the resolved spot so the chip strip stays
  // honest with the body.
  const [spotId, setSpotId] = useState(favorites[0]?.id ?? '');
  const spot = favorites.find((s) => s.id === spotId) ?? favorites[0];
  const currentId = spot?.id ?? '';
  const timeline = (spot ? timelines[spot.id] : undefined) ?? [];

  // Master scrub: the heatmap is the sole interactive surface for picking
  // a point in time on this page. Its active cell becomes a shared cursor
  // that propagates down to the MiniMetric bar charts below — one gesture,
  // four readouts. Lifting the hook here means the hook's `active` is
  // available to siblings; HourlyHeatmap becomes presentational.
  const dayCount = Math.min(7, Math.ceil(timeline.length / 24));
  const scrub = useGridScrub({ cols: 24, rows: dayCount });
  const activeHour = scrub.active ? scrub.active.row * 24 + scrub.active.col : null;

  // Empty state — no favorites means the whole forecast view has
  // nothing to render. Send them to Settings to pick at least one.
  if (!spot) {
    return (
      <Screen>
        <div style={{ padding: '52px 20px 14px', borderBottom: `1px solid ${TOKENS.border}` }}>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>Forecast · 7 days</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>Outlook</div>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: TOKENS.textMute, fontSize: 14 }}>
          No favorites selected. Pick at least one spot in Settings to see the forecast.
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ padding: '52px 20px 14px', borderBottom: `1px solid ${TOKENS.border}` }}>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.18em', color: TOKENS.textMute, textTransform: 'uppercase' }}>Forecast · 7 days</div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>Outlook</div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '12px 20px 10px', overflowX: 'auto' }}>
        {favorites.map((s) => {
          const score = timelines[s.id]?.[0]?.score ?? 0;
          const on = s.id === currentId;
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
        <HourlyHeatmap timeline={timeline} scrub={scrub} dayCount={dayCount}/>
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
          <MiniMetric label="Swell" metric="swellHeight" unit="ft" spot={spot} timeline={timeline} activeHour={activeHour}/>
          <MiniMetric label="Period" metric="swellPeriod" unit="s" spot={spot} timeline={timeline} activeHour={activeHour}/>
          <MiniMetric label="Wind" metric="windSpeed" unit="kts" spot={spot} timeline={timeline} activeHour={activeHour}/>
          <MiniMetric label="Tide" metric="tideHeight" unit="ft" spot={spot} timeline={timeline} activeHour={activeHour} last/>
        </div>
      </div>

      <VectorsPanel spot={spot} current={timeline[0]}/>

      <div style={{ height: 100 }}/>
    </Screen>
  );
}

function HourlyHeatmap({
  timeline, scrub, dayCount,
}: {
  timeline: ForecastHour[];
  scrub: ReturnType<typeof useGridScrub>;
  dayCount: number;
}) {
  // Row labels derive from real local time so they're correct any day of
  // the week, not hardcoded. Renders up to 7 days (168 hours) of forecast.
  // The scrub hook lives in the parent so its `active` value can drive
  // sibling MiniMetric charts in the master-scrub pattern.
  const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const today = new Date().getDay();
  const rows = Array.from({ length: dayCount }, (_, di) => ({
    label: DAYS[(today + di) % 7],
    data: timeline.slice(di * 24, (di + 1) * 24),
  }));
  const { active, surfaceRef, overlayRef, overlayProps } = scrub;
  // Resolve the active cell to its hour-of-week + score for the tooltip.
  const activeHour = active ? timeline[active.row * 24 + active.col] : null;
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
      {/* Surface = the rows region. The scrub overlay sits on top of the
       *  cell columns (positioned right of the 36px label) and captures
       *  pointer events for the whole 2D grid in one go. */}
      <div ref={surfaceRef} style={{ position: 'relative' }}>
        {rows.map((row, ri) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '36px repeat(24, 1fr)', gap: 1, marginBottom: 2 }}>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textDim, letterSpacing: '0.1em', display: 'flex', alignItems: 'center' }}>{row.label}</div>
            {row.data.map((t, i) => {
              const color = scoreColor(t.score);
              const baseOpacity = 0.25 + (t.score / 100) * 0.75;
              const isNow = ri === 0 && i === 0;
              const isActive = !!active && active.row === ri && active.col === i;
              // When a cell is selected, all non-active cells dim to keep
              // the eye anchored on the scrub target. Active stays full.
              const opacity = active && !isActive ? baseOpacity * 0.4 : baseOpacity;
              return (
                <div key={i} style={{
                  height: 18, background: color, opacity,
                  border: isActive
                    ? `1px solid ${TOKENS.text}`
                    : isNow ? `1px solid ${TOKENS.text}` : 'none',
                  borderRadius: 1,
                }}/>
              );
            })}
          </div>
        ))}
        {/* Transparent overlay over the cell columns only — left edge sits
         *  just past the 36px label gutter so taps on labels still feel
         *  inert. Uses calc() because the label column is fixed-px and the
         *  cell columns are fr-units that resize with the container. */}
        <div
          ref={overlayRef}
          {...overlayProps}
          style={{
            ...overlayProps.style,
            position: 'absolute',
            top: 0,
            left: 'calc(36px + 1px)', // 36px label + 1px grid gap
            right: 0,
            bottom: 0,
          }}
        />
        {activeHour && active && (
          <GridScrubTooltip
            row={active.row}
            col={active.col}
            dayLabel={rows[active.row].label}
            overlayRef={overlayRef}
          >
            {hourLabelShort(active.col)} · <span style={{ color: scoreColor(activeHour.score), fontWeight: 500 }}>{Math.round(activeHour.score)}</span>
          </GridScrubTooltip>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12, color: TOKENS.textMute, letterSpacing: '0.1em' }}>
        <span>FLAT</span>
        <div style={{ flex: 1, height: 6, background: `linear-gradient(90deg, ${TOKENS.flat}, ${TOKENS.poor}, ${TOKENS.fair}, ${TOKENS.good}, ${TOKENS.epic})`, borderRadius: 1 }}/>
        <span>EPIC</span>
      </div>
    </div>
  );
}

/** Short hour label for the scrub tooltip — "3p" not "Wed 3:00 PM".
 *  The day comes from the row label so it's already in view. */
function hourLabelShort(hour: number): string {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

/** Internal: absolutely-positioned tooltip for the heatmap scrub. Always
 *  floats well above the active cell with a finger-clearance offset, so a
 *  thumb on the heatmap can't cover its own readout. Earlier flip-below
 *  logic for the top half of the grid put the tooltip directly under the
 *  finger — fixed by going always-above with a generous offset that lets
 *  the tooltip overflow upward into the heatmap card's padding (which is
 *  fine; nothing above it clips vertically).
 *
 *  Pointer-events: none so taps pass through to outside-tap dismiss.
 *  Width-clamped to the overlay bounds — same iOS swipe-back guard as
 *  ScrubTooltip in Primitives. */
function GridScrubTooltip({
  row, col, dayLabel, overlayRef, children,
}: {
  row: number; col: number; dayLabel: string;
  overlayRef: React.MutableRefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [half, setHalf] = React.useState(60);
  const [overlayWidth, setOverlayWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    if (ref.current) setHalf(ref.current.offsetWidth / 2);
    if (overlayRef.current) setOverlayWidth(overlayRef.current.offsetWidth);
  }, [children, col, row]);

  // Horizontal: center over the active column, clamped to overlay edges.
  const OVERLAY_LEFT = 37; // 36px label gutter + 1px grid gap
  const center = overlayWidth > 0 ? ((col + 0.5) / 24) * overlayWidth : 0;
  const clamped = Math.max(half, Math.min(center, Math.max(half, overlayWidth - half)));

  // Vertical: always above. Cell pitch is 20px (18 height + 2 gap). 48px of
  // clearance keeps the tooltip above a typical fingertip's contact patch.
  // The tooltip overflows the heatmap card upward when active is in the
  // top row — that's expected, the parent card doesn't clip.
  const CELL_PITCH = 20;
  const FINGER_CLEARANCE = 48;
  const top = row * CELL_PITCH - FINGER_CLEARANCE;

  return (
    <div ref={ref} style={{
      position: 'absolute',
      left: OVERLAY_LEFT + clamped,
      top,
      transform: 'translateX(-50%)',
      background: TOKENS.surface3,
      border: `1px solid ${TOKENS.borderHi}`,
      borderRadius: 6,
      padding: '6px 8px',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13, color: TOKENS.text,
      boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
      zIndex: 10,
    }}>
      <span style={{ color: TOKENS.textMute, letterSpacing: '0.08em' }}>{dayLabel}</span>{' '}{children}
    </div>
  );
}

function MiniMetric({
  label, metric, unit, spot, timeline, last, activeHour,
}: {
  label: string; metric: MetricKey; unit: string; spot: Spot;
  timeline: ForecastHour[]; last?: boolean;
  /** When the master scrub on the heatmap above pins an hour, all MiniMetric
   *  rows read from that hour instead of timeline[0] ("now"). Passing null
   *  reverts the row to its "now" readout. */
  activeHour: number | null;
}) {
  const values = timeline.map((t) => t[metric] as number);
  // Selected hour drives both the readout value and the chart highlight.
  // Falls back to hour 0 ("now") when nothing is scrubbed.
  const displayIdx = activeHour ?? 0;
  const display = values[displayIdx];
  const max = Math.max(...values), min = Math.min(...values);
  const displayQ = metricQuality(spot, timeline[displayIdx], metric);
  const displayColor = qualityColor(displayQ);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0',
      borderBottom: last ? 'none' : `1px solid ${TOKENS.border}`,
    }}>
      <div style={{ width: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: displayColor, flexShrink: 0 }}/>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, letterSpacing: '0.1em', color: TOKENS.textMute, textTransform: 'uppercase' }}>{label}</div>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 14, color: TOKENS.text, fontWeight: 500, marginTop: 2 }}>
          {display.toFixed(1)}<span style={{ fontSize: 12, color: TOKENS.textDim, marginLeft: 2 }}>{unit}</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <ForecastChart
          timeline={timeline}
          metric={metric}
          spot={spot}
          height={28}
          showAxis={false}
          externalActiveHour={activeHour}
        />
      </div>
      <div style={{ width: 50, textAlign: 'right', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, color: TOKENS.textMute }}>
        {min.toFixed(1)}–{max.toFixed(1)}
      </div>
    </div>
  );
}
