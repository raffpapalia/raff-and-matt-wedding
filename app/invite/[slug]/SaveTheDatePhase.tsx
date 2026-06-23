'use client';

import type { Settings } from '@/lib/supabase';
import { parseIsoDate, formatLongDate, cityFromLocation } from '@/lib/date';
import Section from './v4/components/Section';
import Reveal from './v4/components/Reveal';
import Kicker from './v4/components/Kicker';
import Button from './v4/components/Button';
import CalendarControl from './v4/components/CalendarControl';
import { tokens } from './v4/tokens';

interface SaveTheDatePhaseProps {
  coupleNames: string;
  tagline?: string;
  weddingDate?: string;
  weddingLocation?: string;
  couplePhotoUrl?: string;
  guestName?: string;
  settings?: Settings;
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// "Sat" — short weekday for the hero-mono date line.
function formatShortDow(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return '';
  const { y, m, d } = parsed;
  return WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// "10 July" — day + full month, no year, for the hero-mono date line.
function formatDayMonth(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return '';
  return `${parsed.d} ${MONTHS_FULL[parsed.m - 1]}`;
}

function BigDate({ iso }: { iso: string }) {
  const parsed = parseIsoDate(iso);
  if (!parsed) return null;
  const { y, m, d } = parsed;
  const dotStyle: React.CSSProperties = { color: tokens.persimmon, fontWeight: 900 };
  return (
    <div
      style={{
        fontFamily: tokens.display,
        fontWeight: 900,
        fontSize: 'clamp(3.4rem, 17vw, 9rem)',
        lineHeight: 0.9,
        letterSpacing: '-0.02em',
        margin: '18px 0 8px',
      }}
    >
      {String(d).padStart(2, '0')}
      <b style={dotStyle}>·</b>
      {String(m).padStart(2, '0')}
      <b style={dotStyle}>·</b>
      {String(y).slice(-2)}
    </div>
  );
}

// Bone matte frame around the couple photo in NATURAL colour — deliberately local to
// this page rather than TreatedPhoto, which always applies the shared emerald duotone.
function MattedPhoto({ src }: { src: string }) {
  return (
    <div
      style={{
        background: tokens.greenDeep,
        padding: 'clamp(64px, 10vw, 120px) 0',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <figure
        style={{
          background: tokens.bone,
          padding: 'clamp(14px, 2vw, 20px)',
          borderRadius: 6,
          boxShadow: '0 30px 60px -24px rgba(0,0,0,.55)',
          maxWidth: 680,
          width: '100%',
          margin: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          style={{ display: 'block', width: '100%', aspectRatio: '3 / 2', objectFit: 'cover', borderRadius: 2 }}
        />
      </figure>
    </div>
  );
}

export default function SaveTheDatePhase({
  coupleNames,
  tagline = "Cancel your plans. We've made better ones.",
  weddingDate,
  weddingLocation = 'Melbourne, Victoria',
  couplePhotoUrl,
  guestName,
  settings,
}: SaveTheDatePhaseProps) {
  const [name1, name2] = coupleNames.includes(' & ') ? coupleNames.split(' & ') : [coupleNames, ''];
  const city = cityFromLocation(weddingLocation);
  const pad = 'clamp(20px, 5.5vw, 90px)';

  return (
    <div style={{ fontFamily: tokens.body, fontWeight: 300, lineHeight: 1.6 }}>
      {/* ── HERO — gradient only, no photo, left-aligned ── */}
      <header
        style={{
          position: 'relative',
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: tokens.bone,
          overflow: 'hidden',
          background: [
            'linear-gradient(100deg, rgba(11,46,34,.8) 0%, rgba(11,46,34,.45) 45%, transparent 75%)',
            'radial-gradient(120% 90% at 85% 12%, rgba(226,178,60,.22) 0%, transparent 60%)',
            tokens.greenDeep,
          ].join(', '),
        }}
      >
        {/* Minimal top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: `18px ${pad}`, zIndex: 5 }}>
          <div style={{ fontFamily: tokens.display, fontWeight: 600, fontSize: '1rem' }}>
            {name1} <em style={{ color: tokens.gold, fontStyle: 'italic' }}>&amp;</em> {name2}
          </div>
        </div>

        {weddingDate && settings && (
          <div
            style={{
              position: 'absolute',
              top: 64,
              left: pad,
              fontFamily: tokens.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            {settings.venue_name} · {formatShortDow(weddingDate)} {formatDayMonth(weddingDate)} {parseIsoDate(weddingDate)?.y} · {city}
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 1200, margin: '0 auto', padding: `0 ${pad}` }}>
          <Reveal>
            <div
              style={{
                fontFamily: tokens.grotesque,
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontSize: 'clamp(1.4rem, 4.5vw, 2.6rem)',
                color: tokens.gold,
                marginBottom: 8,
              }}
            >
              Save the date
            </div>
            <h1 style={{ fontFamily: tokens.display, fontWeight: 900, lineHeight: 0.84, letterSpacing: '-0.01em', margin: 0 }}>
              <span style={{ display: 'block', fontSize: 'clamp(4rem, 17vw, 11rem)' }}>{name1}</span>
              <span style={{ display: 'block', fontSize: 'clamp(4rem, 17vw, 11rem)', paddingLeft: '0.5em' }}>
                <em style={{ fontStyle: 'italic', fontWeight: 600, color: tokens.persimmon }}>&amp;</em> {name2}
              </span>
            </h1>
            <p
              style={{
                fontFamily: tokens.display,
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(1.15rem, 3.6vw, 1.9rem)',
                marginTop: 22,
                maxWidth: '20ch',
              }}
            >
              {tagline}
            </p>
            {guestName && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 26,
                  border: '1px dashed rgba(246,238,221,.5)',
                  borderRadius: 6,
                  padding: '9px 16px',
                }}
              >
                <span
                  style={{
                    fontFamily: tokens.mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: tokens.gold,
                  }}
                >
                  For
                </span>
                <span style={{ fontFamily: tokens.display, fontWeight: 600, fontSize: '1rem' }}>{guestName}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap' }}>
              {settings && <CalendarControl mode="save_the_date" settings={settings} />}
              <Button href="#date" variant="ghost">See the date ↓</Button>
            </div>
          </Reveal>
        </div>
      </header>

      {/* ── MATTED PHOTO — natural colour, no duotone ── */}
      {couplePhotoUrl && <MattedPhoto src={couplePhotoUrl} />}

      {/* ── DATE PANEL — bone, the lock-it-in moment ── */}
      <Reveal>
        <Section variant="bone" id="date">
          <div style={{ textAlign: 'center' }}>
            <Kicker variant="bare" label="Lock it in" />
            {weddingDate && <BigDate iso={weddingDate} />}
            {weddingDate && (
              <p style={{ fontFamily: tokens.display, fontWeight: 600, fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', margin: 0 }}>
                {formatLongDate(weddingDate)}
              </p>
            )}
            {settings && (
              <p
                style={{
                  fontFamily: tokens.mono,
                  fontSize: '0.72rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: tokens.green,
                  marginTop: 10,
                }}
              >
                {settings.venue_name} · {settings.wedding_time}
              </p>
            )}
            {settings && (
              <div style={{ margin: '36px 0 30px' }}>
                <CalendarControl mode="save_the_date" settings={settings} />
              </div>
            )}
            <p style={{ fontFamily: tokens.display, fontStyle: 'italic', fontSize: 'clamp(1.2rem, 3.4vw, 1.7rem)', color: tokens.ink, opacity: 0.8, margin: 0 }}>
              More info coming soon!
            </p>
          </div>
        </Section>
      </Reveal>

      {/* ── FOOTER ── */}
      <Section variant="deep">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(1.8rem, 8vw, 3.4rem)' }}>
            {name1} <em style={{ fontStyle: 'italic', color: tokens.persimmon }}>&amp;</em> {name2}
          </div>
          {settings && (
            <p
              style={{
                fontFamily: tokens.mono,
                fontSize: '0.62rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                opacity: 0.6,
                marginTop: 16,
              }}
            >
              {settings.hashtag}
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
