# Project: Surf Vikings

Project-specific notes for assistant sessions. The global working-agreement
rules (root `~/.claude/CLAUDE.md`) still apply.

## Preview deploy workflow for bigger features

For anything bigger than a single-file tweak or data refinement, work on a
branch and deploy a Vercel preview before merging to `main`. Vercel
auto-deploys any pushed branch to a preview URL — no manual setup needed.

Process:

1. **Start a feature on a branch.** Naming convention: `preview/<short-slug>`
   (e.g. `preview/seven-day-forecast`, `preview/water-quality`).
   ```
   git checkout -b preview/<slug>
   ```

2. **Push and let Vercel build.** The first push triggers an automatic
   preview deploy. Get the URL with:
   ```
   vercel inspect https://surfvikings-<id>.vercel.app
   ```
   The branch-named alias is usually more memorable:
   `https://surfvikings-git-preview-<slug>-elieljohnsons-projects.vercel.app`

   **Watch for the 63-char DNS label limit.** Long branch names get a
   hashed alias instead of the predictable one — e.g. a branch named
   `preview/spectral-direction-energy-buoys` got the alias
   `surfvikings-git-preview-spectral-008376-elieljohnsons-projects.vercel.app`
   (the slug after `preview-` got truncated + hashed). Always confirm
   the alias from `vercel inspect` before sharing it. Keep branch names
   short — under ~30 chars after `preview/`.

3. **Iterate on the branch.** Each push to the branch triggers a new preview
   deploy with the same alias. Share the URL with Eliel for review.

4. **Watch for transient GitHub clone failures.** Vercel deploys occasionally
   fail with "git provider returned an HTTP 500" — this is a GitHub
   infrastructure hiccup, not a code problem. Redeploy with:
   ```
   vercel redeploy https://surfvikings-<id>.vercel.app
   ```

5. **On approval, fast-forward merge to main + clean up:**
   ```
   git checkout main
   git merge --ff-only preview/<slug>
   git push origin main
   git push origin --delete preview/<slug>
   git branch -d preview/<slug>
   ```

When this is **not** worth doing: small data refinements (spot coefficient
edits, copy fixes, icon tweaks), single-file bug fixes, and todo cleanups.
For those, ship directly to `main`.

## What counts as "bigger"

Default to a preview branch when any of these apply:
- Touches scoring or the forecast pipeline (`src/lib/data.ts`,
  `src/server/fetchers.ts`, `src/lib/api.ts`)
- Introduces a new data source or external API
- Changes a UI surface meaningfully (new section, new layout, new icon set)
- Refactors anything shared across more than 2 components
- Anything Eliel says he wants to "see before shipping"

## Quick links

- Production: https://surfvikings.com
- Vercel project: `elieljohnsons-projects/surfvikings`
- CLI auth: `vercel whoami` should return `elieljohnson`
