# Surf Vikings — Technical Overview

A hyper-local surf forecasting PWA covering 64 NorCal spots from Salt Point to Santa Cruz. Single-user app built around Eliel's actual rotation, not a discovery platform.

## What it does

For each spot it knows the user's local optimal conditions (swell direction, size range, period, tide, offshore wind, shadow factor). For each forecast hour it computes a 0–100 score against those optimals. The dashboard surfaces the highest-scoring spot in the user's favorites as the "Top Pick," with a 48-hour quality timeline and per-metric breakdown on the spot detail page.

## How forecasts are built

Live data from public NOAA + European sources, all keyless:

- **NDBC `.txt`** — buoy standard meteorological: significant wave height, dominant period, mean direction, water/air temp where present. Each spot maps to a primary buoy + optional secondary in `src/lib/buoyMapping.ts`.
- **NDBC `.data_spec` + `.swdir`** — full energy spectrum (47 frequency bins) + per-bin direction. Parsed into 3–5 swell trains via peak-finding, plus a single wave-energy-flux number. Drives the SpectralPanel on Spot Detail and the buoy footer.
- **NOAA CO-OPS** — hourly tide predictions per spot.
- **Open-Meteo Marine + Forecast** — three separate sets of wave data (`swell_wave_*` primary groundswell, `wind_wave_*` local wind chop, combined `wave_*`), plus wind direction/speed at each spot's lat/lng. The forecast pipeline.

The merge happens in `src/server/fetchers.ts` (Vercel serverless function exposed at `/api/conditions`). The client calls it with a list of spot IDs and gets back a 48-hour timeline per spot plus the raw buoy/tide observations including spectral trains.

## Two separate fidelity layers

The pipeline distinguishes between **current observations** (high-fidelity, real spectral data, but only "now") and **forecast hours** (lower-fidelity, model-derived, looking 48 hours out):

- **Current observation** uses NDBC `.data_spec` + `.swdir` from the nearest buoy. Multiple swell trains, per-train direction, total wave energy flux. Displayed in the SpectralPanel on Spot Detail.
- **Forecast hours** use Open-Meteo's primary-by-Hs swell partition. Less precise than spectral but covers the next 48h. Displayed in the Forecast chart and ForecastHour timeline.

A user looking at "right now" sees the spectral truth. A user looking at "8pm tonight" sees the Open-Meteo forecast.

## shadowFactor applied to displayed swellHeight

Open-Meteo returns open-ocean wave height at each spot's lat/lng. For coastal-sheltered breaks like the Bolinas spots (Duxbury Reef filters incoming swell) we need to discount that height. Each spot has a `shadowFactor` (0–1) describing the fraction of open-ocean energy reaching the break.

Applied once in `hoursToTimeline` in `api.ts`, multiplying `swellHeight` by `spot.shadowFactor ?? 1.0` before scoring and before storing in `ForecastHour`. Single point of application — every downstream reader sees the shadow-adjusted value.

Discovery in the May 11 pass: `shadowFactor` had been defined per-spot since the original schema, documented as a scoring input — but was **never actually consumed** in any function. Display-only. So applying it now didn't double-count.

## Scoring model

`computeScore(spot, hour)` in `src/lib/data.ts`. Six components, each with a max contribution to a 100-point score:

- **Direction match** (30 pts): cosine-ish penalty against `spot.optimalSwell`
- **Period match** (20 pts): trapezoid window around `spot.optimalPeriod`
- **Size match** (15 pts): inverse-quadratic distance from the center of `spot.optimalSize`
- **Wind direction match** (15 pts): penalty against `spot.offshore`
- **Wind speed penalty** (-10 to 0): subtractive when wind > 12kts
- **Tide match** (10 pts + 3 bonus for rising-and-inside-band)
- **Special rules** (variable): `falling-tide-rip` is the only one currently implemented; subtracts points when conditions match a spot-specific danger pattern.

Mavericks uses a different formula (`watchOnly` flag) because it's a spectator advisory, not a "should I surf this?" signal.

## App structure

