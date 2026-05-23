import React from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from './PageShell';

const TEAL = '#0891B2';      // cyan-600, matches legacy surfvikings.com
const TEAL_DARK = '#0E7490'; // cyan-700, deeper hover
const INK = '#0F172A';
const MUTED = '#64748B';
const SURFACE = '#F8FAFC';

export function Landing() {
  return (
    <PageShell activeNav="home" transparentHeader>
      <Hero />
      <FeatureSection
        eyebrow="Per-spot bathymetry"
        headline="Every break has its own profile."
        body="64 NorCal surf spots, Salt Point to Santa Cruz. Each with hardcoded coefficients for bathymetry, swell shadow, tide dependency, and wind exposure. Generic models say &ldquo;4ft at 12s.&rdquo; Surf Vikings tells you what that swell does at The Patch vs The Groin vs Ocean Beach. Different math, different answers, one app."
        imageAlt="Spot detail screen showing Why This Score breakdown"
        imageSlug="spot-detail"
        reversed={false}
      />
      <FeatureSection
        eyebrow="Best Window detection"
        headline="Know exactly when to paddle out."
        body="The score engine runs every spot across a 7-day forecast. When a clean window opens, the app finds it and labels it: tide rising into optimal, swell peaking, wind dropping below 10 kts. No more guessing which hour to set the alarm for."
        imageSlug="dashboard"
        imageAlt="Dashboard showing Top Pick and Best Window cards"
        reversed
      />
      <FeatureSection
        eyebrow="Reads the buoy, not just the model"
        headline="Live spectrum, not a summary."
        body="Most apps trust one summary number from the weather model. On a Bolinas NW groundswell day that summary reads 7 seconds — while the real dominant swell is 14.7. Surf Vikings reads the live NDBC buoy and picks the swell that's actually doing the work. Bolinas Patch jumped from 32 to 49 on the same conditions."
        imageSlug="spot-detail-spectral"
        imageAlt="Spot detail showing multi-train spectral decomposition from buoy 46026"
        reversed={false}
      />
      <FeatureSection
        eyebrow="64 spots · 150 miles"
        headline="Every break from Salt Point to Santa Cruz."
        body="Scan the whole coast at a glance. Colored pins show current quality score per spot, grouped by region. Filter by difficulty to hide spots outside your range. Offline-cached, so the whole map still works in the Bolinas dead zone."
        imageSlug="map"
        imageAlt="Region map showing all 64 spots with colored score pins"
        reversed
      />
      <FeatureSection
        eyebrow="Synchronized scrub"
        headline="One finger, the whole week."
        body="Scrub a 7-day quality heatmap with your thumb and watch swell, period, wind, and tide update in lockstep across four strip charts below it. One gesture, four metrics, the score at every hour. No menus, no drill-downs, no pinching."
        imageSlug="forecast"
        imageAlt="Forecast tab showing 7-day quality heatmap and synchronized metric strip charts"
        reversed={false}
      />
      <DataProof />
      <FeatureGrid />
      <FinalCTA />
    </PageShell>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section style={{
      position: 'relative',
      minHeight: 'calc(100vh - 160px)',
      marginTop: -64, // so hero sits beneath the sticky header, photo bleeds to top
      paddingTop: 64,
      background: '#000',
      overflow: 'hidden',
      isolation: 'isolate',
    }}>
      {/* B&W surfer bg */}
      <picture>
        <source srcSet="/hero-surfer.webp" type="image/webp" />
        <img
          src="/hero-surfer.jpg"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 30%',
            zIndex: -2,
          }}
        />
      </picture>
      {/* Dark gradient overlay — stronger at bottom for text contrast */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: -1,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)',
      }}/>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '48px 24px 80px',
        minHeight: 'calc(100vh - 400px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        color: '#FFFFFF',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
          alignSelf: 'flex-start',
          fontSize: 13, fontWeight: 500, letterSpacing: '0.02em',
          marginBottom: 24,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#10B981', boxShadow: '0 0 8px #10B981',
          }}/>
          Live NOAA data · Free forever
        </div>

        <h1 style={{
          margin: 0,
          fontSize: 'clamp(44px, 7vw, 88px)',
          fontWeight: 800,
          letterSpacing: '-0.035em',
          lineHeight: 1.02,
          maxWidth: 900,
        }}>
          Read the water<br/>
          <span style={{ color: TEAL }}>like a local.</span>
        </h1>

        <p style={{
          margin: '24px 0 0',
          fontSize: 'clamp(16px, 1.4vw, 19px)',
          color: 'rgba(255,255,255,0.85)',
          maxWidth: 620,
          lineHeight: 1.5,
        }}>
          Hyper-local surf forecasts from Salt Point to Santa Cruz. 64 breaks, each with its own scoring model. Built for NorCal surfers who already know that &ldquo;good&rdquo; at Rodeo isn&rsquo;t &ldquo;good&rdquo; at The Patch.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap' }}>
          <Link
            to="/app"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '16px 28px', borderRadius: 999,
              background: TEAL, color: '#FFFFFF',
              fontSize: 16, fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 8px 24px -8px rgba(6,182,212,0.55)',
              transition: 'background 120ms ease, transform 120ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = TEAL_DARK; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = TEAL; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Open the forecast →
          </Link>
          <a
            href="#how-it-works"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '16px 24px', borderRadius: 999,
              background: 'rgba(255,255,255,0.1)', color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.25)',
              fontSize: 16, fontWeight: 500, textDecoration: 'none',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            How it works ↓
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Feature Sections (getslopes-style alternating) ──────────────── */

