# Postmortem — 2026-06-02 · Dot-cleanup sweep + Landing page refresh + docs pass

Session 7. Continuation of session 6. Two coherent arcs:
1. A full doc + Landing update surfacing session-6's technical wins to
   the marketing site and portfolio artifacts.
2. A systematic dot-removal sweep across every colored-quality surface
   in the app — establishing the design principle that a colored dot
   next to already-colored text is duplicate signal.

Plus screenshot regeneration passes and a script hardening change.

## What shipped this session (in order)

### Documentation update pass (start of session)

1. **`docs:` case studies + glossary + technical-overview through session 6.**
   Reconciled numbers across `case-study.md` and `case-study-resume.md`:
   8,600 → 8,630 LOC, 51 → 52 source files, 88 → 95 tests, 203 → 220
   commits, 11 → 15 arcs, 5 → 6 sessions. Added four new arcs to
   `case-study.md` covering session-6's work (drag-to-scrub, spectral
   override, iOS hardening, expand-in-place + master-scrub). Added three
   new principles to `case-study-resume.md` ("Trust observation over
   model when both are in hand", "The cursor is the chart", "WebKit on
   iOS is its own platform"). Extended `glossary.md` with four new
   sections (Interaction patterns, iOS hardening, Master-scrub, Spectral
   terms). Extended `technical-overview.md` with the hour-0 buoy
   override data flow + `FORECAST_HOURS` + two scrub hooks + master-scrub
   state hoist. Bumped `sv:conditions:v1:` → `sv:conditions:v3:` in
   both `stack.md` and `technical-overview.md` to match production.

2. **`docs:` refresh docs/screenshots after dot cleanup.**
   Regenerated all 16 case-study screenshots (dashboard, spot-detail
   set, forecast set, map, landing, merch) against the current build.
   Also switched `capture-screenshots.mjs` from `waitUntil: networkidle`
   to `domcontentloaded` — the dev server keeps a Vite HMR websocket
   open plus 15-minute `useConditions` polling, so the network is never
   strictly idle on app routes and the old wait was timing out.

### Landing page refresh (preview branch)

3. **`feat:` surface session-6 wins on Landing.** Added two new
   FeatureSections between the existing three:
   - "Live spectrum, not a summary" — explains the spectral peak
     override with the concrete "Bolinas Patch moved from 32 → 49 on
     the same conditions" callout.
   - "One finger, the whole week" — explains the Surfline-style
     master-scrub interaction.
   Refreshed the DataProof stats: `64 spots · 7 NOAA buoys · 47 spectral
   bins · 5 WQ counties · 7-day horizon` (was 64/7/6 tide stations/56
   WQ spots). Swapped two FeatureGrid cards — dropped Mavericks Watch
   + Open methodology, added Calendar feed + Tap to explain. Two rounds
   of copy simplification on the spectral body — final language keeps
   "groundswell hiding under chop" as surfer-natural but drops
   `swell_wave_period`, `H²·T`, `NDBC`, and the 7s/14.7s specifics.

4. **`style:` tighten FeatureSection vertical rhythm.** 100px → 56px
   section padding on desktop (200px section gaps felt cavernous on the
   longer 5-section page), 40px → 32px on mobile. `alignItems: center`
   → `flex-start` so eyebrow/headline anchors to the phone mockup's top
   edge instead of vertically centering with the whole flex row, which
   was producing dead air above the text on tall mockups.

### Systematic dot cleanup sweep

The design principle that surfaced: **a colored dot next to
colored text is duplicate signal.** User called it out in one place;
we then hunted every instance across the app.

5. **`style:` drop redundant colored dot from spot cards (RegionMap).**
   The dot's information was already carried by the colored left border
   + the colored score number. Removed the 8px circle.

6. **`fix:` drop the spot-card glow.** My first attempt at (5)
   "preserved" the epic-tier glow by moving it from the dot to the card
   border via boxShadow. The 12px blur radius bled ~10px outward and
   visually contaminated adjacent rows. Killed the glow entirely — over-
   engineering that I should have skipped when I killed the dot.

7. **`style:` drop dots from VectorsPanel column headers.** Added a
   `dot={false}` prop to the shared `Stat` component (defaults `true`
   to preserve every other surface), used it on the four VectorsPanel
   calls (SWELL DIR / OPTIMAL / WIND / OFFSHORE). Affects both Forecast
   and Spot Detail's Vectors panels.

8. **`style:` drop the ◉ glyph from My Spots PEAK rows.** Unicode dot
   character prefixing "PEAK N @ T Ypm". Plain delete.

9. **`style:` drop the colored dots from Top Pick card.** Four sources:
   - SWELL / DIR / WIND / TIDE stats got `dot={false}`
   - ◉ GO NOW glyph removed
   - LIVE status indicator dot removed; moved the `dataBadgeColor` onto
     the "LIVE / OFFLINE / STALE / SYNCING / PARTIAL" text itself so the
     connection-state signal is preserved without the dot.

10. **`style:` drop dots from Sun & Moon stat labels.** Same `dot={false}`
    on the three SUNRISE / SUNSET / MOON Stat calls. These had
    `color={TOKENS.text}` (white) so the dots were nearly invisible
    against the dark background anyway.

11. **`style:` drop the ◉ glyph from Optimal Window label.**

12. **`style:` drop dot from Water Quality status row.** The 8px dot
    next to "Clean / Caution / Closed / Not monitored" — the status
    word already wears the `dotColor`. Structural simplification.

### Screenshot regeneration + refinement

13. **`docs:` refresh Landing page screenshots after dot cleanup.**
    Regenerated `public/screenshots/` (5 files: dashboard, spot-detail,
    spot-detail-spectral, forecast, map) so the Landing page's
    PhoneMockup panels match the dot-less production build.

14. **`docs:` refresh docs/screenshots after dot cleanup.** Same
    regeneration for the case-study asset folder — 16 files total.

15. **`docs:` chart-dominant spot-detail-spectral screenshot.** The
    original spectral-view scroll landed too far down the page — user
    saw mostly verbose NWS Marine Forecast text with just the bottom
    of the spectral peaks. Rewrote the scroll anchor to target the
    SWELL header (above the spectral panel) so the three metric bar
    charts (SWELL / WIND / TIDE) dominate the upper half and the
    spectral peaks fill the lower half. NWS text shrinks to a sliver
    at the bottom edge. Also generalized `capture-screenshots.mjs`
    with a new `anchorText` view-config option so future capture
    positions survive content-height drift.

## Diagnostic moments worth recording

**The dot pattern turned out to be everywhere.** The user's first
"remove the dots" request was scoped to one component. What emerged
across the session was a systemic anti-pattern: every place we'd added
a colored dot next to text that was already tinted the same color, the
dot was duplicate signal. Nine components / seven commits later, the
app is consistent — quality is communicated by the value/label that
means something, not a bullet beside it. The design principle is now
codified in the `dot?: boolean` prop on the shared `Stat` component
(defaults `true` to preserve caller intent; called-out surfaces pass
`dot={false}`).

**Never "preserve" a signal you're not sure about.** The glow-around-
epic-card fix (commit 395b9c9) was pure over-engineering. When the
user asked to remove the dot, I invented a replacement signal (moving
the glow from dot to card border) that then contaminated neighboring
cards. Should have killed the entire signal at once. Rule of thumb:
if the user says "remove this," start by removing it — don't preserve
adjacent things they didn't ask you to preserve.

**Two screenshot scripts have subtly different anchors.** `capture-
screenshots.mjs` uses the "Screen container" selector (an `overflowY:
auto` div) and `getBoundingClientRect`-based scrolling. `gen-screenshots.mjs`
uses the same logic but with case-INsensitive regex. Both hit the same
gotcha: labels in the app are usually `"Swell"` / `"Wind"` with CSS
`text-transform: uppercase`, so `textContent` returns title case, not
the visually-rendered ALL CAPS. Case-insensitive regex flag is
non-optional for anchor-on-header patterns.

## What was previewed vs. shipped direct

Preview branch first:
- `preview/landing-refresh` — meaningful UI surface change on
  marketing site, wanted eyes-on before merge

Direct to main (small fixes):
- All the dot removals — one-line style changes, no logic risk
- Both screenshot regen commits
- The chart-dominant spot-detail-spectral capture

## Preview branches at end of session

**`preview/labs`** — unmerged, unresolved. Three commits on it, made in
a parallel session I didn't participate in:

- `7363b3e chore: add maplibre-gl for the Labs map views`
- `6cac3da feat: add /labs dataviz section — six surf-forecast experiments`
- `ad7d27f feat: add 4 more Labs experiments — Stoke Field, Swell Bloom, Ridgeline, Swell Origin Map`

These look like a `/labs` route with six + four = ten surf-forecast
dataviz experiments built on `maplibre-gl`. The user said "I'll come
back to labs" — we did not touch, merge, or preview it. The branch is
intact at `origin/preview/labs`.

When resuming: open the preview URL for `preview/labs` (or run it
locally on that branch) to see the state. Decide: merge, iterate, or
abandon.

There's also an old-looking `origin/claude/review-surfvikings-public-xJMeK`
branch on the remote. Not touched this session, unknown provenance.

## Numbers at end of session

- **236 commits** total (+16 from session 6's 220)
- 95 Vitest tests across 10 files (unchanged — no test-worthy logic changes,
  all this session's work was UI/style + docs + screenshots)
- 52 source files (unchanged)
- ~8,630 source LOC (essentially unchanged)
- 64 spots (unchanged)

Bolinas Patch score in production still ~49 on the same conditions
where session 5 saw 32 — the spectral peak override is doing its work.

## Backlog state at end of session

By value:

1. **Labs branch decision.** Look at what's there, decide merge vs.
   iterate vs. abandon.

2. **Spectral refraction (Bolinas direction gap).** Open-ocean buoy
   reads 14.7s @ ~245° SW; LOTUS reports the same swell at the break
   as ~225° SW after Duxbury Reef refraction. Our direction is still
   incident. Closing this needs the CUDEM bathymetry pipeline that's
   been on the backlog. Significant work, high payoff for Bolinas
   specifically.

3. **Forecast-side multi-swell decomposition.** Hour 0 now reads off
   the buoy but hours 1-167 still use Open-Meteo's collapsed period.
   The model has secondary swell components
   (`secondary_swell_wave_height`, etc.) that we're not consuming.
   Wiring those through and running the same `pickDominantPeak` logic
   on the forecast side would close the gap end-to-end. Half-day work.

4. **Asymmetric size penalty + energy-weighted direction.** Existing
   scoring engine refinement.

5. **Typed `LocalRule` framework.** Waiting for more ground-truth
   observations before committing to a schema.

6. **Ground-truth rating capture UI.** Closes the loop the localNote
   field opens.

7. **Sigward Muir Beach webcam.** Still blocked on his reply.

8. **Gridded map overlays.** NOAA WaveWatch III GRIB rendering.

9. **Landing page mobile pass.** The two new FeatureSections were
   verified on desktop via Claude Preview. Mobile breakpoint of the
   Landing page — the FeatureSections use the existing flex-wrap
   layout with `useLandingNarrow()`, so they should reflow correctly,
   but haven't been eyeballed on a real phone. Low risk, worth a
   scroll-through.

10. **case-study.pdf / case-study.pptx regeneration.** The .md sources
    are up to date but the binary PDF/PPTX in `docs/` are stale. Not
    urgent unless a portfolio conversation is imminent — regenerate
    via Anthropic's docx/pptx skills when needed.

11. **Update Landing.tsx marketing copy for the website itself.** The
    session-6 arcs were surfaced but the hero + FinalCTA are unchanged.
    Might be worth another pass once the design principles from the
    dot-cleanup have settled.

## Files touched this session

Docs:
- `docs/case-study.md` — arcs 12-15 added, numbers reconciled, executive
  summary rewritten
- `docs/case-study-resume.md` — bullets updated, three principles added,
  numbers reconciled
- `docs/glossary.md` — four new sections (interaction patterns, iOS,
  master-scrub, spectral)
- `docs/technical-overview.md` — hour-0 override subsection,
  FORECAST_HOURS, scrub hooks, master-scrub state hoist
- `docs/stack.md` — cache-key version bump v1 → v3
- `docs/postmortems/2026-05-19-scrub-spectral-master.md` — created
- `docs/postmortems/2026-06-02-dot-sweep-landing-refresh.md` — this file
- `docs/screenshots/` — all 16 regenerated (2 passes)

Source:
- `src/pages/Landing.tsx` — two new FeatureSections, DataProof rework,
  FeatureGrid swap, layout tightening
- `src/components/RegionMap.tsx` — dropped MapSpotPin dot + glow attempt
- `src/components/Primitives.tsx` — added `dot?: boolean` to Stat,
  dropped four dots from VectorsPanel
- `src/components/Dashboard.tsx` — 4 Stat dots off, ◉ off GO NOW, LIVE
  indicator dot moved into text color
- `src/components/SpotDetail.tsx` — 3 Sun & Moon Stat dots off, ◉ off
  Optimal Window, Water Quality status dot removed
- No source-code changes to `hooks/`, `lib/`, or `server/` — none of
  this session's work touched data pipeline, scoring, or fetchers

Screenshots:
- `public/screenshots/` — dashboard, spot-detail, spot-detail-spectral,
  forecast, map (each .png + .webp)
- `docs/screenshots/` — 16 total (all landing, merch, dashboard,
  spot-detail set, forecast set)

Scripts:
- `scripts/gen-screenshots.mjs` — SWELL anchor for spot-detail-spectral,
  BREAKS/Map fallback selector
- `scripts/capture-screenshots.mjs` — new `anchorText`/`anchorOffset`
  view-config option, waitUntil changed to `domcontentloaded`,
  case-insensitive anchor regex

## Handoff — how to pick this up

Standard project boot:

1. Read `docs/postmortems/2026-06-02-dot-sweep-landing-refresh.md`
   (this file) — freshest state.
2. Read `docs/postmortems/2026-05-19-scrub-spectral-master.md` for
   session-6 context (drag-to-scrub + spectral peak override).
3. `docs/technical-overview.md` — current architecture.
4. `docs/glossary.md` — vocabulary specific to this project.

Then check:

- `git log --oneline main | head -20` for the recent commits
- `git branch -a` — note the unresolved `preview/labs` branch
- Backlog above ranked by value

If the user's first ask is "what's next," Labs branch decision is the
top-of-mind unresolved item; spectral refraction is the highest-value
technical work remaining.

**One design principle worth carrying forward:** colored dots and
colored text are duplicate signal — remove the dot, keep the text
tint. Documented in `Stat`'s `dot?: boolean` prop.
