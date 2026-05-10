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
| **Vercel Functions** | Edge/serverless | `/api/conditions` is a single function that fans out to NDBC + Open-Meteo + NOAA Tides and merges the results |

## Live data sources (all free, all keyless)

| Source | What we pull | URL |
|---|---|---|
| **NDBC (NOAA)** | Buoy observations: significant wave height, dominant period, mean wave direction, water temp, air temp | `https://www.ndbc.noaa.gov/data/realtime2/{buoyId}.txt` |
| **NOAA CO-OPS** | Tide predictions per station | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` |
| **Open-Meteo Marine** | Wave forecast (height, period, direction) at arbitrary lat/lng | `https://marine-api.open-meteo.com/v1/marine` |
| **Open-Meteo Forecast** | Wind, air temp, sea surface temp at arbitrary lat/lng | `https://api.open-meteo.com/v1/forecast` |
| **Nominatim (OpenStreetMap)** | Geocoding home-base text → coordinates | `https://nominatim.openstreetmap.org/search` |
| **OSRM public demo** | Driving distance matrix from home-base to all spot coords | `https://router.project-osrm.org/table/v1/driving/...` |

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
| **localStorage `sv:favorites`** *(planned)* | User's curated spot list — currently still hardcoded in `data.ts` |

No backend database. Everything client-side except the `/api/conditions` proxy.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | TypeScript check + Vite production build |
| `npm run icons` | Pre-build step generating PWA icon variants |
| `npm run screenshots` | Playwright-based screenshot generation for the case-study materials |
