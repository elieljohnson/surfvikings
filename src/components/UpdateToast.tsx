// Surfaces a small "New version available" banner when the PWA's service
// worker detects a fresh build. Tap to activate the new SW and reload
// the page. Pairs with vite.config.ts's `registerType: 'prompt'`.
//
// Why this exists: vite-plugin-pwa's default 'autoUpdate' mode waits to
// activate a new SW until all tabs are closed and reopened. For a
// single-tab user keeping the app open across days, that means the
// deployed bundle silently lags reality until they happen to close the
// tab. We were working around it by telling people "hard refresh" every
// time. This component removes that whole class of friction — fresh
// version arrives, user gets a tap target, done.

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { TOKENS } from '../lib/tokens';

export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Poll for new SW versions every 10 minutes while the tab is
      // open. Without this, useRegisterSW only checks on initial page
      // load, so a user who keeps the app open all day would never
      // see the toast until they reload — defeating the point.
      if (!registration) return;
      const POLL_MS = 10 * 60 * 1000;
      setInterval(() => {
        // r.update() prompts the browser to refetch sw.js and compare
        // against the installed version. Fails silently on network
        // errors (offline, captive portals, etc.).
        registration.update().catch(() => { /* ignore */ });
      }, POLL_MS);
    },
    onRegisterError(err) {
      // Don't crash on registration failures (private windows, dev
      // mode, etc.) — just log and let the app run un-cached.
      // eslint-disable-next-line no-console
      console.warn('SW register failed:', err);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        // Sit above the TabBar (which is ~64px) plus iOS safe-area inset
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px 10px 16px',
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.borderHi}`,
        borderRadius: 999,
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        color: TOKENS.text,
        fontSize: 13,
        maxWidth: 'calc(100% - 32px)',
      }}
    >
      <span style={{ whiteSpace: 'nowrap' }}>New version available</span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        style={{
          padding: '6px 12px',
          borderRadius: 999,
          background: TOKENS.pacific,
          color: '#FFFFFF',
          border: 'none',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Refresh
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setNeedRefresh(false)}
        style={{
          padding: '6px 8px',
          background: 'transparent',
          color: TOKENS.textMute,
          border: 'none',
          fontSize: 16,
          lineHeight: 1,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ×
      </button>
    </div>
  );
}
