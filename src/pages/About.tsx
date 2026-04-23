import React from 'react';
import { PageShell } from './PageShell';

export function About() {
  return (
    <PageShell activeNav="about">
      <div style={{
        maxWidth: 720, margin: '0 auto',
        padding: '80px 24px 120px',
      }}>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em' }}>About</h1>
        <p style={{ marginTop: 16, fontSize: 17, color: '#64748B', lineHeight: 1.6 }}>
          Surf Vikings is a hyper-local forecast engine for Northern California surfers — Salt Point
          to Santa Cruz. 28 spots, each with its own bathymetry, swell shadow, and tide dependency
          encoded into the scoring model. Built on free public data (NOAA, Open-Meteo). The full
          story is coming here.
        </p>
      </div>
    </PageShell>
  );
}
