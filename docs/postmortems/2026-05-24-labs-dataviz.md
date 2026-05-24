# Postmortem — 2026-05-24 · Labs dataviz section

Session 7. One arc: built a new `/labs` section — six surf-forecast
visualization experiments — from a handoff spec. Nothing shipped to
production yet; the work is staged on a branch for a preview deploy and
visual review.

## What was built

A new unlisted section at `/labs`: a gallery plus six dataviz views, all
running on the live forecast. New code lives entirely under `src/labs/` —
the only existing file touched is `SiteShell.tsx` (two routes). The PWA and
marketing bundles are unchanged.

The six views, in spec order:

1. **Flow Map** — MapLibre + a `<canvas>` particle field. Particles ride the
   Open-Meteo wave-direction grid; speed carries period, color carries
   height. The hard one (canvas + projection sync).
2. **Window Grid** — faceted heatmap, hour-of-day × day, one grid per spot.
   Cell color is the quality score. Built first: it validates the weights.
3. **Swell Rose** — polar wind-rose of swell direction, petal area ∝ hour
   count, with each spot's ideal window drawn as a wedge.
4. **Swell Trajectory** — connected scatter, period × height, the line is
   time, color is wind quality. Isolates the week's dominant swell event.
5. **Convergence Timeline** — stacked horizon bands for tide / energy /
   wind, with convergence columns where the score crosses threshold.
6. **Watercolor Mood Map** — MapLibre Watercolor + hand-drawn wave glyphs;
   stroke count is height, raggedness is wind, hue is quality.

## Architecture — three shared foundations

The spec's core discipline: six views, one system. Built once, in
`src/labs/`:

- **A — spot contract (`spots.ts`).** `vizContract(spot)` derives the
  extra fields the views need (`swellWindow`, `shoreNormal`, numeric tide
  center, etc.) from canonical `Spot` fields. It is a *consumer* of
  `SPOTS`, never a second author. `featuredSpots()` curates six breaks.
- **B — quality (`quality.ts`).** The spec's sample `waveQuality()` with
  its own 30/30/20/10 weights would have been a third, parallel definition
  of "good." It was not built. Instead `scoreBreakdown()` mirrors the
  app's own `computeScore` and returns the per-component contributions for
  the legibility panels. `quality.test.ts` pins the two together — if
  `computeScore` changes, the test fails and names this file.
- **C — data (`data.ts`).** Per-spot views reuse the app's `useConditions`
  hook (same fetch, same cache). The Flow Map needs *field* data, which
  `/api/conditions` doesn't provide, so `useWaveField` fetches the
  Open-Meteo Marine grid client-side (CORS-open, keyless).

## Decisions worth recording

- **Consumed `computeScore`, did not fork it.** See foundation B. Every
  `ForecastHour.score` the views read is the app's number. Zero changes to
  `data.ts` — the Labs layer is purely additive, and `scoreBreakdown` is
  drift-pinned by a test rather than by editing the engine.

- **Hand-rolled SVG for views 2–5; no D3, no Observable Plot.** The spec
  named those libraries, but the app's house style is hand-rolled SVG
  (CompassRose, BathymetryCrossSection, ForecastChart) and the hover
  interactions are exactly what the app already does. Hand-rolling kept the
  dependency count flat and the code consistent with the codebase. The spec
  itself lands here for #2 ("graduate to D3 if you need custom cell
  interaction" — the hover breakdown *is* custom interaction).

- **One new dependency: `maplibre-gl`.** Views 1 and 6 genuinely need a
  slippy map; there is no lean alternative. It is code-split — a separate
  1 MB chunk (284 KB gzip) that only downloads when a map view opens. The
  marketing site and PWA never load it. Confirmed in the build output.

- **CARTO dark basemap for the Flow Map, not Stamen Toner.** Stamen via
  Stadia is keyless on `localhost` only; on a `vercel.app` preview it would
  403. CARTO `dark_nolabels` is keyless everywhere and meets the same
  intent — a stark dark field that leaves the color budget for the data.
  The Flow Map therefore renders fully on the preview deploy.

