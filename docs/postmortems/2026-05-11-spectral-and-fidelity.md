# Postmortem: Forecast fidelity pass + NDBC spectral decomposition

**Dates:** May 10–11, 2026
**Branch strategy:** Main + 2 preview branches (`preview/swell-plus-chop`, `preview/spectral-direction-energy-buoys`), both fast-forward merged.
**Final state:** 64 spots. Forecast pipeline reports primary groundswell separately from wind wave separately from combined sea state. Current-observation panel shows multi-train spectral decomposition with per-train direction and total wave-energy flux.

## What we set out to do

Two arcs in parallel:

1. **Continue the data pass.** When we wrapped May 9 we had 40 spots and the postmortem said "every NorCal region triangulated." But Eliel kept sending Stormrider + Surfline screenshots showing spots and sub-peaks we hadn't modeled. Closed those gaps and surfaced several real errors in already-modeled spots along the way.

2. **Close the Bolinas fidelity gap.** Eliel screenshotted Surfline showing 1.7ft @ 17s SW at Bolinas while our app showed 5.1ft @ 7s WNW for the same break. Same Pacific, completely different headline. Tracing the cause turned into a multi-commit fidelity arc.

## What we shipped

### Data: 40 spots → 64 spots

Added during this session (north-to-south):
- **Hwy 1 South** stretch: Tunitas Creek, San Gregorio, Pomponio, Pescadero, Bean Hollow, Gazos Creek
- **Santa Cruz** westside: Laguna Creek, Three Mile, Natural Bridges, Mitchell's Cove, Stockton Avenue (Weasel Reef)
- **San Lorenzo / Soquel mouth area**: The Rivermouth (San Lorenzo), Santa Cruz Harbor, 26th Avenue, Capitola Rivermouth
- **East of Pleasure Point**: Privates, Beer Can Beach
- **Sub-peak splits**:
  - Steamer Lane → The Point + Middle Peak + Indicators + The Slot (4 separate spots, each with its own swell window and tide)
  - Pleasure Point → Sewer Peak + First Peak + Second Peak + Insides (4 separate)
  - Plus added Jack's at 38th Ave as a separate spot in the Pleasure Point chain

### Real corrections caught in existing spots

These were wrong before, not refinements:

- **Año Nuevo** had `optimalSwell: 280°` (W) and `offshore: 90°` (E). Both sources clearly say S-SW swell, NE offshore, south-facing cove with hollow A-frame rights. Swapped to 225° / 45° / 'rising' tide. Same systematic NE-default-offshore bug we found on Mavericks last session.
- **Waddell** had `offshore: 45°`. Both sources say E (90°). Fixed.
- **Four Mile** was tagged `type: 'Beach'` / `bottom: 'Sand'`. Both sources clearly say right pointbreak over rock reef. Substantive misclassification — scoring was treating it as a sand beachbreak when it's a reef point.
- **Scott Creek** capped `optimalSize` at [3,8] when both sources say it holds to triple-overhead. Broadened to [3,15]. Also missing `sharkAdvisory: true`.
- **Cowells** had `optimalTide: 'high'` (Surfline explicit: low to incoming) and `optimalSwell: 200°` (both sources lead with W/NW). Misclassified as `'Beach'` when it's a pointbreak. All three fixed.

These all had the same shape: structured fields were entered hastily and contradicted the source prose. Going forward we trust prose over Stormrider's structured-field tags (precedent set with Princeton Jetty in the prior pass).

### Multi-swell decomposition (Open-Meteo)

Open-Meteo Marine already returned three sets of wave data that we were only partially using:
- `swell_wave_*` — primary groundswell only
- `wind_wave_*` — local wind-generated only (was completely unused)
- `wave_*` — combined sea state (the two stacked)

