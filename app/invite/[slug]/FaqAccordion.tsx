'use client';

import { useState } from 'react';
import type { Faq } from '@/lib/supabase';

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (faqs.length === 0) return null;

  return (
    <div className="w-full text-left">
      {faqs.map(faq => {
        const isOpen = openId === faq.id;
        return (
          <div key={faq.id} className="border-b border-[#D4A83A]/10 last:border-0">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              <span className="text-sm sm:text-base text-[#F2E8D0] font-light leading-snug">
                {faq.question}
              </span>
              <span
                className="text-[#D4A83A]/60 text-lg shrink-0 transition-transform duration-200"
                style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
              >
                +
              </span>
            </button>
            {isOpen && (
              <p
                className="text-sm text-[#F2E8D0]/60 font-light leading-relaxed pb-5"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
