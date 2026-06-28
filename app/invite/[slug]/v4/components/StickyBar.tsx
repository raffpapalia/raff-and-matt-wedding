'use client';

import { useEffect, useState } from 'react';
import Button from './Button';
import { tokens } from '../tokens';

interface StickyBarProps {
  coupleNames: string;
  rightHref: string;
  rightLabel: string;
  rightVariant?: 'solid' | 'ghost';
  // Opt-in: the bar starts fully transparent and non-interactive, then fades
  // in (opacity + pointer-events) once the user scrolls past the hero. Stays
  // in the DOM from load for SEO/accessibility — only its visibility toggles.
  // Defaults to false so the bar's existing always-visible behaviour on the
  // pre-wedding and thank-you pages is unaffected.
  hideUntilScroll?: boolean;
}

// Fixed header bar shared by the invitation and pre-wedding pages — couple name
// on the left (fades to a solid backdrop after a small scroll), a single CTA on
// the right that each page configures for its own primary action.
export default function StickyBar({ coupleNames, rightHref, rightLabel, rightVariant = 'solid', hideUntilScroll = false }: StickyBarProps) {
  const [name1, name2] = coupleNames.includes(' & ') ? coupleNames.split(' & ') : [coupleNames, ''];
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    function onScroll() {
      setSolid(window.scrollY > (hideUntilScroll ? 80 : 40));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideUntilScroll]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        padding: '12px clamp(20px, 5.5vw, 90px)',
        // rgba(15,67,49,...) is tokens.greenDeep (#0F4331) decomposed for alpha compositing.
        background: solid ? 'rgba(15,67,49,.92)' : `linear-gradient(${tokens.greenDeep}, rgba(15,67,49,0))`,
        backdropFilter: solid ? 'blur(10px)' : undefined,
        boxShadow: solid ? '0 1px 0 rgba(226,178,60,.18)' : undefined,
        opacity: hideUntilScroll ? (solid ? 1 : 0) : 1,
        pointerEvents: hideUntilScroll && !solid ? 'none' : 'auto',
        transition: 'opacity 0.3s ease, background-color 0.3s, backdrop-filter 0.3s',
      }}
    >
      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontFamily: tokens.display, fontWeight: 600, fontSize: '1rem', letterSpacing: '0.02em' }}>
          <span style={{ color: tokens.violet }}>{name1.charAt(0).toUpperCase()}</span>
          <span style={{ color: tokens.persimmon }}> &amp; </span>
          <span style={{ color: tokens.violet }}>{name2.charAt(0).toUpperCase()}</span>
        </span>
        <span style={{ color: tokens.muted, margin: '0 7px' }}>·</span>
        <span style={{ fontFamily: tokens.grotesque, fontWeight: 500, fontSize: '0.78rem', color: tokens.sand }}>
          ten 7 twenty 7
        </span>
      </div>
      <div style={{ flexShrink: 0 }}>
        <Button href={rightHref} variant={rightVariant}>
          {rightLabel}
        </Button>
      </div>
    </div>
  );
}
