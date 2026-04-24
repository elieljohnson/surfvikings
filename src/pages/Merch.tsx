import React from 'react';
import { PageShell } from './PageShell';
import { MERCH_PRODUCTS, MerchProduct } from '../lib/merch-products';

const TEAL = '#0891B2';
const TEAL_DARK = '#0E7490';
const INK = '#0F172A';
const MUTED = '#64748B';
const SURFACE = '#F8FAFC';

const STORE_URL = 'https://surfvikings.printful.me';

/** Narrow-viewport hook, mirroring the one in Landing/PageShell. */
function useNarrow() {
  const [narrow, setNarrow] = React.useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false,
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

export function Merch() {
  // Hero collage: hand-pick a visually varied lineup for the top row.
  // Prefer the flagship pieces — tee, hoodie, rash guard, hat, towel, sticker.
  const heroSlugs = ['og-tee', 'premium-hoodie', 'mens-rash-guard', 'snapback', 'beach-towel', 'die-cut-stickers'];
  const heroProducts = heroSlugs
    .map((s) => MERCH_PRODUCTS.find((p) => p.slug === s))
    .filter(Boolean) as MerchProduct[];

  return (
    <PageShell activeNav="merch">
      <Hero products={heroProducts} />
      <ProductGrid />
    </PageShell>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────── */

function Hero({ products }: { products: MerchProduct[] }) {
  const isNarrow = useNarrow();
  return (
    <section style={{
      background: `linear-gradient(180deg, ${INK} 0%, #1E293B 100%)`,
      color: '#FFFFFF',
      padding: isNarrow ? '56px 20px 40px' : '96px 24px 72px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.16)',
          fontSize: 13, fontWeight: 500, letterSpacing: '0.02em',
          marginBottom: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
          Shipped worldwide · Printful fulfillment
        </div>
        <h1 style={{
          margin: 0, fontSize: 'clamp(36px, 6vw, 72px)',
          fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.02,
          maxWidth: 820,
        }}>
          Surf Vikings merch<br/>
          <span style={{ color: TEAL }}>Conquer the waves.</span>
        </h1>
        <p style={{
          margin: '24px 0 0', fontSize: 'clamp(16px, 1.4vw, 19px)',
          color: 'rgba(255,255,255,0.88)', maxWidth: 680, lineHeight: 1.55,
        }}>
          Born in the cold waters of Northern California, Surf Vikings represents the spirit of adventure and resilience. Our gear is forged for warriors who face the elements head-on, whether in icy Nordic breaks or tropical paradise.
        </p>
        <p style={{
          margin: '16px 0 0', fontSize: 'clamp(15px, 1.3vw, 18px)',
          color: 'rgba(255,255,255,0.7)', maxWidth: 620, lineHeight: 1.5,
        }}>
          Tees, hoodies, hats, rash guards, water bottles, stickers. Printed on demand — every order is made fresh in the US, no inventory waste.
        </p>

        {/* Product collage — horizontally scrolling strip on mobile, grid on desktop */}
        <div style={{
          marginTop: isNarrow ? 40 : 56,
          display: isNarrow ? 'flex' : 'grid',
          gridTemplateColumns: isNarrow ? undefined : 'repeat(6, 1fr)',
          gap: isNarrow ? 12 : 16,
          overflowX: isNarrow ? 'auto' : 'visible',
          scrollSnapType: isNarrow ? 'x mandatory' : undefined,
          scrollPadding: isNarrow ? 20 : undefined,
          marginLeft: isNarrow ? -20 : undefined,
          marginRight: isNarrow ? -20 : undefined,
          paddingLeft: isNarrow ? 20 : undefined,
          paddingRight: isNarrow ? 20 : undefined,
          paddingBottom: isNarrow ? 8 : undefined,
        }}>
          {products.map((p) => (
            <HeroTile key={p.slug} product={p} narrow={isNarrow} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: isNarrow ? 32 : 40, flexWrap: 'wrap' }}>
          <a
            href={STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 24px', borderRadius: 999,
              background: TEAL, color: '#FFFFFF',
              fontSize: 15, fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 8px 24px -8px rgba(8, 145, 178, 0.55)',
              transition: 'background 120ms ease, transform 120ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = TEAL_DARK; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = TEAL; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Visit the full store →
          </a>
          <a
            href="#all-products"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 22px', borderRadius: 999,
              background: 'rgba(255,255,255,0.08)', color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 15, fontWeight: 500, textDecoration: 'none',
            }}
          >
            Browse all {MERCH_PRODUCTS.length} ↓
          </a>
        </div>
      </div>
    </section>
  );
}

function HeroTile({ product, narrow }: { product: MerchProduct; narrow: boolean }) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${product.name} — $${product.price}`}
      style={{
        display: 'block',
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 14,
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: '0 12px 32px -12px rgba(0,0,0,0.6)',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        textDecoration: 'none', color: 'inherit',
        flex: narrow ? '0 0 72%' : undefined,
        scrollSnapAlign: narrow ? 'start' : undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 18px 44px -12px rgba(0,0,0,0.7)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 12px 32px -12px rgba(0,0,0,0.6)';
      }}
    >
      <img
        src={product.image}
        alt={product.name}
        loading="eager"
        decoding="async"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {/* Gradient + label overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: 12,
      }}>
        <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
          {product.name}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 500, marginTop: 2 }}>
          ${product.price}
        </div>
      </div>
    </a>
  );
}

/* ─── Full Product Grid ───────────────────────────────────────────── */

function ProductGrid() {
  const isNarrow = useNarrow();

  // Group by category for skimmable browsing.
  const grouped = React.useMemo(() => {
    const order = ['Apparel', 'Headwear', 'Surf Gear', 'Beach', 'Accessories', 'Stickers'];
    const buckets = new Map<string, MerchProduct[]>();
    for (const p of MERCH_PRODUCTS) {
      const arr = buckets.get(p.category) ?? [];
      arr.push(p);
      buckets.set(p.category, arr);
    }
    // Sort each bucket by price descending so flagship items lead.
    for (const arr of buckets.values()) arr.sort((a, b) => b.price - a.price);
    return order
      .filter((c) => buckets.has(c))
      .map((c) => ({ category: c, items: buckets.get(c)! }))
      .concat(
        [...buckets.keys()]
          .filter((c) => !order.includes(c))
          .map((c) => ({ category: c, items: buckets.get(c)! })),
      );
  }, []);

  return (
    <section id="all-products" style={{
      padding: isNarrow ? '48px 20px 80px' : '80px 24px 120px',
      background: '#FFFFFF',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: isNarrow ? 32 : 48 }}>
          <div style={{
            color: TEAL, fontSize: 14, fontWeight: 600,
            letterSpacing: '0.02em', marginBottom: 10,
          }}>The full catalog</div>
          <h2 style={{
            margin: 0, fontSize: 'clamp(28px, 3.4vw, 40px)',
            fontWeight: 800, letterSpacing: '-0.03em', color: INK, lineHeight: 1.1,
          }}>
            {MERCH_PRODUCTS.length} products. All Viking.
          </h2>
          <p style={{
            margin: '14px 0 0', fontSize: 16, color: MUTED,
            lineHeight: 1.55, maxWidth: 620,
          }}>
            Click any item to open its page on our Printful store — pick your color, size, and checkout there. All orders are printed and shipped fresh — no returns, no leftovers.
          </p>
        </div>

        {grouped.map(({ category, items }) => (
          <div key={category} style={{ marginBottom: isNarrow ? 40 : 56 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: isNarrow ? 16 : 20,
              gap: 12, flexWrap: 'wrap',
            }}>
              <h3 style={{
                margin: 0, fontSize: 20, fontWeight: 700,
                letterSpacing: '-0.02em', color: INK,
              }}>{category}</h3>
              <span style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: isNarrow ? 12 : 20,
            }}>
              {items.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: MerchProduct }) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', flexDirection: 'column',
        textDecoration: 'none', color: 'inherit',
        borderRadius: 14,
        overflow: 'hidden',
        background: SURFACE,
        border: '1px solid #F1F5F9',
        transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 14px 32px -18px rgba(15, 23, 42, 0.35)';
        e.currentTarget.style.borderColor = '#E2E8F0';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#F1F5F9';
      }}
    >
      <div style={{
        aspectRatio: '1 / 1',
        background: '#FFFFFF',
        position: 'relative', overflow: 'hidden',
      }}>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: INK, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
          {product.name}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 2,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEAL, fontVariantNumeric: 'tabular-nums' }}>
            ${product.price}
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>
            {product.category}
          </div>
        </div>
      </div>
    </a>
  );
}