function FeatureSection({
  eyebrow, headline, body, imageSlug, imageAlt, reversed,
}: {
  eyebrow: string; headline: string; body: string;
  imageSlug: string; imageAlt: string; reversed: boolean;
}) {
  const isNarrow = useLandingNarrow();
  // On narrow viewports, always stack: text on top, phone below.
  // On wide, honor `reversed` to alternate left/right for visual rhythm.
  const textOrder = isNarrow ? 1 : (reversed ? 2 : 1);
  const imageOrder = isNarrow ? 2 : (reversed ? 1 : 2);

  return (
    <section id="how-it-works" style={{
      padding: isNarrow ? '40px 20px' : '100px 24px',
      background: '#FFFFFF',
      borderTop: '1px solid #F1F5F9',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'flex', flexWrap: 'wrap',
        gap: isNarrow ? 20 : 64, alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          flex: '1 1 380px', minWidth: 0,
          order: textOrder,
        }}>
          <div style={{
            color: TEAL, fontSize: 14, fontWeight: 600,
            letterSpacing: '0.02em', marginBottom: 12,
          }}>{eyebrow}</div>
          <h2 style={{
            margin: 0, fontSize: 'clamp(28px, 3.6vw, 44px)',
            fontWeight: 800, letterSpacing: '-0.03em',
            color: INK, lineHeight: 1.1,
          }}>{headline}</h2>
          <p style={{
            margin: '20px 0 0', fontSize: 17, color: MUTED,
            lineHeight: 1.6, maxWidth: 520,
          }}>{body}</p>
        </div>
        <div style={{
          flex: '0 0 auto',
          display: 'flex', justifyContent: 'center',
          order: imageOrder,
          maxWidth: '100%',
        }}>
          <PhoneMockup imageSlug={imageSlug} imageAlt={imageAlt}/>
        </div>
      </div>
    </section>
  );
}

function useLandingNarrow() {
  const [narrow, setNarrow] = React.useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 768px)');
    const on = () => setNarrow(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return narrow;
}

/**
 * iPhone-proportioned device mockup (19.5:9 aspect). Inside, a screenshot
 * loads via <picture> with WebP preferred, PNG fallback. Screenshots are
 * regenerated by `npm run screenshots` (Playwright → public/screenshots/).
 */
