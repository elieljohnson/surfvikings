import { describe, expect, it } from 'vitest';
import { parseMarinJson } from './waterQualityMarin';

// Mirror of the ArcGIS Feature Service response shape (one feature per
// station after the is_latest_inspection=1 filter).
const SAMPLE = JSON.stringify({
  features: [
    { attributes: {
      beach_name: 'BOLINAS BEACH',
      inspection_week_date: Date.parse('2026-05-06T00:00:00Z'),
      inspection_result: 'OK',
    } },
    { attributes: {
      beach_name: 'DILLON BEACH DITCH',
      inspection_week_date: Date.parse('2026-05-06T00:00:00Z'),
      inspection_result: 'AVOID',
    } },
    { attributes: {
      beach_name: 'MUIR BEACH - NORTH',
      inspection_week_date: Date.parse('2026-05-06T00:00:00Z'),
      inspection_result: 'N/A',
    } },
    { attributes: {
      beach_name: 'STINSON BEACH - CENTRAL',
      inspection_week_date: Date.parse('2026-05-06T00:00:00Z'),
      inspection_result: 'OK',
    } },
    // Unexpected result — drop rather than guess
    { attributes: {
      beach_name: 'Mystery Station',
      inspection_week_date: Date.parse('2026-05-06T00:00:00Z'),
      inspection_result: 'PENDING',
    } },
  ],
});

describe('parseMarinJson', () => {
  it('parses features and title-cases the beach names', () => {
    const readings = parseMarinJson(SAMPLE);
    const names = readings.map((r) => r.beachName);
    expect(names).toContain('Bolinas Beach');
    expect(names).toContain('Dillon Beach Ditch');
    expect(names).toContain('Stinson Beach - Central');
  });

  it('maps OK → open', () => {
    const r = parseMarinJson(SAMPLE).find((x) => x.beachName === 'Bolinas Beach');
    expect(r?.status).toBe('open');
    expect(r?.rawStatus).toBe('No advisory posted');
  });

  it('maps AVOID → caution (advisory posted, not closed)', () => {
    const r = parseMarinJson(SAMPLE).find((x) => x.beachName === 'Dillon Beach Ditch');
    expect(r?.status).toBe('caution');
    expect(r?.rawStatus).toMatch(/avoid/i);
  });

  it('drops N/A (station not sampled this week)', () => {
    const r = parseMarinJson(SAMPLE).find((x) => x.beachName === 'Muir Beach - North');
    expect(r).toBeUndefined();
  });

  it('drops unknown result rather than guessing', () => {
    const r = parseMarinJson(SAMPLE).find((x) => x.beachName === 'Mystery Station');
    expect(r).toBeUndefined();
  });

  it('normalizes the epoch ms timestamp to YYYY-MM-DD', () => {
    const r = parseMarinJson(SAMPLE).find((x) => x.beachName === 'Bolinas Beach');
    expect(r?.sampleDate).toBe('2026-05-06');
  });

  it('stamps every reading with the Marin County source', () => {
    const readings = parseMarinJson(SAMPLE);
    for (const r of readings) {
      expect(r.source).toMatch(/Marin/);
    }
  });

  it('returns empty array on malformed input rather than throwing', () => {
    expect(parseMarinJson('not json')).toEqual([]);
    expect(parseMarinJson(JSON.stringify({ error: 'boom' }))).toEqual([]);
  });
});
