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
  red:       '#FF5D5D',
  epic:      '#22c55e',
  good:      '#E6B800',
  fair:      '#FF8A3D',
  poor:      '#FF5D5D',
  flat:      '#4B5058',
  maverick:  '#FF6D00',
  cData:     '#3FB8FF',
  cSwell:    '#3FB8FF',
  cWind:     '#3FB8FF',
  cTide:     '#3FB8FF',
} as const;

export type TokenKey = keyof typeof TOKENS;

export function scoreColor(score: number, watchOnly?: boolean): string {
  if (watchOnly) return score >= 75 ? TOKENS.maverick : score >= 35 ? TOKENS.good : TOKENS.flat;
  if (score >= 75) return TOKENS.epic;
  if (score >= 55) return TOKENS.good;
  if (score >= 35) return TOKENS.fair;
  if (score >= 15) return TOKENS.poor;
  return TOKENS.flat;
}

export function qualityColor(q: number): string {
  if (q >= 0.78) return '#7DFF9E';
  if (q >= 0.58) return '#C8F56B';
  if (q >= 0.40) return '#E6B800';
  if (q >= 0.22) return '#E8833A';
  return '#B84545';
}
