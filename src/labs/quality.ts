// Labs — Foundation B: the quality function, made legible.
//
// The app already defines "good": computeScore() in src/lib/data.ts. The
// spec is explicit that the viz must NOT introduce a second, parallel
// definition that quietly disagrees. So Labs imports computeScore and uses
// it as-is — every ForecastHour.score the views read came from it.
//
// What this file adds is LEGIBILITY. A composite score with no shown method
// is untrustworthy (the spec's "Legibility Problem"). scoreBreakdown() opens
// the number up: it returns the same total computeScore returns, plus the
// per-component contributions and a plain-English line for each. Views
// default to the confident number and reveal this breakdown on demand.
//
// scoreBreakdown MIRRORS computeScore's arithmetic. data.ts does not export
// its tideMatch / special-rule internals, so the period, size, tide and
// special pieces are re-derived here. quality.test.ts pins the two together:
// if computeScore ever changes, that test fails and tells you to update
// this file. That is the seam — duplication that cannot silently drift.

import {
  Spot, ForecastHour, computeScore,
  swellDirectionScore, windDirectionScore, windWavePenalty, angleDelta,
} from '../lib/data';

export { computeScore } from '../lib/data';

/** Subset of ForecastHour the scoring engine actually consumes. */
export interface ScoreInput {
  swellHeight: number;
  swellPeriod: number;
  swellDirection: number;
  windWaveHeight?: number;
  windSpeed: number;
  windDirection: number;
  tideHeight: number;
  tideRising: boolean;
}

export interface ScoreComponent {
  key: string;
  label: string;
  /** Actual contribution to the score. Negative for penalties. */
  points: number;
  /** Nominal cap, for drawing a proportional bar. 0 for pure penalties. */
  max: number;
  /** One plain-English line — no jargon — explaining this number. */
  detail: string;
}

