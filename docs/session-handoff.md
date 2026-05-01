# Session handoff — LinkedIn cover image

Branch: `claude/review-surfvikings-public-xJMeK`
Last session ended: 2026-05-01
Read `AGENTS.md` first.

## What this session did

The user wanted a LinkedIn article cover image (1.91:1, 2560×1440) showing the Surf Vikings PWA, with their name "Eliel" baked into the dashboard greeting. Final design landed on:

- 2560×1440 PNG at `docs/linkedin-cover.png`
- Background: `public/hero-surfer.jpg` at opacity 0.18 (grayscale 0.4) over `#08090B`, with a radial vignette and top/bottom dark gradient
- Three phones, **no tilt**, evenly spaced across the center: Map (left), Dashboard with "Morning, Eliel." (center), Spot Detail / Ocean Beach (right)
- Phone frame: 460×1000, 14px bezel, 56px outer radius, 42px screen radius, layered drop shadow
- Brand mark + "Surf Vikings" wordmark anchored upper-left, white, weight 800, letter-spacing `-0.03em` (see "Open thread" below)
- Renderer: `scripts/render-linkedin-cover.mjs`. Composes existing `public/screenshots/*.png` captures via headless Chromium screenshot of an inline HTML doc. Extracts the helmet SVG path from `src/components/Logo.tsx` at runtime so the wordmark stays in sync.

Both the renderer and the output PNG are committed (commits `1b76814` and `da325e3`).

## Path we walked, so you don't repeat it

1. **Original plan:** automate four phone-framed captures (Today, Map, The Patch, Forecast) against the production deploy with `name=Eliel` seeded in localStorage. Started a `gen-docs-screenshots.mjs` script.
2. Hit the sandbox firewall trying to load `surfvikings.com` (see Hypotheses). Reset the WIP commit (`98a3cdd` was the pre-WIP state) with `git reset --hard` + `--force-with-lease`.
3. **Pivot:** user pointed out `public/screenshots/dashboard.png`, `map.png`, `spot-detail.png` already exist — captured from production in a prior session. Built a renderer that composes those PNGs instead of reshooting.
4. First composition (committed in `1b76814`): cyan radial glow over slate gradient, Map at -7°, Spot Detail at +7°, Dashboard centered hero. User asked for Forecast as a fourth phone — deferred because there's no `forecast.png` and the firewall blocks recapturing.
5. Second composition (committed in `da325e3`, current): user direction "Use a very faded version of the background surfer image for the background image and remove the angles of the screen shots — no tilts just straight across." Replaced gradient with faded `hero-surfer.jpg`, removed all rotations, added the brand mark + wordmark upper-left from the real `Logo.tsx` SVG path.

## Hypotheses tried and ruled out

- **"`curl` 403 from production is a config issue."** Ruled out. Tested with Playwright + `ignoreHTTPSErrors: true` — still 403, body `"Host not in allowlist"`. The sandbox's TLS-intercepting proxy is host-allowlist based; only the npm registry is whitelisted. There is no curl/header tweak that gets past it.
- **"`npx playwright install chromium` will fix the version mismatch."** Ruled out. The installer downloads from `playwright.azureedge.net` which is also off-allowlist. Workaround: there's a pre-installed Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Pass it as `executablePath` to `chromium.launch()` to bypass Playwright's version check. The installed `playwright` package wants build 1217; 1194 works fine for our usage.
- **"Use the user's attached logo PNG for the brand mark."** Ruled out by the user mid-task ("Pull the actual assets"). Final approach reads `src/components/Logo.tsx` and extracts the SVG `path d="..."` via regex at render time, so any future change to the brand mark propagates automatically.
- **"Tilted phones with cyan glow look right."** Ruled out by aesthetic direction. Final composition is straight-across with a quiet faded photo background.

## Status of the cover

**The user produced the final LinkedIn image manually outside this repo and considers the cover task done.** Do not pick it back up. `scripts/render-linkedin-cover.mjs` and `docs/linkedin-cover.png` are committed for reference but no further iteration is needed unless explicitly asked.

## Open threads / pick this up first next session

1. **`gen-screenshots.mjs` doesn't capture the Forecast tab.** It runs Dashboard / Spot Detail / Map only. Independent of the cover work — this is a real gap if anyone wants a complete set of marketing screenshots in the future. Fix would be: navigate to Forecast (`TabBar` in `src/components/Primitives.tsx`) and capture `public/screenshots/forecast.png` + `.webp`. Requires a reachable dev server or production deploy (sandbox firewall blocks the latter — see hypotheses above).

Nothing else from this session is actionable.

## Useful state to keep in mind

- Current branch is `claude/review-surfvikings-public-xJMeK`, working tree clean as of 2026-05-01.
- The handoff `PRD.md` in `handoff/` (gitignored) has the full product spec — read it for non-obvious context like spot scoring, regional architecture, and the "NorCal Committed" persona.
- The user prefers terse, not chatty. They will redirect aesthetic decisions concretely ("faded surfer, no tilts") — don't over-design before showing them something to react to.
- Sandbox network: only the npm registry is reachable. Do not waste time trying to fetch from any other host; either work from committed assets or ask the user to run a network-dependent step on their machine.
