import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { devApiPlugin } from './src/server/vite-dev-plugin';

export default defineConfig({
  plugins: [
    react(),
    devApiPlugin(),
    VitePWA({
      // 'prompt' instead of 'autoUpdate' so the SW doesn't silently
      // wait for all tabs to close before activating a new version.
      // We pair this with <UpdateToast/>, which surfaces a "new
      // version available" banner the moment a fresh SW is detected.
      // Tap to apply + reload — no more "hard refresh to bypass the
      // SW" every deploy.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Surf Vikings',
        short_name: 'Surf Vikings',
        description: 'Hyper-local NorCal surf forecasts · Salt Point to Santa Cruz',
        theme_color: '#08090B',
        background_color: '#08090B',
        display: 'standalone',
        orientation: 'portrait',
        // Scoped to /app/ so the install prompt only fires on PWA pages
        // and the installed app launches into the forecast, not the landing.
        start_url: '/app/',
        scope: '/app/',
        categories: ['weather', 'sports', 'lifestyle'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Prune stale entries from previous SW versions when a new one
        // activates. Without this, old hashed bundles would accumulate
        // in the cache forever even after they're no longer reachable.
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // NOAA / Open-Meteo API (for future live wiring)
            urlPattern: /^https:\/\/(.*\.ndbc\.noaa\.gov|api\.tidesandcurrents\.noaa\.gov|marine-api\.open-meteo\.com|api\.open-meteo\.com|api\.weather\.gov)\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'surf-data',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // TEMPORARY: sourcemaps enabled for one deploy to diagnose a
    // reproducible "Cannot create property '_int' on number '1'" error
    // in production. Remove once the bug is located and fixed —
    // sourcemaps shouldn't ship long-term (leaks source code structure
    // + adds bundle weight). Companion comment in commit message.
    sourcemap: true,
  },
});