Added `wind_wave_*` to the request, exposed all three through `MarineHour → MergedHour → MergedHourWire → ForecastHour`. Bumped localStorage cache key `v1 → v2` so stale entries invalidate. The headline `swellHeight` is now explicitly the primary groundswell — the existing fallback chain in `fetchers.ts:203` was already preferring `swell_wave_*` over `wave_*`, so the per-field semantics tightened rather than changed.

The remaining limitation: Open-Meteo's "primary swell" is whichever partition is **largest by Hs**, not necessarily the cleanest long-period groundswell. Surfline's LOTUS picks groundswell by period band. This means on days with a big short-period windswell on top of a smaller clean groundswell, our `swellHeight` field reports the windswell as primary and Surfline reports the groundswell. **Spectral decomposition (below) is what actually fixes this for the current-observation panel.** The forecast pipeline still suffers this issue.

### shadowFactor applied to displayed wave height

**Discovery:** `shadowFactor` was defined per-spot in `data.ts` and documented in `docs/glossary.md` as a scoring input — but `grep -rn "shadowFactor" src/` found only **one** read site, on `SpotDetail.tsx:281` displaying it as a stat. It was never used in scoring or any other calculation. Pure documentation field.

Wired it in once in `hoursToTimeline` in `api.ts`, multiplying `swellHeight` by `spot.shadowFactor ?? 1.0` before both the scoring call and the returned `ForecastHour`. Single point of application, no double-counting risk. Sheltered spots (Bolinas at 0.55, Boneyard-shadowed coves) now display realistic at-the-break heights instead of raw open-ocean values. Scoring also gets the corrected input.

### "+chop" secondary on Spot Detail

Once multi-swell decomposition was live, added a muted secondary readout next to the Swell row on Spot Detail: `2.3 ft +1.4ft chop` when `windWaveHeight > 0.5`. Below 0.5ft of chop the addendum doesn't render — clean days stay uncluttered.

### Wind direction convention audit

The original Bolinas screenshot showed our app reading WNW for wind while Surfline read SSE — nearly opposite. Audit conclusion: **no bug**. Open-Meteo's `wind_direction_10m`, our `spot.offshore`, the `angleDelta` scoring comparison, `degToCardinal` display, and CompassRose arrow rotation are all internally consistent on meteorological "from" convention. The Bolinas disagreement was real model variance at 2-3kts (light winds have very high model uncertainty).

Locked the convention in a comment on the `Spot` interface so it doesn't get accidentally flipped later.

### NDBC spectral decomposition (`.data_spec`)

This is the biggest fidelity win in the session. NDBC publishes full energy spectrum at each buoy: 47 frequency bins from 0.0325 Hz (30.8s period) to 0.485 Hz (2.06s), 30-min cadence.

Pipeline added in `src/server/fetchers.ts`:
- `fetchSpectral(buoyId)` pulls `.data_spec` (and `.swdir`, in parallel)
- `parseSpectral()` extracts energy-frequency pairs from the header-stripped first row
- `decomposeSwellTrains()` peak-finds local maxima in the smoothed spectrum, integrates variance in a ±2-bin window, computes `Hs = 4·√σ²`, filters >0.3ft, sorts longest-period first, returns top 4
- Trains and total energy flux merged into `BuoyObservation.swellTrains` and `BuoyObservation.energyKwPerM`

Pipeline added in `src/components/SpotDetail.tsx`:
- New `SpectralPanel` between chart rows and bathymetry
- Renders each train as a row: `17.4s 1.7ft SW 222° GROUNDSWELL` (longest-period first, tagged GROUNDSWELL when ≥11s, tagged WINDSWELL when <8s)
- Energy flux in `kW/m` on the right side of the header

This closes the Bolinas mismatch for the **current observation** panel. The spectral decomposition correctly surfaces the long-period clean groundswell as the primary train, even when a bigger short-period windswell would otherwise mask it via Open-Meteo's "primary by Hs" definition.

### Wave Energy flux

