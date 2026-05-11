// Regression tests for the May 11 wind-wave penalty added to computeScore.
// The penalty closes the gap where a 2ft @ 18s under 4ft of windswell
// scored the same as a glassy 2ft @ 18s day.

import { describe, expect, it } from 'vitest';
import { computeScore, windWavePenalty, SPOTS } from './data';

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
