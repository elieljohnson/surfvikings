// Labs — the score breakdown panel.
//
// This is the Legibility Problem solved in miniature. A quality score is a
// composite; shown as a bare number it asks for blind trust. This panel is
// what "reveal the process on demand" looks like: the number up top, then
// every component that built it — points, a proportional bar, and one line
// of plain English. Reused by the Window Grid and the Swell Rose.

import React from 'react';
import { Spot, ForecastHour } from '../lib/data';
import { scoreBreakdown } from './quality';
import { LABS, MONO, seqGreen } from './theme';

interface Props {
  spot: Spot | null;
  hour: ForecastHour | null;
  /** Human label for when this hour is — "Tue 7am" etc. */
  whenLabel: string;
  /** Optional heading above the spot name — e.g. "Best window this week". */
  caption?: string;
}

export function ScoreBreakdownPanel({ spot, hour, whenLabel, caption }: Props) {
  if (!spot || !hour) {
    return (
      <div style={panelStyle}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: LABS.inkMute, lineHeight: 1.6 }}>
          Point at any cell to open the score behind it — every component, every penalty.
        </div>
      </div>
    );
  }

  const b = scoreBreakdown(spot, hour);
  const scoreColor = seqGreen(Math.max(0.08, b.total / 100));

  return (
    <div style={panelStyle}>
      {caption && (
        <div style={{
          fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: LABS.cyan, marginBottom: 8,
        }}>{caption}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 2 }}>
        <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: scoreColor }}>
          {Math.round(b.total)}
        </span>
        <span style={{ fontSize: 13, color: LABS.inkDim }}>/ 100</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: LABS.ink }}>{spot.name}</div>
      <div style={{ fontFamily: MONO, fontSize: 11.5, color: LABS.inkMute, marginBottom: 12 }}>
        {whenLabel}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {b.components.map((c) => {
          const isPenalty = c.max === 0;
          const frac = c.max > 0 ? Math.max(0, Math.min(1, c.points / c.max)) : 0;
          return (
            <div key={c.key}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                fontFamily: MONO, fontSize: 11.5,
              }}>
                <span style={{ color: LABS.inkDim }}>{c.label}</span>
                <span style={{ color: isPenalty && c.points < 0 ? LABS.accent : LABS.ink }}>
                  {c.points >= 0 ? '+' : ''}{Math.round(c.points * 10) / 10}
                  {c.max > 0 && <span style={{ color: LABS.inkMute }}> / {c.max}</span>}
                </span>
              </div>
              {!isPenalty && (
                <div style={{
                  height: 4, marginTop: 3, borderRadius: 3, background: LABS.line, overflow: 'hidden',
                }}>
                  <div style={{ height: '100%', width: `${frac * 100}%`, background: seqGreen(0.25 + frac * 0.7) }} />
                </div>
              )}
              <div style={{ fontSize: 11.5, lineHeight: 1.45, color: LABS.inkMute, marginTop: 3 }}>
                {c.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: LABS.panel2,
  border: `1px solid ${LABS.line}`,
  borderRadius: 11,
  padding: 16,
};