function PhoneMockup({ imageSlug, imageAlt }: { imageSlug: string; imageAlt: string }) {
  // Screenshots are captured at iPhone 14 Pro viewport (393×852 CSS px).
  // Match the inner bezel to that exact aspect so the image fills without cropping.
  const BEZEL = 8;
  const INNER_W = 264;
  const INNER_H = Math.round(INNER_W * (852 / 393)); // = 573
  const DEVICE_W = INNER_W + BEZEL * 2; // 280
  const DEVICE_H = INNER_H + BEZEL * 2; // 589
  return (
    <div style={{
      width: DEVICE_W, height: DEVICE_H,
      borderRadius: 40,
      background: '#0F172A',
      padding: BEZEL,
      boxShadow: '0 40px 80px -20px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.15)',
      position: 'relative',
      flexShrink: 0,
    }}>
      <div style={{
        width: '100%', height: '100%',
        borderRadius: 32,
        overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(160deg, ${TEAL} 0%, ${INK} 100%)`,
      }}>
        <picture>
          <source srcSet={`/screenshots/${imageSlug}.webp`} type="image/webp" />
          <img
            src={`/screenshots/${imageSlug}.png`}
            alt={imageAlt}
            loading="lazy"
            decoding="async"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'top center',
              display: 'block',
            }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
          />
        </picture>
      </div>
    </div>
  );
}

/* ─── Data Proof Strip ────────────────────────────────────────────── */

function DataProof() {
  const stats: { n: string; label: string }[] = [
    { n: '64', label: 'NorCal surf spots' },
    { n: '7', label: 'NOAA buoys' },
    { n: '47', label: 'Spectral bins' },
    { n: '5', label: 'Water quality counties' },
    { n: '7d', label: 'Forecast horizon' },
  ];
  return (
    <section style={{
      background: SURFACE,
      padding: '64px 24px',
      borderTop: '1px solid #F1F5F9',
      borderBottom: '1px solid #F1F5F9',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 32,
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'clamp(36px, 4.5vw, 56px)',
              fontWeight: 800, letterSpacing: '-0.03em',
              color: INK, lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>{s.n}</div>
            <div style={{
              fontSize: 13, color: MUTED, marginTop: 8,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: 500,
            }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Feature Grid ────────────────────────────────────────────────── */

function FeatureGrid() {
  const features: { title: string; body: string; icon: string }[] = [
    { icon: '🌊', title: 'Bolinas sub-breaks',     body: 'Patch, Jetty, and Groin scored independently. Same swell, three answers.' },
    { icon: '📅', title: 'Calendar feed',          body: 'Subscribe to your spots in Apple, Google, or Outlook Calendar. Pre-event alerts on your watch, lock screen, even CarPlay.' },
    { icon: '🔍', title: 'Tap to explain',         body: 'Why does Direction score 11/30? Period 8/20? Tap any row in Why-This-Score. Plain English. The math is right there.' },
    { icon: '🆓', title: 'Free forever',           body: 'No paywall, no premium tier. All data is public.' },
    { icon: '🔒', title: 'Privacy-first',          body: 'No accounts, no tracking, no ads. Your spots stay on your device.' },
    { icon: '📱', title: 'No app store',           body: 'Install straight from the browser. Works on iOS, Android, desktop.' },
    { icon: '🔌', title: 'Works offline',          body: 'Tide and forecast cached for the dead zones.' },
    { icon: '💧', title: 'Water quality',          body: 'Weekly bacteria results from 5 county health departments. Know before you paddle out.' },
  ];
  return (
    <section style={{
      padding: '100px 24px',
      background: '#FFFFFF',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{
            margin: 0, fontSize: 'clamp(28px, 3.6vw, 44px)',
            fontWeight: 800, letterSpacing: '-0.03em', color: INK,
          }}>And a whole lot more.</h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
        }}>
          {features.map((f) => (
            <div key={f.title} style={{
              padding: 24,
              borderRadius: 14,
              background: SURFACE,
              border: '1px solid #F1F5F9',
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: INK, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ───────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section style={{
      padding: '120px 24px',
      background: '#0F172A',
      color: '#FFFFFF',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{
          margin: 0, fontSize: 'clamp(32px, 4.2vw, 52px)',
          fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05,
        }}>
          Ready to read<br/>
          the water?
        </h2>
        <p style={{
          margin: '20px auto 0', fontSize: 17, color: '#94A3B8',
          lineHeight: 1.5, maxWidth: 520,
        }}>
          Open the forecast, add it to your home screen, and check it before dawn.
          No accounts. No cost. Just better surf intel.
        </p>
        <div style={{ marginTop: 36 }}>
          <Link
            to="/app"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '18px 32px', borderRadius: 999,
              background: TEAL, color: '#FFFFFF',
              fontSize: 17, fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 12px 32px -8px rgba(6,182,212,0.6)',
              transition: 'background 120ms ease, transform 120ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = TEAL_DARK; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = TEAL; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Open the forecast →
          </Link>
        </div>
      </div>
    </section>
  );
}
