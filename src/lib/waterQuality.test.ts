import { describe, expect, it } from 'vitest';
import { SPOTS } from './data';
import { getWaterQuality, tierOf, WATER_QUALITY } from './waterQuality';

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

  it('returns undefined for spots without documented water-quality concerns', () => {
    expect(getWaterQuality('bolinas-patch')).toBeUndefined();
    expect(getWaterQuality('steamer-lane')).toBeUndefined();
    expect(getWaterQuality('mavericks')).toBeUndefined();
  });

  it('every entry in WATER_QUALITY maps to a real spot', () => {
    // Lock down against typos in spot IDs that would silently never trigger.
    const allSpotIds = new Set(SPOTS.map((s) => s.id));
    for (const id of Object.keys(WATER_QUALITY)) {
      expect(allSpotIds.has(id)).toBe(true);
    }
  });
});

describe('tierOf', () => {
  it('permanent advisories always render at caution tier (amber, not red)', () => {
    // Per design: people surf Cowells year-round despite the permanent
    // posting. Red is reserved for active 'closed' state (Phase 3).
    expect(tierOf(getWaterQuality('cowell')!)).toBe('caution');
    expect(tierOf(getWaterQuality('cowell')!, 0)).toBe('caution');
    expect(tierOf(getWaterQuality('cowell')!, 20)).toBe('caution');
    expect(tierOf(getWaterQuality('rivermouth')!)).toBe('caution');
  });

  it('rain-sensitive entries stay quiet on dry days', () => {
    expect(tierOf(getWaterQuality('mitchells-cove')!, 0)).toBeUndefined();
    expect(tierOf(getWaterQuality('mitchells-cove')!, 2)).toBeUndefined();
    expect(tierOf(getWaterQuality('26th-ave')!, 4.9)).toBeUndefined();
  });

  it('rain-sensitive entries flip to caution at the 5mm threshold', () => {
    expect(tierOf(getWaterQuality('mitchells-cove')!, 5)).toBe('caution');
    expect(tierOf(getWaterQuality('mitchells-cove')!, 12)).toBe('caution');
    expect(tierOf(getWaterQuality('26th-ave')!, 25)).toBe('caution');
  });

  it('returns undefined for entries with no advisory or sensitivity flag', () => {
    expect(tierOf({ beachId: '123' }, 100)).toBeUndefined();
    expect(tierOf({}, 100)).toBeUndefined();
  });

  it('permanent advisory still wins over rain-sensitive when both are set', () => {
    // Same caution tier today, but the permanentAdvisory text is shown
    // (unconditional) rather than the rain-trigger text.
    expect(tierOf({
      permanentAdvisory: 'creek outflow',
      rainSensitive: 'also bad after rain',
    }, 0)).toBe('caution');
  });
});
