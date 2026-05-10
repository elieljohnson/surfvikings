# Surf Vikings — Résumé Version

**Hyper-local NorCal surf forecasting PWA · [surfvikings.com](https://surfvikings.com)**

*Sole designer, engineer, and product lead · 2026*

![Landing hero + live dashboard](./screenshots/landing-hero.png)

---

### What it is

A progressive web app that scores 28 Northern California surf breaks hour-by-hour using free public NOAA data. Every spot has its own bathymetry profile, swell shadow, tide dependency, and wind exposure coefficients baked in — so "good at Rodeo" and "good at The Patch" aren't the same score. The thesis: a NorCal surfer's real decision isn't "what are the conditions?" — it's "which break, at what hour, is worth the drive?"

### What I shipped

- **PWA with installable home-screen launch** — Vite + React 18 + TypeScript, vite-plugin-pwa, react-router-dom v7
- **Custom scoring engine** — pure, deterministic, 7-tier quality scale with color that reinforces score rather than replacing it
- **Live data pipeline** — NDBC buoys + Open-Meteo marine + NOAA tides merged into 48-hour hourly timelines with 10-min cache, three-state rendering (cached · mock · stale) so the UI is never empty
- **Marketing site** — Landing page, Merch storefront with 23 Printful products, Games, About — same domain, same design language, route-separated from the PWA
- **Merch scraper** — Playwright + Sharp pipeline that bypasses Cloudflare bot challenges by routing image fetches through an authenticated Chromium session; editorial-content-as-code for product copy
- **Zero-downtime domain migration** — legacy surfvikings.com → Vercel while preserving email at the same domain; decoupled web hosting from email hosting via DNS surgery
- **Living dashboard header** — minute-aligned ticking clock, time-aware greeting (Dawn patrol / Morning / Afternoon / Evening / Night), localStorage-backed name + home base, real buoy air temp + top-spot wind, inline editing that works identically in browser, standalone PWA, and in-app WebView

### Engineering principles worth quoting

1. **Model the domain before writing the UI** — 12-field `Spot` type and pure `computeScore()` existed before any component rendered them
2. **Graceful degradation by default** — three-state rendering never leaves the user staring at a spinner
3. **Color conveys quality, not state** — 7-tier phosphor → amber palette instead of red/green stoplight
4. **When the platform fights you, route through what the platform trusts** — Cloudflare bypass via real Chromium `page.goto()`, not challenge-solving
5. **Decouple orthogonal concerns** — web hosting + email hosting are different services that happen to share a domain; DNS is the seam
6. **Platform affordances over platform APIs** — inline `<input>` swap instead of `window.prompt()`, which iOS standalone PWAs silently suppress
7. **Editorial systems, not editorial content** — product copy lives in a mapping table, inherits defaults, survives scraper re-runs
8. **Iterate in commits, not in branches** — 34 linear commits to `main`, every change small and reversible

### Stack & scope

`Vite · React 18 · TypeScript · vite-plugin-pwa · react-router-dom v7 · Playwright · Sharp · Vercel · DreamHost email · Let's Encrypt`

**~4,100 lines of TypeScript · 34 commits · 28 surf spots modeled · 48-hour hourly horizon · 0 third-party JS dependencies · $0 hosting · $0 data**

### Measurable outcomes

- Custom domain live on Vercel with auto-provisioned TLS, edge-cached from SFO
- Installable PWA with iOS safe-area + Home Screen standalone support
- 23-product merch storefront with automated image pipeline, ~20KB WebP per product
- Zero-downtime migration from legacy shared hosting, email continuity preserved

---

*[Full case study](./case-study.md) · [Repo](https://github.com/elieljohnson/surfvikings) · [Live](https://surfvikings.com)*
