// Labs — the section shell.
//
// Labs is unlisted: it lives at /labs, is linked from nowhere in the site
// nav, and carries a noindex tag so search engines skip it. Anyone with the
// URL can see it; nobody stumbles in. When Labs goes public, delete the
// useNoIndex() call and add a nav link — nothing else changes.
//
// The shell runs dark — Labs is a gallery, a different register from the
// light marketing site.

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { LABS, MONO, SANS } from './theme';

/** Inject robots:noindex for as long as a Labs page is mounted, then clean
 *  up. Belt-and-suspenders with public/robots.txt — a meta tag covers
 *  crawlers that fetched the SPA shell before robots.txt was read. */
function useNoIndex(title: string) {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = `${title} · Surf Vikings Labs`;
    return () => {
      document.head.removeChild(meta);
      document.title = prevTitle;
    };
  }, [title]);
}

interface LabsLayoutProps {
  /** Page title — also drives the document title. */
  title: string;
  /** When set, shows a back-to-Labs crumb instead of the gallery being home. */
  onGallery?: boolean;
  children: React.ReactNode;
}

export function LabsLayout({ title, onGallery, children }: LabsLayoutProps) {
  useNoIndex(title);
  return (
    <div style={{
      minHeight: '100vh', background: LABS.bg, color: LABS.ink,
      fontFamily: SANS, letterSpacing: '-0.01em',
      display: 'flex', flexDirection: 'column',
    }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(7,10,14,0.86)', backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${LABS.line}`,
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto', padding: '13px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <Link to="/labs" style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            textDecoration: 'none', color: LABS.ink, fontWeight: 700, fontSize: 16,
            letterSpacing: '-0.02em',
          }}>
            <Logo size={24} />
            <span>Surf Vikings</span>
            <span style={{
              fontFamily: MONO, fontSize: 11, fontWeight: 500, color: LABS.cyan,
              border: `1px solid ${LABS.line}`, borderRadius: 5, padding: '2px 7px',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>Labs</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {!onGallery && (
              <Link to="/labs" style={{
                fontFamily: MONO, fontSize: 12, color: LABS.inkDim, textDecoration: 'none',
              }}>← All experiments</Link>
            )}
            <a href="/app" style={{
              fontFamily: MONO, fontSize: 12, color: LABS.inkMute, textDecoration: 'none',
            }}>Forecast app ↗</a>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 1120, margin: '0 auto', padding: '34px 22px 72px' }}>
        {children}
      </main>

      <footer style={{
        borderTop: `1px solid ${LABS.line}`, padding: '22px',
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', gap: '8px 18px', justifyContent: 'space-between',
          fontFamily: MONO, fontSize: 11, color: LABS.inkMute,
        }}>
          <span>Surf Vikings Labs — dataviz experiments · unlisted preview</span>
          <span>Built on live public data · no key, no account</span>
        </div>
      </footer>
    </div>
  );
}
