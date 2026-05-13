# Postmortem: Settings overhaul, calendar feed, Marin live data, SC shadow sweep, SW update toast

**Date:** May 12, 2026
**Branch strategy:** Mostly straight-to-main for small UI tweaks; preview branches for the four bigger features (`preview/settings-cleanup`, `preview/settings-favorites`, `preview/wq-marin-live`, `preview/sc-shadowfactor`, `preview/ical-calendar`, `preview/sw-update-toast`). All fast-forward merged.
**Final state:** 64 spots. 5 live water-quality sources (Sonoma HTML, SFPUC JSON, San Mateo KML, Santa Cruz ArcGIS, Marin ArcGIS — Marin replaced an earlier manual screenshot fixture). New `/api/calendar.ics` feed lets users subscribe in Apple/Google Calendar and get OS-native notifications before each forecasted peak. Settings is no longer a wall of lies — every control persists to localStorage and actually does something. Favorites are editable. Service-worker updates surface as an in-app toast within ~10 min of any deploy. SC shadowFactor calibrated for all 24 spots, closing a systemic over-scoring gap.

## What we set out to do

Six separate arcs ran in one long session, each with its own preview branch where it mattered:

1. **Settings honesty pass.** The page was a v1 mockup. Toggles toggled, sliders slid, but nothing was persisted or read by any other component. "Mavericks watch" and "Epic window alerts" were promises with no delivery path. Imperial/Metric switched a number in memory and immediately threw it away. Strip the lies; wire the controls that should work; kill the rest honestly.

2. **Editable favorites.** Static `FAVORITES = [...]` in `data.ts` couldn't be edited by visitors. Build a real per-region toggle UI in Settings, persist to localStorage, swap Dashboard/Forecast consumers to use the live list, handle empty-favorites empty states.

3. **Wire Marin live water quality.** Yesterday we shipped a manual screenshot fixture as a stopgap because Marin's web page is Cloudflare-blocked. Eliel sent a polite email to Marin EH; they responded within hours with a real public ArcGIS Feature Service. Replace the fixture, retire the weekly screenshot ritual.

4. **iCal forecast calendar feed.** Original ticket was "push notifications." Settled on iCal calendar subscription instead: zero infra (no DB, no auth, no Vercel Cron), works on every device including iOS without "add to home screen," delivers OS-native notifications via the calendar app. Each VEVENT carries the forecast detail in the description + a deep-link URL back to the spot detail page.

5. **Capture local ground-truth as a typed field.** Eliel's son's surf team reported Muir Beach at 6/10 while our model said 5.5. The systematic miss was the cove-wrap effect (NW wind deflects off Mt Tam, arrives in the cove as offshore). Encode this as a `localNote` text field that surfaces on Spot Detail as a "Forecast note" callout. Architectural seed for a future typed `LocalRule` framework once we have more ground-truth observations.

6. **Close the SC shadowFactor gap.** Eliel screenshotted Cowells reading 89/100 in our app while Surfline showed POOR with 0-1ft surf. Investigation: the entire 24-spot SC cluster had no `shadowFactor` set — defaulting to 1.0, meaning the model was treating raw buoy data as if it arrived intact at each break. We did this work for Bolinas back in May during the spectral push; the SC half of the coast just never got the same treatment.

7. **PWA service-worker update toast.** Every deploy in this session ended with "hard reload to bypass the SW." That's friction we were working around for ourselves; interviewers and casual visitors don't know to hard-reload. Switch from `autoUpdate` (silent, waits for tab close) to `prompt` (in-app toast with a Refresh button). Plus a 10-min polling interval so the toast appears spontaneously when a deploy lands, not just on reload.

## What we shipped

### Settings overhaul (~half-dozen commits, `preview/settings-cleanup` + `preview/settings-favorites`)

The page used to display six interactive controls; **none of them** had any effect on the rest of the app. Confirmed via grep: the `useState` variables in `Settings.tsx` (`units`, `notifyEpic`, `notifyMavs`, `minScore`) appeared nowhere else in `src/`.

