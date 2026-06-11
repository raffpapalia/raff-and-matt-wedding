'use client';

import { useEffect, useState } from 'react';
import AddToCalendar from '@/app/components/AddToCalendar';
import type { Settings } from '@/lib/supabase';
import {
  Parallelogram,
  WaterRipple,
  LightBeam,
  Noise,
  Vignette,
  FloatingPetal,
} from './v3/primitives';

interface SaveTheDatePhaseProps {
  guestName: string;
  personalMessage?: string | null;
  personalPhotoUrl?: string | null;
  coupleNames?: string;
  tagline?: string;
  invitationFooter?: string;
  weddingDate?: string;
  weddingLocation?: string;
  settings?: Settings;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatWeddingDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  return `${parseInt(day)} ${MONTHS[parseInt(month) - 1]} ${year}`;
}

function getImgSrc(url: string): string {
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('/')) return url;
  return `data:image/jpeg;base64,${url}`;
}

type AnimationStage =
  | 'init'
  | 'fadeToGreen'
  | 'photo'
  | 'guestName'
  | 'divider'
  | 'saveTheDateLabel'
  | 'coupleNames'
  | 'date'
  | 'location'
  | 'tagline'
  | 'personalMessage'
  | 'footer';

export default function SaveTheDatePhase({
  guestName,
  personalMessage,
  personalPhotoUrl,
  tagline = "Cancel your plans. We've made better ones.",
  invitationFooter = 'Full invitation coming soon',
  weddingDate = '2027-07-12',
  weddingLocation = 'Melbourne, Victoria',
  settings,
}: SaveTheDatePhaseProps) {
  const [mounted, setMounted] = useState(false);
  const [visibleStages, setVisibleStages] = useState<Set<AnimationStage>>(
    new Set(['init'])
  );

  useEffect(() => {
    setMounted(true);

    const timeline = [
      { stage: 'fadeToGreen' as const, delay: 0 },
      { stage: 'photo' as const, delay: 400 },
      { stage: 'guestName' as const, delay: 1000 },
      { stage: 'divider' as const, delay: 1900 },
      { stage: 'saveTheDateLabel' as const, delay: 2900 },
      { stage: 'coupleNames' as const, delay: 3500 },
      { stage: 'date' as const, delay: 4200 },
      { stage: 'location' as const, delay: 4700 },
      { stage: 'tagline' as const, delay: 5200 },
      { stage: 'personalMessage' as const, delay: 5800 },
      { stage: 'footer' as const, delay: 6400 },
    ];

    timeline.forEach(({ stage, delay }) => {
      setTimeout(() => {
        setVisibleStages((prev) => new Set([...prev, stage]));
      }, delay);
    });
  }, []);

  if (!mounted) return null;

  const isGreenVisible = visibleStages.has('fadeToGreen');
  const isPhotoVisible = visibleStages.has('photo');
  const isGuestNameVisible = visibleStages.has('guestName');
  const isSaveTheDateLabelVisible = visibleStages.has('saveTheDateLabel');
  const isCoupleNamesVisible = visibleStages.has('coupleNames');
  const isDateVisible = visibleStages.has('date');
  const isTaglineVisible = visibleStages.has('tagline');
  const isPersonalMessageVisible = visibleStages.has('personalMessage');
  const isFooterVisible = visibleStages.has('footer');

  const transition = 'opacity 1s ease, transform 1s ease';

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        backgroundColor: isGreenVisible ? '#0A1F14' : '#000000',
        transition: 'background-color 1s ease-out',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background layers */}
      <WaterRipple opacity={0.12} />
      <LightBeam delay={0} opacity={0.07} />
      <LightBeam delay={3} opacity={0.04} />
      <Noise opacity={0.03} />
      <Vignette />

      {/* Floating petals — stage 3 (guestName) */}
      {isGuestNameVisible && (
        <>
          <FloatingPetal delay={0} top="22%" duration={20} color="#E8B89E" />
          <FloatingPetal delay={6} top="55%" duration={25} color="#C89870" flip />
          <FloatingPetal delay={13} top="75%" duration={17} scale={0.75} color="#E8B89E" />
        </>
      )}

      {/* Content — left-aligned, max 640px */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '640px',
          padding: '5rem max(1.5rem, 4vw) 5rem max(1.5rem, 4vw)',
        }}
      >
        {/* SAVE THE DATE label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '2rem',
            opacity: isSaveTheDateLabelVisible ? 1 : 0,
            transition: 'opacity 1s ease',
          }}
        >
          <Parallelogram width={18} height={9} color="#E8B89E" skew={5} />
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.6rem',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: '#E8B89E',
              margin: 0,
            }}
          >
            Save the Date
          </p>
        </div>

        {/* "For" + guest name */}
        <div
          style={{
            marginBottom: '2.5rem',
            opacity: isGuestNameVisible ? 1 : 0,
            transform: isGuestNameVisible ? 'translateY(0)' : 'translateY(16px)',
            transition,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              color: '#E8B89E',
              opacity: 0.7,
              marginBottom: '0.4rem',
            }}
          >
            For
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(1.75rem, 5.5vw, 3rem)',
              color: '#F2E8D0',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {guestName}
          </h1>
        </div>

        {/* Couple names — monumental, left-aligned */}
        <div
          style={{
            marginBottom: '2.5rem',
            opacity: isCoupleNamesVisible ? 1 : 0,
            transform: isCoupleNamesVisible ? 'translateY(0)' : 'translateY(16px)',
            transition,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(2.5rem, 12vw, 6.5rem)',
              color: '#F2E8D0',
              lineHeight: 1,
              margin: 0,
            }}
          >
            Matt
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              margin: '0.25rem 0',
            }}
          >
            <Parallelogram width={80} height={32} color="#1F4D3A" skew={18} />
            <span
              style={{
                fontFamily: 'var(--font-cinzel)',
                fontStyle: 'italic',
                fontSize: '1.75rem',
                color: '#F2E8D0',
                opacity: 0.65,
                lineHeight: 1,
              }}
            >
              &amp;
            </span>
            <div
              style={{
                flex: 1,
                height: '1px',
                backgroundColor: 'rgba(242,232,208,0.18)',
              }}
            />
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(2.5rem, 12vw, 6.5rem)',
              color: '#F2E8D0',
              lineHeight: 1,
              margin: 0,
              textAlign: 'right',
              maxWidth: '100%',
            }}
          >
            Raff
          </h2>
        </div>

        {/* Date block — three columns */}
        <div
          className="std-date-grid"
          style={{
            display: 'grid',
            gap: '1.5rem',
            marginBottom: '2.5rem',
            opacity: isDateVisible ? 1 : 0,
            transition: 'opacity 1s ease',
          }}
        >
          {[
            { label: 'Date', value: formatWeddingDate(weddingDate) },
            { label: 'Where', value: weddingLocation },
            { label: 'From', value: (settings?.wedding_time || '3:00 PM').replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase()) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: '0.55rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3em',
                  color: '#E8B89E',
                  marginBottom: '0.4rem',
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-cinzel)',
                  fontStyle: 'italic',
                  fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
                  color: '#F2E8D0',
                  lineHeight: 1.4,
                  margin: 0,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div
          style={{
            marginBottom: '2rem',
            opacity: isTaglineVisible ? 1 : 0,
            transform: isTaglineVisible ? 'translateY(0)' : 'translateY(8px)',
            transition,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
              color: 'rgba(242,232,208,0.72)',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {tagline}
          </p>
        </div>

        {/* Personal photo */}
        {personalPhotoUrl && (
          <div
            style={{
              marginBottom: '2.5rem',
              opacity: isPhotoVisible ? 1 : 0,
              transform: isPhotoVisible ? 'translateY(0)' : 'translateY(16px)',
              transition,
              clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)',
              maxWidth: '320px',
            }}
          >
            <img
              src={getImgSrc(personalPhotoUrl)}
              alt="Personal photo"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              style={{
                width: '100%',
                display: 'block',
                aspectRatio: '4/3',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Personal message card */}
        {personalMessage && (
          <div
            style={{
              marginBottom: '2.5rem',
              opacity: isPersonalMessageVisible ? 1 : 0,
              transform: isPersonalMessageVisible ? 'translateY(0)' : 'translateY(8px)',
              transition,
            }}
          >
            <div
              style={{
                borderLeft: '3px solid #1F4D3A',
                padding: '1.25rem 1.5rem',
                background: 'rgba(31,77,58,0.18)',
                backdropFilter: 'blur(8px)',
                position: 'relative',
              }}
            >
              {/* Small peach parallelogram top-right */}
              <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', pointerEvents: 'none' }}>
                <Parallelogram width={22} height={11} color="#E8B89E" fillOpacity={0.45} skew={6} />
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontStyle: 'italic',
                  fontSize: '0.875rem',
                  color: 'rgba(242,232,208,0.78)',
                  lineHeight: 1.75,
                  margin: 0,
                }}
              >
                {personalMessage}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            opacity: isFooterVisible ? 1 : 0,
            transform: isFooterVisible ? 'translateY(0)' : 'translateY(8px)',
            transition,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            <Parallelogram width={14} height={7} color="#E8B89E" fillOpacity={0.6} skew={4} />
            <p
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.55rem',
                textTransform: 'uppercase',
                letterSpacing: '0.4em',
                color: 'rgba(232,184,158,0.55)',
                margin: 0,
              }}
            >
              {invitationFooter}
            </p>
          </div>

          {settings && (
            <AddToCalendar mode="save_the_date" settings={settings} />
          )}
        </div>
      </div>

      <style>{`
        .std-date-grid { grid-template-columns: 1fr; }
        @media (min-width: 640px) {
          .std-date-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  );
}
