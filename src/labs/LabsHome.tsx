// Labs — the gallery.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LabsLayout } from './LabsLayout';
import { EXPERIMENTS, Experiment } from './registry';
import { LABS, MONO } from './theme';

export function LabsHome() {
  return (
    <LabsLayout title="Experiments" onGallery>
      <div style={{
        fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: LABS.cyan, marginBottom: 14,
      }}>Surf Vikings Labs</div>

      <h1 style={{
        margin: 0, fontSize: 'clamp(28px, 4.6vw, 44px)', lineHeight: 1.1, fontWeight: 700,
        letterSpacing: '-0.03em', maxWidth: 740,
      }}>Six ways to look at the same swell.</h1>

      <p style={{
        margin: '18px 0 0', fontSize: 16, lineHeight: 1.6, color: LABS.inkDim, maxWidth: 600,
      }}>
        Each experiment takes the live NorCal forecast — the same data the app runs on —
        and asks a different question of it. They share one foundation: the spot knowledge
        and the quality score the forecast already uses. Six views, one engine. The lineage
        runs through Tufte, Bostock, Stamen, and McCandless: a finding stated plainly, every
        channel earning its place, and the method always open to inspection.
      </p>

      <div style={{
        marginTop: 36,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: 16,
      }}>
        {EXPERIMENTS.map((e) => <ExperimentCard key={e.slug} exp={e} />)}
      </div>
    </LabsLayout>
  );
}

export default LabsHome;

function ExperimentCard({ exp }: { exp: Experiment }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      to={`/labs/${exp.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: 20, borderRadius: 13, textDecoration: 'none',
        background: hover ? LABS.panel2 : LABS.panel,
        border: `1px solid ${hover ? LABS.cyan : LABS.line}`,
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'background 130ms ease, border-color 130ms ease, transform 130ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: MONO, fontSize: 12, fontWeight: 600, color: LABS.cyan,
        }}>{exp.num}</span>
        <span style={{
          fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: LABS.inkMute,
        }}>{exp.register}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: LABS.ink }}>
        {exp.title}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: LABS.inkDim }}>
        {exp.finding}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: LABS.inkMute, marginTop: 2 }}>
        {exp.blurb}
      </div>
      <div style={{
        marginTop: 'auto', paddingTop: 8,
        fontFamily: MONO, fontSize: 12, fontWeight: 600,
        color: hover ? LABS.cyanHi : LABS.cyan,
      }}>Open experiment →</div>
    </Link>
  );
}