What's now real:

- **Min score threshold slider** — persists to `sv:minScore` (default 25 for new visitors, intentionally low so interviewers see populated chips). Dashboard's "My Spots · Ranked" rows and Best Windows strip filter by it. Top Pick always shows regardless. Header shows "3/5 · hiding 2 below 33" when filter is active. Empty state when only Top Pick survives. Slider range opened up to 0–100 from the original 30–85.
- **Forecast calendar group** — replaces the lying Epic Window Alerts toggle. Collapsed-by-default; expands to reveal Apple Calendar / Google Calendar / Copy link buttons + the full URL. See iCal section below.
- **Favorites editor** — collapsed-by-region (Sonoma → Pt Reyes → Marin → SF → SM-North → SM-South → SC, north-to-south the way surfers actually think about the coast). Region headers show `X/Y favorited` + chevron; tap to expand the spot list with checkboxes. Region label + count render bolder + pacific-colored when at least one spot is favorited so users can scan the page and see where their picks live. "Reset to defaults" link appears only after the user drifts off `DEFAULT_FAVORITES` so the affordance teaches the concept without cluttering the default state.
- **Home base location** — read from `sv:user:home`/`sv:user:location` (same keys the dashboard already uses for inline edit). Whole row is a tap target that swaps to an InlineEdit when active. Background geocode via OpenStreetMap Nominatim. Status feedback when geocoding: loading "Searching for X…", error "Couldn't find X. Try adding a state or country.", localStorage only updated on geocode success — so bad input ("asdfg") never silently leaves the label and coords mismatched. Single-line value (was wrapping to 2 lines).
- **Disclaimer at top of Settings:** "Preferences are saved to this device only. No account, no sync, no tracking." Addresses the unspoken "can visitors change my app?" concern. Answer is no, because each browser/device gets its own localStorage.

What's now dead (anti-feature decisions):

- **Mavericks watch toggle** — commented out. No delivery path for push notifications.
- **Epic window alerts toggle** — removed entirely; replaced by the calendar feed.
- **Imperial/Metric segmented control** — killed. US-focused personal app for NorCal surfers, target audience is US, metric threading through every numeric panel would be half a day of engineering for near-zero benefit. Honest version of "I'll never use this" is "delete it." Swell/Wind/Temp rows kept in the Units group as display-only ("ft·s / knots / °F") since they document the app's units for any new visitor.

Engineering pattern that emerged: when an affordance lies, fix the affordance, not the lie. Settings now contains only things that work or that explicitly document what they are without claiming interactivity.

#### Discoverable edit affordance (`b8f4447`)

The dashboard header's `Mill Valley` location text was already a `<button>` with `onClick={() => setEditingLoc(true)}` — but it was styled to look exactly like a static caption (small muted-gray uppercase monospace). Users including Eliel didn't realize they could tap it. Added a 10px outline pencil SVG inline with the location text (and the name greeting once a name is set). The pencil inherits `currentColor` so it tints with the text — muted gray on the small location label, full text color on the big greeting. Used inline SVG rather than the `✎` unicode character because unicode pencil renders inconsistently across iOS/Android/desktop fonts (sometimes blue emoji, sometimes a missing-glyph box).

#### `Spot` data-model changes

