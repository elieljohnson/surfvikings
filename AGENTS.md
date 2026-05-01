# AGENTS.md

Notes for future Claude sessions working on Surf Vikings. Only the non-obvious things — read the code for the rest.

## Stack

- React 18 + Vite 5 + TypeScript (strict). No CSS framework — inline styles + one `src/styles.css`.
- `react-router-dom` v7 for routing. PWA via `vite-plugin-pwa` (Workbox).
- Edge runtime for `/api/*` on Vercel (`regions: ["sfo1"]`). The same handler runs in dev via a Vite middleware plugin so `/api/conditions` works locally without `vercel dev`.
- No test framework. "Verified" = `npm run typecheck` clean + manual browser check.

## Build / dev / scripts

- `npm run dev` — Vite on `:5173`, host `true` (LAN-accessible), with `/api/*` middleware.
- `npm run build` — runs `npm run icons` → `tsc --noEmit` → `vite build`. Strict TS; build fails on any type error.
- `npm run typecheck` — `tsc --noEmit` only.
- `npm run icons` — regenerates `public/icon-192.png`, `icon-512.png`, `icon-maskable.png`, `apple-touch-icon.png` from `public/favicon.svg` via sharp. **These four PNGs are git-ignored** — never hand-edit, never commit. `build` regenerates them every time.
- `npm run screenshots` / `:local` — Playwright capture into `public/screenshots/`. Captures Dashboard / Spot Detail / Map only. **Does not capture the Forecast tab** (known gap — see Gotchas).
- No lint script wired up.

## Project structure

```
src/
  main.tsx          BrowserRouter + StrictMode entry
  SiteShell.tsx     Top-level <Routes>: marketing at /, PWA at /app/*
  App.tsx           PWA shell — own tab state, no react-router
  pages/            Marketing pages (Landing, Merch, About, Games) + PageShell
  components/       PWA screens (Dashboard, SpotDetail, RegionMap, Forecast,
                    Settings) + Logo + Primitives (TabBar etc.)
  hooks/            useLocalStorage, useNow, useConditions
  lib/              data.ts (spot profiles + scoring), api.ts, greeting.ts,
                    buoyMapping.ts, tokens.ts, merch-products.ts
  server/           handler.ts (Edge handler), fetchers.ts (NOAA/Open-Meteo),
                    vite-dev-plugin.ts (mirrors handler in dev)
api/conditions.ts   Vercel Edge Function entry → src/server/handler.ts
public/             favicon.svg, hero-surfer.jpg, screenshots/, games/
scripts/            gen-icons, gen-screenshots, render-linkedin-cover, fetch-merch
docs/               Tracked design/marketing assets (linkedin-cover.png, etc.)
handoff/            **gitignored** — local-only PRD and notes
```

## Conventions

- **Two visual systems, do not mix.** Marketing pages use `PageShell` (white background, slate-900 text, cyan-600 `#0891B2` accents, SF/Inter system stack). PWA at `/app/*` uses its own `Screen` primitive (near-black `#08090B`, JetBrains Mono for numerics, yellow accent). The PWA must not import `PageShell`.
- **Brand wordmark spec** (`src/pages/PageShell.tsx:115-123`): weight 800, letter-spacing `-0.02em`, gap 10 between `<Logo/>` and `<span>Surf Vikings</span>`, 18px desktop / 16px mobile, logo size 30/26.
- The `<Logo/>` SVG path in `src/components/Logo.tsx` is the canonical brand mark. Anything else that needs the helmet (cover renderer, etc.) extracts the path from this file rather than duplicating it.
- Function components only. Persisted state goes through `useLocalStorage`.
- React StrictMode is on — effects double-fire in dev. Don't "fix" this with refs or guards.

## Security / secrets

- No API keys in repo. All upstream data sources (NOAA NDBC, NOAA CO-OPS, Open-Meteo, weather.gov) are public, keyless. If you add a keyed source, put the key in Vercel env vars and read it via `process.env` inside `src/server/`.
- `/api/conditions` has a 15-minute in-memory cache (`src/server/handler.ts:7`). Per-instance only — there's no shared cache.
- No analytics, no third-party trackers. Keep it that way unless explicitly asked.

## Gotchas

- **`useLocalStorage` JSON-encodes values.** To seed a string key from DevTools or a script, write the JSON-quoted form: `localStorage.setItem('sv:user:name', '"Eliel"')`. Plain `'Eliel'` will not parse.
- **PWA scope is `/app/` only** (`vite.config.ts` manifest `scope`/`start_url`, plus the SW). Marketing pages don't trigger install. If you broaden scope, re-test that the landing page still doesn't prompt to install.
- **Service worker runtime cache** (`surf-data`, NetworkFirst, 1h) can serve stale `/api/conditions` while iterating. Clear it in DevTools → Application → Cache Storage when responses look frozen.
- **Inter + JetBrains Mono load from Google Fonts CDN** (`index.html`). Headless/sandboxed rendering with no network falls back to system-ui — fine for screenshots, surprising if you don't expect it.
- **The Playwright screenshot script doesn't capture the Forecast tab.** It also expects the dev server (or production) to be reachable on an allowlisted host. See `docs/session-handoff.md` for the firewall situation that bit the last session.
- **`tsc` runs before `vite build`** — strict mode, `noFallthroughCasesInSwitch`, `react-jsx`. Build will fail on `any` leaks, unreachable cases, etc. Don't ship by skipping the build.
- **Vercel SPA rewrite** (`vercel.json`) sends everything except `/api/*` to `/index.html`. Don't add server-rendered routes without updating that rule.
- **`handoff/` is gitignored** — the PRD lives there, not in `docs/`. Tracked design docs and shipping artifacts go in `docs/`.
