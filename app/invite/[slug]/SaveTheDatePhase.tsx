'use client';

import type { Settings } from '@/lib/supabase';
import { formatLongDate, formatDisplayTime } from '@/lib/date';
import Section from './v4/components/Section';
import Reveal from './v4/components/Reveal';
import CalendarControl from './v4/components/CalendarControl';
import { tokens } from './v4/tokens';

// Film-grain texture for the hero only — local to this page, distinct from the
// site-wide grain in app/globals.css (which sits at z-index:9999 above everything
// for an overall vignette). This one paints into the hero's own background stack,
// below the copy/photo content.
const HERO_GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='heroGrain'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(%23heroGrain)' opacity='0.5'/></svg>\")";

// Local alias for the shared v4 tokens this page uses — Save the Date now reads
// its full palette (green/violet/sand/persimmon/bone/ink) from the shared tokens,
// which were promoted to this finalised palette as the single source of truth.
const stdColors = {
  persimmon: tokens.persimmon,
  violet: tokens.violet,
  sand: tokens.sand,
  green: tokens.greenDeep,
  bone: tokens.bone,
  ink: tokens.ink,
};

// Tunable type sizes/weights — safe to edit these values directly; run npm run
// build to verify. Font-FAMILY stays on the tokens.* CSS-var indirection
// (next/font requires it) and colours stay on stdColors — only size/weight/
// letter-spacing/margin live here.
const TYPE = {
  greeting: { size: 'clamp(1.6rem, 4.5vw, 2.3rem)', weight: 500, marginBottom: 'clamp(34px, 8vw, 52px)' },
  saveTheDate: { size: 'clamp(1.5rem, 5vw, 2.4rem)', weight: 800, tracking: '0.15em', marginBottom: 'clamp(8px, 2vw, 14px)' },
  names: { size: 'clamp(5rem, 22vw, 10.6rem)', weight: 900, lineHeight: 0.8, tracking: '-0.01em', indent: 'clamp(26px, 8vw, 46px)' },
  married: { size: 'clamp(1.5rem, 5vw, 2.4rem)', weight: 700, tracking: '0.15em', marginTop: 'clamp(30px, 6vw, 40px)' },
  lockItIn: { size: 'clamp(1.1rem, 3.6vw, 1.5rem)', weight: 800, tracking: '0.22em' },
  bigDate: { size: 'clamp(2.5rem, 12vw, 6.5rem)', weight: 850, tracking: '-0.01em', lineHeight: 0.88, margin: 'clamp(12px, 3vw, 20px) 0 clamp(10px, 2vw, 14px)' },
  dateLine: { size: 'clamp(1.05rem, 3.4vw, 1.4rem)', weight: 700 },
  // venue_name + location render as one block (line-break between), per the
  // "option H" vertical-spine layout.
  venue: { size: 'clamp(1rem, 3.2vw, 1.3rem)', weight: 600, tracking: '0.14em', lineHeight: 1.4, marginTop: 'clamp(14px, 3vw, 20px)' },
  moreInfo: { size: 'clamp(1rem, 3vw, 1.25rem)', weight: 700, tracking: '0.12em', marginTop: 'clamp(26px, 5vw, 36px)' },
  footerNames: { size: 'clamp(1.8rem, 8vw, 3.4rem)', weight: 900 },
  // Vertical spine + actions block (details section, "option H" layout)
  spine: { indent: 'clamp(18px, 5vw, 30px)', borderWidth: '5px', maxWidth: '760px' },
  actions: { marginTop: 'clamp(30px, 6vw, 44px)' },
  detailsSection: { paddingY: 'clamp(60px, 10vw, 120px)' },
} as const;

interface SaveTheDatePhaseProps {
  coupleNames: string;
  tagline?: string;
  weddingDate?: string;
  weddingLocation?: string;
  couplePhotoUrl?: string;
  guestName?: string;
  settings?: Settings;
}

