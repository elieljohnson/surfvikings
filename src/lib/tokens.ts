export const TOKENS = {
  bg:        '#08090B',
  surface:   '#111317',
  surface2:  '#171A1F',
  surface3:  '#1E2229',
  border:    '#24272E',
  borderHi:  '#353A43',
  text:      '#F2F4F7',
  textDim:   '#C4CAD3',
  textMute:  '#AFB5BF',
  pacific:   '#3FB8FF',
  teal:      '#2DD4BF',
  phosphor:  '#7EE787',
  amber:     '#F5A524',
  orange:    '#F97316',
  red:       '#EF4444',
  epic:      '#05F772', // electric green
  good:      '#8EF705', // electric lime
  fair:      '#BAF705', // bright yellow-lime
  mediocre:  '#EAB308', // yellow-500
  meh:       '#F97316', // orange-500
  poor:      '#EF4444', // red-500
  flat:      '#4B5058', // gray
  maverick:  '#FF6D00',
  cData:     '#3FB8FF',
  cSwell:    '#3FB8FF',
  cWind:     '#3FB8FF',
  cTide:     '#3FB8FF',
} as const;

export type TokenKey = keyof typeof TOKENS;

export function scoreColor(score: number, watchOnly?: boolean): string {
  if (watchOnly) return score >= 80 ? TOKENS.maverick : score >= 35 ? TOKENS.mediocre : TOKENS.flat;
  if (score >= 80) return TOKENS.epic;     // 80-100 teal
  if (score >= 60) return TOKENS.good;     // 60-79  lime-500
  if (score >= 50) return TOKENS.fair;     // 50-59  lime-400
  if (score >= 35) return TOKENS.mediocre; // 35-49  yellow
  if (score >= 30) return TOKENS.meh;      // 30-34  orange
  if (score >= 15) return TOKENS.poor;     // 15-29  red
  return TOKENS.flat;                       // 0-14   gray
}

export function qualityColor(q: number): string {
  if (q >= 0.80) return TOKENS.epic;     // teal
  if (q >= 0.60) return TOKENS.good;     // lime-500
  if (q >= 0.50) return TOKENS.fair;     // lime-400
  if (q >= 0.35) return TOKENS.mediocre; // yellow
  if (q >= 0.30) return TOKENS.meh;      // orange
  return TOKENS.poor;                     // red (also covers < 0.15 → gray would feel broken)
}
