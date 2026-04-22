// Vercel Edge Function entry for /api/conditions.
// (On Cloudflare Workers, export default { fetch: handleConditions }; same handler.)

import { handleConditions } from '../src/server/handler';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  return handleConditions(req);
}