Computed from spectral variance directly:
```
P (kW/m of crest) = ρ·g²·m₀·Tₑ / (16π)
```
where `m₀ = ∫S(f)df` is total variance and `Tₑ = m_{-1}/m₀` is the energy period.

Surfaced as a single number on the SpectralPanel header. Surfers read this as "how much water is moving" — a relative magnitude across all trains.

### Per-train swell direction (`.swdir`)

`.swdir` is the same format as `.data_spec` but with alpha1 mean direction at each frequency bin instead of energy. Fetched in parallel with `.data_spec`, parsed identically, and the direction at each peak bin is attached to the matching `SwellTrain`. When `.swdir` is missing (some smaller buoys don't publish it), trains degrade to direction-less but everything else still works.

### Buoy mappings: 46014 (Pt Arena) + 46214 (Pt Reyes)

NDBC publishes more nearshore buoys than we were using. Geographic-fit corrections:
- **Secrets, Timber Cove, Mystos** swapped from 46013 (Bodega Bay, 35km south) to 46014 (Pt Arena, 30km north), 46013 retained as secondary fallback
- **Point Reyes Beach, Drakes Estero** swapped from 46013 (~21km north) to 46214 (Pt Reyes, ~10km south, almost directly offshore), 46013 secondary
- Russian Rivermouth and Dillon Beach got secondary buoy upgrades (kept primaries that fit better)
- Marin spots intentionally unchanged — 46026 SF Bar Approach reads the offshore swell entering the gate, which is the right signal for Duxbury-shadowed breaks

### Tab bar + visual polish

- Renamed "Map" → "Breaks" (the existing tab was a list view, not a map)
- Replaced placeholder unicode glyphs with custom SVG icons: wave (Breaks), bars (Forecast), gear (Settings), all sharing 1.25 effective stroke weight
- Final wave icon went through several iterations (multi-path → single-stroke barrel curl) until it matched the reference Eliel sent
- Renamed favorite from `ocean-beach` → `muir-beach` per Eliel's current rotation

### Process: preview deployment workflow

Established `preview/<slug>` branch convention. Vercel auto-deploys any pushed branch to its own URL. After approval, fast-forward merge to `main` and delete the branch locally + remote.

Wrote `CLAUDE.md` at the repo root documenting:
- The branch-then-preview process
- Naming convention and the 30-char limit under `preview/` (long branch names get hashed aliases that don't match the predictable pattern)
- The `vercel redeploy` command for transient GitHub clone 500s
- What counts as "bigger" (worth a preview branch) vs trivial (ship to main)

## What didn't go well

- **`git add -A` blunder.** Early in the session I bundled 24 previously-untracked files into a spot-data commit by using `-A` instead of explicit paths. Inflated the commit to 1641 lines. Already pushed before noticing. Flagged to Eliel; from then on used targeted `git add <files>`. Lesson lodged in working memory.

- **Bolinas comparison required three rounds.** The first multi-swell + shadowFactor commits weren't visible to Eliel even after a Cmd+Shift+R because the PWA service worker was caching the old JS bundle. I had to verify the deployed bundle via `curl + grep` to prove the changes were live before realizing the issue was client-side caching, not code. The "force unregister service worker + clear site data" path is non-obvious and worth surfacing in future docs.

- **Long branch name → 63-char DNS truncation.** `preview/spectral-direction-energy-buoys` generated an alias of `surfvikings-git-preview-spectral-direction-energy-buoys-elieljohnsons-projects.vercel.app` which is over the 63-char DNS label limit. Vercel hashed the slug, the predictable URL 404'd, Eliel hit DNS_PROBE_FINISHED_NXDOMAIN. Added a warning to CLAUDE.md.

- **Two transient Vercel build failures from upstream GitHub HTTP 500s.** Not code issues. Required `vercel redeploy` to retry. Also documented.

## What's still imperfect

- **Open-Meteo's "primary swell" definition.** The forecast pipeline still picks largest-by-Hs as primary. This means days with big short-period windswell + small clean long-period groundswell will rank-order them backwards from Surfline. **The fix is the same `.data_spec` peak-finding we built for current observations, but applied to WaveWatch III forecast GRIB files — that's the gridded-map-overlays todo's pipeline (~2-3 weeks of work) plus a derived primary-swell-by-period extraction. Not in scope this session.**

- **Scoring still doesn't use multi-swell.** `computeScore` reads `swellHeight/Period/Direction` (now the primary groundswell, post-multi-swell). It ignores `windWaveHeight` and `combinedHeight`. A day with 2ft 18s + 4ft 7s windswell scores like a clean 2ft 18s day, but the surfer paddling out feels 5ft of mess. Either (a) scoring should penalize for high `windWaveHeight`, or (b) the score should explicitly read `combinedHeight` for the size component while keeping period/direction from primary. Worth thinking about.

- **Headline forecast values don't apply spectral decomposition.** SpectralPanel shows the trains for the NOW observation only. The 48h forecast chart still uses Open-Meteo's primary. So a user looking at the timeline 6 hours out is back to the "largest Hs partition wins" framing. Mitigates the value of spectral somewhat.

- **5 spots flagged for water quality** (Mitchell's Cove, The Rivermouth, 26th Ave, Capitola, Capitola Rivermouth) per their source notes. The water-quality feature is queued but not built. Until it lands, these spots could score "perfect" after a rainstorm when they're actually dirty.

## Working principles confirmed this session

- **Match Surfline's framing without copying their model.** Surfline's LOTUS is proprietary; we can't replicate it. But we can match their *information shape* — multiple swell trains, energy, direction, "what's clean groundswell vs what's chop" — using the same public NOAA data they use upstream. Spectral decomposition was the unlock.
- **Trust prose over structured tags.** Stormrider's "All Tides" / "Beginner" / etc. structured fields are frequently contradicted by their own surf descriptions. Same for Surfline's tide field on the rare occasion they put "varies" or "Beachbreak so it varies." When in doubt, parse the prose.
- **A discovery that "X isn't being used" is a real finding.** `shadowFactor` was glossary-documented as a scoring input and turned out to be display-only. Same energy as a bug fix — surface the contradiction in the commit message so future readers don't think it always worked.

## Tally at end of session

- **64 spots** total (started session at 40, ended at 64 — added 24, none removed)
- **9 fidelity commits** to the forecast pipeline: multi-swell, shadowFactor, +chop, spectral, wave energy, directional spectral, buoy mappings, plus the two docs commits
- **18 data commits** to the spot registry (mostly N→S Hwy 1 South + Santa Cruz spots and sub-peak splits)
- **2 preview branches** opened, both merged after Eliel approved
- **0 reverts** — all material commits stuck

## Backlog state at end of session

10 items pending, ranked by user value:

1. **Forecast horizon 48h → 7 days** — same Open-Meteo endpoints, just request more days; touches the forecast heatmap layout
2. **Cloud cover + precipitation** — same Open-Meteo Forecast endpoint we already call, currently-ignored fields
3. **Sunrise/sunset/moon phase** — pure local math, no API
4. **Water quality feature** — 5 spots already have notes from source triangulation; data.ca.gov CKAN backend
5. **Editable favorites on Settings** — build the Settings tab itself
6. **Wave-overlay maps in Stamen/D3 style** — 2-3 week future-release item; pipeline scope already documented
7. **NOAA NWS text forecasts** — we already map every spot to `nwsZone`, just never call the API
8. **NOAA NCEI CUDEM bathymetry pipeline** — replaces hand-curated profiles
9. **Sigward's Muir Beach webcam** — BLOCKED on email reply
10. **Push notifications** — OPEN ISSUE, decisions on auth + DB + cron still unmade

Full descriptions and implementation notes live in the working todo list — pick up where the previous assistant left off via `CLAUDE.md`.
