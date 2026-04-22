// Unified handler: shared between Vercel Edge Function and Vite dev middleware.
// Takes a Request, returns a Response. Web-standard API.

import { buildConditions } from './fetchers';
import { BUOY_MAPPINGS } from '../lib/buoyMapping';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let cache: { key: string; at: number; body: string } | null = null;

export async function handleConditions(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const spotsParam = url.searchParams.get('spots');
  const spotIds = spotsParam
    ? spotsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : BUOY_MAPPINGS.map((m) => m.spotId);

  const key = spotIds.slice().sort().join(',');
  const now = Date.now();
  if (cache && cache.key === key && now - cache.at < CACHE_TTL_MS) {
    return new Response(cache.body, {
      status: 200,
      headers: jsonHeaders(cache.at, 'HIT'),
    });
  }

  try {
    const payload = await buildConditions(spotIds, req.signal);
    const body = JSON.stringify(payload);
    cache = { key, at: now, body };
    return new Response(body, {
      status: 200,
      headers: jsonHeaders(now, 'MISS'),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}

function jsonHeaders(at: number, status: 'HIT' | 'MISS'): HeadersInit {
  return {
    'content-type': 'application/json',
    'cache-control': 'public, max-age=60, s-maxage=900, stale-while-revalidate=3600',
    'x-cache': status,
    'x-served-at': new Date(at).toISOString(),
  };
}
