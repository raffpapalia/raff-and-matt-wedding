'use client';

import { useEffect, useState } from 'react';
import AddToCalendar from '@/app/components/AddToCalendar';
import type { Settings } from '@/lib/supabase';
import {
  Parallelogram,
  WaterRipple,
  LightBeam,
  Noise,
} from './v3/primitives';
import { palette } from './v3/tokens';

interface SaveTheDatePhaseProps {
  guestName: string;
  coupleNames: string;
  tagline?: string;
  invitationFooter?: string;
  weddingDate?: string;
  weddingLocation?: string;
  couplePhotoUrl?: string;
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

type AnimationStage =
  | 'init'
  | 'fadeToGreen'
  | 'guestName'
  | 'divider'
  | 'saveTheDateLabel'
  | 'coupleNames'
  | 'date'
  | 'location'
  | 'tagline'
  | 'footer';

export default function SaveTheDatePhase({
  guestName,
  coupleNames,
  tagline = "Cancel your plans. We've made better ones.",
  invitationFooter = 'Full invitation coming soon',
  weddingDate,
  weddingLocation = 'Melbourne, Victoria',
  couplePhotoUrl,
  settings,
}: SaveTheDatePhaseProps) {
  const [name1, name2] = coupleNames.includes(' & ')
    ? coupleNames.split(' & ')
    : [coupleNames, ''];

  const hasPhoto = Boolean(couplePhotoUrl);

  const [mounted, setMounted] = useState(false);
  const [visibleStages, setVisibleStages] = useState<Set<AnimationStage>>(
    new Set(['init'])
  );

  useEffect(() => {
    setMounted(true);

    const timeline = [
      { stage: 'fadeToGreen' as const, delay: 0 },
      { stage: 'guestName' as const, delay: 1000 },
      { stage: 'divider' as const, delay: 1900 },
      { stage: 'saveTheDateLabel' as const, delay: 2900 },
      { stage: 'coupleNames' as const, delay: 3500 },
      { stage: 'date' as const, delay: 4200 },
      { stage: 'location' as const, delay: 4700 },
      { stage: 'tagline' as const, delay: 5200 },
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
  const isGuestNameVisible = visibleStages.has('guestName');
  const isDividerVisible = visibleStages.has('divider');
  const isSaveTheDateLabelVisible = visibleStages.has('saveTheDateLabel');
  const isCoupleNamesVisible = visibleStages.has('coupleNames');
  const isDateVisible = visibleStages.has('date');
  const isTaglineVisible = visibleStages.has('tagline');
  const isFooterVisible = visibleStages.has('footer');

  const transition = 'opacity 1s ease, transform 1s ease';

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        backgroundColor: isGreenVisible ? palette.bgPrimary : palette.bgDeepest,
        transition: 'background-color 1s ease-out',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background layers */}
      <WaterRipple opacity={0.08} />
      <LightBeam delay={0} opacity={0.07} />
      <Noise opacity={0.03} />

      {/* Content column — full width, or 62% on desktop when a couple photo is present */}
      <div
        className={hasPhoto ? 'std-content has-photo' : 'std-content'}
        style={{
          position: 'relative',
          zIndex: 10,
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
          <Parallelogram width={24} height={12} color={palette.goldBase} />
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '13px',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: palette.goldBase,
              margin: 0,
            }}
          >
            Save the Date
          </p>
        </div>

        {/* Guest name */}
        <div
          style={{
            marginBottom: '2.5rem',
            opacity: isGuestNameVisible ? 1 : 0,
            transform: isGuestNameVisible ? 'translateY(0)' : 'translateY(16px)',
            transition,
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(20px, 2.5vw, 26px)',
              color: palette.cream,
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {guestName}
          </h1>
        </div>

        {/* "You're invited to the wedding of" */}
        <div
          style={{
            marginBottom: '1rem',
            opacity: isDividerVisible ? 1 : 0,
            transition: 'opacity 1s ease',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              color: palette.cream,
              opacity: 0.7,
              margin: 0,
            }}
          >
            You&apos;re invited to the wedding of
          </p>
        </div>

        {/* Couple names — staggered, left-aligned */}
        <div
          style={{
            marginBottom: '2.5rem',
            opacity: isCoupleNamesVisible ? 1 : 0,
            transform: isCoupleNamesVisible ? 'translateY(0)' : 'translateY(16px)',
            transition,
          }}
        >
          <h2
            aria-label={coupleNames}
            style={{
              margin: 0,
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(48px, 7vw, 68px)',
              lineHeight: 0.95,
              color: palette.cream,
              textAlign: 'left',
            }}
          >
            <span aria-hidden="true" style={{ display: 'block' }}>
              {name1}
            </span>
            <span aria-hidden="true" style={{ display: 'block', marginLeft: '2rem' }}>
              <span style={{ color: '#009473' }}>&amp; </span>
              {name2}
            </span>
          </h2>
        </div>

        {/* Date block — three columns, framed by hairline rules */}
        <div
          style={{
            marginBottom: '2.5rem',
            opacity: isDateVisible ? 1 : 0,
            transition: 'opacity 1s ease',
          }}
        >
          <div style={{ height: '1px', backgroundColor: palette.goldBase, opacity: 0.3 }} />
          <div style={{ height: '1px', backgroundColor: palette.cream, opacity: 0.18 }} />
          <div
            className="std-date-grid"
            style={{
              display: 'grid',
              gap: '1.5rem',
              padding: '1.5rem 0',
            }}
          >
            {[
              { label: 'Date', value: weddingDate ? formatWeddingDate(weddingDate) : '' },
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
                    color: palette.goldBase,
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
                    color: palette.cream,
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div style={{ height: '1px', backgroundColor: palette.cream, opacity: 0.18 }} />
        </div>

        {/* Couple photo — mobile only, below date block */}
        {hasPhoto && (
          <img
            className="std-photo-mobile"
            src={couplePhotoUrl}
            alt=""
            style={{
              width: '100%',
              height: '320px',
              objectFit: 'cover',
              objectPosition: 'center top',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 35%)',
              opacity: isDateVisible ? 1 : 0,
              transition: 'opacity 1s ease',
              marginBottom: '2rem',
            }}
          />
        )}

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
              color: palette.cream,
              opacity: 0.72,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {tagline}
          </p>
        </div>

        {/* Footer */}
        <div
          className="std-footer"
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
            <Parallelogram width={14} height={7} color={palette.goldBase} fillOpacity={0.6} />
            <p
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.4em',
                color: palette.goldBase,
                margin: 0,
                marginTop: '0.2rem',
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

      {/* Couple photo — desktop only, right-hand column */}
      {hasPhoto && (
        <img
          className="std-photo-desktop"
          src={couplePhotoUrl}
          alt=""
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '38%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            maskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
            zIndex: 5,
            opacity: isDateVisible ? 1 : 0,
            transition: 'opacity 1s ease',
          }}
        />
      )}

      <style>{`
        .std-date-grid { grid-template-columns: 1fr; }
        @media (min-width: 640px) {
          .std-date-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .std-date-grid > div:not(:first-child) {
            border-left: 1px solid ${palette.cream}2e;
            padding-left: 1.5rem;
          }
        }
        .std-content { width: 100%; }
        .std-photo-desktop { display: none; }
        .std-photo-mobile { display: block; }
        @media (min-width: 768px) {
          .std-content.has-photo { width: 62%; }
          .std-photo-desktop { display: block; }
          .std-photo-mobile { display: none; }
        }
        /* AddToCalendar centers its own content — left-align it here so it
           shares the same left edge as the rest of this column. */
        .std-footer .text-center { text-align: left; }
        .std-footer .justify-center { justify-content: flex-start; }
      `}</style>
    </div>
  );
}
