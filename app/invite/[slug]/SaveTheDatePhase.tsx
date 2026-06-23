'use client';

import type { Settings } from '@/lib/supabase';
import { parseIsoDate, formatLongDate, cityFromLocation } from '@/lib/date';
import Section from './v4/components/Section';
import Reveal from './v4/components/Reveal';
import Kicker from './v4/components/Kicker';
import BandQuote from './v4/components/BandQuote';
import Sunburst from './v4/components/Sunburst';
import CalendarControl from './v4/components/CalendarControl';
import { tokens } from './v4/tokens';

interface SaveTheDatePhaseProps {
  coupleNames: string;
  tagline?: string;
  weddingDate?: string;
  weddingLocation?: string;
  couplePhotoUrl?: string;
  settings?: Settings;
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// "Sat" — short weekday for the hero date strip.
function formatShortDow(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return '';
  const { y, m, d } = parsed;
  return WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// "10 July" — day + full month, no year, for the hero date strip.
function formatDayMonth(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return '';
  return `${parsed.d} ${MONTHS_FULL[parsed.m - 1]}`;
}

function Dot() {
  return (
    <span
      aria-hidden="true"
      style={{ width: 6, height: 6, background: tokens.persimmon, transform: 'rotate(45deg)', flex: '0 0 auto' }}
    />
  );
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

export default function SaveTheDatePhase({
  coupleNames,
  tagline = "Cancel your plans. We've made better ones.",
  weddingDate,
  weddingLocation = 'Melbourne, Victoria',
  couplePhotoUrl,
  settings,
}: SaveTheDatePhaseProps) {
  const [name1, name2] = coupleNames.includes(' & ') ? coupleNames.split(' & ') : [coupleNames, ''];
  const city = cityFromLocation(weddingLocation);

  return (
    <div style={{ fontFamily: tokens.body, fontWeight: 300, lineHeight: 1.6 }}>
      {/* ── HERO — centred poster teaser ── */}
      <Section variant="deep" backgroundImage={couplePhotoUrl || undefined} minHeight="100svh" contentAlign="center">
        <Reveal style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Sunburst size={48} />
          <Kicker variant="bare" label="Save the date" labelColor={tokens.gold} style={{ marginTop: 22 }} />
          <h1
            style={{
              fontFamily: tokens.display,
              fontWeight: 900,
              lineHeight: 0.86,
              letterSpacing: '-0.01em',
              margin: '20px 0 6px',
              fontSize: 'clamp(3.6rem, 16vw, 10rem)',
            }}
          >
            {name1} <em style={{ fontStyle: 'italic', fontWeight: 600, color: tokens.persimmon }}>&amp;</em> {name2}
          </h1>
          <p
            style={{
              fontFamily: tokens.display,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(1.1rem, 3.4vw, 1.7rem)',
              opacity: 0.9,
              margin: '0 0 36px',
            }}
          >
            are getting married
          </p>
          {weddingDate && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(14px, 4vw, 30px)',
                fontFamily: tokens.mono,
                fontSize: 'clamp(0.72rem, 2vw, 0.95rem)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <span>
                {formatShortDow(weddingDate)} <b style={{ color: tokens.gold, fontWeight: 500 }}>{formatDayMonth(weddingDate)}</b>
              </span>
              <Dot />
              <span>
                <b style={{ color: tokens.gold, fontWeight: 500 }}>{parseIsoDate(weddingDate)?.y}</b>
              </span>
              <Dot />
              <span>{city}</span>
            </div>
          )}
          <p
            style={{
              fontFamily: tokens.display,
              fontStyle: 'italic',
              fontSize: 'clamp(1.05rem, 3vw, 1.5rem)',
              marginTop: 34,
              maxWidth: '22ch',
              opacity: 0.85,
            }}
          >
            {tagline}
          </p>
        </Reveal>
      </Section>

      {/* ── DATE PANEL — bone, the lock-it-in moment ── */}
      <Reveal>
        <Section variant="bone">
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
            <p style={{ fontSize: '1rem', opacity: 0.7, maxWidth: '34ch', margin: '0 auto' }}>
              Your formal invitation — with the full running order — lands closer to the day.
            </p>
          </div>
        </Section>
      </Reveal>

      {/* ── BAND ── */}
      {settings?.band_photo_url && (
        <Reveal>
          <BandQuote src={settings.band_photo_url} alt="">
            {settings.band_quote}
          </BandQuote>
        </Reveal>
      )}

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
              {settings.hashtag} · Invitation to follow
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
