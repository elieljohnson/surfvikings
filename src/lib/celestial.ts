// Local astronomical math — sunrise, sunset, moon phase.
// All formulas are standard NOAA / USNO algorithms, accurate to ~1 minute.
// No external API: lat/lng + date are enough. No npm dependency.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Julian Day for a UTC date. The astronomical zero point is noon UT,
 *  Jan 1 4713 BC. We just need it as a counter for the trig below. */
function julianDay(date: Date): number {
  const ms = date.getTime();
  return ms / 86400000 + 2440587.5;
}

/** Sunrise + sunset for a given date at a given lat/lng. Returns Date
 *  objects in the system's local timezone. Implements the NOAA Solar
 *  Position Algorithm — approximate but well within ±1 minute. */
export function sunriseSunset(date: Date, lat: number, lng: number): { sunrise: Date; sunset: Date } {
  // Start of the day in UT, midnight at the spot's longitude
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const jd = julianDay(dayStart);

  // Days since J2000 (Jan 1 2000 12:00 UT)
  const n = jd - 2451545.0 + 0.0008;
  // Mean solar noon at this longitude (in days since J2000)
  const jstar = n - lng / 360;
  // Solar mean anomaly (deg)
  const M = (357.5291 + 0.98560028 * jstar) % 360;
  // Equation of center
  const C =
    1.9148 * Math.sin(M * RAD) +
    0.02 * Math.sin(2 * M * RAD) +
    0.0003 * Math.sin(3 * M * RAD);
  // Ecliptic longitude
  const lambda = (M + C + 180 + 102.9372) % 360;
  // Solar transit (JD when the sun crosses the meridian)
  const jTransit =
    2451545.0 +
    jstar +
    0.0053 * Math.sin(M * RAD) -
    0.0069 * Math.sin(2 * lambda * RAD);
  // Sun's declination
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.44 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  // Hour angle of sunrise (when sun's altitude = -0.83° accounting for refraction)
  const cosH =
    (Math.sin(-0.83 * RAD) - Math.sin(lat * RAD) * sinDec) /
    (Math.cos(lat * RAD) * cosDec);
  // Polar day / polar night guard (won't happen in NorCal but be defensive)
  const omega = Math.abs(cosH) > 1 ? 0 : Math.acos(cosH) * DEG;
  const jRise = jTransit - omega / 360;
  const jSet = jTransit + omega / 360;
  return {
    sunrise: new Date((jRise - 2440587.5) * 86400000),
    sunset: new Date((jSet - 2440587.5) * 86400000),
  };
}

/** Moon illumination fraction (0–1) and an English phase label. Calculated
 *  from the lunar synodic period (29.53 days) anchored to a known new moon
 *  (Jan 6 2000 18:14 UTC = JD 2451550.1). Phase angle accuracy is ±2 hours,
 *  fine for the "how much moon will be up tonight" question surfers care about. */
export function moonPhase(date: Date): { illumination: number; label: string } {
  const jd = julianDay(date);
  const synodic = 29.530588853;
  const phase = ((jd - 2451550.1) / synodic) % 1;
  const angle = phase * 2 * Math.PI;
  // Illumination = (1 - cos(angle)) / 2 — 0 at new, 1 at full
  const illumination = (1 - Math.cos(angle)) / 2;
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
  const wrapped = (phase + 1) % 1;
  const match = labels.find(([cutoff]) => wrapped < cutoff);
  const label = match ? match[1] : 'New';
  return { illumination, label };
}

/** Convenience: is `t` (epoch ms) currently within daylight at this spot? */
export function isDaylight(t: number, lat: number, lng: number): boolean {
  const d = new Date(t);
  const { sunrise, sunset } = sunriseSunset(d, lat, lng);
  return t >= sunrise.getTime() && t <= sunset.getTime();
}

/** "5:43a" / "8:12p" formatter for sun times. */
export function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'p' : 'a';
  const disp = ((h + 11) % 12) + 1;
  return `${disp}:${m.toString().padStart(2, '0')}${suffix}`;
}
