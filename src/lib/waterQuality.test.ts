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

  it('classifies structural vs rain-only concerns from source notes', () => {
    // Mitchell's Cove: sewage outfall offshore is structural — always amber
    expect(getWaterQuality('mitchells-cove')?.permanentAdvisory).toMatch(/Sewage outfall/);
    // 26th Ave: water quality is "decent" baseline per Surfline, only
    // worth flagging post-rain — rainSensitive, not permanentAdvisory
    expect(getWaterQuality('26th-ave')?.rainSensitive).toMatch(/runoff/);
    expect(getWaterQuality('26th-ave')?.permanentAdvisory).toBeUndefined();
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

  it('returns undefined for spots without concerns AND without live data', () => {
    // Per Eliel: "only display the card when we have data wired."
    // A spot in a monitored region with no live reading + no encoded
    // concern returns undefined — the panel hides.
    expect(stateFor(undefined, 'marin', 0)).toBeUndefined();
    expect(stateFor(undefined, 'sc', 0)).toBeUndefined();
  });

  it('returns monitored + sampleDate when a live reading is matched', () => {
    const info = { liveBeachName: 'Salmon Creek State Beach' };
    const live = {
      'Salmon Creek State Beach': {
        beachName: 'Salmon Creek State Beach',
        sampleDate: '2026-05-04',
        status: 'open' as const,
        rawStatus: 'Open',
        source: 'Sonoma County Env. Health',
      },
    };
    const s = stateFor(info, 'sonoma', 0, live);
    expect(s?.status).toBe('monitored');
    expect(s?.sampleDate).toBe('2026-05-04');
    expect(s?.source).toMatch(/Sonoma/);
  });

  it('promotes live status of caution / closed to the panel', () => {
    const info = { liveBeachName: 'Test Beach' };
    const cautionReading = {
      beachName: 'Test Beach',
      sampleDate: '2026-05-04',
      status: 'caution' as const,
      rawStatus: 'Caution: elevated coliform',
      source: 'Test County',
    };
    const s = stateFor(info, 'sonoma', 0, { 'Test Beach': cautionReading });
    expect(s?.status).toBe('caution');
    expect(s?.text).toContain('Caution');
  });

  it('hides spot panel when liveBeachName is set but no matching reading', () => {
    // Server fetch failed / county unreachable / beach name mis-spelled —
    // return undefined so panel hides rather than showing stale/blank.
    expect(stateFor({ liveBeachName: 'Salmon Creek State Beach' }, 'sonoma', 0, {})).toBeUndefined();
  });

  it('rain-sensitive spot stays informational on dry days, escalates to caution on wet', () => {
    // 26th Ave has rainSensitive set. The concern is real year-round
    // (surfers should know), so the panel stays visible on dry days
    // as 'monitored' (no amber dot) and escalates to 'caution' once
    // recent rain crosses the threshold.
    const wq = getWaterQuality('26th-ave')!;
    const dry = stateFor(wq, 'sc', 2);
    expect(dry?.status).toBe('monitored');
    expect(dry?.text).toMatch(/runoff/);
    expect(stateFor(wq, 'sc', 8)?.status).toBe('caution');
  });

  it('structural concerns (Mitchell\'s sewage outfall) stay caution year-round', () => {
    const wq = getWaterQuality('mitchells-cove')!;
    expect(stateFor(wq, 'sc', 0)?.status).toBe('caution');
    expect(stateFor(wq, 'sc', 20)?.status).toBe('caution');
  });

  it('returns not-monitored with proxy info for Salt Point spots', () => {
    const wq = getWaterQuality('secrets')!;
    const s = stateFor(wq, 'sonoma', 0);
    expect(s?.status).toBe('not-monitored');
    expect(s?.proxy?.name).toBe('Stillwater Cove');
    expect(s?.proxy?.miles).toBe(3);
  });

  it('includes source attribution on permanent-advisory spots via fallback', () => {
    // Cowells: permanentAdvisory set but no liveBeachName wired. Source
    // attribution comes from defaultMonitor(region).
    const wq = getWaterQuality('cowell')!;
    expect(stateFor(wq, 'sc', 0)?.source).toMatch(/Santa Cruz/);
  });

  it('returns undefined when the spot is in an unknown region with no info', () => {
    expect(stateFor(undefined, 'atlantis', 0)).toBeUndefined();
  });
});
