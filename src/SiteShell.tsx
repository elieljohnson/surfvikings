import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';
import { Landing } from './pages/Landing';
import { Merch } from './pages/Merch';
import { About } from './pages/About';
import { Games } from './pages/Games';

/**
 * Top-level route shell.
 *
 * Marketing pages (/, /merch, /about, /games) live at the site root.
 * The PWA lives under /app/* — service worker and manifest scope are
 * both scoped to /app/ so the marketing site doesn't get treated as
 * part of the installed app.
 */
export function SiteShell() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/merch" element={<Merch />} />
      <Route path="/about" element={<About />} />
      <Route path="/games" element={<Games />} />
      <Route path="/app/*" element={<App />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
