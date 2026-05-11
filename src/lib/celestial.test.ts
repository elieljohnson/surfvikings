// Regression test for the May 11 2026 sunrise/sunset bug. The pre-SunCalc
// hand-rolled NOAA Solar Position Algorithm was returning times off by ~5
// hours. After two unsuccessful fix attempts we swapped in SunCalc; this
// test locks the corrected behavior so a future "let's roll our own again"
// refactor would fail loudly.

import { describe, expect, it } from 'vitest';
import { moonPhase, sunriseSunset } from './celestial';

describe('sunriseSunset', () => {
  // Bolinas Patch — the spot we screenshotted in the bug report.
  const BOLINAS = { lat: 37.9042, lng: -122.7101 };

  it('returns realistic sunrise / sunset for Bolinas on May 11 2026', () => {
    const date = new Date(2026, 4, 11, 12, 0, 0); // local noon May 11 2026
    const { sunrise, sunset } = sunriseSunset(date, BOLINAS.lat, BOLINAS.lng);

    // Sunrise should be in the 5-7 AM band (UTC offset depends on test
    // machine TZ — assert on UTC hour instead so the test runs anywhere).
    // PDT sunrise ~6 AM = ~13 UTC. PST sunrise (winter) ~7 AM = ~15 UTC.
    // For May 2026 NorCal it's PDT, so we expect 13 UTC ±1.
    const sunriseUtcHour = sunrise.getUTCHours();
    expect(sunriseUtcHour).toBeGreaterThanOrEqual(12);
    expect(sunriseUtcHour).toBeLessThanOrEqual(14);

    // Sunset ~8 PM PDT = ~03 UTC next day.
    const sunsetUtcHour = sunset.getUTCHours();
    expect(sunsetUtcHour).toBeGreaterThanOrEqual(2);
    expect(sunsetUtcHour).toBeLessThanOrEqual(4);

    // Day length should be ~14 hours in May at this latitude.
    const dayLengthMs = sunset.getTime() - sunrise.getTime();
    const dayLengthHours = dayLengthMs / 3600000;
    expect(dayLengthHours).toBeGreaterThanOrEqual(13.5);
    expect(dayLengthHours).toBeLessThanOrEqual(14.5);
  });

  it('produces shorter days in winter than summer at the same spot', () => {
    const summer = new Date(2026, 5, 21); // Jun 21
    const winter = new Date(2026, 11, 21); // Dec 21
    const s = sunriseSunset(summer, BOLINAS.lat, BOLINAS.lng);
    const w = sunriseSunset(winter, BOLINAS.lat, BOLINAS.lng);
    const summerHours = (s.sunset.getTime() - s.sunrise.getTime()) / 3600000;
    const winterHours = (w.sunset.getTime() - w.sunrise.getTime()) / 3600000;
    expect(summerHours).toBeGreaterThan(winterHours);
    // Sanity: summer day ≥ 14h, winter day ≤ 10h at ~38°N
    expect(summerHours).toBeGreaterThanOrEqual(14);
    expect(winterHours).toBeLessThanOrEqual(10);
  });

  it('is stable across different times of the same day', () => {
    // The function should ignore the hours/minutes of the input Date and
    // give the same sunrise time regardless of when in the day it was
    // called. (Pre-fix bug: calling near midnight gave different answers
    // than calling near noon because setHours mutated the input date.)
    const morning = new Date(2026, 4, 11, 4, 0, 0);
    const evening = new Date(2026, 4, 11, 22, 0, 0);
    const a = sunriseSunset(morning, BOLINAS.lat, BOLINAS.lng);
    const b = sunriseSunset(evening, BOLINAS.lat, BOLINAS.lng);
    expect(Math.abs(a.sunrise.getTime() - b.sunrise.getTime())).toBeLessThan(60000);
    expect(Math.abs(a.sunset.getTime() - b.sunset.getTime())).toBeLessThan(60000);
  });
});

describe('moonPhase', () => {
  it('returns illumination between 0 and 1 with a readable label', () => {
    const m = moonPhase(new Date(2026, 4, 11));
    expect(m.illumination).toBeGreaterThanOrEqual(0);
    expect(m.illumination).toBeLessThanOrEqual(1);
    expect(typeof m.label).toBe('string');
    expect(m.label.length).toBeGreaterThan(0);
  });

  it('returns Full near a known full moon date', () => {
    // Jan 13 2025 was a full moon. SunCalc is quite accurate so phase
    // should be near 0.5 with label 'Full' or adjacent.
    const m = moonPhase(new Date(2025, 0, 13, 22, 0, 0));
    expect(m.illumination).toBeGreaterThan(0.95);
  });
});
