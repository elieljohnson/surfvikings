import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '../components/Logo';

/** Tiny media-query hook for responsive behavior without a CSS framework. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

type NavKey = 'home' | 'app' | 'merch' | 'games' | 'about';

interface PageShellProps {
  activeNav?: NavKey;
  /** When true, header sits transparently over a dark hero; text is white. */
  transparentHeader?: boolean;
  children: React.ReactNode;
}

const NAV: { key: NavKey; label: string; to: string }[] = [
  { key: 'home',  label: 'Home',     to: '/' },
  { key: 'app',   label: 'Forecast', to: '/app' },
  { key: 'merch', label: 'Merch',    to: '/merch' },
  { key: 'games', label: 'Games',    to: '/games' },
  { key: 'about', label: 'About',    to: '/about' },
];

const TEAL = '#0891B2';      // cyan-600, matches legacy surfvikings.com
const TEAL_DARK = '#0E7490'; // cyan-700

/**
 * Marketing-site shell used by /, /merch, /about, /games.
 * PWA at /app/* uses its own Screen primitive and does NOT render this.
 *
 * transparentHeader: for the Landing page, the header overlays the
 * dark hero photo. After scroll, it becomes a solid white pill.
 */
export function PageShell({ activeNav, transparentHeader, children }: PageShellProps) {
  const location = useLocation();
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
      <TopNav active={active} transparent={!!transparentHeader} />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

function TopNav({ active, transparent }: { active: NavKey; transparent: boolean }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const isNarrow = useMediaQuery('(max-width: 768px)');

  React.useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparent]);

  // Close mobile menu when route changes
  const location = useLocation();
  React.useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const overHero = transparent && !scrolled;
  const headerBg = overHero ? 'transparent' : 'rgba(255, 255, 255, 0.9)';
  const borderColor = overHero ? 'transparent' : '#E2E8F0';
  const textColor = overHero ? '#FFFFFF' : '#0F172A';
  const mutedText = overHero ? 'rgba(255,255,255,0.78)' : '#64748B';

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: headerBg,
      backdropFilter: overHero ? 'none' : 'blur(16px) saturate(1.6)',
      WebkitBackdropFilter: overHero ? 'none' : 'blur(16px) saturate(1.6)',
      borderBottom: `1px solid ${borderColor}`,
      color: textColor,
      paddingTop: 'env(safe-area-inset-top)',
      transition: 'background 180ms ease, border-color 180ms ease, color 180ms ease',
    }}>
      <nav style={{
        maxWidth: 1200, margin: '0 auto',
        padding: isNarrow ? '12px 16px' : '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          textDecoration: 'none', color: 'inherit',
          fontWeight: 800, fontSize: isNarrow ? 16 : 18, letterSpacing: '-0.02em',
          flexShrink: 0,
        }}>
          <Logo size={isNarrow ? 26 : 30} />
          <span>Surf Vikings</span>
        </Link>

        {/* Desktop nav — hidden on narrow viewports */}
        {!isNarrow && (
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {NAV.slice(1).map((item) => {
              const isActive = active === item.key;
              return (
                <Link key={item.key} to={item.to} style={{
                  padding: '8px 12px', borderRadius: 8,
                  textDecoration: 'none',
                  color: isActive ? textColor : mutedText,
                  background: isActive && !overHero ? '#F1F5F9' :
                              isActive && overHero   ? 'rgba(255,255,255,0.14)' : 'transparent',
                  fontWeight: 500, fontSize: 14,
                  transition: 'color 120ms ease',
                  whiteSpace: 'nowrap',
                }}>{item.label}</Link>
              );
            })}
            <Link to="/app" style={ctaStyle(false)}
              onMouseEnter={(e) => { e.currentTarget.style.background = TEAL_DARK; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = TEAL; }}
            >Open app →</Link>
          </div>
        )}

        {/* Mobile: compact CTA + hamburger */}
        {isNarrow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/app" style={ctaStyle(true)}>Open app</Link>
            <button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: overHero ? 'rgba(255,255,255,0.14)' : '#F1F5F9',
                border: 'none', cursor: 'pointer',
                color: textColor,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <HamburgerIcon open={menuOpen}/>
            </button>
          </div>
        )}
      </nav>

      {/* Mobile drawer */}
      {isNarrow && menuOpen && (
        <div style={{
          borderTop: `1px solid ${overHero ? 'rgba(255,255,255,0.12)' : '#E2E8F0'}`,
          background: overHero ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '8px 16px 16px',
          display: 'flex', flexDirection: 'column',
        }}>
          {NAV.slice(1).map((item) => {
            const isActive = active === item.key;
            return (
              <Link key={item.key} to={item.to} style={{
                padding: '14px 8px', textDecoration: 'none',
                color: isActive ? textColor : mutedText,
                fontWeight: isActive ? 600 : 500, fontSize: 16,
                borderBottom: `1px solid ${overHero ? 'rgba(255,255,255,0.08)' : '#F1F5F9'}`,
              }}>{item.label}</Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

function ctaStyle(compact: boolean): React.CSSProperties {
  return {
    padding: compact ? '8px 14px' : '9px 16px',
    borderRadius: 999,
    background: TEAL,
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: compact ? 13 : 14,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    transition: 'background 120ms ease',
    WebkitTapHighlightColor: 'transparent',
  };
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <line x1="3" y1={open ? 10 : 6}  x2="17" y2={open ? 10 : 6}  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        style={{ transition: 'transform 160ms ease, y 160ms ease', transform: open ? 'rotate(45deg)' : 'rotate(0)', transformOrigin: '10px 10px' }} />
      <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        style={{ opacity: open ? 0 : 1, transition: 'opacity 120ms ease' }} />
      <line x1="3" y1={open ? 10 : 14} x2="17" y2={open ? 10 : 14} stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        style={{ transition: 'transform 160ms ease, y 160ms ease', transform: open ? 'rotate(-45deg)' : 'rotate(0)', transformOrigin: '10px 10px' }} />
    </svg>
  );
}

function Footer() {
  const isNarrow = useMediaQuery('(max-width: 768px)');
  return (
    <footer style={{
      background: '#0F172A',
      color: '#CBD5E1',
      padding: isNarrow ? '48px 20px 24px' : '64px 24px 32px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : 'minmax(220px, 1.5fr) repeat(3, 1fr)',
          gap: isNarrow ? 32 : 40,
          marginBottom: isNarrow ? 32 : 48,
        }}>
          <div>
            <Link to="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              textDecoration: 'none', color: '#FFFFFF',
              fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em',
              marginBottom: 12,
            }}>
              <Logo size={28} />
              Surf Vikings
            </Link>
            <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', lineHeight: 1.6, maxWidth: 280 }}>
              Hyper-local surf forecasts for Northern California. Built with free public data, designed for local surfers.
            </p>
          </div>

          <FooterCol title="Product">
            <FooterLink to="/app">Forecast app</FooterLink>
            <FooterLink to="/merch">Merch store</FooterLink>
            <FooterLink to="/games">Arcade</FooterLink>
          </FooterCol>

          <FooterCol title="Company">
            <FooterLink to="/about">About</FooterLink>
            <FooterLink href="mailto:hello@surfvikings.com" external>Contact</FooterLink>
            <FooterLink href="https://surfvikings.printful.me" external>Shop (Printful)</FooterLink>
          </FooterCol>

          <FooterCol title="Data sources">
            <FooterSubhead>Forecasts</FooterSubhead>
            <FooterLink href="https://www.ndbc.noaa.gov" external>NOAA NDBC</FooterLink>
            <FooterLink href="https://tidesandcurrents.noaa.gov" external>NOAA CO-OPS</FooterLink>
            <FooterLink href="https://www.weather.gov/marine/" external>NOAA NWS Marine</FooterLink>
            <FooterLink href="https://open-meteo.com" external>Open-Meteo</FooterLink>
            <FooterSubhead>Water quality</FooterSubhead>
            <FooterLink href="https://sonomacounty.gov/health-and-human-services/health-services/divisions/public-health/environmental-health/programs-and-services/ocean-water-quality" external>Sonoma County EH</FooterLink>
            <FooterLink href="https://sfwater.org" external>SFPUC</FooterLink>
            <FooterLink href="https://www.smchealth.org/" external>San Mateo County</FooterLink>
            <FooterLink href="https://www.marincounty.gov/departments/cda/env-health-svcs/prgm-beach-water-monitoring" external>Marin County EH</FooterLink>
          </FooterCol>
        </div>

        <div style={{
          borderTop: '1px solid #1E293B',
          paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 16, flexWrap: 'wrap',
          fontSize: 12, color: '#64748B',
        }}>
          <div>© 2026 Surf Vikings. Designed in Northern California.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <span>Built with live public data</span>
            <span>·</span>
            <span>No ads, no trackers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#FFFFFF', marginBottom: 14,
      }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

/** Inline subheading inside a FooterCol — used by the Data sources column
 *  to visually separate forecast sources from water-quality sources without
 *  introducing a second column (which would break the 4-col footer grid). */
function FooterSubhead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: '#94A3B8',
      marginTop: 4, marginBottom: -2,
    }}>{children}</div>
  );
}

function FooterLink({
  to, href, external, children,
}: { to?: string; href?: string; external?: boolean; children: React.ReactNode }) {
  const style: React.CSSProperties = {
    fontSize: 13, color: '#CBD5E1', textDecoration: 'none',
    transition: 'color 120ms ease',
  };
  const onEnter = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = '#FFFFFF'; };
  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = '#CBD5E1'; };
  if (external && href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</a>;
  }
  return <Link to={to ?? '/'} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</Link>;
}
