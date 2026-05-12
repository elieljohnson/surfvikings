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
          Surf Vikings is a hyper-local forecast engine for Northern California surfers, Salt Point
          to Santa Cruz. 64 spots, each with its own bathymetry, swell shadow, and tide dependency
          encoded into the scoring model. Built on free public data: wave and weather forecasts from
          NOAA NDBC, NOAA CO-OPS tides, NOAA NWS coastal waters, and Open-Meteo; water-quality
          results from Sonoma County Environmental Health, SFPUC, San Mateo County, Marin
          County Environmental Health, and Santa Cruz County Environmental Health.
        </p>
        <p style={{ marginTop: 16, fontSize: 17, color: '#64748B', lineHeight: 1.6 }}>
          The whole point is to answer one question: should I go now, or wait.
        </p>
        <p style={{ marginTop: 16, fontSize: 17, color: '#64748B', lineHeight: 1.6 }}>
          I built it myself in Cursor and Claude Code, deployed on Vercel. I'm a designer by trade,
          not an engineer, and the site is partly a working forecast and partly a place to learn by
          building. That's why there's a Games tab. I'm teaching my kids HTML and JavaScript by
          making small games together, and they live here. The Merch tab is the same impulse: a real
          store is a better way to learn e-commerce than a tutorial.
        </p>
        <p style={{ marginTop: 16, fontSize: 17, color: '#64748B', lineHeight: 1.6 }}>
          If something breaks, that's why. If something works, that's also why.
        </p>
        <p style={{ marginTop: 16, fontSize: 17, color: '#64748B', lineHeight: 1.6 }}>
          — Eliel
        </p>
      </div>
    </PageShell>
  );
}
