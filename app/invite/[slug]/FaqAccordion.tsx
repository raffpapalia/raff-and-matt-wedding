'use client';

import { useState, useRef, useEffect } from 'react';
import type { Faq } from '@/lib/supabase';
import { palette, alpha } from './v3/tokens';
import { Parallelogram } from './v3/primitives';

function AccordionItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: Faq;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div style={{ borderBottom: `1px solid ${alpha(palette.goldChampagne, 0.1)}` }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '20px 1fr 24px',
          gap: '1rem',
          alignItems: 'center',
          padding: '1.25rem 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Parallelogram marker — emerald jewel as the open-state indicator, subtle forest otherwise */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Parallelogram
            width={20}
            height={10}
            color={isOpen ? palette.emeraldJewel : palette.forestAccent}
            skew={5}
            fillOpacity={0.8}
          />
        </div>

        {/* Question */}
        <span
          style={{
            fontFamily: 'var(--font-cinzel)',
            fontStyle: 'italic',
            fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
            color: palette.cream,
            lineHeight: 1.4,
          }}
        >
          {faq.question}
        </span>

        {/* Toggle */}
        <span
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: '1.1rem',
            color: alpha(palette.goldChampagne, 0.6),
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(45deg)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +
        </span>
      </button>

      <div
        style={{
          height: `${height}px`,
          overflow: 'hidden',
          transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div ref={contentRef}>
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.875rem',
              color: alpha(palette.cream, 0.62),
              lineHeight: 1.8,
              paddingBottom: '1.25rem',
              paddingLeft: '2.25rem',
              margin: 0,
            }}
          >
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (faqs.length === 0) return null;

  return (
    <div style={{ width: '100%' }}>
      {faqs.map(faq => (
        <AccordionItem
          key={faq.id}
          faq={faq}
          isOpen={openId === faq.id}
          onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
        />
      ))}
    </div>
  );
}
