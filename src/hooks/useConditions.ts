// React hook: fetches /api/conditions for the given spots and returns
// scored timelines. Uses a stale-while-revalidate cache so reloads render
// the user's last real forecast instantly, then refresh to live in the
// background. The synthetic mock from buildTimeline() is only used on the
// very first visit (no cached data) or if both network and storage fail.

import { useEffect, useMemo, useState } from 'react';
import { SPOTS, ForecastHour, buildTimeline } from '../lib/data';
import {
  ConditionsResponse, fetchConditions, timelinesFromResponse,
} from '../lib/api';

interface State {
  timelines: Record<string, ForecastHour[]>;
  response: ConditionsResponse | null;
  loading: boolean;
  error: string | null;
  stale: boolean;
}

interface CacheEntry { at: number; res: ConditionsResponse }

// In-memory cache shared across hook instances in this tab.
const GLOBAL_CACHE = new Map<string, CacheEntry>();
// Stale beyond this age, but still rendered while we revalidate.
const CACHE_TTL = 10 * 60 * 1000; // 10 min
// Background refresh cadence — matches the server-side cache TTL so we
// poll exactly as often as the upstream cache can yield new data. Keeps
// water-quality (Marin / Sonoma / SFPUC / SM / SC), live tides, and buoy
// observations current while a tab stays open.
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 min
// On visibility/focus return, refetch only if cache is older than this.
// Short threshold so tab-switchers see fresh data; not so short that a
// quick blur/focus burst spams the API.
const FOCUS_REVALIDATE_THRESHOLD = 60 * 1000; // 1 min
// Discard cached data older than this — forecasts past 24h are useless.
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
// Bump this if ConditionsResponse shape changes — old entries get ignored.
const STORAGE_PREFIX = 'sv:conditions:v3:';

function readStorageCache(key: string): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.at || !parsed.res) return null;
    if (Date.now() - parsed.at > CACHE_MAX_AGE) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorageCache(key: string, entry: CacheEntry) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Quota exceeded, private mode, etc. — silently no-op.
  }
}

export function useConditions(spotIds: string[]): State {
  const key = useMemo(() => spotIds.slice().sort().join(','), [spotIds]);

  // Mock fallback is cheap & deterministic, safe for first render.
  const mock = useMemo(() => {
    const out: Record<string, ForecastHour[]> = {};
    for (const id of spotIds) {
      const s = SPOTS.find((x) => x.id === id);
      if (s) out[id] = buildTimeline(s);
    }
    return out;
  }, [key]);

  // Hydrate from in-memory cache first, then localStorage. Either gives us
  // real data to render on first paint; only the very first visit ever
  // falls back to the synthetic mock.
  const initial = GLOBAL_CACHE.get(key) ?? readStorageCache(key);
  if (initial && !GLOBAL_CACHE.has(key)) GLOBAL_CACHE.set(key, initial);
  const [state, setState] = useState<State>(() => ({
    timelines: initial ? timelinesFromResponse(spotIds, initial.res) : mock,
    response: initial?.res ?? null,
    loading: !initial,
    error: null,
    stale: initial ? Date.now() - initial.at > CACHE_TTL : false,
  }));

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function revalidate(reason: 'mount' | 'interval' | 'focus') {
      // Skip if the in-memory cache is still warm and we're not being
      // forced. The 'mount' path also short-circuits here so we don't
      // refetch when navigating between spots in the same session.
      const cached = GLOBAL_CACHE.get(key);
      const age = cached ? Date.now() - cached.at : Infinity;
      if (reason === 'mount' && cached && age < CACHE_TTL) {
        setState({
          timelines: timelinesFromResponse(spotIds, cached.res),
          response: cached.res,
          loading: false,
          error: null,
          stale: false,
        });
        return;
      }
      if (reason === 'focus' && age < FOCUS_REVALIDATE_THRESHOLD) return;
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetchConditions(spotIds);
        if (cancelled) return;
        const entry: CacheEntry = { at: Date.now(), res };
        GLOBAL_CACHE.set(key, entry);
        writeStorageCache(key, entry);
        setState({
          timelines: timelinesFromResponse(spotIds, res),
          response: res,
          loading: false,
          error: null,
          stale: false,
        });
      } catch (err) {
        if (cancelled) return;
        // Background refreshes shouldn't clobber a successful prior render
        // with an error state — keep showing the stale data and just flag it.
        setState((s) => s.response
          ? { ...s, stale: true, error: err instanceof Error ? err.message : String(err) }
          : { ...s, loading: false, error: err instanceof Error ? err.message : String(err) }
        );
      } finally {
        inFlight = false;
      }
    }

    revalidate('mount');

    // Periodic background refresh — keeps long-lived tabs current with
    // upstream cadence (Marin Thursdays, Sonoma weekly, NOAA hourly, etc.).
    const intervalId = window.setInterval(() => revalidate('interval'), REFRESH_INTERVAL);

    // Tab regains focus → opportunistic refresh if cache is more than
    // FOCUS_REVALIDATE_THRESHOLD old. Catches the common "checked at dawn,
    // opened again at lunch" pattern without waiting for the next interval.
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        revalidate('focus');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [key]);

  return state;
}
