import { describe, expect, it } from 'vitest';
import { parseSFPUC, parseSonomaCounty } from './waterQualityLive';

describe('parseSonomaCounty', () => {
  // Stripped-down sample of the live page structure as of May 11 2026.
  const SAMPLE_HTML = `
    <div>
      <table>
        <tr><td>Salmon Creek State Beach</td><td></td></tr>
        <tr><td>Date Collected:</td><td>May 4, 2026</td></tr>
        <tr><td>Total Coliform:</td><td>Less than 10</td></tr>
        <tr><td>Escherichia coli:</td><td>Less than 10</td></tr>
        <tr><td>Beach Status:</td><td>Open</td></tr>
      </table>
      <table>
        <tr><td>Doran Regional Park Beach</td><td></td></tr>
        <tr><td>Date Collected:</td><td>May 4, 2026</td></tr>
        <tr><td>Total Coliform:</td><td>20</td></tr>
        <tr><td>Beach Status:</td><td>Caution</td></tr>
      </table>
      <table>
        <tr><td>Total Coliform:</td><td>Threshold info</td></tr>
        <tr><td>Other:</td><td>Legend</td></tr>
      </table>
    </div>
  `;

  it('extracts each beach with normalized date + status', () => {
    const readings = parseSonomaCounty(SAMPLE_HTML);
    expect(readings).toHaveLength(2);
    expect(readings[0].beachName).toBe('Salmon Creek State Beach');
    expect(readings[0].sampleDate).toBe('2026-05-04');
    expect(readings[0].status).toBe('open');
    expect(readings[1].status).toBe('caution');
  });

  it('skips the legend / header-only tables (first cell ends with colon)', () => {
    const readings = parseSonomaCounty(SAMPLE_HTML);
    const names = readings.map((r) => r.beachName);
    expect(names).not.toContain('Total Coliform:');
  });

  it('stamps every reading with the Sonoma source', () => {
    const readings = parseSonomaCounty(SAMPLE_HTML);
    for (const r of readings) {
      expect(r.source).toMatch(/Sonoma/);
    }
  });
});

describe('parseSFPUC', () => {
  // SOAP-wrapped JSON the lims.asmx endpoint returns
  const SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<string xmlns="http://tempuri.org/">[{"stationid":"4604","stationname":"Ocean Beach at Balboa Street","cso":null,"s_color":null,"posted":null,"p_color":null,"sample_date":"05/04/26","lat":"37.77492","lon":"-122.51351"},{"stationid":"4606","stationname":"Ocean Beach at Pacheco Street","cso":null,"s_color":"W","posted":null,"p_color":null,"sample_date":"02/19/26","lat":"37.74891","lon":"-122.50996"},{"stationid":"4699","stationname":"Closed Test Beach","cso":null,"s_color":null,"posted":"2026-05-08","p_color":"R","sample_date":"05/04/26","lat":"37.7","lon":"-122.5"}]</string>`;

  it('parses three stations with the expected names', () => {
    const readings = parseSFPUC(SAMPLE);
    expect(readings).toHaveLength(3);
    expect(readings[0].beachName).toBe('Ocean Beach at Balboa Street');
  });

  it('normalizes MM/DD/YY date to YYYY-MM-DD', () => {
    const readings = parseSFPUC(SAMPLE);
    expect(readings[0].sampleDate).toBe('2026-05-04');
  });

  it('maps s_color=null + posted=null to open', () => {
    const readings = parseSFPUC(SAMPLE);
    expect(readings[0].status).toBe('open');
  });

  it('maps s_color=W to caution', () => {
    const readings = parseSFPUC(SAMPLE);
    expect(readings[1].status).toBe('caution');
  });

  it('maps a non-null posted value to closed', () => {
    const readings = parseSFPUC(SAMPLE);
    expect(readings[2].status).toBe('closed');
  });

  it('returns empty array on malformed input rather than throwing', () => {
    expect(parseSFPUC('not xml')).toEqual([]);
    expect(parseSFPUC('<string>not json</string>')).toEqual([]);
  });
});
