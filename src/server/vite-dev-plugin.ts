// Vite plugin: mounts the edge handler at /api/conditions during `vite dev`.
// In production the same handler is served by Vercel Edge (api/conditions.ts).

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

export function devApiPlugin(): Plugin {
  return {
    name: 'surf-vikings-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/conditions', async (req: IncomingMessage, res: ServerResponse) => {
        try {
          // Dynamic import so edits hot-reload.
          const { handleConditions } = await server.ssrLoadModule('/src/server/handler.ts') as typeof import('./handler');
          const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? ''}`;
          const request = new Request(url, { method: req.method ?? 'GET' });
          const response = await handleConditions(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          const body = await response.text();
          res.end(body);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
    },
  };
}
