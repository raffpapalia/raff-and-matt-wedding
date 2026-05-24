'use client';

import { useState } from 'react';
import type { Household, Guest, Settings } from '@/lib/supabase';

interface ThankYouPhaseProps {
  household: Household;
  guests: Guest[];
  settings: Settings;
}

function GoldDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-[#D4A83A]/25" />
      <div className="w-1 h-1 rounded-full bg-[#D4A83A]/40" />
      <div className="flex-1 h-px bg-[#D4A83A]/25" />
    </div>
  );
}

export default function ThankYouPhase({ household, guests, settings }: ThankYouPhaseProps) {
  const [photoError, setPhotoError] = useState(false);

  const anyStatuses = guests.some(g => g.rsvp_status !== 'pending');
  const attended = !anyStatuses || guests.some(g => g.rsvp_status === 'attending');

  const photoUrl = (settings as any).wedding_photo_url as string | undefined;
  const photosUrl = (settings as any).google_photos_url as string | undefined;

  const showPhoto = !!photoUrl && !photoError;

  return (
    <div style={{ backgroundColor: '#0A1F14', color: '#F2E8D0', minHeight: '100dvh' }}>
      {/* Wedding photo — full width, 16:9, max-height 500px */}
      {showPhoto ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: '500px',
            overflow: 'hidden',
          }}
        >
          <img
            src={photoUrl}
            alt="Wedding day"
            onError={() => setPhotoError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 50%, #0A1F14 100%)',
            }}
          />
        </div>
      ) : (
        <div className="pt-16" />
      )}

      <div className="max-w-lg mx-auto px-6 pb-20">

        {/* Household name */}
        <p
          className="text-center text-xs uppercase tracking-[0.3em] text-[#D4A83A]/70 font-light mb-6"
          style={{ fontFamily: 'var(--font-dm-sans)', marginTop: showPhoto ? '-2rem' : '0' }}
        >
          {household.name}
        </p>

        {/* Heading */}
        <h1
          className="text-center text-4xl sm:text-5xl font-normal text-[#F2E8D0] mb-8 leading-tight"
          style={{ fontFamily: 'var(--font-cinzel)' }}
        >
          Thank You
        </h1>

        <div className="mb-8">
          <GoldDivider />
        </div>

        {/* Message */}
        <p
          className="text-center text-base sm:text-lg leading-relaxed text-[#F2E8D0]/85 mb-10"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          {attended
            ? (household.thank_you_message?.trim() ||
                'Thank you so much for celebrating with us. Your presence made our day truly special.')
            : 'We missed you on our special day. Thank you for your kind wishes — it meant the world to us.'}
        </p>

        {/* Google Photos button */}
        {photosUrl ? (
          <div className="flex justify-center mb-12">
            <a
              href={photosUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-slate-950 transition hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #D4A83A, #E8C050)',
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4zm7-12H17l-1.83-2H8.83L7 3.2H5A3.2 3.2 0 0 0 1.8 6.4v12A3.2 3.2 0 0 0 5 21.6h14a3.2 3.2 0 0 0 3.2-3.2v-12A3.2 3.2 0 0 0 19 3.2z"/>
              </svg>
              {attended ? 'View photos from the day' : 'See how the day unfolded'}
            </a>
          </div>
        ) : null}

        {/* Closing */}
        <div className="mb-8">
          <GoldDivider />
        </div>

        <p
          className="text-center text-xl sm:text-2xl font-normal text-[#D4A83A] mt-8"
          style={{ fontFamily: 'var(--font-cinzel)' }}
        >
          With love,
        </p>
        <p
          className="text-center text-2xl sm:text-3xl font-normal text-[#F2E8D0] mt-2"
          style={{ fontFamily: 'var(--font-cinzel)' }}
        >
          Matt &amp; Raff
        </p>

      </div>
    </div>
  );
}
