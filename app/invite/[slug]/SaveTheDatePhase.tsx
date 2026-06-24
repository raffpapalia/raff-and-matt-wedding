'use client';

import type { Settings } from '@/lib/supabase';
import { parseIsoDate, formatLongDate } from '@/lib/date';
import Section from './v4/components/Section';
import Reveal from './v4/components/Reveal';
import Kicker from './v4/components/Kicker';
import CalendarControl from './v4/components/CalendarControl';
import { tokens } from './v4/tokens';

// Film-grain texture for the hero only — local to this page, distinct from the
// site-wide grain in app/globals.css (which sits at z-index:9999 above everything
// for an overall vignette). This one paints into the hero's own background stack,
// below the copy/photo content.
const HERO_GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='heroGrain'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(%23heroGrain)' opacity='0.5'/></svg>\")";

interface SaveTheDatePhaseProps {
  coupleNames: string;
  tagline?: string;
  weddingDate?: string;
  weddingLocation?: string;
  couplePhotoUrl?: string;
  guestName?: string;
  settings?: Settings;
}

// "10·7·27" — no leading zero on the month, per the v3 details-box spec.
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
        fontSize: 'clamp(3.6rem, 18vw, 9rem)',
        lineHeight: 0.9,
        letterSpacing: '-0.02em',
        margin: '16px 0 8px',
      }}
    >
      {String(d).padStart(2, '0')}
      <b style={dotStyle}>·</b>
      {m}
      <b style={dotStyle}>·</b>
      {String(y).slice(-2)}
    </div>
  );
}

export default function SaveTheDatePhase({
  coupleNames,
  weddingDate,
  weddingLocation = 'Melbourne, Victoria',
  couplePhotoUrl,
  guestName,
  settings,
}: SaveTheDatePhaseProps) {
  const [name1, name2] = coupleNames.includes(' & ') ? coupleNames.split(' & ') : [coupleNames, ''];
  const heroPad = 'clamp(22px, 6vw, 90px)';
  const hasPhoto = Boolean(couplePhotoUrl);

  return (
    <div style={{ fontFamily: tokens.body, fontWeight: 300, lineHeight: 1.6 }}>
      {/* Scoped responsive grid + reduced-motion-safe scroll-cue animation — local to this page only */}
      <style>{`
        .mr-std-hero-grid { display: grid; grid-template-columns: 1fr; gap: clamp(34px, 5vw, 56px); align-items: center; }
        @media (min-width: 840px) {
          .mr-std-hero-grid--photo { grid-template-columns: 1.1fr .9fr; gap: clamp(48px, 6vw, 80px); }
          .mr-std-hero-grid--photo .mr-std-hero-photo { max-width: 420px; justify-self: end; }
        }
        @keyframes mrStdScrollBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
        .mr-std-scroll-cue { display: inline-block; animation: mrStdScrollBob 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mr-std-scroll-cue { animation: none; }
        }
      `}</style>

      {/* ── HERO — teaser only: greeting, names, "are getting married!!", photo. No date/venue. ── */}
      <header
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: `${heroPad} 0`,
          color: tokens.bone,
          background: [
            `linear-gradient(180deg, rgba(11,46,34,.35), rgba(11,46,34,.2) 40%, ${tokens.greenDeep})`,
            'radial-gradient(120% 80% at 88% 8%, rgba(242,96,60,.50), rgba(242,96,60,0) 55%)',
            'radial-gradient(80% 60% at 96% 70%, rgba(226,178,60,.20), rgba(226,178,60,0) 60%)',
            'radial-gradient(90% 80% at 6% 4%, rgba(15,122,82,.30), rgba(15,122,82,0) 55%)',
            tokens.greenDeep,
          ].join(', '),
        }}
      >
        {/* Film grain — above the gradient blooms, below the copy/photo (which sit in the zIndex:2 wrapper below) */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.08,
            mixBlendMode: 'overlay',
            backgroundImage: HERO_GRAIN_URL,
            backgroundRepeat: 'repeat',
            backgroundSize: '180px 180px',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1180, margin: '0 auto', padding: `0 ${heroPad}` }}>
          <div className={`mr-std-hero-grid${hasPhoto ? ' mr-std-hero-grid--photo' : ''}`}>
            <Reveal>
              <div>
                {guestName && (
                  <p style={{ fontFamily: tokens.display, fontStyle: 'italic', fontSize: 'clamp(1.05rem, 3vw, 1.35rem)', opacity: 0.9, margin: 0 }}>
                    Dear {guestName},
                  </p>
                )}
                <div
                  style={{
                    fontFamily: tokens.grotesque,
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    fontSize: 'clamp(1.5rem, 5vw, 2.4rem)',
                    color: tokens.gold,
                    marginTop: 14,
                  }}
                >
                  Save the date
                </div>
                <h1 style={{ fontFamily: tokens.display, fontWeight: 900, lineHeight: 0.86, letterSpacing: '-0.01em', margin: '6px 0 0' }}>
                  <span style={{ display: 'block', fontSize: 'clamp(3.6rem, 16vw, 8rem)' }}>{name1}</span>
                  <span style={{ display: 'block', fontSize: 'clamp(3.6rem, 16vw, 8rem)' }}>
                    <em style={{ fontStyle: 'italic', fontWeight: 600, color: tokens.persimmon }}>&amp;</em> {name2}
                  </span>
                </h1>
                <p style={{ fontFamily: tokens.display, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 3.4vw, 1.6rem)', opacity: 0.9, marginTop: 10 }}>
                  are getting married!!
                </p>
              </div>
            </Reveal>

            {hasPhoto && (
              <Reveal>
                <div
                  className="mr-std-hero-photo"
                  style={{
                    width: '100%',
                    background: tokens.bone,
                    padding: 'clamp(8px, 1.4vw, 12px)',
                    borderRadius: 8,
                    boxShadow: '0 30px 60px -24px rgba(0,0,0,.55)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={couplePhotoUrl}
                    alt=""
                    style={{ display: 'block', width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 3 }}
                  />
                </div>
              </Reveal>
            )}
          </div>

          <a
            href="#date"
            className="mr-std-scroll-cue"
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: 'clamp(40px, 6vw, 64px)',
              fontFamily: tokens.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: tokens.gold,
              textDecoration: 'none',
            }}
          >
            Scroll for details ↓
          </a>
        </div>
      </header>

      {/* ── DETAILS BOX — bone, the single source of all logistics ── */}
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
            {weddingLocation && (
              <p
                style={{
                  fontFamily: tokens.mono,
                  fontSize: '0.66rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(11,33,24,.55)',
                  marginTop: 6,
                }}
              >
                {weddingLocation}
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

      {/* ── FOOTER — couple names only, no hashtag, no sunburst ── */}
      <Section variant="deep">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(1.8rem, 8vw, 3.4rem)' }}>
            {name1} <em style={{ fontStyle: 'italic', color: tokens.persimmon }}>&amp;</em> {name2}
          </div>
        </div>
      </Section>
    </div>
  );
}