// Written out as a stylised flourish ("ten 7 twenty 7") rather than derived from
// the date — a deliberate one-off typographic choice for 10 July 2027, not a
// general day/month/year-to-words formatter. Update this text by hand if the
// wedding date ever changes.
function BigDate() {
  return (
    <div
      style={{
        fontFamily: tokens.display,
        fontWeight: TYPE.bigDate.weight,
        fontSize: TYPE.bigDate.size,
        lineHeight: TYPE.bigDate.lineHeight,
        letterSpacing: TYPE.bigDate.tracking,
        margin: TYPE.bigDate.margin,
        color: stdColors.green,
      }}
    >
      ten 7 twenty 7
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
  const heroPad = 'clamp(18px, 4.5vw, 64px)';
  const heroPadTop = 'clamp(56px, 11vw, 90px)';
  const hasPhoto = Boolean(couplePhotoUrl);

  return (
    <div style={{ fontFamily: tokens.body, fontWeight: 300, lineHeight: 1.6 }}>
      {/* Scoped responsive grid + Matt's colour-scheme overrides for shared v4 sub-components
          (Section/CalendarControl) — local to this page only, does not edit v4/design.css */}
      <style>{`
        .mr-std-hero-grid { display: grid; grid-template-columns: 1fr; gap: clamp(46px, 9vw, 64px); align-items: center; }
        .mr-std-names { padding-left: ${TYPE.names.indent}; }
        @media (min-width: 840px) {
          .mr-std-hero-grid--photo { grid-template-columns: 1.1fr .9fr; gap: clamp(28px, 4.5vw, 48px); }
          .mr-std-hero-grid--photo .mr-std-hero-photo { max-width: 420px; justify-self: end; }
          .mr-std-names { padding-left: 0; }
        }
        #std-date {
          background: ${stdColors.sand} !important;
          padding-top: ${TYPE.detailsSection.paddingY} !important;
          padding-bottom: ${TYPE.detailsSection.paddingY} !important;
        }
        #std-footer {
          background:
            radial-gradient(70% 80% at 8% 118%, rgba(242,96,60,.42), rgba(242,96,60,0) 60%),
            radial-gradient(60% 70% at 88% 135%, rgba(142,124,195,.4), rgba(142,124,195,0) 62%),
            ${stdColors.green} !important;
        }
        .mr-v4 .mr-std-cal .mr-btn-solid {
          background: ${stdColors.violet} !important;
          color: ${stdColors.ink} !important;
        }
        .mr-v4 .mr-std-cal .mr-btn-solid:hover {
          background: ${stdColors.violet} !important;
        }
      `}</style>

      {/* ── HERO — teaser only: greeting, names, "are getting married!", photo. No date/venue. ── */}
      <header
        style={{
          position: 'relative',
          overflow: 'hidden',
          paddingTop: heroPadTop,
          paddingBottom: heroPad,
          color: tokens.bone,
          background: [
            // Legibility tint — fades fully to transparent by 45% so it never
            // flattens the blooms beneath it (the prior version went fully opaque
            // by 40%, which is why the violet bloom read as invisible).
            'linear-gradient(180deg, rgba(11,33,24,.32), rgba(11,33,24,0) 45%)',
            // persimmon — upper-right
            'radial-gradient(60% 55% at 88% 10%, rgba(242,96,60,.5), rgba(242,96,60,0) 72%)',
            // violet — upper-left, anchored in the open corner margin (outside the
            // text/photo columns on both mobile and desktop) at full spec opacity
            // so it's clearly visible against the green base
            'radial-gradient(68% 62% at 8% 8%, rgba(142,124,195,.4), rgba(142,124,195,0) 75%)',
            // sand — lower-right
            'radial-gradient(55% 50% at 92% 90%, rgba(168,140,96,.25), rgba(168,140,96,0) 72%)',
            stdColors.green,
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
                  <p
                    style={{
                      fontFamily: tokens.grotesque,
                      fontWeight: TYPE.greeting.weight,
                      fontSize: TYPE.greeting.size,
                      color: stdColors.persimmon,
                      margin: `0 0 ${TYPE.greeting.marginBottom}`,
                    }}
                  >
                    {guestName},
                  </p>
                )}
                <div
                  style={{
                    fontFamily: tokens.grotesque,
                    fontWeight: TYPE.saveTheDate.weight,
                    letterSpacing: TYPE.saveTheDate.tracking,
                    textTransform: 'uppercase',
                    fontSize: TYPE.saveTheDate.size,
                    color: stdColors.sand,
                    margin: `0 0 ${TYPE.saveTheDate.marginBottom}`,
                  }}
                >
                  Save the date
                </div>
                <h1
                  className="mr-std-names"
                  style={{
                    fontFamily: tokens.display,
                    fontWeight: TYPE.names.weight,
                    lineHeight: TYPE.names.lineHeight,
                    letterSpacing: TYPE.names.tracking,
                    margin: 0,
                  }}
                >
                  <span style={{ display: 'block', fontSize: TYPE.names.size, color: stdColors.violet }}>{name1}</span>
                  <span style={{ display: 'block', fontSize: TYPE.names.size }}>
                    <em style={{ fontStyle: 'italic', fontWeight: 600, color: stdColors.persimmon }}>&amp;</em>{' '}
                    <span style={{ color: stdColors.violet }}>{name2}</span>
                  </span>
                </h1>
                <div
                  style={{
                    fontFamily: tokens.grotesque,
                    fontWeight: TYPE.married.weight,
                    letterSpacing: TYPE.married.tracking,
                    textTransform: 'uppercase',
                    fontSize: TYPE.married.size,
                    color: stdColors.sand,
                    marginTop: TYPE.married.marginTop,
                  }}
                >
                  are getting married!
                </div>
              </div>
            </Reveal>

            {hasPhoto && (
              <Reveal>
                <div
                  className="mr-std-hero-photo"
                  style={{
                    width: '100%',
                    background: stdColors.sand,
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
        </div>
      </header>

      {/* ── DETAILS BOX — sand, vertical-spine ("option H") layout, left-aligned ── */}
      <Reveal>
        <Section variant="bone" id="std-date">
          <div
            style={{
              borderLeft: `${TYPE.spine.borderWidth} solid ${stdColors.persimmon}`,
              paddingLeft: TYPE.spine.indent,
              maxWidth: TYPE.spine.maxWidth,
            }}
          >
            <div
              style={{
                fontFamily: tokens.grotesque,
                fontWeight: TYPE.lockItIn.weight,
                letterSpacing: TYPE.lockItIn.tracking,
                textTransform: 'uppercase',
                fontSize: TYPE.lockItIn.size,
                color: stdColors.green,
              }}
            >
              Lock it in
            </div>
            {weddingDate && <BigDate />}
            {weddingDate && (
              <p
                style={{
                  fontFamily: tokens.grotesque,
                  fontWeight: TYPE.dateLine.weight,
                  fontSize: TYPE.dateLine.size,
                  color: stdColors.green,
                  margin: 0,
                }}
              >
                {settings ? `${formatDisplayTime(settings.wedding_time)} · ${formatLongDate(weddingDate)}` : formatLongDate(weddingDate)}
              </p>
            )}
            {settings && (
              <p
                style={{
                  fontFamily: tokens.grotesque,
                  fontWeight: TYPE.venue.weight,
                  letterSpacing: TYPE.venue.tracking,
                  textTransform: 'uppercase',
                  fontSize: TYPE.venue.size,
                  lineHeight: TYPE.venue.lineHeight,
                  color: stdColors.green,
                  marginTop: TYPE.venue.marginTop,
                }}
              >
                {settings.venue_name}
                {weddingLocation && (
                  <>
                    <br />
                    {weddingLocation}
                  </>
                )}
              </p>
            )}
          </div>

          {/* Actions sit outside the spine bracket, same left indent, no border */}
          <div style={{ paddingLeft: TYPE.spine.indent, marginTop: TYPE.actions.marginTop }}>
            {settings && (
              <div className="mr-std-cal" style={{ display: 'inline-block' }}>
                <CalendarControl mode="save_the_date" settings={settings} />
              </div>
            )}
            <div
              style={{
                fontFamily: tokens.grotesque,
                fontWeight: TYPE.moreInfo.weight,
                letterSpacing: TYPE.moreInfo.tracking,
                textTransform: 'uppercase',
                fontSize: TYPE.moreInfo.size,
                color: stdColors.green,
                marginTop: TYPE.moreInfo.marginTop,
              }}
            >
              More info coming soon!
            </div>
          </div>
        </Section>
      </Reveal>

      {/* ── FOOTER — couple names only, no hashtag, no sunburst ── */}
      <Section variant="deep" id="std-footer">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: tokens.display, fontWeight: TYPE.footerNames.weight, fontSize: TYPE.footerNames.size }}>
            <span style={{ color: stdColors.violet }}>{name1}</span>{' '}
            <em style={{ fontStyle: 'italic', color: stdColors.persimmon }}>&amp;</em>{' '}
            <span style={{ color: stdColors.violet }}>{name2}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
