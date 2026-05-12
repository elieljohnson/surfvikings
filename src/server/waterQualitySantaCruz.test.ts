import { describe, expect, it } from 'vitest';
import { parseSantaCruzJson } from './waterQualitySantaCruz';

// Minimal sample mirroring the ArcGIS Feature Service response shape
// (one feature per station after the MostRecent=1 filter).
const SAMPLE = JSON.stringify({
  features: [
    { attributes: {
      LocationDescription: 'Cowell Beach',
      CollectDateTimeString: '2026-05-04 10:04',
      Category: 'Acceptable',
      StaNumTypeDescription: 'Ocean',
    } },
    { attributes: {
      LocationDescription: 'Capitola Beach at Soquel Creek',
      CollectDateTimeString: '2026-05-04 10:30',
      Category: 'Caution',
      StaNumTypeDescription: 'Ocean',
    } },
    { attributes: {
      LocationDescription: 'San Lorenzo River at Mouth',
      CollectDateTimeString: '2026-05-04 10:04',
      Category: 'Health Advisory',
      StaNumTypeDescription: 'Stream or Lagoon',
    } },
    { attributes: {
      LocationDescription: 'Kelly Lake at Ramp',
      CollectDateTimeString: '2026-04-22 09:05',
      Category: 'Serious Risk',
      StaNumTypeDescription: 'Lake or Pond',
    } },
    // Unknown category — drop rather than guess
    { attributes: {
      LocationDescription: 'Mystery Station',
      CollectDateTimeString: '2026-05-04 10:00',
      Category: 'Pending Review',
      StaNumTypeDescription: 'Ocean',
    } },
  ],
});

describe('parseSantaCruzJson', () => {
  it('parses features into LiveBeachReading with normalized date', () => {
    const readings = parseSantaCruzJson(SAMPLE);
    expect(readings).toHaveLength(4); // unknown category dropped
    expect(readings[0].beachName).toBe('Cowell Beach');
    expect(readings[0].sampleDate).toBe('2026-05-04');
  });

  it('maps Acceptable to open', () => {
    const r = parseSantaCruzJson(SAMPLE).find((x) => x.beachName === 'Cowell Beach');
    expect(r?.status).toBe('open');
  });

  it('maps both Caution and Health Advisory to the caution tier', () => {
    const readings = parseSantaCruzJson(SAMPLE);
    const cap = readings.find((r) => r.beachName === 'Capitola Beach at Soquel Creek');
    const slr = readings.find((r) => r.beachName === 'San Lorenzo River at Mouth');
    expect(cap?.status).toBe('caution');
    expect(slr?.status).toBe('caution');
    // …but rawStatus differentiates them so the panel reads informatively
    expect(cap?.rawStatus).not.toBe(slr?.rawStatus);
  });

  it('maps Serious Risk to the closed tier (first source to emit closed)', () => {
    const r = parseSantaCruzJson(SAMPLE).find((x) => x.beachName === 'Kelly Lake at Ramp');
    expect(r?.status).toBe('closed');
    expect(r?.rawStatus).toMatch(/Serious risk/);
  });

  it('drops unknown Category rather than guessing', () => {
    const readings = parseSantaCruzJson(SAMPLE);
    expect(readings.find((r) => r.beachName === 'Mystery Station')).toBeUndefined();
  });

  it('stamps every reading with the Santa Cruz County source', () => {
    const readings = parseSantaCruzJson(SAMPLE);
    for (const r of readings) {
      expect(r.source).toMatch(/Santa Cruz/);
    }
  });

  it('returns empty array on malformed input rather than throwing', () => {
    expect(parseSantaCruzJson('not json')).toEqual([]);
    expect(parseSantaCruzJson(JSON.stringify({ error: 'something' }))).toEqual([]);
  });
});
