// Regression tests for the May 11 wind-wave penalty added to computeScore.
// The penalty closes the gap where a 2ft @ 18s under 4ft of windswell
// scored the same as a glassy 2ft @ 18s day.

import { describe, expect, it } from 'vitest';
import {
  computeScore, windWavePenalty,
  swellDirectionScore, swellDirectionQuality,
  windDirectionScore, windDirectionQuality,
  SPOTS,
} from './data';

const BOLINAS_PATCH = SPOTS.find((s) => s.id === 'bolinas-patch')!;

const baseInput = {
  swellHeight: 3,           // ft, in The Patch's optimalSize [1,6]
  swellPeriod: 14,          // s, in optimalPeriod [12,16]
  swellDirection: 225,      // matches optimalSwell
  windSpeed: 5,             // light, no wind penalty
  windDirection: 0,         // matches offshore = 0 (N)
  tideHeight: 1,            // in 'low' tide band
  tideRising: false,
};

describe('windWavePenalty', () => {
  it('returns 0 when wind wave height is missing or tiny', () => {
    expect(windWavePenalty(3, undefined)).toBe(0);
    expect(windWavePenalty(3, 0.2)).toBe(0);
  });

  it('returns 0 when ratio is below 0.5 (clean swell with minor chop)', () => {
    expect(windWavePenalty(4, 1)).toBe(0);       // ratio 0.25, no penalty
    expect(windWavePenalty(4, 1.9)).toBe(0);     // ratio 0.475, still no penalty
  });

  it('scales linearly from 0 at ratio 0.5 down to -10 at ratio 1.5', () => {
    expect(windWavePenalty(4, 2)).toBe(0);            // ratio 0.5, boundary
    expect(windWavePenalty(4, 3)).toBeCloseTo(-2.5);  // ratio 0.75
    expect(windWavePenalty(4, 4)).toBeCloseTo(-5);    // ratio 1.0
    expect(windWavePenalty(2, 2.5)).toBeCloseTo(-7.5);// ratio 1.25
    expect(windWavePenalty(2, 3)).toBeCloseTo(-10);   // ratio 1.5
  });

  it('flat-caps at -15 once chop fully dominates (ratio >= 2.0)', () => {
    expect(windWavePenalty(2, 4)).toBe(-15);   // ratio 2.0
    expect(windWavePenalty(1, 5)).toBe(-15);   // ratio 5.0
  });

  it('returns 0 when groundswell is below 0.5ft (avoid divide-by-near-zero)', () => {
    expect(windWavePenalty(0.3, 2)).toBe(0);
  });
});

describe('computeScore — wind wave integration', () => {
  it('a glassy day scores the same with or without the windWaveHeight field', () => {
    // Backward compat: omitting the field shouldn't change the score from
    // pre-feature behavior. Both inputs are conceptually 'no chop.'
    const without = computeScore(BOLINAS_PATCH, baseInput);
    const withZero = computeScore(BOLINAS_PATCH, { ...baseInput, windWaveHeight: 0 });
    expect(withZero).toBe(without);
  });

  it('docks points when significant chop sits on top of the swell', () => {
    const clean = computeScore(BOLINAS_PATCH, { ...baseInput, windWaveHeight: 0.2 });
    const choppy = computeScore(BOLINAS_PATCH, { ...baseInput, windWaveHeight: 3 });
    // 3ft chop on 3ft swell = ratio 1.0 = -5 pts. Choppy should score lower.
    expect(choppy).toBeLessThan(clean);
    expect(clean - choppy).toBeGreaterThanOrEqual(4);
    expect(clean - choppy).toBeLessThanOrEqual(6);
  });

  it('docks the full ~15 pts when chop dominates the groundswell', () => {
    const clean = computeScore(BOLINAS_PATCH, { ...baseInput, windWaveHeight: 0.2 });
    const buried = computeScore(BOLINAS_PATCH, { ...baseInput, windWaveHeight: 6 });
    // 6ft chop on 3ft swell = ratio 2.0 = -15 pts
    expect(clean - buried).toBeGreaterThanOrEqual(14);
    expect(clean - buried).toBeLessThanOrEqual(16);
  });

  // Regression: a 68° swell-direction miss used to render green on the
  // compass while showing 0/30 in the Why-this-score breakdown — two
  // different quality formulas disagreeing on the same hour. After
  // unification + cosine² decay, the shape is smooth:
  //   0°  → 30  (perfect alignment)
  //   30° → 22.5
  //   60° → 7.5
  //   90° → 0  (perpendicular — wave can't enter the window)
  //  >90° → 0
  it('swellDirectionScore follows cos² of the delta', () => {
    expect(swellDirectionScore(225, 225)).toBeCloseTo(30, 5);
    expect(swellDirectionScore(225, 255)).toBeCloseTo(22.5, 1); // 30° off
    expect(swellDirectionScore(225, 285)).toBeCloseTo(7.5, 1);  // 60° off
    expect(swellDirectionScore(225, 315)).toBeCloseTo(0, 5);    // 90° off
    expect(swellDirectionScore(225, 45)).toBeCloseTo(0, 5);     // 180° off
  });

  it('swellDirectionQuality is just the score normalized to 0-1', () => {
    expect(swellDirectionQuality(225, 225)).toBeCloseTo(1, 5);
    expect(swellDirectionQuality(225, 255)).toBeCloseTo(0.75, 2);
    expect(swellDirectionQuality(225, 285)).toBeCloseTo(0.25, 2);
    expect(swellDirectionQuality(225, 315)).toBeCloseTo(0, 5);
  });

  // The original Bolinas bug case: actual 293, optimal 225, delta 68.
  // Old linear curve gave 0/30 (flat zero past 43°). New cosine curve
  // gives ~4/30 — still clearly poor, no longer surreal-feeling.
  it('Bolinas bug case (delta 68°) returns a small but non-zero score', () => {
    const s = swellDirectionScore(293, 225);
    expect(s).toBeGreaterThan(3);
    expect(s).toBeLessThan(5);
  });

  it('windDirectionScore and quality agree across boundary cases', () => {
    expect(windDirectionScore(0, 0)).toBe(15);
    expect(windDirectionQuality(0, 0)).toBe(1);
    expect(windDirectionScore(90, 0)).toBeCloseTo(15 - 90 * 0.09, 2);
    expect(windDirectionQuality(90, 0)).toBeCloseTo((15 - 90 * 0.09) / 15, 2);
  });

  it('never returns a score outside [0, 100]', () => {
    const wild = computeScore(BOLINAS_PATCH, {
      swellHeight: 100, swellPeriod: 25, swellDirection: 0,
      windWaveHeight: 50,
      windSpeed: 50, windDirection: 180,
      tideHeight: 10, tideRising: true,
    });
    expect(wild).toBeGreaterThanOrEqual(0);
    expect(wild).toBeLessThanOrEqual(100);
  });
});
