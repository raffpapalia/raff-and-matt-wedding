'use client';

import RSVPPhase from './RSVPPhase';
import FaqAccordion from './FaqAccordion';
import AddToCalendar from '@/app/components/AddToCalendar';
import type { Household, Guest, Settings, CustomQuestion, CustomAnswer, Faq } from '@/lib/supabase';
import {
  Parallelogram,
  WaterRipple,
  LightBeam,
  Particles,
  FloatingPetal,
  SectionNumber,
} from './v3/primitives';

interface InvitationPhaseProps {
  household: Household;
  guests: Guest[];
  settings: Settings;
  questions: CustomQuestion[];
  existingAnswers: CustomAnswer[];
  guestName: string;
  faqs: Faq[];
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

function formatCutoffDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  return `${parseInt(day)} ${MONTHS[parseInt(month) - 1]} ${year}`;
}

function getImgSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('/')) return url;
  return `data:image/jpeg;base64,${url}`;
}

// Original Unsplash sources (re-download to /public/images/ if assets are missing):
// BANKSIA:    https://images.unsplash.com/photo-1591289009723-aef022f3f4ee?w=600&q=80
// PROTEA:     https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&q=80
// EUCALYPTUS: https://images.unsplash.com/photo-1599824192893-cd91e1f02b66?w=600&q=80
// MAGNOLIA:   https://images.unsplash.com/photo-1582564286939-400a311013a5?w=600&q=80
// VELVET:     https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80
const BANKSIA_URL = '/images/banksia.jpg';
const PROTEA_URL = '/images/protea.jpg';
const EUCALYPTUS_URL = '/images/eucalyptus.jpg';
const MAGNOLIA_URL = '/images/magnolia.jpg';
const VELVET_URL = '/images/velvet.jpg';

const schedule = [
  { time: '3:00', period: 'PM', event: 'Arrival', detail: 'Drinks in the lobby' },
  { time: '3:30', period: 'PM', event: 'Ceremony', detail: 'A short, sharp celebration' },
  { time: '4:00', period: 'PM', event: 'Cocktails', detail: 'Canapés & conversation' },
  { time: '5:00', period: 'PM', event: 'Reception', detail: 'Dinner, dancing, the lot' },
  { time: 'Late', period: '', event: 'After-hours', detail: 'The night is long' },
];

