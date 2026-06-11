'use client';

import { useState } from 'react';
import type { Household, Guest, Settings } from '@/lib/supabase';
import { Parallelogram, WaterRipple } from './v3/primitives';

interface ThankYouPhaseProps {
  household: Household;
  guests: Guest[];
  settings: Settings;
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

      {/* Hero photo — full width 16:9 max-height 560px */}
      {showPhoto && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: '560px',
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
              filter: 'brightness(0.65) sepia(0.15) contrast(1.05) saturate(0.9)',
            }}
          />

          {/* Water ripple overlay */}
          <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
            <WaterRipple opacity={0.25} />
          </div>

          {/* Gradient fade to background at bottom */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 45%, #0A1F14 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top-left overlay: peach parallelogram + "WITH GRATITUDE" */}
          <div
            style={{
              position: 'absolute',
              top: '1.75rem',
              left: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              pointerEvents: 'none',
            }}
          >
            <Parallelogram width={18} height={9} color="#E8B89E" skew={5} />
            <p
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.4em',
                color: '#E8B89E',
                margin: 0,
              }}
            >
              With Gratitude
            </p>
          </div>
        </div>
      )}

      {!showPhoto && <div style={{ paddingTop: '5rem' }} />}

      {/* Content */}
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: `${showPhoto ? '2rem' : '0'} 1.75rem 5rem`,
        }}
      >
        {/* "To" + guest names */}
        <div style={{ marginBottom: '1rem' }}>
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              color: '#E8B89E',
              opacity: 0.7,
              marginBottom: '0.35rem',
            }}
          >
            To
          </p>
          <p
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
              color: '#F2E8D0',
              margin: 0,
            }}
          >
            {household.name}
          </p>
        </div>

        {/* "Thank" + emerald para + rule, "You" right-aligned in gradient */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(3.5rem, 12vw, 6.5rem)',
              color: '#F2E8D0',
              lineHeight: 1,
              margin: 0,
            }}
          >
            Thank
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              margin: '0.2rem 0',
            }}
          >
            <Parallelogram width={64} height={26} color="#1F4D3A" skew={16} />
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(242,232,208,0.18)' }} />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(3.5rem, 12vw, 6.5rem)',
              background: 'linear-gradient(135deg, #E8B89E 0%, #C89870 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1,
              margin: 0,
              textAlign: 'right',
            }}
          >
            You
          </h1>
        </div>

        {/* Thank you message in card with left emerald border */}
        <div
          style={{
            borderLeft: '3px solid #1F4D3A',
            padding: '1.25rem 1.5rem',
            background: 'rgba(31,77,58,0.12)',
            marginBottom: '2.5rem',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.95rem',
              color: 'rgba(242,232,208,0.85)',
              lineHeight: 1.85,
              margin: 0,
            }}
          >
            {attended
              ? (household.thank_you_message?.trim() ||
                  'Thank you so much for celebrating with us. Your presence made our day truly special.')
              : 'We missed you on our special day. Thank you for your kind wishes — it meant the world to us.'}
          </p>
        </div>

        {/* View Photos button */}
        {photosUrl && (
          <div style={{ marginBottom: '3rem' }}>
            <a
              href={photosUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '0 2.5rem',
                minHeight: '44px',
                lineHeight: '44px',
                backgroundColor: '#E8B89E',
                color: '#040B07',
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.7rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)',
                textDecoration: 'none',
              }}
            >
              View Photos from the Day
            </a>
          </div>
        )}

        {/* Closing */}
        <div style={{ marginTop: '3rem' }}>
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.4em',
              color: '#E8B89E',
              marginBottom: '0.5rem',
            }}
          >
            With love,
          </p>
          <p
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              color: '#F2E8D0',
              margin: 0,
            }}
          >
            Matt &amp; Raff
          </p>
        </div>
      </div>
    </div>
  );
}
