// Regression tests for the NWS Coastal Waters Forecast parser.
// Sample bulletin captured from a live api.weather.gov fetch on May 11
// 2026 — locks the parse against the real format so a future tweak to
// the regex doesn't silently regress.

import { describe, expect, it } from 'vitest';
import { parseCwf } from './fetchers';

const SAMPLE_CWF = `
000
FZUS56 KMTR 111602
CWFMTR

Coastal Waters Forecast for California
National Weather Service San Francisco Bay Area
902 AM PDT Mon May 11 2026

Central California Coast from Point Arena to Point Piedras
Blancas out to 60 NM, including Monterey Bay, Greater Farallones,
and Cordell Bank National Marine Sanctuaries

PZZ500-120430-
902 AM PDT Mon May 11 2026

.Synopsis for the Central California Coast and Bays...

$$

PZZ545-120430-
Waters from Pigeon Point to Point Reyes-
902 AM PDT Mon May 11 2026

...SMALL CRAFT ADVISORY IN EFFECT UNTIL 3 PM PDT THIS AFTERNOON...

.TODAY...NW wind 20 to 25 kt, easing to 15 to 20 kt this
afternoon. Seas 7 to 9 ft. Wave Detail: NW 9 ft at 9 seconds and
S 2 ft at 16 seconds.
.TONIGHT...NW wind 15 to 20 kt. Seas 6 to 7 ft. Wave Detail: NW
6 ft at 9 seconds.
.TUE...NW wind 10 to 15 kt in the morning becoming W. Seas 5 to
6 ft.

$$

PZZ565-120430-
Waters from Pigeon Point to Point Pinos out 10 NM-
902 AM PDT Mon May 11 2026

.TODAY...NW wind 15 to 20 kt. Seas 5 to 6 ft.
.TONIGHT...NW wind 10 to 15 kt. Seas 4 to 5 ft.

$$
`;

describe('parseCwf', () => {
  const result = parseCwf(SAMPLE_CWF, 1778460000000);

  it('extracts the zones present in the bulletin', () => {
    const zones = Object.keys(result).sort();
    expect(zones).toContain('PZZ545');
    expect(zones).toContain('PZZ565');
  });

  it('captures zone description and issuance timestamp', () => {
    expect(result.PZZ545.description).toBe('Waters from Pigeon Point to Point Reyes');
    expect(result.PZZ545.issuedAt).toBe(1778460000000);
  });

  it('captures active advisories on zones that have them', () => {
    expect(result.PZZ545.advisories.length).toBeGreaterThan(0);
    expect(result.PZZ545.advisories[0]).toMatch(/SMALL CRAFT ADVISORY/);
  });

  it('returns no advisories when none are issued for the zone', () => {
    expect(result.PZZ565.advisories).toEqual([]);
  });

  it('parses period sections in order: Today / Tonight / next-day', () => {
    const names = result.PZZ545.periods.map((p) => p.name);
    expect(names).toEqual(['Today', 'Tonight', 'Tue']);
  });

  it('joins multi-line period text into single-line narrative', () => {
    const today = result.PZZ545.periods[0];
    expect(today.text).toMatch(/NW wind 20 to 25 kt/);
    expect(today.text).toMatch(/Wave Detail: NW 9 ft at 9 seconds and S 2 ft at 16 seconds/);
    expect(today.text).not.toContain('\n');
  });

  it('handles zones with fewer periods independently', () => {
    expect(result.PZZ565.periods).toHaveLength(2);
    expect(result.PZZ565.periods[0].name).toBe('Today');
  });

  it('returns an empty object when text is malformed', () => {
    expect(parseCwf('garbage', 0)).toEqual({});
  });
});
