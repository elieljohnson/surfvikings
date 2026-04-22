// React hook: fetches /api/conditions for the given spots and returns
// scored timelines. Falls back to the synthetic mock while loading or on error.

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

const GLOBAL_CACHE = new Map<string, { at: number; res: ConditionsResponse }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

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

  const cached = GLOBAL_CACHE.get(key);
  const [state, setState] = useState<State>(() => ({
    timelines: cached ? timelinesFromResponse(spotIds, cached.res) : mock,
    response: cached?.res ?? null,
    loading: !cached,
    error: null,
    stale: cached ? Date.now() - cached.at > CACHE_TTL : false,
  }));

  useEffect(() => {
    const fresh = GLOBAL_CACHE.get(key);
    if (fresh && Date.now() - fresh.at < CACHE_TTL) {
      setState({
        timelines: timelinesFromResponse(spotIds, fresh.res),
        response: fresh.res,
        loading: false,
        error: null,
        stale: false,
      });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchConditions(spotIds);
        if (cancelled) return;
        GLOBAL_CACHE.set(key, { at: Date.now(), res });
        setState({
          timelines: timelinesFromResponse(spotIds, res),
          response: res,
          loading: false,
          error: null,
          stale: false,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return state;
}
