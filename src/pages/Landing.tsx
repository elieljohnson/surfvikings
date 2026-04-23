import React from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from './PageShell';

/**
 * Marketing landing page. Stub — will be rebuilt with getslopes-style
 * hero + feature sections pulling in the son-with-Viking-helmet photo
 * as an accent.
 */
export function Landing() {
  return (
    <PageShell activeNav="home">
      <div style={{
        minHeight: '70vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px', textAlign: 'center', gap: 16,
      }}>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Surf Vikings
        </h1>
        <p style={{ margin: 0, fontSize: 17, color: '#64748B', maxWidth: 520 }}>
          Hyper-local NorCal surf forecasts — Salt Point to Santa Cruz. Landing page coming soon.
        </p>
        <Link
          to="/app"
          style={{
            marginTop: 16,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 24px', borderRadius: 999,
            background: '#06B6D4', color: '#FFFFFF',
            fontSize: 15, fontWeight: 600, textDecoration: 'none',
          }}
        >
          Open the Forecast App →
        </Link>
      </div>
    </PageShell>
  );
}
