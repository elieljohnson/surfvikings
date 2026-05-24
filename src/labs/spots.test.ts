// Foundation A — the spot contract is a pure derivation of canonical Spot
// fields. These pin the derivations so a future change to data.ts's Spot
// shape can't silently break the viz layer.

import { describe, it, expect } from 'vitest';
import { SPOTS } from '../lib/data';
import { featuredSpots, vizContract, FEATURED_SPOT_IDS } from './spots';

describe('featuredSpots', () => {
  it('resolves every featured id to a real spot', () => {
    const featured = featuredSpots();
    expect(featured.length).toBe(FEATURED_SPOT_IDS.length);
    for (const s of featured) {
      expect(SPOTS.some((x) => x.id === s.id)).toBe(true);
      expect(s.viz).toBeDefined();
    }
  });
});

describe('vizContract derivations', () => {
  const cases = SPOTS.slice(0, 12);

  it('idealSwellDir aliases optimalSwell exactly', () => {
    for (const s of cases) expect(vizContract(s).idealSwellDir).toBe(s.optimalSwell);
  });

  it('shoreNormal is the reciprocal of offshore', () => {
    for (const s of cases) {
      expect(vizContract(s).shoreNormal).toBe((s.offshore + 180) % 360);
    }
  });

  it('optimalHeight is the midpoint of optimalSize', () => {
    for (const s of cases) {
      const [lo, hi] = s.optimalSize;
      expect(vizContract(s).optimalHeight).toBeCloseTo((lo + hi) / 2, 6);
    }
  });

  it('swellWindow is a positive tolerance', () => {
    for (const s of cases) {
      const w = vizContract(s).swellWindow;
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThan(90);
    }
  });
});