export interface ScoreBreakdown {
  /** Clamped 0–100. Equals computeScore(spot, input) exactly. */
  total: number;
  components: ScoreComponent[];
  watchOnly: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r1 = (n: number) => Math.round(n * 10) / 10;

// data.ts tideMatch() — re-derived. Bands mirror tideMatch's bands.
const TIDE_BANDS: Record<Spot['optimalTide'], [number, number]> = {
  low: [0, 2], mid: [2, 4], high: [4, 6], rising: [1.5, 5],
};
function tidePoints(optimal: Spot['optimalTide'], h: number, rising: boolean): number {
  const [lo, hi] = TIDE_BANDS[optimal] ?? [0, 6];
  const inside = h >= lo && h <= hi;
  const base = inside ? 10 : Math.max(0, 10 - Math.min(Math.abs(h - lo), Math.abs(h - hi)) * 3);
  return base + (rising && inside ? 3 : 0);
}

// data.ts evaluateSpecialRules() — re-derived (penalty only).
function specialPenalty(spot: Spot, c: { tideHeight: number; tideRising: boolean }): number {
  let p = 0;
  for (const rule of spot.specialRules ?? []) {
    if (rule.kind === 'falling-tide-rip' && !c.tideRising && c.tideHeight < rule.below) {
      p += rule.penalty;
    }
  }
  return p;
}

const dirCardinal = (deg: number) => {
  const c = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return c[Math.round(deg / 22.5) % 16];
};

/**
 * Open up a score. Returns the same total computeScore would, plus the
 * components behind it. Pure — same spot + input, same breakdown.
 */
export function scoreBreakdown(spot: Spot, c: ScoreInput): ScoreBreakdown {
  if (spot.watchOnly) {
    // Mavericks-style spectator advisory — a different formula entirely.
    const size = c.swellHeight > 8 ? 30 : c.swellHeight * 3;
    const period = c.swellPeriod > 17 ? 30 : (c.swellPeriod - 10) * 4;
    const delta = angleDelta(c.swellDirection, spot.optimalSwell);
    const dir = 40 - delta * 0.8;
    const components: ScoreComponent[] = [
      { key: 'size', label: 'Size', points: size, max: 30,
        detail: `${r1(c.swellHeight)}ft — this spot wants 8ft+ to register` },
      { key: 'period', label: 'Period', points: period, max: 30,
        detail: `${r1(c.swellPeriod)}s — long-interval groundswell is the trigger` },
      { key: 'direction', label: 'Direction', points: dir, max: 40,
        detail: `${Math.round(delta)}° off the ${spot.optimalSwell}° window` },
    ];
    return { total: clamp(size + period + dir, 0, 100), components, watchOnly: true };
  }

  const delta = angleDelta(c.swellDirection, spot.optimalSwell);
  const direction = swellDirectionScore(c.swellDirection, spot.optimalSwell);

  const [pMin, pMax] = spot.optimalPeriod;
  let period: number;
  let periodNote: string;
  if (c.swellPeriod >= pMin && c.swellPeriod <= pMax) {
    period = 20;
    periodNote = `${r1(c.swellPeriod)}s sits inside the ${pMin}–${pMax}s window`;
  } else if (c.swellPeriod < pMin) {
    period = Math.max(0, 20 - (pMin - c.swellPeriod) * 3);
    periodNote = `${r1(c.swellPeriod)}s is ${r1(pMin - c.swellPeriod)}s short of the window`;
  } else {
    period = Math.max(0, 20 - (c.swellPeriod - pMax) * 2);
    periodNote = `${r1(c.swellPeriod)}s runs ${r1(c.swellPeriod - pMax)}s past the window`;
  }

  const [sMin, sMax] = spot.optimalSize;
  const sCenter = (sMin + sMax) / 2;
  const sSpread = (sMax - sMin) / 2 + 1;
  const size = Math.max(0, 15 - Math.pow((c.swellHeight - sCenter) / sSpread, 2) * 10);

  const windDir = windDirectionScore(c.windDirection, spot.offshore);
  const windOff = Math.round(angleDelta(c.windDirection, spot.offshore));
  const windSpeed = c.windSpeed > 20 ? -10 : c.windSpeed > 12 ? -(c.windSpeed - 12) : 0;
  const chop = windWavePenalty(c.swellHeight, c.windWaveHeight);
  const tide = tidePoints(spot.optimalTide, c.tideHeight, c.tideRising);
  const [tLo, tHi] = TIDE_BANDS[spot.optimalTide] ?? [0, 6];
  const special = specialPenalty(spot, c);

  const components: ScoreComponent[] = [
    { key: 'direction', label: 'Direction', points: direction, max: 30,
      detail: `Swell from ${Math.round(c.swellDirection)}° (${dirCardinal(c.swellDirection)}), ${Math.round(delta)}° off the ${spot.optimalSwell}° this break wants` },
    { key: 'period', label: 'Period', points: period, max: 20, detail: periodNote },
    { key: 'size', label: 'Size', points: size, max: 15,
      detail: `${r1(c.swellHeight)}ft at the break vs the ${r1(sCenter)}ft sweet spot (${sMin}–${sMax}ft)` },
    { key: 'windDir', label: 'Wind angle', points: windDir, max: 15,
      detail: windOff < 50 ? `Wind ${windOff}° off offshore — grooming the wave`
        : windOff > 130 ? `Wind ${windOff}° off offshore — onshore, tearing it up`
        : `Wind ${windOff}° off offshore — side-shore` },
    { key: 'windSpeed', label: 'Wind speed', points: windSpeed, max: 0,
      detail: windSpeed === 0 ? `${r1(c.windSpeed)}kt — under the 12kt penalty line`
        : `${r1(c.windSpeed)}kt — ${r1(-windSpeed)}pt penalty over the 12kt line` },
    { key: 'chop', label: 'Chop', points: chop, max: 0,
      detail: chop === 0 ? 'Clean — local windswell is small next to the groundswell'
        : `Local windswell is eating into the groundswell — ${r1(-chop)}pt penalty` },
    { key: 'tide', label: 'Tide', points: tide, max: 13,
      detail: `${r1(c.tideHeight)}ft, ${c.tideRising ? 'rising' : 'falling'} — break wants ${tLo}–${tHi}ft${tide > 10 ? ', rising bonus applied' : ''}` },
  ];
  if (special !== 0) {
    components.push({ key: 'special', label: 'Hazard', points: special, max: 0,
      detail: `Falling tide is running a rip here — ${r1(-special)}pt penalty` });
  }
  components.push({ key: 'base', label: 'Baseline', points: 5, max: 5,
    detail: 'Flat baseline every spot starts from' });

  const raw = components.reduce((s, x) => s + x.points, 0);
  return { total: clamp(raw, 0, 100), components, watchOnly: false };
}

/** Convenience: the breakdown straight off a scored ForecastHour. */
export function breakdownForHour(spot: Spot, h: ForecastHour): ScoreBreakdown {
  return scoreBreakdown(spot, h);
}

/** 0–1 normalized score, for feeding the sequential color ramps. */
export function quality01(score: number): number {
  return clamp(score, 0, 100) / 100;
}
