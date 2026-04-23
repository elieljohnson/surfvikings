import React from 'react';
import { PageShell } from './PageShell';

export function Merch() {
  return (
    <PageShell activeNav="merch">
      <div style={{
        minHeight: '70vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px', textAlign: 'center', gap: 16,
      }}>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em' }}>Merch</h1>
        <p style={{ margin: 0, fontSize: 17, color: '#64748B', maxWidth: 480 }}>
          Shop Surf Vikings gear — tees, hoodies, hats, stickers, and more.
        </p>
        <a
          href="https://surfvikings.printful.me"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: 16,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 24px', borderRadius: 999,
            background: '#06B6D4', color: '#FFFFFF',
            fontSize: 15, fontWeight: 600, textDecoration: 'none',
          }}
        >
          Browse all 22 products →
        </a>
      </div>
    </PageShell>
  );
}