function PracticalCard({
  roman,
  category,
  imageUrl,
  title,
  body,
  ctaLabel,
  ctaUrl,
}: {
  roman: string;
  category: string;
  imageUrl: string;
  title: string;
  body: React.ReactNode;
  ctaLabel: string;
  ctaUrl?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Image header with parallelogram clip */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)',
          aspectRatio: '4/3',
          marginBottom: '1.25rem',
        }}
      >
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            filter: 'brightness(0.32) saturate(0.65)',
          }}
        />
        {/* Roman numeral + category overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            padding: '1rem',
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: '0.75rem',
              color: '#E8B89E',
              opacity: 0.75,
              marginBottom: '0.2rem',
            }}
          >
            {roman}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              color: '#F2E8D0',
              opacity: 0.8,
              margin: 0,
            }}
          >
            {category}
          </p>
        </div>
      </div>

      {/* Content */}
      <h3
        style={{
          fontFamily: 'var(--font-cinzel)',
          fontStyle: 'italic',
          fontSize: '1.1rem',
          color: '#F2E8D0',
          marginBottom: '0.75rem',
          marginTop: 0,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '0.85rem',
          color: 'rgba(242,232,208,0.68)',
          lineHeight: 1.75,
          flex: 1,
          marginBottom: '1.25rem',
        }}
      >
        {body}
      </div>

      {/* CTA with parallelogram bullet */}
      {ctaUrl ? (
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
        >
          <Parallelogram width={12} height={6} color="#E8B89E" skew={4} />
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#E8B89E',
            }}
          >
            {ctaLabel}
          </span>
        </a>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: 0.4,
          }}
        >
          <Parallelogram width={12} height={6} color="#E8B89E" skew={4} />
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#E8B89E',
            }}
          >
            {ctaLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export default function InvitationPhase({
  household,
  guests,
  settings,
  questions,
  existingAnswers,
  guestName,
  faqs,
}: InvitationPhaseProps) {
  const photoSrc = getImgSrc(household.personal_photo_url);

  return (
    <div style={{ backgroundColor: '#0A1F14', color: '#F2E8D0' }}>

      {/* ── HERO — full viewport height ── */}
      <section
        style={{
          position: 'relative',
          minHeight: '100dvh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Hero background ambience */}
        <WaterRipple opacity={0.1} />
        <LightBeam delay={0} opacity={0.06} />
        <LightBeam delay={4} opacity={0.035} />
        <Particles count={20} color="rgba(232,184,158,0.6)" />
        <FloatingPetal delay={2} top="18%" duration={22} color="#E8B89E" />
        <FloatingPetal delay={9} top="64%" duration={18} color="#C89870" flip />

        {/* Top corner markers */}
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
          <Parallelogram width={16} height={8} color="#E8B89E" skew={5} />
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              letterSpacing: '0.35em',
              color: '#E8B89E',
              opacity: 0.75,
            }}
          >
            M &amp; R · 2027
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            top: '1.75rem',
            right: '1.75rem',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              letterSpacing: '0.35em',
              color: '#E8B89E',
              opacity: 0.55,
            }}
          >
            Melbourne · Winter
          </span>
        </div>

        {/* Hero grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-12 md:gap-16 items-center"
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: '1100px',
            padding: '7rem 2rem 5rem',
          }}
        >
          {/* Left: text content */}
          <div className="order-1">
            {/* "THE INVITATION" label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem',
              }}
            >
              <Parallelogram width={24} height={12} color="#1F4D3A" skew={6} />
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
                The Invitation
              </p>
            </div>

            {/* "For" + guest name */}
            <div style={{ marginBottom: '1.75rem' }}>
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
                  fontSize: 'clamp(1.75rem, 5vw, 3rem)',
                  color: '#F2E8D0',
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                {guestName}
              </h1>
            </div>

            {/* Personal message card */}
            {household.personal_message && (
              <div
                style={{
                  borderLeft: '3px solid #1F4D3A',
                  padding: '1.1rem 1.25rem',
                  background: 'rgba(31,77,58,0.15)',
                  marginBottom: '2rem',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontStyle: 'italic',
                    fontSize: '0.875rem',
                    color: 'rgba(242,232,208,0.75)',
                    lineHeight: 1.75,
                    margin: 0,
                  }}
                >
                  {household.personal_message}
                </p>
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <a
                href="#section-06"
                style={{
                  display: 'inline-block',
                  padding: '0.875rem 2.25rem',
                  backgroundColor: '#E8B89E',
                  color: '#040B07',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.25em',
                  clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)',
                  textDecoration: 'none',
                  minHeight: '44px',
                  lineHeight: '44px',
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
              >
                RSVP
              </a>
              <a
                href="#section-01"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 1.75rem',
                  minHeight: '44px',
                  border: '1px solid rgba(232,184,158,0.45)',
                  color: '#E8B89E',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  textDecoration: 'none',
                  background: 'transparent',
                }}
              >
                The Details ↓
              </a>
            </div>
          </div>

          {/* Right: personal photo */}
          {photoSrc && (
            <div className="order-2" style={{ position: 'relative' }}>
              {/* Emerald shadow behind */}
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '-14px',
                  right: '14px',
                  bottom: '-14px',
                  backgroundColor: '#1F4D3A',
                  clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)',
                  pointerEvents: 'none',
                }}
                aria-hidden="true"
              />
              {/* Photo */}
              <div
                style={{
                  position: 'relative',
                  clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={photoSrc}
                  alt="Personal photo"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  style={{
                    width: '100%',
                    display: 'block',
                    aspectRatio: '3/4',
                    objectFit: 'cover',
                    filter: 'grayscale(0.35) sepia(0.1) brightness(0.88) contrast(1.05) saturate(0.9)',
                  }}
                />
                {/* Water ripple overlay */}
                <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
                  <WaterRipple opacity={0.25} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scroll indicator bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <div
            style={{
              width: '1px',
              height: '40px',
              background: 'linear-gradient(to bottom, rgba(232,184,158,0.6), transparent)',
            }}
          />
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              color: '#E8B89E',
              opacity: 0.5,
              writingMode: 'vertical-rl',
              margin: 0,
            }}
          >
            Scroll
          </p>
        </div>
      </section>

      {/* ── SECTION 01 — The Day ── */}
      <section id="section-01" style={{ backgroundColor: '#0A1F14', padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <SectionNumber n="01" label="The Day" />

          {/* Couple names asymmetric */}
          <div style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-cinzel)',
                fontStyle: 'italic',
                fontSize: 'clamp(2.5rem, 10vw, 6rem)',
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
                margin: '0.3rem 0',
              }}
            >
              <Parallelogram width={72} height={28} color="#1F4D3A" skew={16} />
              <span
                style={{
                  fontFamily: 'var(--font-cinzel)',
                  fontStyle: 'italic',
                  fontSize: '1.5rem',
                  color: '#F2E8D0',
                  opacity: 0.65,
                }}
              >
                &amp;
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(242,232,208,0.18)' }} />
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-cinzel)',
                fontStyle: 'italic',
                fontSize: 'clamp(2.5rem, 10vw, 6rem)',
                color: '#F2E8D0',
                lineHeight: 1,
                margin: 0,
              }}
            >
              Raff
            </h2>
          </div>

          {/* Cinematic couple photo */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              marginBottom: '2.5rem',
              clipPath: 'polygon(2% 0, 100% 0, 98% 100%, 0 100%)',
              overflow: 'hidden',
            }}
          >
            <img
              src={photoSrc || 'https://images.unsplash.com/photo-1604017011826-d3b4c23f8914?w=1200&q=80'}
              alt=""
              aria-hidden="true"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              className="section-01-couple-photo"
              style={{
                width: '100%',
                display: 'block',
                objectFit: 'cover',
                filter: 'grayscale(0.3) sepia(0.1) brightness(0.75) contrast(1.08) saturate(0.85)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, transparent 40%, #0A1F14 100%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
              <WaterRipple opacity={0.2} />
            </div>
          </div>

          {/* Date block — three columns */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
            style={{ marginBottom: '2.5rem' }}
          >
            {[
              { label: 'Date', value: formatWeddingDate(settings.wedding_date) },
              { label: 'From', value: settings.wedding_time.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase()) },
              { label: 'Venue', value: settings.venue_name },
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
                    fontSize: '0.95rem',
                    color: '#F2E8D0',
                    lineHeight: 1.45,
                    margin: 0,
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Tagline */}
          <p
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(0.85rem, 2.5vw, 1.05rem)',
              color: 'rgba(242,232,208,0.6)',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {settings.tagline}
          </p>
        </div>
      </section>

      {/* ── SECTION 02 — Programme ── */}
      <section id="section-02" style={{ backgroundColor: '#0A1F14', padding: '6rem 2rem', position: 'relative', overflow: 'hidden' }}>
        {/* Background floral — banksia, right side */}
        <div
          style={{
            position: 'absolute',
            top: '5%',
            right: 0,
            width: '40%',
            maxWidth: '320px',
            height: '90%',
            clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)',
            opacity: 0.4,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <img
            src={BANKSIA_URL}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.25) saturate(0.6)' }}
          />
        </div>

        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <SectionNumber n="02" label="Programme" />

          <div style={{ marginBottom: '2rem' }}>
            {schedule.map(({ time, period, event, detail }, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 80px 1fr',
                  gap: '1.25rem',
                  alignItems: 'start',
                  padding: '1.1rem 0',
                  borderBottom: i < schedule.length - 1 ? '1px solid rgba(232,184,158,0.08)' : 'none',
                }}
              >
                <div style={{ paddingTop: '0.3rem' }}>
                  <Parallelogram width={24} height={12} color="#E8B89E" skew={5} fillOpacity={0.6} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: '1rem',
                      color: '#F2E8D0',
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    {time}
                  </p>
                  {period && (
                    <p
                      style={{
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: '0.6rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        color: '#E8B89E',
                        margin: '0.15rem 0 0',
                      }}
                    >
                      {period}
                    </p>
                  )}
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontStyle: 'italic',
                      fontSize: '0.95rem',
                      color: '#F2E8D0',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {event}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: '0.78rem',
                      color: 'rgba(242,232,208,0.55)',
                      margin: '0.2rem 0 0',
                    }}
                  >
                    {detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Add to Calendar */}
          <div>
            <AddToCalendar mode="invitation" settings={settings} />
          </div>
        </div>
      </section>

      {/* ── SECTION 03 — Dress Code ── */}
      <section
        id="section-03"
        style={{
          backgroundColor: '#06140C',
          padding: '6rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background texture — dark velvet, left */}
        <div
          style={{
            position: 'absolute',
            top: '5%',
            left: 0,
            width: '35%',
            maxWidth: '280px',
            height: '90%',
            clipPath: 'polygon(0 0, 92% 0, 100% 100%, 0 100%)',
            opacity: 0.45,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <img
            src={VELVET_URL}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.22) saturate(0.5)' }}
          />
        </div>

        <div
          className="dress-code-content"
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <SectionNumber n="03" label="Dress Code" />

          <p
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(2.5rem, 8vw, 4rem)',
              color: '#F2E8D0',
              lineHeight: 1,
              margin: '0 0 0.25rem',
            }}
          >
            Elevated
          </p>
          <p
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(2.5rem, 8vw, 4rem)',
              background: 'linear-gradient(135deg, #E8B89E 0%, #C89670 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1,
              margin: '0 0 2rem',
            }}
          >
            Cocktail
          </p>

          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.9rem',
              color: 'rgba(242,232,208,0.7)',
              lineHeight: 1.8,
              marginBottom: '1rem',
              maxWidth: '380px',
            }}
          >
            We&apos;ll be dressed up and we&apos;d love you to be too. Think glamorous cocktail —
            dresses and suits.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.9rem',
              color: 'rgba(242,232,208,0.7)',
              lineHeight: 1.8,
              margin: 0,
              maxWidth: '380px',
            }}
          >
            Black tie is absolutely welcome if that&apos;s your vibe.
          </p>
        </div>
      </section>

      {/* ── SECTION 04 — The Practicalities ── */}
      <section id="section-04" style={{ backgroundColor: '#0A1F14', padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <SectionNumber n="04" label="The Practicalities" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <PracticalCard
              roman="i."
              category="Stay"
              imageUrl={EUCALYPTUS_URL}
              title="Accommodation"
              body={
                <>
                  We&apos;ve arranged a special rate at <em>{settings.venue_name}</em>. Plenty of other
                  CBD hotels are nearby if you prefer.
                </>
              }
              ctaLabel="Book a room"
              ctaUrl={settings.accommodation_url || undefined}
            />
            <PracticalCard
              roman="ii."
              category="Capture"
              imageUrl={BANKSIA_URL}
              title="Photos"
              body={
                <>
                  Snap away and share on the day. Tag us with{' '}
                  <em style={{ color: '#E8B89E', fontStyle: 'italic' }}>{settings.hashtag}</em>{' '}
                  in your stories and posts.
                </>
              }
              ctaLabel="Upload yours"
              ctaUrl={settings.photos_upload_url || undefined}
            />
            <PracticalCard
              roman="iii."
              category="Gift"
              imageUrl={MAGNOLIA_URL}
              title="Registry"
              body="Your presence is the greatest gift. If you'd like to give something more, we've put together a small wish list."
              ctaLabel="View registry"
              ctaUrl={settings.registry_url || undefined}
            />
          </div>
        </div>
      </section>

      {/* ── SECTION 05 — Questions ── */}
      <section
        id="section-05"
        style={{
          backgroundColor: '#06140C',
          padding: '6rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background floral bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '30%',
            maxWidth: '240px',
            height: '60%',
            clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <img
            src={PROTEA_URL}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.2) saturate(0.5)' }}
          />
        </div>

        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <SectionNumber n="05" label="Questions" />

          {faqs.length > 0 ? (
            <FaqAccordion faqs={faqs} />
          ) : (
            <p
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.875rem',
                color: 'rgba(242,232,208,0.4)',
                fontStyle: 'italic',
              }}
            >
              Frequently asked questions coming soon.
            </p>
          )}
        </div>
      </section>

      {/* ── SECTION 06 — The Reply ── */}
      <section id="section-06" style={{ backgroundColor: '#0A1F14', padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <SectionNumber n="06" label="The Reply" />

          <h2
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(2rem, 6vw, 3.5rem)',
              color: '#F2E8D0',
              lineHeight: 1.1,
              margin: '0 0 1rem',
            }}
          >
            Will you join us?
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.85rem',
              color: 'rgba(242,232,208,0.65)',
              marginBottom: '2rem',
            }}
          >
            Please reply by{' '}
            <em style={{ color: '#E8B89E', fontStyle: 'italic' }}>
              {formatCutoffDate(settings.rsvp_cutoff_date)}
            </em>
          </p>

          {/* RSVP card with emerald border + two parallelograms top-right */}
          <div
            className="rsvp-card"
            style={{
              borderLeft: '3px solid #1F4D3A',
              background: 'rgba(31,77,58,0.08)',
              position: 'relative',
            }}
          >
            {/* Two parallelograms top-right */}
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                display: 'flex',
                gap: '0.3rem',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              <Parallelogram width={18} height={9} color="#1F4D3A" skew={5} fillOpacity={0.7} />
              <Parallelogram width={12} height={9} color="#E8B89E" skew={5} fillOpacity={0.5} />
            </div>

            <RSVPPhase
              household={household}
              guests={guests}
              questions={questions}
              existingAnswers={existingAnswers}
              dietaryOptions={settings.dietary_options}
              rsvpCutoffDate={settings.rsvp_cutoff_date}
              embedded
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ backgroundColor: '#040B07', padding: '2.5rem 2rem' }}>
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
              color: '#F2E8D0',
              margin: 0,
            }}
          >
            Matt &amp; Raff
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Parallelogram width={20} height={10} color="#1F4D3A" skew={5} />
            <Parallelogram width={20} height={10} color="#E8B89E" skew={5} />
            <Parallelogram width={20} height={10} color="#C89870" skew={5} />
          </div>
        </div>
      </footer>

      <style>{`
        .section-01-couple-photo { aspect-ratio: 16/9; }
        @media (min-width: 768px) {
          .section-01-couple-photo { aspect-ratio: 21/9; }
        }
        .dress-code-content { padding-left: 0; }
        @media (min-width: 768px) {
          .dress-code-content { padding-left: min(20%, 200px); }
        }
        .rsvp-card { padding: 1.5rem 1.25rem; }
        @media (min-width: 768px) {
          .rsvp-card { padding: 2rem 1.75rem; }
        }
        #section-05 button { min-height: 44px; }
      `}</style>
    </div>
  );
}