- `FAVORITES` → `DEFAULT_FAVORITES`. The static const stays as the seed value; the live list moves to `useFavorites()` hook backed by `useLocalStorage<string[]>('sv:favorites', DEFAULT_FAVORITES)` with `toggle/reset/isFavorite` helpers (`useCallback`-stable so consumers don't churn props).
- `Spot.localNote?: string` field added. See "Spot.localNote" section below.

### Live Marin water quality (`3bf431c`)

Three-day arc:
- **May 11:** Tried to scrape Marin's results page from a Vercel edge function. Got 403 with HTML — Cloudflare bot challenge, blocks any non-browser client even with a Chrome User-Agent.
- **May 11 evening:** Shipped a stopgap manual-fixture path (`src/server/waterQualityMarinManual.ts`). Eliel screenshots Marin's page each Mon/Tue, Claude reads it and rewrites the file. Worked but unsustainable.
- **May 11 also:** Emailed Marin EH asking for an automated path. Polite, specific, three options ranked easiest-first (UA whitelist, existing data feed, weekly email/CSV).
- **May 12:** Two responses within hours. Natalya Beckman (EHS) pointed to the open data portal (Socrata). Daniel Myers (Marin IT, Advanced Systems Engineer - Data) provided a direct ArcGIS Feature Service URL with daily Thursday refresh. Wired Daniel's ArcGIS endpoint same-day; pattern matched Santa Cruz's exactly.

Endpoint: `https://services6.arcgis.com/T8eS7sop5hLmgRRH/arcgis/rest/services/a64e0b/FeatureServer/0/query`. Field model: `beach_name` (UPPERCASE in source — title-cased in our parser so existing spot mappings stay stable), `inspection_week_date` (epoch ms), `inspection_result` (OK/AVOID/N/A), `is_latest_inspection` flag (=1 for the most recent sample per station, mirrors Santa Cruz's `MostRecent` field).

Status mapping: OK → open, AVOID → caution (advisory posted, not a closure — surfers can still enter at their own risk, consistent with Sonoma's Caution tier and SM's Posted tier), N/A → dropped (station not sampled this week).

Retired the manual fixture (`waterQualityMarinManual.ts`) and its test. No more weekly screenshot ritual.

**Process lesson worth preserving:** the polite email path produced two real data sources from two different teams at the same county within 24 hours. Worth attempting before assuming a wall is permanent. The technical fix (whitelist, API, CSV) is often less effort for the data team than for us to build a Playwright bypass. Eliel followed up with thank-you replies to both Daniel and Natalya including a link to the live integration — small social investment that's good for future asks (schema breaks, new datasets, etc.).

### iCal forecast calendar feed (`preview/ical-calendar`, `8a00d36` through `47f01da`)

The original backlog item was "push notifications" with the implementation footprint of "auth + DB + Vercel Cron + service-worker push registration." Substantial multi-day project.

The reframe that landed: a surf app's notification need is mostly "tell me tomorrow about the good window," not "real-time alert me when conditions cross threshold." Driving to the coast already takes 30+ minutes; the sub-hour-precision case doesn't exist in practice. That suggested iCal subscription instead of Web Push:

- **No subscription store.** The .ics URL itself IS the subscription — spot IDs encoded in the query string. Server never knows who's subscribed.
- **No iOS PWA-install friction.** Web Push requires the iOS user to install the PWA to the home screen first. iCal subscription works in Safari without that step.
- **No notification UI to maintain.** Calendar apps already deliver to Apple Watch, CarPlay, lock screens, dock badges. We just author the events.
- **Privacy story intact.** No DB, no accounts, nothing personally identifying server-side.

The implementation in 4 files:

- `src/server/icalendar.ts` — pure RFC 5545 generator. Handles UTC formatting, CRLF endings, §3.3.11 text escapes (comma/semicolon/backslash/newline), and §3.1 line folding at 75 octets. 10 unit tests. Each VEVENT gets a `VALARM` with `TRIGGER:-PT60M` so the OS fires a notification 1h before the window starts.
- `src/server/calendar-handler.ts` — edge handler. Calls the same `buildConditions()` pipeline as `/api/conditions`. Per spot, runs `findBestWindows()` on the 7-day timeline, caps at top 3 peaks per spot. Each window becomes a `VEVENT` with title `🌊 The Patch · Peak 78`, description with conditions readout, location = `spot.regionLabel`, deep-link URL `https://surfvikings.com/app?spot=bolinas-patch`.
- `api/calendar.ics.ts` — Vercel edge function entry. URL preserves the `.ics` extension so the file content-type matches what surfers paste into their calendar app.
- `src/components/Settings.tsx` — new "Forecast calendar" group with Apple/Google subscribe buttons + copy-link fallback. The .ics URL is generated live from the user's current `sv:favorites` so it always reflects their tracked list.

`App.tsx` reads `?spot=<id>` from the URL on initial mount and, if it matches a real spot, opens that spot's detail page. Cleared via `history.replaceState` after consumption so refresh doesn't re-pin. That's the deep-link landing path: calendar event → tap URL → land directly on spot detail with live conditions, not just the dashboard.

Anchored event timestamps to `Math.floor(Date.now() / 3600_000) * 3600_000` (current hour rounded down). UIDs computed as `${spotId}-${startMs}@surfvikings.com`. Stable within an hour, shift only on hourly boundaries — calendar apps see events as updates rather than duplicates.

#### Three subtle bugs caught during validation

1. **`webcal://` vs `webcals://` (`64a56af` then reverted in `e6df5b5`).** I confidently shipped `webcals://` (with the S) thinking it was the "secure" variant. macOS Calendar does NOT register a handler for `webcals://` — falls through to Safari, opens a blank page. Plain `webcal://` is the only scheme Calendar dispatches on. Modern macOS Calendar handles the HTTPS redirect transparently even though the scheme is HTTP-by-spec. Reverted. The "Insecure Connection" warning that pops once is cosmetic.

2. **Calendar event anchor mismatch (`47f01da`).** Event times were computed from `wire[0].t` but the peak time label used `hourLabel(w.peakHour)` which anchors on `Date.now()`. Open-Meteo's `past_days` param prepends historical hours to `wire`, so `wire[0].t` is hours/days before "now." Result: event display showed Wed 7-11AM but the notes said "Peak at F 4pm" — the peak hour literally outside the event window. Fix: anchor both event times AND peak label on `Date.now()` rounded to the hour, compute `peakMs = anchorMs + w.peakHour * 3600_000`, format with `Intl.DateTimeFormat` in `America/Los_Angeles` so the wall time is baked into the description string. Also dropped `hourLabel`'s single-letter day initials (Tue/Thu both 'T', Sat/Sun both 'S') in favor of three-letter `Wed 4pm` format.

3. **The toast's chicken-and-egg.** See SW section below.

### Spot.localNote architectural seed (`eeb7b3f`)

Eliel's son's surf team reported Muir Beach at 6/10 on a day our model said 5.5/10. Close, but Eliel wanted to know how we systematically capture the gap.

Three layers of local knowledge the model was missing at Muir:
1. **Spatial** — cove geometry transforms wind. The model uses a single `spot.offshore` direction. Cove wraps rotate the effective wind angle at the break.
2. **Temporal** — afternoon NW sea breeze deflects off Mt Tam and arrives in the cove from the NE-ish, which is exactly Muir's `offshore: 45°`. Model has no hour-of-day awareness.
3. **Refraction** — short-period swell (6s) can wrap into a cove and break rideably when at exposed spots it would just be junk.

Three encoding options ranked smallest-first:
- **(A) Plain text `localNote`** — describes what the model can't see; doesn't change the score. Honest disclosure.
- **(B) Typed `LocalRule` union** — `{ type: 'wind-wrap'; hourRange; fromDirection; rotateBy; description }` etc. Scoring engine reads them, "Why this score" surfaces them. Real impact on numbers.
- **(C) Ground-truth calibration loop** — log surfer ratings, back out per-spot corrections over time.

Shipped (A). The Muir model is actually well-tuned for what it can see (`optimalSwell: 250` WSW matches the cove's opening, `offshore: 45°` matches the post-wrap direction, `optimalPeriod: [10,14]` already tolerates shorter periods than typical NorCal spots). The residual 0.5-point error is mostly the time-of-day modulation we'd need (B) to encode. Not worth building (B) for one observation. Defer until we have 5+ similar observations across spots.

Implementation: `localNote?: string` on `Spot`, surfaces in `LocalInsight` component on Spot Detail as a separate "Forecast note" callout inside the existing Local intel panel. Pacific-blue tag distinguishes it from the character-note INSIGHTS text. First entry: Muir's "NW wind wraps around the headland and arrives in the cove as offshore. Short-period wind swell refracts in. Forecast may underestimate conditions on NW-wind afternoons."

The architectural beat to preserve: when the typed framework is built later, the localNote field becomes the **description text** the LocalRule emits. Each rule has typed params + a description. The Muir text is the prototype.

### SC shadowFactor sweep (`67a6974`, `preview/sc-shadowfactor`)

Eliel screenshotted Cowells: our app showed 89/100 ("GOOD") while Surfline showed POOR with 0-1ft surf height. Investigated.

**Root cause:** Cowells had no `shadowFactor` set. The entire 24-spot Santa Cruz cluster had no `shadowFactor` set. Defaulting to 1.0 means the timeline pipeline treats raw open-ocean buoy data as the at-the-break wave height. Reality: Cowells sits in a deep lee behind Lighthouse Point and Steamer Lane's reef; real-world energy reaching the break is maybe 25-35% of open-ocean. That's *why* Cowells is famous as a longboard wave — only small swell reaches it. We did this work for Bolinas back in May (~0.45-0.55) after the same Surfline-disagreement pattern. The SC half of the coast never got the same treatment.

Calibrated all 24 spots per coastal geometry, using the existing scale (0.25 deeply sheltered → 0.95 fully exposed point):

```
North coast (fully exposed):
  laguna-creek 0.85, four-mile 0.85, three-mile 0.80

Lighthouse Point lee (west-cliff stretch):
  natural-bridges 0.65, mitchells-cove 0.50, stockton-ave 0.45

Steamer Lane (headland tip — exposed):
  steamer-point 0.90, steamer-middle 0.85, steamer-indicators 0.85, steamer-slot 0.70

Cove behind Lighthouse Point (deep shadow):
  cowell 0.30, rivermouth 0.55, sc-harbor 0.50

Eastside / Pleasure Point peninsula:
  26th-ave 0.70, pleasure-sewer 0.80, pleasure-first 0.70,
  pleasure-second 0.60, pleasure-insides 0.50,
  jacks 0.65, the-hook 0.55, privates 0.45

Capitola/Aptos (Soquel Cove):
  capitola 0.35, capitola-rivermouth 0.35, beer-can 0.50
```

Implementation method worth preserving: wrote a Python script that injects `shadowFactor: X.XX` into each spot's block. Cleaner audit trail than 24 individual `Edit` tool calls. Multi-line entries (`rivermouth`, `capitola-rivermouth` with their `specialRules`) handled by tracking which spot block we're inside as we walk lines. Both branches (single-line, multi-line) tested and produced syntactically clean TS.

**Validation against the current live reading at Cowells (4.3ft @ 7s from 295°, 10kt W wind, rising 2.8ft tide):** score dropped from **89 → 73**. At-break height is now 1.29ft, matching the visual size Surfline reports.

**Residual gap (73 still higher than Surfline's POOR — i.e. ~30-40):** sits in the scoring engine, not shadowFactor. Two surgical changes would close most of it:

1. **`sScore` is symmetric** — being 1.3ft below a [2,5] range pays the same penalty as being 1.3ft above. Should be asymmetric. Below-min is "no waves to ride"; above-max is "too big but maybe still surfable." Different problems.
2. **`dirScore` is independent of energy** — at 1.3ft, direction barely matters because there's no energy to differentiate. A multiplier like `min(1, swellHeight / pMin)` on dirScore would correctly de-weight direction when waves are tiny.

These are now the active scoring-engine refinement item on the backlog. Worth a fresh session — needs care because every score across the app shifts.

### PWA service-worker update toast (`preview/sw-update-toast`)

Every commit in this session ended with "hard reload to bypass the SW." `vite-plugin-pwa` was set to `registerType: 'autoUpdate'` which downloads new SWs silently but waits to activate until all tabs are closed and reopened. A user who keeps surfvikings.com pinned across days never sees the update.

Fix in three pieces:

- `vite.config.ts`: `registerType: 'autoUpdate'` → `'prompt'`. `workbox.cleanupOutdatedCaches: true` so old hashed bundles get pruned when a new SW activates.
- `src/components/UpdateToast.tsx`: uses `useRegisterSW` from `virtual:pwa-register/react`. Pill-shaped banner at the bottom of the viewport (above the TabBar via `bottom: 80px + env(safe-area-inset-bottom)`). Says "New version available · Refresh · ×". Tap Refresh → `updateServiceWorker(true)` activates the waiting SW and reloads. Tap × → toast hides; respects user choice; re-fires on the next SW update.
- `onRegisteredSW` callback schedules `registration.update()` every 10 minutes. Without polling, `useRegisterSW` only checks for new SWs on initial page load — defeating the point. 10 min is conservative: frequent enough to catch a deploy within a useful window, infrequent enough that long-running tabs don't hammer Vercel.

#### The chicken-and-egg lesson

Existing visitors today have the OLD SW (`autoUpdate`-mode). The OLD SW serves the OLD bundle which has no toast component. So even after we deploy the new toast-aware code, those visitors keep seeing the old bundle indefinitely until they happen to close all tabs. They don't *know* to do the one-time reset.

Concretely: **this fix has a 1-deploy ramp before existing visitors benefit.** The first time they reload after we deployed the toast, they receive the new toast-aware SW. The SECOND time they reload (and a deploy has happened in between), the toast appears.

For new visitors after the deploy, the benefit is immediate.

There's no clean workaround. The OLD SW can't be told "stop serving old bundle, let new SW take over" from within the new SW. The browser owns that transition.

#### The `_int` ghost

During validation, an unrelated `Uncaught TypeError: Cannot create property '_int' on number '1'` showed up in the production console. Stack trace pointed inside React's scheduler (`unstable_scheduleCallback`, `postMessage`, `MessageChannel` — all React 18's deferred-work path). Enabled sourcemaps for one build to localize the source. Before we could capture an unminified trace, the next deploy made it stop reproducing. Most plausible explanation: Chrome DevTools' performance instrumentation hooks into React's scheduler and occasionally fails on certain bundle hashes; the issue evaporated with the next clean build. **Not a real bug** — but worth recording the pattern so future-me doesn't chase it again.

Sourcemaps were disabled in the same wrap commit (`b6b4a28`). They shouldn't ship long-term — leaks source structure, adds weight.

## Things noticed but not changed

Recording these so they don't get lost:

- **`scoreToRating` calibration.** The Cowells 73 case revealed that "Fair" might describe genuinely-tiny-but-rideable longboard conditions OR genuinely-mediocre overhead conditions. The rating tiers don't differentiate. Could refactor to factor in absolute size (e.g., Fair-but-tiny vs Fair-but-bumpy). Low priority; defer until the scoring-engine refinement pass.

- **`scoreToRating`'s "Good" and "Great" rating bands** could probably also be reviewed once the scoring engine is asymmetric. Currently the bands are tuned for symmetric scoring; with steeper below-min penalties the distribution will shift.

- **iOS Calendar default alarms.** When subscribing on iOS via webcal://, Event Alerts toggle is ON by default — good. macOS Calendar by default has "Remove Alerts" CHECKED in the subscribe dialog, which would strip our VALARM directives. Different OSes, different defaults. If we ever build a marketing page for the calendar feature, mention "macOS users: uncheck Remove Alerts in the subscribe dialog."

- **`Year2026.ics` clock-rollover behavior.** The .ics feed currently uses UTC timestamps; calendar apps render in the user's local timezone. Tested in PDT only. If someone subscribes from another timezone, events will render correctly (calendar apps handle that). Worth noting in docs eventually.

- **Settings page is now 4 functional groups + Favorites + About** — total scroll height is starting to feel long on mobile. Not yet a problem; flag for the next UX pass.

## Backlog state at end of session

Active items, ranked by user value:

1. **Scoring-engine refinement** — penalize below-min size more aggressively + soften direction weight when wave energy is tiny. Surfaced by the Cowells 73 case. ~2-3 hours, intellectually meaty. Affects every spot's score; needs care.
2. **Typed `LocalRule` framework** — design once we have 5+ ground-truth observations across spots. Premature now with just Muir.
3. **Ground-truth rating capture UI** — small "Rate this session" form on Spot Detail, logs `{ spotId, dateISO, modelScore, userRating, note }` to localStorage. Builds the dataset that fuels LocalRule + calibration work. ~1 hour. Today's Muir 6/10 and the Cowells "POOR" comparison would be data points #1 and #2 if we had the form.
4. **Sigward Muir Beach webcam** — blocked on his reply.
5. **CUDEM bathymetry pipeline** — pull real bathy data from NOAA NCEI into our shadowFactor calculations. Multi-day project; would let us replace hand-tuned shadowFactor values with computed ones.
6. **FUTURE — gridded map overlays** with particle-flow animation (NOAA WaveWatch III GRIB).

Closed in this session (no longer in the backlog):

- ~~Push notifications~~ — replaced by the iCal feed. Same user benefit, no DB/auth/cron.
- ~~Final spot tally pass~~ — done; 64 spots, marketing surfaces refreshed.
- ~~Make FAVORITES editable on Settings~~ — done (PR #1).
- ~~Email Marin EH for whitelist~~ — done, got a better path (ArcGIS endpoint directly from IT).
- ~~PWA service worker caches old bundle too aggressively~~ — done.
- ~~Thread units (imperial/metric) through view components~~ — killed deliberately. Imperial-only by design.

## Conventions worth preserving for next session

Today reinforced or introduced these patterns:

- **When an affordance lies, fix the affordance, not the lie.** Multiple Settings controls got deleted or replaced rather than papered over. "Imperial/Metric" was killed instead of finished. "Mavericks watch" was removed instead of stubbed. "Epic window alerts" became a real calendar feed. Honest disclosure beats over-claim.
- **Architectural seeds beat speculative frameworks.** `Spot.localNote` is one text field; the typed LocalRule framework it points toward is deferred until we have enough data points to design it against. Same shape as `findBestWindows` → `BestWindow[]` evolving as needs surfaced.
- **The polite email path works.** Marin EH's IT and EHS teams both responded within a day with usable data paths. Worth attempting before assuming a wall is permanent.
- **Validate end-to-end in the user's hand.** "Trust me, it works" isn't validation. The SW toast feature kept being "almost working" until we actually observed the toast appear on Eliel's screen. Make the user verify in-product.
- **Single-character bugs are real.** `webcal://` vs `webcals://`. I was confidently wrong on the second; quick screenshot from Eliel caught it. Resist the impulse to "fix" a working pattern based on partial knowledge.

## How a next session should pick this up

Read in this order:

1. This file.
2. `docs/postmortems/2026-05-11-spectral-and-fidelity.md` for the prior session's context — the Bolinas shadowFactor work that established the calibration scale we extended today.
3. `docs/technical-overview.md` for current architecture shape. Updated this session to mention the iCal feed, the 5-source water-quality pipeline, the SW update toast, and `Spot.localNote`.
4. `docs/glossary.md` for new terms: iCalendar / VEVENT / VALARM, `webcal://`, `useRegisterSW`, ArcGIS Feature Service, MostRecent flag, the chicken-and-egg of SW transitions.

Then the obvious next-session task is **the scoring-engine refinement** — Cowells residual 73 vs Surfline POOR. Two surgical changes to `computeScore` in `src/lib/data.ts`:
- Asymmetric `sScore`: below-min penalty steeper than above-max
- Energy-weighted `dirScore`: multiplier like `min(1, swellHeight / pMin)` so direction only counts when there's energy

Plus optionally **(3) ground-truth capture UI** since that's a 1-hour job that builds the dataset for everything downstream.

Hold on (2) LocalRule framework, (4) Sigward webcam (external), (5) CUDEM (multi-day), (6) WaveWatch III GRIB (future release).

The app is in a genuinely-good state right now. 26 commits today, all live in production, no known regressions. Take the win.
