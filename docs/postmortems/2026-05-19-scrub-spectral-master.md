# Postmortem — 2026-05-19 · Scrub, spectral peak, master-scrub

Session 6 of the project. One long arc with multiple landings, all on the
PWA side. Headline: closed a real accuracy gap on the scoring engine and
shipped a Surfline-style master-scrub pattern on the Forecast tab.

## What shipped this session (in order)

1. **`fix:` scrub-tooltip clamp + iOS swipe-back guard.** The previous
   build's ScrubTooltip used `transform: translate(-50%)` with no width
   clamp. Near the left edge it clipped off-screen; near the right edge
   it grew the document width and iOS Safari read the horizontal overflow
   as a swipe-back gesture, dragging the entire page off-canvas. Fix:
   measure the tooltip's own width with `useLayoutEffect`, clamp `left`
   to `[half, chartWidth - half]`. Added `overflow-x: hidden` +
   `overscroll-behavior-x: contain` on the `Screen` container as
   defense-in-depth.

2. **`feat:` expand-in-place score-breakdown rows.** Each of the five
   rows (Direction, Period, Size, Wind, Tide) on Spot Detail is now a
   button that expands to reveal 2-3 lines of plain-English math. No
   viz — the compass and tide chart already on screen do the visual
   half. Text only:
   - Direction: "48° off optimal · cosine² falloff puts this at 43% of
     max · Lined up / rotated east of ideal / Too far west…"
   - Period: "10s = short-period groundswell · 69% the energy of a 12s
     wave · 4s short of the 14-18s window, penalty is 3 pts per second"
   - Size: "Open-ocean buoy reads 4.0ft · shadowFactor 0.55 → 2.2ft
     reaches the break · Inside your 2-6ft window…"
   - Wind dir: "Wind 113° off offshore — effectively side-onshore" +
     12h forecast lookahead "eases to 5kt by 6 PM"
   - Tide: "3.7ft now, Rising · Next high 4.5ft in ~47m"

3. **`feat:` live buoy spectral peak overrides hour-0 swell scoring.**
   The big accuracy win. Open-Meteo's `swell_wave_period` field
   collapses multi-modal seas into a single number that can land closer
   to the windswell than the groundswell. 2026-05-19 Bolinas case: buoy
   46026 reported a clean **14.7s @ 3.8ft groundswell (5 kW/m)** sitting
   under a 7s windswell, but Open-Meteo was returning 7s. That pulled
   The Patch's Period score to 4/20 even though the dominant groundswell
   was right inside its 12-16s optimal window. NWS Marine forecaster
   confirmed "NW 6 ft at 10 seconds" — agreed with the buoy, disagreed
   with the model. Fix: `pickDominantPeak(trains)` returns the train
   with the highest `H²·T` (standard surf-forecast energy-flux proxy);
   `hoursToTimeline` accepts an optional `BuoyForOverride` and swaps in
   the peak's period + direction for hour 0 when the buoy is `'online'`
   (not `'stale'`). Height untouched — `shadowFactor` already handles
   the at-the-break conversion on Open-Meteo height. Bolinas Patch
   score moved from 32 → 49 in production.

4. **`fix:` mock timeline matches live response length.** `useConditions`
   falls back to `buildTimeline(spot)` when there's no cached response.
   `buildTimeline`'s default is 48h (vestigial). On cache-miss visits
   (next morning after a >24h gap), the HourlyHeatmap rendered 2 rows
   of synthetic data, then reflowed to 7 rows when the live 168h
   response landed. Extract `FORECAST_HOURS = 168` constant in
   `lib/api.ts`, use it everywhere a timeline length is set.

5. **`feat:` 2D drag-to-scrub on the hourly-quality heatmap.** Sibling
   `useGridScrub` hook to the existing `useChartScrub`. Same Pointer
   Events principles (capture, 4px deadzone, lastCellRef gating per
   `(row,col)` change, `e.isPrimary` filter, pointercancel cleanup,
   `touch-action: none`) extended to two axes. Index math is
   `Math.floor(((clientX - rect.left) / rect.width) * cols)` and same
   for rows. Tap pins, drag scrubs in any 2D direction, outside-tap
   dismisses.

6. **`feat:` master-scrub pattern — heatmap drives all four MiniMetric
   charts.** Reframe of the dense bar-chart problem. The MiniMetric
   charts on the Forecast tab squeezed 168 bars into ~220px = unreadable.
   Surfline's pattern is to keep the heatmap as the only interactive
   surface and treat the bar charts below as passive readouts that
   respond to a shared scrub cursor. Implementation: lifted
   `useGridScrub` from `HourlyHeatmap` to `Forecast` so the active cell
   is available to sibling components; added `externalActiveHour` prop
   to `ForecastChart` (when set, skips its own pointer overlay, dims
   non-active bars, draws the scrub guideline); each MiniMetric reads
   `timeline[activeHour ?? 0]` for its "now" value display. One gesture,
   four metrics revealed at once.

7. **`fix:` iOS Safari text-selection callout during scrub.**
   `touch-action: none` only governs scroll gestures, not selection.
   On iOS, long-press during a scrub triggered the "Copy / Look Up"
   callout popup plus blue selection handles around the heatmap card.
   The WebKit-specific suppression suite: `user-select: none` /
   `-webkit-user-select: none` / `-webkit-touch-callout: none` /
   `-webkit-tap-highlight-color: transparent`. Added to both
   `useGridScrub` and `useChartScrub` overlay props, plus
   defense-in-depth on the HourlyHeatmap surface container.