```
src/
├── lib/
│   ├── data.ts            ← Spot registry (64 spots), scoring engine, formatting helpers
│   ├── buoyMapping.ts     ← spot → buoy + tide station + NWS zone
│   ├── tokens.ts          ← color palette + scoreColor / qualityColor helpers
│   ├── api.ts             ← /api/conditions client; applies shadowFactor; ForecastHour mapping
│   └── routing.ts         ← Nominatim geocode + OSRM driving matrix (keyless)
├── hooks/
│   ├── useConditions.ts   ← stale-while-revalidate localStorage cache (v2 key)
│   ├── useDriveTimes.ts   ← per-spot drive-time matrix from home base
│   └── useLocalStorage.ts
├── server/
│   ├── handler.ts         ← /api/conditions entry: cache + dispatch to buildConditions
│   └── fetchers.ts        ← NDBC + spectral + .swdir + Open-Meteo + tide merge
└── components/
    ├── Dashboard.tsx      ← Top Pick hero card, Best Windows strip, My Spots ranked, Mavericks watch
    ├── SpotDetail.tsx     ← per-spot drilldown with 48h chart, Why-this-score, Bathymetry, Vectors, Local Intel
    ├── RegionMap.tsx      ← spot list grouped by region
    ├── Forecast.tsx       ← all-spots 48h heatmap + per-metric breakdowns
    └── Primitives.tsx     ← shared chart primitives (ScoreTimeline, ForecastChart, ScoreSpark, CompassRose, VectorsPanel, Stat)
```

## Cross-screen design rules

These are explicit principles that govern every UI decision:

1. **Green/yellow/red = quality, everywhere.** Scores and per-metric quality use the same palette via `scoreColor()` (0–100 input) and `qualityColor()` (0–1 input). Both share thresholds so a 67 score and a 0.67 quality both render as `good`.
2. **Fixed colors are non-quality identity only.** Pacific blue (`#3FB8FF`) for trend lines that aren't carrying quality signal; phosphor green (`#7EE787`) for static per-spot reference labels (Optimal swell, Offshore wind direction).
3. **Live data is dim, optimal is muted.** In the Why-this-score panel each row shows current value (white) over optimal value (dim) — the live measurement gets visual weight.
4. **By-exception UX.** Mavericks watch panel only appears on contest-grade days. Water quality alerts (when shipped) only on caution/closed states. Don't surface things that don't need attention.
5. **Set-and-forget.** Home base, favorites, units — all configured once and persisted to localStorage. No discovery, no recommendations, no daily prompts.

## Caching strategy

- **Conditions:** localStorage-backed stale-while-revalidate. Cache key includes the version (`sv:conditions:v1:`) and sorted spot IDs. 24h max-age. Reloads render the user's last real forecast on first paint, then revalidate in the background.
- **Drive times:** matrix keyed by home-base lat/lng (rounded to 4 decimals). Refetches only when home base changes — once OSRM gives us all 40 spots' drive times, we cache the whole grid in localStorage.
- **Home base coords:** geocoded once via Nominatim, cached as `{label, lat, lng}` in localStorage.

## Water quality

Five live sources merged in `src/server/waterQualityLive.ts` via a single aggregator:

- **Sonoma County Env. Health** (HTML scrape) — weekly during in-season, ~7 stations.
- **SFPUC Beach Monitoring** (undocumented JSON API at `infrastructure.sfwater.org/lims.asmx/getBeaches`) — weekly year-round, 20+ stations.
- **San Mateo County** (Google MyMaps KML with `?forcekml=1`) — weekly, 40 stations, no per-station sample date.
- **Santa Cruz County Env. Health** (ArcGIS Feature Service) — weekly with 4-tier status (Acceptable / Caution / Health Advisory / Serious Risk). Only source that can emit our `closed` tier via Serious Risk.
- **Marin County Env. Health** (ArcGIS Feature Service, endpoint provided by Marin IT after a polite email) — weekly Thursdays.

