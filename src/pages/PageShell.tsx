import React from 'react';
import { Link, useLocation } from 'react-router-dom';

type NavKey = 'home' | 'app' | 'merch' | 'games' | 'about';

interface PageShellProps {
  activeNav?: NavKey;
  children: React.ReactNode;
}

const NAV: { key: NavKey; label: string; to: string; external?: boolean }[] = [
  { key: 'home',  label: 'Home',    to: '/' },
  { key: 'app',   label: 'Forecast', to: '/app' },
  { key: 'merch', label: 'Merch',   to: '/merch' },
  { key: 'games', label: 'Games',   to: '/games' },
  { key: 'about', label: 'About',   to: '/about' },
];

/**
 * Marketing-site shell used by /, /merch, /about, /games.
 * Provides a shared sticky top nav and footer. The PWA at /app/*
 * uses its own shell (Screen primitive) and does NOT render this.
 *
 * Aesthetic: light/photographic. Teal (#06B6D4 cyan-500) for primary
 * action color. The dark aesthetic is reserved for the PWA so the
 * two experiences have distinct moods.
 */
export function PageShell({ activeNav, children }: PageShellProps) {
  const location = useLocation();
  // Infer active from path if not explicitly set
  const active: NavKey = activeNav ?? (
    location.pathname === '/'       ? 'home'  :
    location.pathname.startsWith('/app')   ? 'app'   :
    location.pathname.startsWith('/merch') ? 'merch' :
    location.pathname.startsWith('/games') ? 'games' :
    location.pathname.startsWith('/about') ? 'about' : 'home'
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      color: '#0F172A',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
      letterSpacing: '-0.01em',
    }}>
      <TopNav active={active} />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

function TopNav({ active }: { active: NavKey }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid #E2E8F0',
    }}>
      <nav style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
      }}>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          textDecoration: 'none', color: '#0F172A',
          fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em',
        }}>
          <img src="/favicon.svg" alt="" width={28} height={28} style={{ display: 'block' }}/>
          Surf Vikings
        </Link>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {NAV.slice(1).map((item) => {
            const isActive = active === item.key;
            return (
              <Link key={item.key} to={item.to} style={{
                padding: '8px 14px', borderRadius: 8,
                textDecoration: 'none',
                color: isActive ? '#0F172A' : '#64748B',
                background: isActive ? '#F1F5F9' : 'transparent',
                fontWeight: 500, fontSize: 14,
              }}>{item.label}</Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #E2E8F0',
      padding: '40px 24px',
      color: '#64748B', fontSize: 13,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div>© 2026 Surf Vikings. Designed in NorCal.</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="mailto:hello@surfvikings.com" style={{ color: '#64748B', textDecoration: 'none' }}>hello@surfvikings.com</a>
          <a href="https://surfvikings.printful.me" target="_blank" rel="noopener noreferrer" style={{ color: '#64748B', textDecoration: 'none' }}>Merch →</a>
        </div>
      </div>
    </footer>
  );
}
