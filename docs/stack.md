# Stack

## Frontend

| Tech | Category | What it does for us |
|---|---|---|
| **React 18** | UI library | Component model, hooks, the everything-else of modern web UI |
| **TypeScript** | Typed JS | Catches schema bugs before runtime; the `Spot` interface is the single source of truth |
| **Vite** | Build tool / dev server | Fast hot reload during development; minimal config |
| **react-router-dom 7** | Routing | `/` (Landing), `/about`, `/merch`, `/games`, `/app/*` (the actual surf app) |
| **vite-plugin-pwa** | Progressive web app | Service worker + manifest so the app installs as a phone app |

No CSS framework. Inline styles via the React `style` prop, design tokens centralized in `src/lib/tokens.ts`. Trade-off: no Tailwind ergonomics, but zero CSS-in-JS runtime + every style is co-located with the component using it.

## Hosting + serverless

| Tech | Category | What it does for us |
|---|---|---|
| **Vercel** | Hosting platform | Static site + serverless functions in one deploy |
| **Vercel Functions** | Edge/serverless | `/api/conditions` fans out to NDBC + Open-Meteo + NOAA + water-quality sources. `/api/calendar.ics` reuses the same pipeline to emit an RFC 5545 iCalendar feed of forecasted best windows. |

## Live data sources (all free, all keyless)

| Source | What we pull | URL |
|---|---|---|
| **NDBC (NOAA)** — `.txt` | Buoy standard met: significant wave height, dominant period, mean wave direction, water temp, air temp | `https://www.ndbc.noaa.gov/data/realtime2/{buoyId}.txt` |
| **NDBC (NOAA)** — `.data_spec` | Full energy spectrum at 47 frequency bins (2-30s) per buoy; powers spectral decomposition into multiple swell trains + wave energy flux | `https://www.ndbc.noaa.gov/data/realtime2/{buoyId}.data_spec` |
| **NDBC (NOAA)** — `.swdir` | Mean direction (alpha1) at each frequency bin; joined to `.data_spec` peaks to give per-train direction | `https://www.ndbc.noaa.gov/data/realtime2/{buoyId}.swdir` |
| **NOAA CO-OPS** | Tide predictions per station | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` |
| **Open-Meteo Marine** | Wave forecast (height, period, direction) at arbitrary lat/lng | `https://marine-api.open-meteo.com/v1/marine` |
| **Open-Meteo Forecast** | Wind, air temp, sea surface temp at arbitrary lat/lng | `https://api.open-meteo.com/v1/forecast` |
| **Nominatim (OpenStreetMap)** | Geocoding home-base text → coordinates | `https://nominatim.openstreetmap.org/search` |
| **OSRM public demo** | Driving distance matrix from home-base to all spot coords | `https://router.project-osrm.org/table/v1/driving/...` |
| **Sonoma County Env. Health** | Water quality, weekly | HTML scrape of the public results page |
| **SFPUC Beach Monitoring** | Water quality, weekly | Undocumented JSON API at `infrastructure.sfwater.org/lims.asmx/getBeaches` |
| **San Mateo County** | Water quality, weekly | Google MyMaps KML at `www.google.com/maps/d/u/0/kml?mid=...&forcekml=1` (forcekml=1 is critical — without it Google returns KMZ which would require server-side unzip) |
| **Santa Cruz County Env. Health** | Water quality, weekly, 4-tier | ArcGIS Feature Service at `sccgis.santacruzcountyca.gov/server/rest/services/waterquality/MapServer/0` (filter `where=MostRecent=1`) |
| **Marin County Env. Health** | Water quality, weekly Thursdays | ArcGIS Feature Service at `services6.arcgis.com/T8eS7sop5hLmgRRH/...` (filter `where=is_latest_inspection=1`) |

The keyless constraint is intentional. No vendor lock-in, no billing, no API quota anxiety. Trade-off: OSRM and Nominatim public servers have fair-use terms; if Surf Vikings ever scales beyond personal use, those become the first migration target.

## Reference data sources (research, not runtime)

These don't power the app — they're sources we triangulated against during the data-quality pass to set per-spot `optimal*` values.

| Source | Coverage | Used for |
|---|---|---|
| **Stormrider Guide** (web) | All NorCal spots | Optimal swell direction window, size range, period bias, offshore wind, optimum tide, hazards, bottom type |
| **Surfline Surf Guides** (free public pages) | Most NorCal spots, some split into N/Central/S sub-spots | Cross-check against Stormrider; better at narrowing swell windows; explicit on tide preferences |
| **NOAA charts** (informal) | Hand-eyeballed bathymetry for 3 Bolinas spots | Depth profiles in the BathymetryCrossSection |

## Storage

| Where | What |
|---|---|
| **localStorage `sv:conditions:v1:{spots}`** | Stale-while-revalidate forecast cache (~98KB for 7 spots; 24h max-age) |
| **localStorage `sv:driveMatrix`** | Spot ID → drive-minutes from home base, keyed by home coords |
| **localStorage `sv:user:home`** | Geocoded home base `{label, lat, lng}` |
| **localStorage `sv:user:location`** | Free-text home base label (fallback when geocoding fails) |
| **localStorage `sv:user:name`** | First name for greeting ("Late night, Eliel.") |
| **localStorage `sv:favorites`** | User's curated spot list (live; defaults seed from `DEFAULT_FAVORITES` in `data.ts`) |
| **localStorage `sv:minScore`** | Min-score threshold for filtering dashboard chips (default 25 for new visitors) |

No backend database. Everything client-side except the `/api/conditions` proxy.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | TypeScript check + Vite production build |
| `npm run icons` | Pre-build step generating PWA icon variants |
| `npm run screenshots` | Playwright-based screenshot generation for the case-study materials |
