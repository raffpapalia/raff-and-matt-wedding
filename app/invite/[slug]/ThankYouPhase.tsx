'use client';

import { useState } from 'react';
import type { Household, Guest, Settings } from '@/lib/supabase';
import { Parallelogram, EmeraldJewel, WaterRipple } from './v3/primitives';
import { palette, alpha } from './v3/tokens';

interface ThankYouPhaseProps {
  household: Household;
  guests: Guest[];
  settings: Settings;
}

export default function ThankYouPhase({ household, guests, settings }: ThankYouPhaseProps) {
  const [photoError, setPhotoError] = useState(false);

  const anyStatuses = guests.some(g => g.rsvp_status !== 'pending');
  const attended = !anyStatuses || guests.some(g => g.rsvp_status === 'attending');

  const photoUrl = settings.wedding_photo_url;
  const photosUrl = settings.google_photos_url;

  const showPhoto = !!photoUrl && !photoError;

  return (
    <div style={{ backgroundColor: palette.bgPrimary, color: palette.cream, minHeight: '100dvh' }}>

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
              filter: 'brightness(0.88) contrast(1.02) saturate(0.95)',
            }}
          />

          {/* Water ripple overlay */}
          <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
            <WaterRipple opacity={0.2} />
          </div>

          {/* Gradient fade to background at bottom */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to bottom, transparent 45%, ${palette.bgPrimary} 100%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Top-left overlay: EmeraldJewel + "WITH GRATITUDE" */}
          <div
            style={{
              position: 'absolute',
              top: '1.75rem',
              left: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              pointerEvents: 'none',
            }}
          >
            <EmeraldJewel width={18} height={10} />
            <p
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.4em',
                color: palette.goldChampagne,
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
              color: palette.goldChampagne,
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
              color: palette.cream,
              margin: 0,
            }}
          >
            {household.name}
          </p>
        </div>

        {/* "Thank" + forestAccent bar + rule, "You" right-aligned in gold gradient */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(3.25rem, 11vw, 6rem)',
              color: palette.cream,
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
              margin: '0.35rem 0',
            }}
          >
            <Parallelogram width={64} height={26} color={palette.forestAccent} skew={16} />
            <div style={{ flex: 1, height: '1px', backgroundColor: alpha(palette.cream, 0.18) }} />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(3.25rem, 11vw, 6rem)',
              background: `linear-gradient(135deg, ${palette.goldChampagne} 0%, ${palette.goldDeep} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1,
              margin: '0.25rem 0 0',
              paddingRight: '0.25rem',
              textAlign: 'right',
            }}
          >
            You
          </h1>
        </div>

        {/* Thank you message in card with left forestAccent border */}
        <div
          style={{
            borderLeft: `3px solid ${palette.forestAccent}`,
            padding: '1.25rem 1.5rem',
            background: alpha(palette.forestAccent, 0.12),
            marginBottom: '2.5rem',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.95rem',
              color: alpha(palette.cream, 0.85),
              lineHeight: 1.85,
              margin: 0,
            }}
          >
            {attended
              ? (household.thank_you_message?.trim() || settings.thank_you_attended_message)
              : settings.thank_you_not_attended_message}
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
                backgroundColor: palette.goldChampagne,
                color: palette.bgDeepest,
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
              color: palette.goldChampagne,
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
              color: palette.cream,
              margin: 0,
            }}
          >
            {settings.couple_names}
          </p>
        </div>
      </div>
    </div>
  );
}
