import React from 'react';
import { PageShell } from './PageShell';

interface Game {
  slug: string;
  title: string;
  desc: string;
  emoji: string;
}

const GAMES: Game[] = [
  {
    slug: 'land-raid',
    title: 'Land Raid',
    desc: 'Vikings vs. the shore. Fast-paced browser arcade.',
    emoji: '⚔️',
  },
  {
    slug: 'shark-attack',
    title: 'Shark Attack',
    desc: 'Outswim the apex predator. How long can you survive?',
    emoji: '🦈',
  },
];

export function Games() {
  return (
    <PageShell activeNav="games">
      <div style={{
        maxWidth: 960, margin: '0 auto',
        padding: '80px 24px',
      }}>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em' }}>Games</h1>
        <p style={{ marginTop: 12, fontSize: 17, color: '#64748B', maxWidth: 520 }}>
          Browser-based Surf Vikings arcade games. No install, no login, just open and play.
        </p>

        <div style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {GAMES.map((g) => (
            <a
              key={g.slug}
              href={`/games/${g.slug}.html`}
              style={{
                display: 'block',
                padding: 24,
                borderRadius: 14,
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                textDecoration: 'none',
                color: '#0F172A',
                transition: 'border-color 120ms ease, transform 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#06B6D4'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>{g.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{g.title}</div>
              <div style={{ fontSize: 14, color: '#64748B', marginBottom: 12 }}>{g.desc}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#06B6D4' }}>Play →</div>
            </a>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