Per-spot mapping in `src/lib/waterQuality.ts`. Status tier model unified across sources: `open` (no advisory) / `caution` (advisory posted, surfers can still enter) / `closed` (physical closure). Spots with no encoded concern and no live data wired hide the water-quality panel entirely (per-exception UX, Eliel's call: "only display the card when we have data wired").

Option B precedence: when a spot has BOTH a permanent advisory (Cowells' Neary Lagoon outfall, etc.) AND a live reading, the live reading drives the colored tier. The permanent advisory text appears as year-round context when the live reading is clean.

## Forecast calendar feed

`/api/calendar.ics?spots=<id>,<id>,...` returns an RFC 5545 iCalendar feed of the next 7 days' Best Windows per spot. Users subscribe in Apple/Google/Outlook Calendar; their OS handles the notification UI (lock screen, Apple Watch, CarPlay audio). Each VEVENT has a VALARM at `TRIGGER:-PT60M` so a notification fires 1 hour before the window opens. The description text contains the conditions readout plus an autolinked deep-link URL back to the spot detail page. The URL itself IS the subscription — spot IDs in the query string, no server-side store, no accounts.

`src/server/icalendar.ts` (pure generator, 10 unit tests) handles RFC 5545 specifics: UTC formatting, CRLF endings, §3.3.11 text escapes, §3.1 line folding at 75 octets. `src/server/calendar-handler.ts` composes the timeline → events pipeline. `App.tsx` reads `?spot=<id>` on mount to land users on the right spot detail when they tap a calendar event.

## Service worker update flow

`vite-plugin-pwa` set to `registerType: 'prompt'`. `src/components/UpdateToast.tsx` uses `useRegisterSW` from `virtual:pwa-register/react` to show an in-app "New version available · Refresh" toast when the SW detects a new build. 10-minute polling so the toast appears spontaneously rather than only on reload. Note the one-time chicken-and-egg: visitors with the OLD `autoUpdate` SW won't see the toast until they reload once after the new SW deploys — there's no way to "fix" an already-installed SW from a new SW.

## What's not in the app (intentional)

- **No accounts.** Everything is local-only. Calendar subscription is the entire notification path; per-user push notifications are explicitly deferred (and probably permanently — iCal covers the actual need).
- **No metric units.** Imperial-only by design. US-focused app for NorCal surfers; threading metric through every panel for near-zero benefit is the wrong trade.
- **No discovery.** No "browse all spots" experience, no "spots you might like." The map view shows everything because it's a map, but there's no recommendation surface.
- **No editorial ratings.** Skip Stormrider stars, Surfline ratings, crowd factor, local vibe. Those are useful in apps that serve many users finding new spots — useless when you already know where you surf.
- **No social.** No comments, no photo uploads, no localism reporting. Hazards are a fixed list per spot.

## Known limitations

- **Score formula is approximate.** Particularly the `watchOnly` Mavericks path (caps size at 8ft, which is laughable for a contest spot). Mavericks watch panel works around this by gating on raw size/period/direction.
- **Bathymetry profiles are hand-curated.** Three Bolinas spots have shape data eyeballed from NOAA charts. The NOAA NCEI CUDEM pipeline (backlog item) would replace these with measured DEM samples.
- **Sources disagree sometimes.** Triangulation is documented per-spot; we trust Surfline for tide preferences (Princeton Jetty's "LOW TIDE ONLY" structured field on Stormrider reads like a copy-paste error vs the Surfline mid-high reading).
- **Scoring engine is symmetric in size + direction.** `sScore` penalizes being below `optimalSize` minimum the same as above maximum (different problems — "no waves" vs "waves too big"). `dirScore` is independent of energy magnitude (at 1.3ft, direction barely matters). Surfaced by Cowells reading 73/Fair where Surfline shows POOR for the same flat day. On the backlog as a focused scoring-engine refinement.
- **`localNote` is text-only.** `Spot.localNote?: string` field surfaces forecast-caveat text on Spot Detail (e.g., Muir Beach's "NW wind wraps around the headland..."). When enough ground-truth observations accumulate, fold into a typed `LocalRule` framework — wind-wrap, short-period-tolerance, time-of-day modulation, etc. — with structured scoring deltas instead of just descriptive text.
