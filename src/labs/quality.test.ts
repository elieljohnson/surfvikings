// Pins the Labs scoreBreakdown() to the app's computeScore().
//
// scoreBreakdown re-derives the period / size / tide / special pieces that
// data.ts does not export. This test is the seam that keeps the two from
// drifting: if computeScore's arithmetic ever changes, the totals diverge
// and this fails — a direct instruction to update src/labs/quality.ts.

import { describe, it, expect } from 'vitest';
import { SPOTS, buildTimeline, computeScore } from '../lib/data';
import { scoreBreakdown } from './quality';

// A deliberate spread: a picky reef, an open beach, the special-rules spot
// (Bolinas Groin's falling-tide rip), and the watchOnly spot (Mavericks).
const PIN_SPOTS = ['bolinas-patch', 'ocean-beach', 'bolinas-groin', 'mavericks'];

describe('scoreBreakdown mirrors computeScore', () => {
  for (const id of PIN_SPOTS) {
    const spot = SPOTS.find((s) => s.id === id);
    it(`${id}: breakdown total equals computeScore for every hour`, () => {
      expect(spot).toBeDefined();
      if (!spot) return;
      const timeline = buildTimeline(spot, 72);
      for (const hour of timeline) {
        const total = scoreBreakdown(spot, hour).total;
        const engine = computeScore(spot, hour);
        // Same arithmetic, so they should match to within float noise.
        expect(Math.abs(total - engine)).toBeLessThan(1e-6);
      }
    });
  }

  it('components sum to the clamped total', () => {
    const spot = SPOTS.find((s) => s.id === 'stinson')!;
    for (const hour of buildTimeline(spot, 48)) {
      const b = scoreBreakdown(spot, hour);
      const raw = b.components.reduce((s, c) => s + c.points, 0);
      expect(b.total).toBeCloseTo(Math.max(0, Math.min(100, raw)), 6);
    }
  });
});