- **Watercolor (#6) still uses Stadia's Stamen Watercolor.** There is no
  keyless watercolor basemap, and watercolor *is* the point of that view.
  Off-localhost it needs a Stadia key. Without one, the tiles 403 and the
  view falls back to a warm paper-toned background — the glyphs still read.
  See backlog.

- **Trajectory (#4) runs on forecast, not measured buoy data.** The spec
  wanted a buoy archive for a day you surfed. NDBC's archive has no CORS,
  so a browser can't fetch it. #4 uses the live forecast and isolates the
  week's dominant swell event; the source line says "forecast" plainly.

## Verified / not verified

Verified: `tsc --noEmit` clean; the production bundle builds and
code-splits correctly; the 10 Labs unit tests pass (`quality.test.ts`
pins the breakdown to `computeScore`, `spots.test.ts` pins the contract).

Not verified: the views have **not been seen rendering**. Typecheck +
unit tests + build is the limit of what could be checked without a browser
and the live API. Visual validation is the preview-deploy step — exactly
what the branch-then-preview workflow is for.

## Finding — a pre-existing test failure

`src/lib/celestial.test.ts > "is stable across different times of the same
day"` fails (sunrise times ~24h apart). It is **not** from this session —
`src/lib/` was not touched, and the test hardcodes a fixed date so it fails
identically regardless of run date. The test assumes `SunCalc.getTimes`
ignores the time-of-day of its input; near midnight it doesn't (4am input
resolves to one night, 10pm to the next). Left alone — surfacing it as a
finding, not silently fixing someone else's test. Worth a focused look.

## Backlog

1. **Visual review on the preview deploy.** The real validation step.
2. **Stadia Maps key** for the Watercolor basemap off-localhost. Until
   then #6 shows the paper fallback. Optionally swap the Flow Map's CARTO
   basemap for Stamen Toner once a key exists.
3. **Decide Labs' go-public path.** Currently unlisted: no nav link,
   `robots.txt` disallow, `noindex` meta. To launch: delete the
   `useNoIndex` call in `LabsLayout`, drop the `robots.txt` line, add a nav
   entry.
4. **Trajectory measured-data version** — would need a server-side NDBC
   archive proxy to get true buoy history instead of forecast.
5. **Pre-existing `celestial.test.ts` failure** (above).

## Addendum — four more views (same day)

A second batch of build specs arrived — Stoke Field, Swell Bloom, Ridgeline,
Swell Origin Map — written for Next.js. Folded into the same `/labs` gallery
(experiments 07–10, ten total), adapted rather than pasted.

Decisions:

- **Stack ported, not as-specced.** The specs assume Next.js App Router;
  Surf Vikings is Vite. Mechanical: dropped the `"use client"` directives
  and `@/` aliases.
- **No d3 — hand-rolled.** The specs said `npm install d3`; the other six
  Labs views are d3-free hand-rolled SVG. Adding d3 for four of ten views
  would break the consistency that folding-in is for. Added a Catmull-Rom
  `smoothPath` helper to vizKit; reused the existing `ramp()` for color.
- **Stoke Field consumes `computeScore`, not its own `quality()`.** The
  spec shipped a hand-tuned `quality()` with `idealSwell/optFt/sigma` — a
  third definition of "good." The legible-additive-score idea it reaches
  for already exists as `computeScore` + `scoreBreakdown`. Stoke Field is
  now the single-spot, best-window-headline companion to the Window Grid's
  cross-spot view.
- **Restyled to the Labs theme.** The specs' Fraunces / IBM Plex Mono /
  seafoam→violet language was dropped for the existing `LABS` tokens — one
  period ramp (`seqPeriod`) was kept, since it is deuteranopia-safe and
  period is its own variable next to quality (green) and energy (cyan).
- **Stoke Field overlaps the Window Grid** — both are quality heatmaps.
  Kept both: cross-spot comparison vs. single-spot decision view are
  different jobs. Worth a later call on whether to cut one.

All four typecheck clean and are wired into the registry, so the gallery
and routing pick them up with no further changes.
