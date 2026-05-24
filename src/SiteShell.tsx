import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';
import { Landing } from './pages/Landing';
import { Merch } from './pages/Merch';
import { About } from './pages/About';
import { Games } from './pages/Games';

// Labs is lazy-loaded as its own chunk. maplibre-gl and the six viz views
// only download when /labs is opened — the marketing site and the PWA never
// carry that weight.
const LabsHome = lazy(() => import('./labs/LabsHome'));
const LabsView = lazy(() => import('./labs/LabsView'));

/**
 * Top-level route shell.
 *
 * Marketing pages (/, /merch, /about, /games) live at the site root.
 * The PWA lives under /app/* — service worker and manifest scope are
 * both scoped to /app/ so the marketing site doesn't get treated as
 * part of the installed app.
 *
 * /labs is the dataviz experiments section. It is unlisted on purpose:
 * not linked from any nav, and noindex'd (see LabsLayout + robots.txt).
 */
export function SiteShell() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/merch" element={<Merch />} />
      <Route path="/about" element={<About />} />
      <Route path="/games" element={<Games />} />
      <Route path="/app/*" element={<App />} />
      <Route path="/labs" element={<LabsBoundary><LabsHome /></LabsBoundary>} />
      <Route path="/labs/:slug" element={<LabsBoundary><LabsView /></LabsBoundary>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Suspense boundary for the lazy Labs chunk — dark backdrop so there's no
 *  white flash before the dark Labs shell paints. */
function LabsBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#070A0E' }} />}>
      {children}
    </Suspense>
  );
}
