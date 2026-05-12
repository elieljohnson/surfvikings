import { describe, expect, it } from 'vitest';
import { SPOTS } from './data';
import {
  defaultMonitor, getWaterQuality, stateFor,
  WATER_QUALITY,
} from './waterQuality';

describe('getWaterQuality', () => {
  it('returns info for the four Santa Cruz County permanent postings', () => {
    expect(getWaterQuality('cowell')).toBeDefined();
    expect(getWaterQuality('rivermouth')).toBeDefined();
    expect(getWaterQuality('capitola')).toBeDefined();
    expect(getWaterQuality('capitola-rivermouth')).toBeDefined();
  });

  it('returns info for the two rain-sensitive spots from source notes', () => {
    expect(getWaterQuality('mitchells-cove')).toBeDefined();
    expect(getWaterQuality('26th-ave')).toBeDefined();
  });

  it('returns proxy info for the unmonitored Salt Point stretch', () => {
    expect(getWaterQuality('secrets')?.proxyName).toBe('Stillwater Cove');
    expect(getWaterQuality('timber-cove')?.proxyName).toBe('Stillwater Cove');
    expect(getWaterQuality('mystos')?.proxyName).toBe('Stillwater Cove');
  });

  it('every entry in WATER_QUALITY maps to a real spot', () => {
    const allSpotIds = new Set(SPOTS.map((s) => s.id));
    for (const id of Object.keys(WATER_QUALITY)) {
      expect(allSpotIds.has(id)).toBe(true);
    }
  });
});

describe('defaultMonitor', () => {
  it('maps each known region to its county/agency', () => {
    expect(defaultMonitor('sonoma')).toMatch(/Sonoma/);
    expect(defaultMonitor('marin')).toMatch(/Marin/);
    expect(defaultMonitor('pt-reyes')).toMatch(/Marin/);
    expect(defaultMonitor('sf')).toMatch(/SFPUC/);
    expect(defaultMonitor('sm-north')).toMatch(/San Mateo/);
    expect(defaultMonitor('sm-south')).toMatch(/San Mateo/);
    expect(defaultMonitor('sc')).toMatch(/Santa Cruz/);
  });

  it('returns undefined for unknown regions', () => {
    expect(defaultMonitor('atlantis')).toBeUndefined();
  });
});

describe('stateFor', () => {
  it('returns caution status for permanent advisories regardless of rain', () => {
    const wq = getWaterQuality('cowell')!;
    expect(stateFor(wq, 'sc', 0)?.status).toBe('caution');
    expect(stateFor(wq, 'sc', 20)?.status).toBe('caution');
  });

  it('returns monitored status for spots without concerns in a monitored region', () => {
    const s = stateFor(undefined, 'marin', 0);
    expect(s?.status).toBe('monitored');
    expect(s?.source).toMatch(/Marin/);
  });

  it('rain-sensitive spot returns monitored on dry days, caution on wet', () => {
    const wq = getWaterQuality('mitchells-cove')!;
    expect(stateFor(wq, 'sc', 2)?.status).toBe('monitored');
    expect(stateFor(wq, 'sc', 8)?.status).toBe('caution');
  });

  it('returns not-monitored with proxy info for Salt Point spots', () => {
    const wq = getWaterQuality('secrets')!;
    const s = stateFor(wq, 'sonoma', 0);
    expect(s?.status).toBe('not-monitored');
    expect(s?.proxy?.name).toBe('Stillwater Cove');
    expect(s?.proxy?.miles).toBe(3);
  });

  it('always includes source attribution when the region is monitored', () => {
    expect(stateFor(undefined, 'sc', 0)?.source).toMatch(/Santa Cruz/);
    expect(stateFor(undefined, 'sf', 0)?.source).toMatch(/SFPUC/);
    expect(stateFor(undefined, 'sonoma', 0)?.source).toMatch(/Sonoma/);
  });

  it('returns undefined when the spot is in an unknown region with no info', () => {
    expect(stateFor(undefined, 'atlantis', 0)).toBeUndefined();
  });
});
