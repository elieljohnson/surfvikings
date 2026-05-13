# Surf Vikings — Portfolio Case Study

**Hyper-local NorCal surf forecasting, from thesis to shipped product.**

*Eliel Johnson · 2026*

![Landing page hero](./screenshots/landing-hero.png)

---

## 1. Project Snapshot

| | |
|---|---|
| **Product** | Surf Vikings — a progressive web app that scores **64 Northern California surf breaks** hour-by-hour using free public NOAA, Open-Meteo, NWS, and county-environmental-health data |
| **Domain** | [surfvikings.com](https://surfvikings.com) (marketing) · [surfvikings.com/app](https://surfvikings.com/app/) (PWA) |
| **Role** | Sole designer, engineer, product lead |
| **Surface area** | Marketing site (Landing, Merch, About, Games) + PWA (Dashboard, Spot Detail, Forecast, Region Map, Settings) + public API (`/api/conditions`, `/api/calendar.ics`) |
| **Codebase** | ~8,600 lines TypeScript/TSX across 51 source files |
| **Stack** | Vite + React 18 + TS · react-router-dom v7 · vite-plugin-pwa · Vercel Edge Functions · Vitest · Playwright + Sharp · DreamHost email |
| **Data sources** | 100% free public data — NDBC spectral + standard met buoys, Open-Meteo marine, NOAA CO-OPS tides, NOAA NWS coastal-waters forecast text, plus **5 live county water-quality feeds** (Sonoma, SFPUC, San Mateo, Santa Cruz, Marin) |
| **Tests** | 88 Vitest tests covering scoring, parsers, time math, calendar generation |
| **Status** | Live on custom domain with Let's Encrypt TLS, **203 commits**, installable PWA, weekly-refreshing water-quality + 7-day forecast |

---

## 2. The Thesis

Surfline is a national tool. A NorCal surfer's real question isn't *"what are the conditions?"* — it's *"which of my 6 favorite breaks, at what hour in the next 7 days, is worth the drive, and is the water clean enough to paddle out?"*

Every break has its own bathymetry, swell shadow, tide dependency, and wind exposure. Existing tools surface the same NOAA numbers at every spot. Surf Vikings encodes the **local knowledge that turns data into a decision** — and it pulls that local knowledge from real surfers on the water, not just NOAA buoys.

**Product thesis:** a ranked, scored, time-windowed recommendation engine with three things no other surf app has put together: (1) per-spot scoring built on encoded local geometry, (2) live county-level water quality merged into per-spot detail pages, and (3) a structured way to capture and iterate against ground-truth surfer feedback.

**Brand thesis:** the Norse didn't wait for perfect conditions — they read the water and went. The app is for surfers who think the same way: committed, local, always looking for the next session.

---

## 3. Arcs of Work

The project moved through eleven arcs across five sessions, each illustrating a different engineering, design, or product principle.

### Arc 1 — Forecast engine & PRD

Started with a [PRD](./PRD.md) defining six coastal regions (Sonoma → Santa Cruz), mapping each to a primary NDBC buoy + NOAA tide station, and spec'ing a scoring algorithm that weights swell height, period, direction, wind speed, wind direction, and tide height against per-spot optimal parameters.

**Engineering principle: model the domain before writing the UI.** The `Spot` type (`src/lib/data.ts`) carries ~14 fields per break including `optimalSwell` (degrees), `offshore` (degrees), tidal range preference, skill floor, `shadowFactor` (fraction of open-ocean energy that reaches the break), `sandMobility` (rate of bottom-contour change), `specialRules` (per-spot scoring exceptions), and `localNote` (ground-truth caveat). The scoring engine (`computeScore`) is pure, deterministic, testable — takes a `Spot` + `ForecastHour` and returns a 0–100 score.

![Dashboard — live greeting, real buoy data, scored forecast](./screenshots/dashboard.png)
*Dashboard: live clock, time-aware greeting with tap-to-edit affordance, real NDBC buoy air temp, real wind from the top-ranked favorite, scored 7-day forecast for Bolinas · The Patch from Open-Meteo marine data + the local scoring engine.*

### Arc 2 — Live data integration

Replaced mock data with real NDBC buoy feeds, Open-Meteo marine forecasts, and NOAA tide predictions. Built `src/server/fetchers.ts` to pull from upstream APIs in parallel via `Promise.all`, merge into 7-day hourly timelines, and cache server-side.

**Engineering principle: graceful degradation > perfect uptime.** The `useConditions` hook renders a synthetic mock timeline on first paint so the UI is never empty, then swaps in live data when the fetch resolves. If the fetch fails, the mock stays on screen and a `STALE` badge appears — the user always sees *something* coherent.

### Arc 3 — Design system & visual language

A dark, monospace-accented aesthetic inspired by instrumentation — BUOY IDs, data badges, timestamp labels all in JetBrains Mono. Quality scale went through four iterations before landing on a 7-tier system where **teal represents "Epic"** and a **yellow floor** communicates "Fair" without ever reading as red/green stoplight.

**Design principle: color conveys quality, not state.** Red/green is the lazy default — it carries medical-emergency connotations and flattens nuance. The palette uses phosphor → teal → lime → amber → peach across 7 quality tiers, each paired with a numeric score so color is reinforcement, never the sole signal.

### Arc 4 — Merch storefront with bot-challenge scraper

Built the `/merch` page by scraping 22 products from `surfvikings.printful.me`. First attempt (curl) returned 403 — Cloudflare bot challenge. Second attempt (Playwright `context.request.get()`) also 403 — browser context doesn't share challenge cookies between hostnames for the `request` API.

**Solution:** `page.goto(imageUrl)` runs in the authenticated Chromium page context and bypasses the per-hostname challenge correctly. Each product image is downloaded through the page context, piped through Sharp (resize 600px, WebP q82), written to `public/merch/`.

**Engineering principle: when the platform fights you, route through what the platform already trusts.** Cloudflare trusts a real Chromium session that has solved the challenge. Using `page.goto()` turns the scraper into a legitimate-looking browser client without implementing challenge-solving from scratch.

![Merch grid — categorized product layout](./screenshots/merch-grid.png)
*Categorized product grid: Apparel → Headwear → Surf Gear → Beach → Accessories → Stickers. Six categories, 23 products, each card linking to its canonical Printful detail page.*

### Arc 5 — Domain migration

Migrated the legacy surfvikings.com from DreamHost shared hosting to Vercel while **preserving email routing** at the domain. The snag: DreamHost's "Fully Hosted" mode auto-generates `@` and `www` A records that can't be edited. Solved by removing the website (keeping email) → domain flipped to "DNS Only" → custom A records became editable. Added `A @ 76.76.21.21` and `A www 76.76.21.21` (Vercel's anycast IP). Verified via `dig` + `curl -sI`.

**Engineering principle: decouple orthogonal concerns.** Web hosting and email hosting are independent services that happen to share a domain. Detaching one without touching MX records kept email flowing through DreamHost while web traffic redirected to Vercel — zero-downtime migration.

### Arc 6 — Dashboard personalization (the "living header")

Replaced hardcoded header copy with real data: minute-aligned ticking clock, time-aware greeting (Dawn patrol / Morning / Afternoon / Evening / Night), localStorage-backed name + home base, real buoy air temp, top-spot wind, inline editing.

**Critical iOS PWA fix:** `window.prompt()` is silently suppressed when the app runs in Home Screen standalone mode. Refactored to inline `<input>` swap via conditional render. Added `enterKeyHint="done"`, `autoComplete="off"`, `autoCorrect="off"`, `spellCheck={false}`. Works identically in browser, PWA, in-app WebView.

**Engineering principle: platform affordances over platform APIs.** `window.prompt()` is a platform API that's inconsistently supported across WebKit contexts. An inline `<input>` is a platform *affordance* that works identically everywhere. When a built-in API fails on a subset of targets, inline the behavior — don't feature-detect and polyfill.

### Arc 7 — Forecast fidelity push (the Bolinas reckoning)

Eliel screenshotted Surfline showing **1.7ft @ 17s SW** at Bolinas while our app showed **5.1ft @ 7s WNW** for the same break, same hour. Same Pacific, completely different headline. Multi-commit arc to close the gap:

- **Multi-swell decomposition** — Open-Meteo returns three separate datasets per hour: `swell_wave_*` (primary groundswell), `wind_wave_*` (local chop), combined `wave_*`. We were averaging them and reporting one number. Split into three, surfaced primary groundswell as the "real" wave height, chop as a secondary `+chop` readout.
- **NDBC spectral decomposition** — pulled `.data_spec` files (47 frequency bins) + `.swdir` (per-bin direction). Built a peak-finding algorithm that identifies multiple swell trains per buoy and computes per-train direction + total wave energy flux. Surfline's "Individual Swells" panel, ours: same shape.
- **`shadowFactor` per spot** — open-ocean swell loses energy refracting around headlands. Bolinas sits at ~0.45-0.55 because Duxbury Reef filters incoming groundswell. Calibrated this fraction for every spot from Salt Point through HMB based on coastal geometry. (See Arc 10 for the systemic SC version.)
- **NOAA NWS coastal-waters forecast text** — the agency narrative that pairs with the spectral numbers. Marine zone PZZ540/545/560/565 per spot. Parsed the multi-period text product, surfaced on Spot Detail as the forecast-narrative panel.

**Engineering principle: fidelity beats coverage when the numbers are wrong.** Adding more spots wouldn't have fixed the 5.1 vs 1.7 disagreement — the model had to start representing the physics correctly.

### Arc 8 — Water quality (the moat no surf app has crossed)

No other surf app surfaces water quality on a per-spot basis. Bacterial monitoring data is published by individual county health departments, in different formats, with different status taxonomies, on different cadences. Aggregating it is annoying enough that nobody has done it for surfers. Did it anyway.

**Five live sources merged in `src/server/waterQualityLive.ts`:**

| County | Format | Cadence | Stations | How we got the data |
|---|---|---|---|---|
| Sonoma | HTML scrape of public results page | Weekly Apr–Oct | ~7 | Public web page |
| SFPUC (SF) | Undocumented JSON API | Weekly year-round | 20+ | Found by reading the public map's JS source |
| San Mateo | Google MyMaps KML (`?forcekml=1`) | Weekly | 40 | Public MyMaps feed |
| Santa Cruz | ArcGIS Feature Service | Weekly with 4-tier status | ~50 (21 surf-relevant) | Public REST endpoint |
| Marin | ArcGIS Feature Service | Weekly Thursdays | 31 | **Polite email to Marin County IT** |

The Marin story is worth telling. Marin's web page is behind Cloudflare's JavaScript bot challenge — even a Chrome User-Agent gets 403'd from a serverless function. After shipping a stopgap manual-screenshot fixture, I emailed Marin Environmental Health asking for an automated path. Three ranked options: User-Agent whitelist, existing data feed, or weekly email/CSV. Two responses within hours from different teams: Natalya Beckman (EHS) pointed at the open data portal (Socrata); Daniel Myers (Marin IT, Advanced Systems Engineer - Data) provided a direct ArcGIS Feature Service URL with daily Thursday refresh. Wired the ArcGIS endpoint same-day. Retired the screenshot fixture.

**Status tier unified across all five sources:** `open` (no advisory), `caution` (advisory posted — surfers can still enter at own risk), `closed` (physical closure). The water-quality panel only renders when the spot has either an encoded year-round concern OR a wired live source. Per-exception UX: silent when nothing to report.

**Option B precedence:** spots with both a permanent advisory AND a live reading let the live reading drive the colored tier. The permanent advisory text becomes year-round context that surfaces in copy when the live reading is clean.

**Engineering principle: the polite email path works.** Two real data sources from two different teams at the same county within 24 hours. Worth attempting before assuming a wall is permanent. The technical fix (whitelist, API, CSV) is often less effort for the data team than for us to build a Playwright bypass.

### Arc 9 — Forecast calendar feed (push notifications without the infrastructure)

Original backlog item was "push notifications for epic forecast windows." The implementation footprint: auth + DB + Vercel Cron + service-worker push registration. Multi-day project. The reframe that landed:

A surf app's notification need is mostly *"tell me tomorrow morning about the good window,"* not *"alert me in real time when conditions cross threshold."* Driving to the coast already takes 30+ minutes; the sub-hour-precision case doesn't exist in practice. That suggested **iCal calendar subscription** instead of Web Push:

- **No subscription store.** The `.ics` URL itself IS the subscription — spot IDs in the query string. Server never knows who's subscribed.
- **No iOS PWA-install friction.** Web Push requires installing the PWA to home screen first. iCal subscription works in Safari without that step.
- **No notification UI to maintain.** Calendar apps already deliver to Apple Watch, CarPlay, lock screens, dock badges. We just author events.
- **Privacy story intact.** No DB, no accounts, nothing identifying server-side.

Implementation: `/api/calendar.ics?spots=<id>,<id>,...` returns RFC 5545 iCalendar with one VEVENT per forecasted Best Window. Each carries a VALARM at `TRIGGER:-PT60M` (60-min pre-event notification), a description with conditions readout, and a deep-link URL back to the spot detail page. `App.tsx` reads `?spot=<id>` on initial mount to land calendar-tap users on the right spot detail, not the dashboard.

Two subtle bugs caught during validation, both worth preserving as learnings:
- **`webcal://` vs `webcals://`:** I confidently shipped `webcals://` (with the S) thinking it was the "secure" variant. macOS Calendar doesn't register a handler for it — falls through to Safari, opens a blank page. Plain `webcal://` is the only scheme Calendar dispatches on. Reverted after Eliel's screenshot caught the error.
- **Event anchor mismatch:** Event timestamps were anchored on `wire[0].t` (Open-Meteo's past-days history start) while peak labels used `Date.now()`. Drift produced events showing "Wed 7-11AM" with notes claiming "Peak at F 4pm." Fixed by unifying both on `Math.floor(Date.now() / 3600_000) * 3600_000` (current hour rounded down) and formatting peak time via `Intl.DateTimeFormat` in `America/Los_Angeles`.

**Product principle: reframe the requirement before building the infrastructure.** The actual user benefit was "wake me up before tomorrow's epic window" — solvable with a calendar event, no auth required.

### Arc 10 — Local feedback loop (ground-truth from real surfers)

The breakthrough that distinguishes Surf Vikings from every other surf app: **systematic capture of ground-truth observations from surfers on the water.**

**Trigger 1 — Muir Beach:** Eliel's son's surf team came back from a session and reported "about a 6/10 today." Our model said 5.5/10 at the time they left. Close, but the systematic miss was the cove-wrap effect — NW afternoon wind deflects off Mt Tam and arrives in the cove from the NE, becoming offshore. The model has no hour-of-day awareness and no spatial wind transformation logic.

**Trigger 2 — Cowells:** Eliel screenshotted Cowells reading 89/100 ("GOOD") in our app while Surfline showed POOR with 0-1ft surf height. Investigation: the entire 24-spot Santa Cruz cluster had no `shadowFactor` set. All defaulted to 1.0 — meaning the model treated raw open-ocean buoy data as if it arrived intact at each break. Reality: Cowells sits in a deep lee behind Lighthouse Point; only 25-35% of incoming swell energy reaches it.

**Two structural responses:**

**(a) `Spot.localNote` — architectural seed for ground-truth knowledge.** A typed `string` field surfacing as a "Forecast note" callout on Spot Detail. First entry, for Muir Beach: *"NW wind wraps around the headland and arrives in the cove as offshore. Short-period wind swell refracts in. Forecast may underestimate conditions on NW-wind afternoons."* The score stays accurate to what the model can compute; the note tells experienced surfers what the model can't see, so they can calibrate up or down based on local knowledge.

**(b) 24-spot Santa Cruz `shadowFactor` calibration.** Per-spot values calibrated against coastal geometry — Steamer Lane's outside peak at 0.90 (fully exposed point), Cowells at 0.30 (deep shadow behind Lighthouse Point), Capitola at 0.35 (sheltered cove inside Soquel). Wrote a Python script to inject the values, cleaner audit trail than 24 individual edits. After the sweep, Cowells dropped from 89 → 73 on the same current conditions. Still higher than Surfline's POOR, but the residual now traces to two clean scoring-engine issues (asymmetric size penalty, energy-weighted direction) rather than a missing input.

**The framework this points toward:** when 5+ similar observations accumulate across spots, fold `localNote` into a typed `LocalRule` union — `{ type: 'wind-wrap'; hourRange; fromDirection; rotateBy; description }`, `{ type: 'short-period-tolerance'; reduction; description }`, etc. Rules influence the score AND surface in a "Why this score" UI. Ground-truth rating capture (planned: small "Rate this session" form logging `{ spotId, dateISO, modelScore, userRating }` to localStorage) builds the dataset that calibrates the rules.

**Product principle: build the loop, not the answer.** A model that improves from feedback beats a model that's perfect at v1. The `localNote` field is one text-only line of TS; the framework it seeds is the actual feature.

### Arc 11 — Settings honesty + service-worker update toast

The Settings page used to display six interactive controls; **none of them** did anything outside the component. Confirmed via grep: the `useState` variables (`units`, `notifyEpic`, `notifyMavs`, `minScore`) appeared nowhere else in `src/`. Toggles toggled, sliders slid, but nothing was persisted or read by any other view.

**Stripped the lies.** Imperial/Metric was killed (US-focused app, will never thread metric through every panel for near-zero benefit). Mavericks watch toggle removed (no push delivery path). Epic window alerts toggle removed (replaced by the calendar feed). What remains is real: min-score threshold filters dashboard chips, favorites editor persists to localStorage with per-region collapsed UI, home base is editable via inline edit with background geocode + status feedback (loading / error states), forecast calendar group has subscribe buttons.

**Engineering principle: when an affordance lies, fix the affordance, not the lie.** Multiple Settings controls got deleted or replaced rather than papered over. Honest disclosure beats over-claim.

**The PWA update toast** addressed a real problem: every commit ended with "hard reload to bypass the service worker." `vite-plugin-pwa` was set to `registerType: 'autoUpdate'`, which downloads new SWs silently but waits to activate until all tabs close. Users keeping the app pinned never saw updates. Switched to `'prompt'`, built a `<UpdateToast/>` component using `useRegisterSW` from `virtual:pwa-register/react`. 10-minute polling so the toast appears spontaneously when a deploy lands, not just on reload. Validated end-to-end after a chicken-and-egg lesson: the OLD SW serves the OLD bundle (with no toast component), so the new behavior takes effect one deploy after it lands.

---

## 4. Cross-Cutting Engineering & Product Principles

Pulled out from the arcs above, because they show up repeatedly and are the most portable takeaways.

### 4.1 Model the domain before writing the UI
The `Spot` type carries 14 fields and the scoring engine is pure and deterministic before any component renders. UI becomes a view over a well-shaped model — not the place where business logic accretes.

### 4.2 Graceful degradation by default
Three-state rendering (`cached | mock | stale`) means the UI is never empty, never throws, never leaves the user staring at a spinner.

### 4.3 Color conveys quality, not state
A 7-tier palette paired with numeric scores carries more information with less cognitive load and reads correctly across color-vision profiles.

### 4.4 When the platform fights you, route through what the platform trusts
Cloudflare trusts a real Chromium session. `page.goto()` is a trusted entry point. Bypassing wasn't the goal — *being a legitimate client* was, and the platform's trust path was already there.

### 4.5 Decouple orthogonal concerns
Web and email hosting are different services that happen to share a domain. DNS records are the seam. Same shape on the API side: `/api/conditions` and `/api/calendar.ics` share the forecast pipeline but expose different surface area.

### 4.6 Platform affordances over platform APIs
`window.prompt()` is convenience that's inconsistently supported. An inline `<input>` works everywhere. When an API fails on a subset of targets, inline the behavior.

### 4.7 Editorial systems, not editorial content
Merch product copy lives in a mapping table that survives scraper re-runs. Same pattern as a CMS, without the CMS.

### 4.8 Fidelity beats coverage when the numbers are wrong
Adding more spots wouldn't have fixed Bolinas reading 5.1ft @ 7s when reality was 1.7ft @ 17s. The model had to start representing wave physics correctly first. Spectral decomposition + `shadowFactor` + multi-swell separation closed the gap.

### 4.9 The polite email path works
Two real data sources from two different teams at the same county within 24 hours. Worth attempting before assuming a wall is permanent. Email cost: 15 minutes. Engineering cost of building a headless-browser bypass: days of fragile code.

### 4.10 Reframe the requirement before building the infrastructure
"Push notifications" was a multi-day infrastructure project. "Subscribe to a calendar feed" delivered the same user benefit with zero new infrastructure, no accounts, no DB, no Vercel Cron. The reframe came from asking what the actual user goal was, not what the original ticket said.

### 4.11 Build the loop, not the answer
A model that improves from ground-truth feedback beats a model that's perfect at v1. The `localNote` field is one line of TS; the framework it seeds — typed `LocalRule` system + ground-truth rating capture — is the actual feature.

### 4.12 When an affordance lies, fix the affordance, not the lie
Imperial/Metric was killed instead of finished. Mavericks watch was removed instead of stubbed. Epic window alerts became a real calendar feed. Honest disclosure beats over-claim.

### 4.13 Iterate in commits, not in branches
203 commits, mostly linear, with preview branches only for features that needed external review (favorites editor, calendar feed, SC shadow sweep). Small focused commits beat long-lived feature branches for a solo project shipping to production.

---

## 5. Technology Stack

```
┌─ Frontend ──────────────────────────────────────────────┐
│  Vite 5 · React 18 · TypeScript 5                        │
│  react-router-dom v7 (SPA)                               │
│  vite-plugin-pwa (service worker, manifest, installable) │
│  Inter + JetBrains Mono (Google Fonts)                   │
│  Inline CSS-in-JS via React style prop                   │
│  useRegisterSW (in-app refresh-toast pattern)            │
│  SunCalc (sunrise/sunset/moon-phase computation)         │
└──────────────────────────────────────────────────────────┘

┌─ Testing & Tooling ─────────────────────────────────────┐
│  Vitest (88 tests, runs in CI on every push)             │
│  TypeScript strict mode (tsc --noEmit before deploy)     │
│  Playwright (chromium) + Sharp for image pipeline        │
│  Node scripts/ for content generation                    │
└──────────────────────────────────────────────────────────┘

┌─ Server / Edge ─────────────────────────────────────────┐
│  Vercel Edge Functions                                   │
│    /api/conditions    forecast + buoy + tide + water Q   │
│    /api/calendar.ics  RFC 5545 iCal feed of best windows │
│  Pure RFC 5545 generator (no library)                    │
│  In-memory edge cache + Cache-Control headers            │
└──────────────────────────────────────────────────────────┘

┌─ Forecast Data Layer ───────────────────────────────────┐
│  NDBC standard met (.txt) — buoy headline numbers        │
│  NDBC spectral (.data_spec + .swdir)                     │
│    47 frequency bins → multi-train decomposition         │
│    + total wave energy flux                              │
│  Open-Meteo Marine — swell_wave_*, wind_wave_*, wave_*   │
│  Open-Meteo Forecast — wind, cloud, precip, air temp     │
│  NOAA CO-OPS — hourly tide predictions per spot          │
│  NOAA NWS Coastal Waters Forecast text — PZZ zones       │
│  Per-spot scoring engine (pure TS, 88 tests)             │
└──────────────────────────────────────────────────────────┘

┌─ Water Quality Layer (5 county sources) ────────────────┐
│  Sonoma County EH       HTML scrape                      │
│  SFPUC                  undocumented JSON API            │
│  San Mateo County       Google MyMaps KML                │
│  Santa Cruz County EH   ArcGIS Feature Service (4-tier)  │
│  Marin County EH        ArcGIS Feature Service (via      │
│                         polite email to Marin IT)        │
│  Aggregator: unified open/caution/closed status model    │
└──────────────────────────────────────────────────────────┘

┌─ Infrastructure ────────────────────────────────────────┐
│  Hosting: Vercel (auto-deploy from main)                 │
│  DNS: DreamHost "DNS Only" mode                          │
│  TLS: Let's Encrypt (auto)                               │
│  Email: DreamHost (unchanged through migration)          │
│  Domain: surfvikings.com                                 │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Artifact Gallery

### 6.1 In the repo

| Artifact | Location | What it shows |
|---|---|---|
| PRD | `docs/PRD.md` | Product thesis, personas, regional architecture, scoring formula |
| Postmortems | `docs/postmortems/` | Three multi-page session writeups — data pass, spectral fidelity, settings/calendar/Marin/shadow/SW |
| Dashboard | `src/components/Dashboard.tsx` | Main PWA screen — greeting, stats strip, top pick, ranked spots, min-score filter |
| Spot Detail | `src/components/SpotDetail.tsx` | 7-day forecast, score breakdown, conditions, water quality, spectral panel, Local intel + Forecast note |
| Forecast | `src/components/Forecast.tsx` | 7-day hourly timeline, multi-metric quality breakdown, best-window detection |
| Region Map | `src/components/RegionMap.tsx` | Coastline view with per-spot scoring |
| Settings | `src/components/Settings.tsx` | Favorites editor, min-score, home base inline edit, calendar subscribe |
| Update toast | `src/components/UpdateToast.tsx` | In-app SW refresh prompt with 10-min polling |
| Scoring engine | `src/lib/data.ts` | `computeScore()`, `findBestWindows()`, `swellDirectionQuality()` |
| Water quality aggregator | `src/server/waterQualityLive.ts` | 5-source merge with unified status model |
| iCalendar generator | `src/server/icalendar.ts` | Pure RFC 5545 emitter with 10 unit tests |
| Calendar handler | `src/server/calendar-handler.ts` | Edge function composing forecast → VEVENT pipeline |
| Spectral decomposition | `src/server/fetchers.ts` (parseSpectral) | Peak-finding over 47 NDBC frequency bins |
| Scraper pipeline | `scripts/fetch-merch.mjs` | Playwright + Sharp + editorial merge |
| Persistent state | `src/hooks/useLocalStorage.ts`, `useFavorites.ts` | Generic localStorage hook + favorites accessor |

### 6.2 Visual assets

- `public/screenshots/dashboard.webp` — PWA dashboard (mobile)
- `public/screenshots/map.webp` — region map view
- `public/screenshots/spot-detail.webp` — forecast detail
- `public/merch/*.webp` — 23 Printful products, optimized
- `public/hero-surfer.webp` — landing page hero image
- `docs/screenshots/` — Playwright-captured marketing screenshots

---

## 7. Metrics & Outcomes

| | |
|---|---|
| **Commits** | **203** on `main` |
| **Lines of code** | **~8,600 TS/TSX** across 51 source files |
| **Tests** | **88** Vitest cases — scoring, parsers, time math, calendar generation, RFC 5545 escaping |
| **Surf spots modeled** | **64** across 7 regions (Sonoma → Santa Cruz) |
| **Forecast horizon** | **7 days, hourly** |
| **Live data sources** | **8 public APIs** — NDBC standard + NDBC spectral + NOAA CO-OPS + Open-Meteo Marine + Open-Meteo Forecast + NOAA NWS CWF + 5 county water-quality endpoints |
| **Water quality coverage** | **5 county health departments** — Sonoma, SFPUC, San Mateo, Santa Cruz, Marin |
| **Best-window detection** | Calendar feed at `/api/calendar.ics` with per-event deep-links + VALARM triggers |
| **PWA install rate** | iOS + Android home screen install, edge-cached from SFO, ~30s deploy-to-live |
| **Third-party JS deps** | 4 (React + react-router + vite-plugin-pwa + SunCalc) |
| **Hosting cost** | $0 (Vercel hobby tier) |
| **Data cost** | $0 (all public APIs) |
| **Documentation** | 3 postmortems, technical-overview, stack, glossary, water-quality-sources — all current |

---

## 8. Reflection

### What worked

- **PRD first, code second.** The regional architecture + scoring formula in the PRD meant every component had a clean model to render. Business logic never leaked into JSX.
- **Mock-first rendering.** Three-state `useConditions` meant the UI was useful before APIs were wired and resilient when they failed.
- **Ground-truth as a typed seed, not a feature.** `Spot.localNote` shipped as one line of TypeScript. The framework it points toward — typed `LocalRule` system, ground-truth rating capture, calibration loop — will inherit a working pattern instead of being designed in a vacuum.
- **Civic API outreach.** Two county data teams responded within hours to a polite email asking for an automated path. Worth attempting before assuming a wall is permanent.
- **Reframe the user goal, not the ticket title.** "Push notifications" became "subscribe to a calendar feed" without changing the user benefit. Saved a multi-day infrastructure build.
- **When an affordance lies, fix it or remove it.** The Settings honesty pass deleted three controls that didn't do anything and made the remaining ones actually do things. Smaller surface, more honest.

### What I'd do differently

- **Tests earlier.** The scoring engine is pure and deterministic — perfect Vitest territory. We bootstrapped Vitest mid-project and now have 88 cases, but I should have written the suite alongside the original PRD.
- **Source maps on by default during development.** Production sourcemaps leak source structure and shouldn't ship long-term, but enabling them temporarily for a single deploy to diagnose a real bug should have been a smoother flip.
- **Calibrate `shadowFactor` for all regions from the start.** The SC sweep happened only after a screenshot caught Cowells over-scoring at 89/100. The Bolinas calibration that established the technique was done months earlier — extending it to the rest of the coast was sitting on the todo list and got pushed by data work.

### What's next

- **Scoring-engine refinement** — asymmetric `sScore` (below-min penalty steeper than above-max) and energy-weighted `dirScore` (direction only counts when there's wave energy to differentiate). Surfaced by the Cowells residual after the shadow sweep.
- **Ground-truth rating capture UI** — small "Rate this session" form on Spot Detail logging `{ spotId, dateISO, modelScore, userRating, note }` to localStorage. Builds the dataset for the LocalRule framework.
- **Typed LocalRule framework** — once 5+ ground-truth observations accumulate, fold `localNote` into structured scoring deltas with a "Why this score" UI surfacing each rule that fired.
- **NOAA NCEI CUDEM bathymetry pipeline** — replace hand-tuned `shadowFactor` with computed values from real bathymetric data.
- **Gridded map overlays** — NOAA WaveWatch III GRIB data rendered as particle-flow animation across the coastline.

---

## 9. Presentation-Ready Executive Summary

> **Surf Vikings** is a hyper-local NorCal surf forecasting PWA I designed, engineered, and shipped solo across 203 commits. It scores **64 NorCal breaks** hour-by-hour over a 7-day horizon by encoding per-spot bathymetry, swell shadow, wind exposure, and tide dependency, then merging in **live water-quality data from 5 county health departments** — a layer no other surf app surfaces. The product moved beyond pure NOAA aggregation into a **closed-loop feedback system**: real surfers on the water report ground-truth ratings, and structured per-spot caveats (`localNote` field) capture what the static model can't see. A polite email to Marin County's IT department unlocked an ArcGIS Feature Service that replaced a manual screenshot fixture overnight — civic API partnership as a competitive moat. The calendar feed at `/api/calendar.ics` delivers per-spot forecast notifications via every OS's native calendar app, sidestepping push-notification infrastructure entirely. Built on free public data (NOAA NDBC spectral buoys, Open-Meteo Marine, NOAA CO-OPS, NWS Coastal Waters Forecast, plus the 5 county water-quality endpoints), with ~8,600 lines of TypeScript across 51 source files, 88 Vitest tests, and 4 third-party JS dependencies. Zero-downtime migrated from legacy DreamHost shared hosting to Vercel with email continuity preserved. Installable PWA with in-app update toast, served from SFO edge. $0 hosting, $0 data, 100% local intelligence.

---

*Built by Eliel Johnson · [surfvikings.com](https://surfvikings.com) · [github.com/elieljohnson/surfvikings](https://github.com/elieljohnson/surfvikings)*
