// Regression tests for the 2026-05-19 buoy-spectral hour-0 override added
// to hoursToTimeline. The Bolinas case study: Open-Meteo collapsed a multi-
// modal sea (14.7s @ 3.8ft groundswell + 7s windswell) into a single 7s
// reading, which then scored 4/20 on period for The Patch despite the
// dominant groundswell sitting right in the spot's 12-16s window.

import { describe, expect, it } from 'vitest';
import { hoursToTimeline, pickDominantPeak, MergedHourWire } from './api';
import { SPOTS } from './data';

const BOLINAS_PATCH = SPOTS.find((s) => s.id === 'bolinas-patch')!;

// A single Open-Meteo wire hour with Bolinas-on-2026-05-19 values:
// the model's collapsed period (7s) and the WNW open-ocean direction (298°)
// that doesn't match the actual dominant groundswell.
function wireHour(overrides: Partial<MergedHourWire> = {}): MergedHourWire {
  return {
    t: Date.now(),
    swellHeight: 3.6,            // ft, open-ocean before shadowFactor
    swellPeriod: 7,              // s — the collapsed/wrong value
    swellDirection: 298,         // deg — open-ocean WNW
    windWaveHeight: 1.0,
    windWavePeriod: 5,
    windWaveDirection: 300,
    combinedHeight: 4.0,
    combinedPeriod: 6,
    combinedDirection: 300,
    windSpeed: 8,
    windDirection: 0,            // offshore for Bolinas (off N)
    windGust: 12,
    cloudcover: 20,
    precipitation: 0,
    precipitationProb: 0,
    tideHeight: 3,
    tideRising: true,
    ...overrides,
  };
}

describe('pickDominantPeak', () => {
  it('picks the highest-H²T train, not the longest-period train', () => {
    // The 9s @ 5ft train wins on H²T (225) over 14s @ 3ft (126).
    const trains = [
      { period: 14, height: 3 },
      { period: 9,  height: 5 },
      { period: 6,  height: 2 },
    ];
    expect(pickDominantPeak(trains)?.period).toBe(9);
  });

  it('matches the 2026-05-19 Bolinas spectrum (14.7s groundswell wins)', () => {
    // Real numbers from buoy 46026 on 5/19. The 14.7s peak should win
    // because H²T = 3.8²·14.7 ≈ 212 > 3.6²·9.1 ≈ 118 > windswell components.
    const trains = [
      { period: 14.7, height: 3.8, direction: 245 },
      { period: 9.1,  height: 3.6 },
      { period: 6.7,  height: 2.8 },
      { period: 5.3,  height: 1.9 },
    ];
    expect(pickDominantPeak(trains)?.period).toBe(14.7);
  });

  it('returns undefined for empty or missing input', () => {
    expect(pickDominantPeak(undefined)).toBeUndefined();
    expect(pickDominantPeak([])).toBeUndefined();
  });
});

describe('hoursToTimeline — hour-0 buoy override', () => {
  it('overrides hour 0 period + direction when buoy is online', () => {
    const buoy = {
      status: 'online' as const,
      swellTrains: [
        { period: 14.7, height: 3.8, direction: 245 },
        { period: 9.1,  height: 3.6 },
      ],
    };
    const tl = hoursToTimeline(BOLINAS_PATCH, [wireHour(), wireHour()], 2, buoy);
    expect(tl[0].swellPeriod).toBeCloseTo(14.7);
    expect(tl[0].swellDirection).toBe(245);
    // Hour 1 still reads from Open-Meteo, no override
    expect(tl[1].swellPeriod).toBe(7);
    expect(tl[1].swellDirection).toBe(298);
  });

  it('ignores stale buoy observations', () => {
    const buoy = {
      status: 'stale' as const,
      swellTrains: [{ period: 14.7, height: 3.8, direction: 245 }],
    };
    const tl = hoursToTimeline(BOLINAS_PATCH, [wireHour()], 1, buoy);
    expect(tl[0].swellPeriod).toBe(7);
    expect(tl[0].swellDirection).toBe(298);
  });

  it('keeps Open-Meteo direction when the spectral peak has none', () => {
    // Smaller buoys often serve .data_spec but not .swdir — direction-less
    // trains. Override the period but leave direction alone.
    const buoy = {
      status: 'online' as const,
      swellTrains: [{ period: 14.7, height: 3.8 }],
    };
    const tl = hoursToTimeline(BOLINAS_PATCH, [wireHour()], 1, buoy);
    expect(tl[0].swellPeriod).toBeCloseTo(14.7);
    expect(tl[0].swellDirection).toBe(298);
  });

  it('boosts the period component of the score for in-window peaks', () => {
    // Patch's optimalPeriod is [12,16]. Without the override, 7s scores
    // (7s short of 12s) × 3 = 15 below max → 5/20. With the override, 14.7s
    // is in-window → full 20/20. Total score must be strictly higher.
    const wire = [wireHour()];
    const noOverride = hoursToTimeline(BOLINAS_PATCH, wire, 1, undefined);
    const withOverride = hoursToTimeline(BOLINAS_PATCH, wire, 1, {
      status: 'online',
      swellTrains: [{ period: 14.7, height: 3.8, direction: 245 }],
    });
    expect(withOverride[0].score).toBeGreaterThan(noOverride[0].score);
  });
});
