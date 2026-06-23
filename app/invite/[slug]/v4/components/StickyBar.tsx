'use client';

import { useEffect, useState } from 'react';
import Button from './Button';
import { tokens } from '../tokens';

interface StickyBarProps {
  coupleNames: string;
  rightHref: string;
  rightLabel: string;
  rightVariant?: 'solid' | 'ghost';
}

// Fixed header bar shared by the invitation and pre-wedding pages — couple name
// on the left (fades to a solid backdrop after a small scroll), a single CTA on
// the right that each page configures for its own primary action.
export default function StickyBar({ coupleNames, rightHref, rightLabel, rightVariant = 'solid' }: StickyBarProps) {
  const [name1, name2] = coupleNames.includes(' & ') ? coupleNames.split(' & ') : [coupleNames, ''];
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    function onScroll() {
      setSolid(window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        background: solid ? 'rgba(11,46,34,.92)' : `linear-gradient(${tokens.greenDeep}, rgba(11,46,34,0))`,
        backdropFilter: solid ? 'blur(10px)' : undefined,
        boxShadow: solid ? '0 1px 0 rgba(226,178,60,.18)' : undefined,
        transition: 'background-color 0.3s, backdrop-filter 0.3s',
      }}
    >
      <div
        style={{
          fontFamily: tokens.display,
          fontWeight: 600,
          fontSize: '1rem',
          letterSpacing: '0.02em',
          color: tokens.bone,
          flex: '1 1 auto',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name1} <em style={{ color: tokens.gold, fontStyle: 'italic' }}>&amp;</em> {name2}
      </div>
      <div style={{ flexShrink: 0 }}>
        <Button href={rightHref} variant={rightVariant}>
          {rightLabel}
        </Button>
      </div>
    </div>
  );
}