8. **`style:` thicker, solid scrub guideline.** The previous treatment
   (`strokeWidth: 1, opacity: 0.45, strokeDasharray: "2 3"`) rendered
   as four faint dots on the 28px-tall MiniMetric charts. Bumped to
   `strokeWidth: 2, opacity: 0.7`, dropped the dash entirely. Reads as
   a clear cursor across all four charts.

## Diagnostic moment worth recording

The buoy-spectral discrepancy was visible right in our own UI before
we fixed it. The Spectral panel on Spot Detail showed 14.7s @ 3.8ft
flagged as GROUNDSWELL, with 5 kW/m total energy. The NWS Marine
forecast (also on the same page) said "NW 6 ft at 10 seconds." But
"Why this score" was reading 7s. The bug was that the scoring engine
was consuming Open-Meteo's dominant-period field instead of the
spectral panel's data we already had in hand.

The fix didn't require any new data sources or fetchers. The buoy
response shape already carried `swellTrains` in `ConditionsResponse`;
`timelinesFromResponse` just wasn't passing it through to
`hoursToTimeline`. A four-line plumbing change closed the gap that
adding more spots or refining shadowFactor coefficients never could.

**Engineering lesson: when two of your own surfaces disagree, the bug
is usually that one isn't reading what the other is.**

## What was previewed vs. shipped direct

Direct to main (small fixes, urgency):
- Scrub tooltip clamp (active bug on production)
- Mock-length reflow fix (one-line, isolated)
- Scrub guideline thicker/solid (style only)
- iOS callout suppression (rolled into master-scrub preview)

Preview branch first:
- `preview/expand-rows` — UI surface change, wanted eyes-on
- `preview/buoy-peak` — scoring engine change, scores would visibly move
- `preview/grid-scrub` — new interaction pattern
- `preview/master-scrub` — biggest behavior shift of the session

Branch naming gotcha re-confirmed: `preview/expand-score-rows` pushed
the alias to 64 chars, one over the 63-char DNS label limit, and got
a hashed alias instead of the predictable one. Renamed to
`preview/expand-rows` (under 30 chars after `preview/`) and got the
clean alias. CLAUDE.md note about this was already there; I broke
the rule once before remembering it.

## Backlog state at end of session

By value:
1. **Spectral refraction (full fix for the second half of the Bolinas
   discrepancy).** Open-ocean buoy reads 14.7s @ ~245° SW; LOTUS reports
   the same swell at the break as ~225° SW after Duxbury Reef refraction.
   Our direction is still incident. Closing this needs the CUDEM
   bathymetry pipeline that's been on the backlog. Significant work,
   high payoff for Bolinas specifically.
2. **Forecast-side multi-swell decomposition.** Hour 0 is now reading
   off the buoy, but hours 1-167 still use Open-Meteo's collapsed
   period. The model has secondary swell components (`secondary_swell_*`
   fields) that we're not consuming. Wiring those through and running
   the same `pickDominantPeak` logic on the forecast side would close
   the gap end-to-end. Half-day work.
3. **Asymmetric size penalty + energy-weighted direction.** Existing
   scoring engine refinement that's been sitting on the backlog.
4. **Typed `LocalRule` framework.** Waiting for more ground-truth
   observations before committing to a schema. `Spot.localNote` keeps
   accreting prose; eventually a few patterns will be obvious enough
   to formalize.
5. **Ground-truth rating capture UI.** Closes the loop the localNote
   field opens.
6. **Sigward Muir Beach webcam.** Still blocked on his reply.
7. **Gridded map overlays.** NOAA WaveWatch III GRIB rendering.
8. **Tap-to-expand chart detail view.** Was a v0 alternative to the
   master-scrub; might still be the right answer for SpotDetail's
   larger charts where the master-scrub doesn't apply.

## Files touched this session

- `src/components/Primitives.tsx` — ScrubTooltip clamp, ForecastChart
  externalActiveHour prop, scrub guideline restyle
- `src/components/Forecast.tsx` — lifted useGridScrub, HourlyHeatmap
  presentational, MiniMetric activeHour propagation, GridScrubTooltip
  finger-clearance positioning, selection suppression
- `src/components/SpotDetail.tsx` — expand-in-place score rows, explainRow helper
- `src/hooks/useChartScrub.ts` — selection-suppression CSS in overlayProps
- `src/hooks/useGridScrub.ts` — new file
- `src/hooks/useConditions.ts` — FORECAST_HOURS in mock fallback
- `src/lib/api.ts` — pickDominantPeak helper, BuoyForOverride type,
  hoursToTimeline buoy parameter, timelinesFromResponse buoy lookup,
  FORECAST_HOURS export
- `src/lib/api.test.ts` — new file (7 tests)

## Numbers at end of session

- 220 commits total (+17 from session 5's 203)
- 95 tests across 10 files (+8 from session 5's 88)
- 52 source files (+1 — useGridScrub.ts)
- 8,630 source LOC (essentially unchanged — refactoring lifted state, new
  code roughly equals removed code)
- Bolinas Patch score: 32 → 49 on the same conditions, with the same
  scoring weights, only the input period changed
