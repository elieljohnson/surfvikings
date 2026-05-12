import { describe, expect, it } from 'vitest';
import { MARIN_READINGS, MARIN_SAMPLE_WEEK } from './waterQualityMarinManual';

describe('waterQualityMarinManual', () => {
  it('every reading carries the documented sample week + Marin source', () => {
    expect(MARIN_SAMPLE_WEEK).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const r of MARIN_READINGS) {
      expect(r.sampleDate).toBe(MARIN_SAMPLE_WEEK);
      expect(r.source).toMatch(/Marin/);
      expect(['open', 'caution', 'closed']).toContain(r.status);
    }
  });

  it('all surf-relevant beach names from the Marin EH page are accounted for', () => {
    // These are the row names Eliel's screenshot maps to our spots.
    // If Marin renames a row, the spot's panel goes dark and we notice.
    const names = new Set(MARIN_READINGS.map((r) => r.beachName));
    for (const expected of [
      'Bolinas Beach',
      'Stinson Beach - Central',
      'Muir Beach - Central',
      'Rodeo Beach - North',
      'Dillon Beach',
      'Drakes Beach',
      'Drakes Estero',
    ]) {
      expect(names.has(expected), `missing ${expected}`).toBe(true);
    }
  });
});
