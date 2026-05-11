// Local astronomical math — sunrise, sunset, moon phase, daylight check.
// Backed by `suncalc` (npm), a tiny battle-tested library used by Mapbox,
// Windy, and others. Pulled in after a hand-rolled NOAA implementation
// produced off-by-hours results and resisted a few rounds of fix attempts.
// Worth ~5KB minified for correctness we can rely on.

import SunCalc from 'suncalc';

/** Sunrise + sunset for a given date at a given lat/lng. Returns Date
 *  objects (epoch-correct), so getHours()/getMinutes() in the system's
 *  local timezone format them as expected. */
export function sunriseSunset(
  date: Date,
  lat: number,
  lng: number,
): { sunrise: Date; sunset: Date } {
  const times = SunCalc.getTimes(date, lat, lng);
  return { sunrise: times.sunrise, sunset: times.sunset };
}

/** Moon illumination (0–1) + English phase label, for the given moment. */
export function moonPhase(date: Date): { illumination: number; label: string } {
  const m = SunCalc.getMoonIllumination(date);
  // SunCalc reports `phase` as 0..1 (0 = new, 0.25 = first qtr, 0.5 = full,
  // 0.75 = last qtr). Map to the eight standard names.
  const phase = m.phase;
  const labels: Array<[number, string]> = [
    [0.03, 'New'],
    [0.22, 'Waxing crescent'],
    [0.28, 'First quarter'],
    [0.47, 'Waxing gibbous'],
    [0.53, 'Full'],
    [0.72, 'Waning gibbous'],
    [0.78, 'Last quarter'],
    [0.97, 'Waning crescent'],
  ];
  const match = labels.find(([cutoff]) => phase < cutoff);
  return { illumination: m.fraction, label: match ? match[1] : 'New' };
}

/** Convenience: is `t` (epoch ms) currently within daylight at this spot? */
export function isDaylight(t: number, lat: number, lng: number): boolean {
  const d = new Date(t);
  const { sunrise, sunset } = sunriseSunset(d, lat, lng);
  return t >= sunrise.getTime() && t <= sunset.getTime();
}

/** "5:43a" / "8:12p" formatter for sun times. Reads getHours/getMinutes
 *  so the system's local timezone formats correctly. */
export function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'p' : 'a';
  const disp = ((h + 11) % 12) + 1;
  return `${disp}:${m.toString().padStart(2, '0')}${suffix}`;
}
