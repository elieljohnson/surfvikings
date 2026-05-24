// Labs — visual theme + color scales.
//
// The Labs section runs darker and cooler than the PWA. It is a register
// shift on purpose: the forecast app is a tool, Labs is a gallery. We reuse
// the app's quality thresholds (so a score still "means" the same thing)
// but NOT the app's traffic-light palette. Every Labs encoding is a single
// sequential hue — the spec's deuteranopia-safe constraint. Red/green
// quality lives in the app; Labs uses one hue and lets lightness carry the
// value.

export const LABS = {
  bg:       '#070A0E',   // near-black, a touch cooler than the app's #08090B
  panel:    '#0E141A',
  panel2:   '#141C24',
  line:     '#1F2A33',
  lineHi:   '#30404C',
  ink:      '#E9EEF2',
  inkDim:   '#9AA7B2',
  inkMute:  '#5C6B77',
  cyan:     '#43C9DC',
  cyanHi:   '#8BEEFF',
  accent:   '#F2B33D',   // warm accent — used ONLY to mark the finding/answer
  grid:     '#161F27',
} as const;

export const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
export const SANS = "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

/** Linear interpolate two #rrggbb hex colors. t is clamped to [0,1]. */
export function lerpHex(a: string, b: string, t: number): string {
  const u = Math.max(0, Math.min(1, t));
  const ai = parseInt(a.slice(1), 16);
  const bi = parseInt(b.slice(1), 16);
  const ar = ai >> 16, ag = (ai >> 8) & 255, ab = ai & 255;
  const br = bi >> 16, bg = (bi >> 8) & 255, bb = bi & 255;
  const r = Math.round(ar + (br - ar) * u);
  const g = Math.round(ag + (bg - ag) * u);
  const bl = Math.round(ab + (bb - ab) * u);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

/** Walk a multi-stop ramp. Stops are evenly spaced; t clamped to [0,1]. */
export function ramp(stops: string[], t: number): string {
  const u = Math.max(0, Math.min(1, t));
  if (stops.length === 1) return stops[0];
  const seg = u * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  return lerpHex(stops[i], stops[i + 1], seg - i);
}

// Sequential single-hue ramps. Dark end sits just above the panel color so
// an empty/low cell still reads as "part of the grid," not a hole.

/** Quality ramp — used by the Window Grid (#2) and anywhere a 0..1 quality
 *  needs a deuteranopia-safe color. One hue (green), lightness carries value. */
const GREEN_STOPS = ['#0C1A12', '#15422A', '#1F7A45', '#3FC368', '#86F2A0'];
export function seqGreen(t: number): string {
  return ramp(GREEN_STOPS, t);
}

/** Wave-energy ramp — used by the Flow Map (#1) and Convergence (#5).
 *  On a dark field, more energy reads as brighter, more saturated cyan. */
const CYAN_STOPS = ['#0B2027', '#124A56', '#1E8FA0', '#43C9DC', '#9FF3FF'];
export function seqCyan(t: number): string {
  return ramp(CYAN_STOPS, t);
}

/** Tide ramp — a quiet blue, distinct from the cyan energy ramp so the two
 *  bands in the Convergence chart never get confused. */
const TIDE_STOPS = ['#10202E', '#1C3F5C', '#2E6E9E', '#4F9FD4'];
export function seqTide(t: number): string {
  return ramp(TIDE_STOPS, t);
}
