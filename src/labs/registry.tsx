// Labs — the experiment registry.
//
// One list, consumed by both the gallery (LabsHome) and the router. Each
// view is React.lazy so maplibre-gl and the heavier views only download
// when their page is opened — the PWA and marketing bundles never carry
// the Labs weight.

import { lazy, LazyExoticComponent, ComponentType } from 'react';

export interface Experiment {
  slug: string;
  num: string;
  title: string;
  /** The dataviz-lineage register this piece works in. */
  register: string;
  /** The claim — what the chart finds. Stated, not hedged. */
  finding: string;
  /** Gallery description. */
  blurb: string;
  Component: LazyExoticComponent<ComponentType>;
}

export const EXPERIMENTS: Experiment[] = [
  {
    slug: 'flow-map',
    num: '01',
    title: 'Swell-Arrival Flow Map',
    register: 'Stamen / Beccario — the showpiece',
    finding: 'Watch where the wave energy is actually pointed — and which breaks it misses.',
    blurb: 'An animated particle field over the coast. Particles ride the swell-direction vectors; '
      + 'their speed carries period, their color carries height. The spots are the anchors the '
      + 'energy is aimed at, or not.',
    Component: lazy(() => import('./views/FlowMap')),
  },
  {
    slug: 'window-grid',
    num: '02',
    title: 'Quality-Score Window Grid',
    register: 'Tufte — small multiples',
    finding: 'There are only a handful of surfable windows this week, and most of them are at dawn.',
    blurb: 'A faceted heatmap — hour of day against day of week, one grid per spot. '
      + 'It makes a surfer’s decision visible, and it visually validates the scoring weights.',
    Component: lazy(() => import('./views/WindowGrid')),
  },
  {
    slug: 'swell-rose',
    num: '03',
    title: 'The Swell Rose',
    register: 'Analytical — polar',
    finding: 'A break only works when the swell points the right way. That window is narrower than you’d think.',
    blurb: 'A compass-oriented polar chart of swell direction, period and quality, with each '
      + 'spot’s ideal window drawn as a translucent wedge — local knowledge rendered as geometry.',
    Component: lazy(() => import('./views/SwellRose')),
  },
  {
    slug: 'trajectory',
    num: '04',
    title: 'Connected-Scatter Swell Trajectory',
    register: 'Bostock / NYT — the graphics desk',
    finding: 'A swell has a life-shape: it builds, peaks, and blows itself out. You can watch the loop.',
    blurb: 'A connected scatter — period against height, the line itself is time. Color along the '
      + 'path tracks the wind turning a clean swell blown-out.',
    Component: lazy(() => import('./views/SwellTrajectory')),
  },
  {
    slug: 'convergence',
    num: '05',
    title: 'Convergence Timeline',
    register: 'Dense multivariate time series',
    finding: 'Tide, swell and wind are three independent clocks. They only agree a couple of times a week.',
    blurb: 'Stacked horizon bands for tide, wave energy and wind, with the convergence windows — '
      + 'where all three line up — called out as columns.',
    Component: lazy(() => import('./views/ConvergenceTimeline')),
  },
  {
    slug: 'watercolor',
    num: '06',
    title: 'Watercolor Mood Map',
    register: 'Stamen — humanistic',
    finding: 'The same numbers, felt rather than measured.',
    blurb: 'A register shift. A painterly basemap, and a hand-drawn wave glyph per spot whose '
      + 'strokes still encode real height, wind and temperature. Rigor in a softer voice.',
    Component: lazy(() => import('./views/WatercolorMap')),
  },
];

export function experimentBySlug(slug: string): Experiment | undefined {
  return EXPERIMENTS.find((e) => e.slug === slug);
}
