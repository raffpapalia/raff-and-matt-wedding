'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import RSVPPhase from './RSVPPhase';
import FaqAccordion from './FaqAccordion';
import AddToCalendar from '@/app/components/AddToCalendar';
import type { Household, Guest, Settings, CustomQuestion, CustomAnswer, Faq, Phase, ScheduleItem, SectionOrderItem } from '@/lib/supabase';
import { DEFAULT_SECTION_ORDER } from '@/lib/supabase';
import { palette, alpha } from './v3/tokens';
import {
  Parallelogram,
  EmeraldJewel,
  WaterRipple,
  LightBeam,
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
  weddingSchedule: ScheduleItem[];
  sectionOrder: SectionOrderItem[];
  currentPhase: Phase['current_phase'];
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

// Easter egg: Konami code
const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];
// Touch equivalent: tap the "M & R · 2027" mark several times in quick succession
const KONAMI_TAP_COUNT = 7;
const KONAMI_TAP_WINDOW = 1800; // ms allowed between consecutive taps
const KONAMI_COLORS = [palette.goldBase, palette.cream, palette.goldDeep];

function KonamiCelebration() {
  const pieces = Array.from({ length: 32 }, (_, i) => ({
    left: (i * 29 + 7) % 100,
    size: 6 + ((i * 7) % 10),
    delay: ((i * 11) % 13) / 10,
    duration: 2.8 + ((i * 5) % 17) / 10,
    rotation: (i * 53) % 360,
    color: KONAMI_COLORS[i % KONAMI_COLORS.length],
  }));

  return (
    <div
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}
      aria-hidden="true"
    >
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            top: '-8%',
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            borderRadius: '2px',
            backgroundColor: p.color,
            opacity: 0.85,
            transform: `rotate(${p.rotation}deg)`,
            animation: `konamiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          fontFamily: 'var(--font-cinzel)',
          fontStyle: 'italic',
          fontSize: 'clamp(1.25rem, 5vw, 2.25rem)',
          color: palette.cream,
          whiteSpace: 'nowrap',
          padding: '0 1rem',
          animation: 'konamiMessage 3s ease-in-out forwards',
        }}
      >
        You found it! 🎉 #mattraff2027
      </div>
    </div>
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Lowercase roman numerals for the practicalities card index ("i.", "ii.", "iii.", ...).
const ROMAN_NUMERALS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

// Decorative category label shown over each practicality card's image. Not part of the
// settings schema, so it stays keyed off the known section ids.
const PRACTICALITIES_CATEGORY_BY_ID: Record<string, string> = {
  accommodation: 'Stay',
  culture: 'Capture',
  registry: 'Gift',
};

// Each practicality card's CTA link comes from its own existing settings key, matched by id.
const PRACTICALITIES_LINK_KEY_BY_ID: Record<string, keyof Settings> = {
  accommodation: 'accommodation_url',
  culture: 'photos_upload_url',
  registry: 'registry_url',
};

// Splits a schedule time like "3:00 PM" into its value and period parts
// so it can render in the same two-line style as the original hardcoded schedule.
function splitScheduleTime(time: string): { value: string; period: string } {
  const match = time.trim().match(/^(.*?)\s*(am|pm)$/i);
  if (match) {
    return { value: match[1].trim(), period: match[2].toUpperCase() };
  }
  return { value: time.trim(), period: '' };
}

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
  ctaLabel?: string | null;
  ctaUrl?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Image header with parallelogram clip */}
      {imageUrl && (
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
                color: palette.goldChampagne,
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
                color: palette.cream,
                opacity: 0.8,
                margin: 0,
              }}
            >
              {category}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <h3
        style={{
          fontFamily: 'var(--font-cinzel)',
          fontStyle: 'italic',
          fontSize: '1.1rem',
          color: palette.cream,
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
          color: alpha(palette.cream, 0.68),
          lineHeight: 1.75,
          flex: 1,
          marginBottom: '1.25rem',
        }}
      >
        {body}
      </div>

      {/* CTA with parallelogram bullet */}
      {ctaLabel ? (
        ctaUrl ? (
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <Parallelogram width={12} height={6} color={palette.goldChampagne} skew={4} />
            <span
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: palette.goldChampagne,
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
            <Parallelogram width={12} height={6} color={palette.goldChampagne} skew={4} />
            <span
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: palette.goldChampagne,
              }}
            >
              {ctaLabel}
            </span>
          </div>
        )
      ) : null}
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
  weddingSchedule,
  sectionOrder,
  currentPhase,
}: InvitationPhaseProps) {
  const photoSrc = getImgSrc(household.personal_photo_url);
  const [showKonami, setShowKonami] = useState(false);

  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCountRef = useRef(0);
  const tapResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Configurable sections: filter to those visible on this phase, sorted by order.
  // "the_day" is always shown first and is not part of this list.
  const configurableSections = (sectionOrder.length > 0 ? sectionOrder : DEFAULT_SECTION_ORDER)
    .filter(section => section.id !== 'the_day' && section.visible_phases?.includes(currentPhase))
    .sort((a, b) => a.order - b.order);

  const rsvpSectionNumber = pad2(configurableSections.length + 2);

  // Easter egg: trigger the celebration overlay, auto-hiding after 4.5s
  const triggerKonami = useCallback(() => {
    setShowKonami(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setShowKonami(false), 4500);
  }, []);

  // Easter egg: Konami code (keyboard)
  useEffect(() => {
    let keyProgress = 0;

    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === KONAMI_SEQUENCE[keyProgress]) {
        keyProgress++;
        if (keyProgress === KONAMI_SEQUENCE.length) {
          keyProgress = 0;
          triggerKonami();
        }
      } else {
        keyProgress = 0;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (tapResetTimeoutRef.current) clearTimeout(tapResetTimeoutRef.current);
    };
  }, [triggerKonami]);

  // Easter egg: touch equivalent — tap the "M & R · 2027" mark several times quickly
  function handleLogoTap() {
    tapCountRef.current += 1;
    if (tapResetTimeoutRef.current) clearTimeout(tapResetTimeoutRef.current);

    if (tapCountRef.current >= KONAMI_TAP_COUNT) {
      tapCountRef.current = 0;
      triggerKonami();
    } else {
      tapResetTimeoutRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, KONAMI_TAP_WINDOW);
    }
  }

  // Renderers for the configurable sections, keyed by section_order id.
  const sectionRenderers: Record<string, (num: string) => React.ReactNode> = {
    on_the_day: (num) => (
      <section
        key="on_the_day"
        id="section-on_the_day"
        style={{ backgroundColor: palette.bgPrimary, padding: '6rem 2rem', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <SectionNumber n={num} label="On the Day" />

          {weddingSchedule.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              {weddingSchedule.map((item, i) => {
                const { value, period } = splitScheduleTime(item.time);
                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 80px 1fr',
                      gap: '1.25rem',
                      alignItems: 'start',
                      padding: '1.1rem 0',
                      borderBottom: i < weddingSchedule.length - 1 ? `1px solid ${alpha(palette.goldChampagne, 0.08)}` : 'none',
                    }}
                  >
                    <div style={{ paddingTop: '0.3rem' }}>
                      <Parallelogram width={24} height={12} color={palette.goldChampagne} skew={5} fillOpacity={0.6} />
                    </div>
                    <div>
                      <p
                        style={{
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: '1rem',
                          color: palette.cream,
                          margin: 0,
                          lineHeight: 1,
                        }}
                      >
                        {value}
                      </p>
                      {period && (
                        <p
                          style={{
                            fontFamily: 'var(--font-dm-sans)',
                            fontSize: '0.6rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            color: palette.goldChampagne,
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
                          color: palette.cream,
                          margin: 0,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add to Calendar */}
          <div>
            <AddToCalendar mode="invitation" settings={settings} />
          </div>
        </div>
      </section>
    ),

    dress_code: (num) => {
      const headingLastSpace = settings.dress_code_heading.lastIndexOf(' ');
      const headingFirst =
        headingLastSpace === -1 ? '' : settings.dress_code_heading.slice(0, headingLastSpace);
      const headingLast =
        headingLastSpace === -1 ? settings.dress_code_heading : settings.dress_code_heading.slice(headingLastSpace + 1);

      return (
      <section
        key="dress_code"
        id="section-dress_code"
        style={{
          backgroundColor: palette.bgDeep,
          padding: '6rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="dress-code-content"
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <SectionNumber n={num} label="Dress Code" />

          {headingFirst && (
            <p
              style={{
                fontFamily: 'var(--font-cinzel)',
                fontStyle: 'italic',
                fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                color: palette.cream,
                lineHeight: 1,
                margin: '0 0 0.25rem',
              }}
            >
              {headingFirst}
            </p>
          )}
          <p
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(2.5rem, 8vw, 4rem)',
              background: `linear-gradient(135deg, ${palette.goldChampagne} 0%, ${palette.goldDeep} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1,
              margin: '0 0 2rem',
            }}
          >
            {headingLast}
          </p>

          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.9rem',
              color: alpha(palette.cream, 0.7),
              lineHeight: 1.8,
              margin: 0,
              maxWidth: '380px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {settings.dress_code_description}
          </p>
        </div>
      </section>
      );
    },

    practicalities: (num) => {
      const cards = (settings.practicalities_sections || []).filter((section) => section.enabled);
      return (
        <section key="practicalities" id="section-practicalities" style={{ backgroundColor: palette.bgPrimary, padding: '6rem 2rem' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <SectionNumber n={num} label="The Practicalities" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {cards.map((card, i) => {
                const linkKey = PRACTICALITIES_LINK_KEY_BY_ID[card.id];
                const ctaUrl = linkKey ? ((settings[linkKey] as string) || undefined) : undefined;
                return (
                  <PracticalCard
                    key={card.id}
                    roman={`${ROMAN_NUMERALS[i] || i + 1}.`}
                    category={PRACTICALITIES_CATEGORY_BY_ID[card.id] || ''}
                    imageUrl={card.image_url}
                    title={card.title}
                    body={card.body}
                    ctaLabel={card.link_label}
                    ctaUrl={ctaUrl}
                  />
                );
              })}
            </div>
          </div>
        </section>
      );
    },

    faqs: (num) => (
      <section
        key="faqs"
        id="section-faqs"
        style={{
          backgroundColor: palette.bgDeep,
          padding: '6rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <SectionNumber n={num} label="Questions" />

          {faqs.length > 0 ? (
            <FaqAccordion faqs={faqs} />
          ) : (
            <p
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '0.875rem',
                color: alpha(palette.cream, 0.4),
                fontStyle: 'italic',
              }}
            >
              Frequently asked questions coming soon.
            </p>
          )}
        </div>
      </section>
    ),
  };

  return (
    <div style={{ backgroundColor: palette.bgPrimary, color: palette.cream }}>
      {showKonami && <KonamiCelebration />}

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
        {/* Hero ambience — one quiet ripple + a single hero-only light beam */}
        <WaterRipple opacity={0.1} />
        <LightBeam delay={0} opacity={0.06} />

        {/* Top corner markers */}
        {/* Easter egg: tap the "M & R" mark several times for a surprise */}
        <div
          onClick={handleLogoTap}
          style={{
            position: 'absolute',
            top: '1.75rem',
            left: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
        >
          <Parallelogram width={16} height={8} color={palette.goldChampagne} skew={5} />
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              letterSpacing: '0.35em',
              color: palette.goldChampagne,
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
              color: palette.goldChampagne,
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
              <Parallelogram width={24} height={12} color={palette.forestAccent} skew={6} fillOpacity={0.55} />
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
                The Invitation
              </p>
            </div>

            {/* Couple names — contained large Cinzel, with the page's single bright EmeraldJewel as the ampersand */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h2 aria-label="Matt & Raff" style={{ margin: 0 }}>
                <span
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-cinzel)',
                    fontStyle: 'italic',
                    fontSize: 'clamp(2.25rem, 9vw, 4.25rem)',
                    color: palette.cream,
                    lineHeight: 1,
                  }}
                >
                  Matt
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    margin: '0.25rem 0',
                  }}
                >
                  <EmeraldJewel width={30} height={18} />
                  <span
                    style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontStyle: 'italic',
                      fontSize: '1.35rem',
                      color: palette.cream,
                      opacity: 0.7,
                    }}
                  >
                    &amp;
                  </span>
                  <span style={{ flex: 1, height: '1px', backgroundColor: alpha(palette.cream, 0.18) }} />
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-cinzel)',
                    fontStyle: 'italic',
                    fontSize: 'clamp(2.25rem, 9vw, 4.25rem)',
                    color: palette.cream,
                    lineHeight: 1,
                  }}
                >
                  Raff
                </span>
              </h2>
            </div>

            {/* "For" + guest name */}
            <div style={{ marginBottom: '1.75rem' }}>
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.25em',
                  color: palette.goldChampagne,
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
                  fontSize: 'clamp(1.25rem, 4vw, 1.9rem)',
                  color: palette.cream,
                  lineHeight: 1.2,
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
                  borderLeft: `3px solid ${palette.forestAccent}`,
                  padding: '1.1rem 1.25rem',
                  background: alpha(palette.forestAccent, 0.15),
                  marginBottom: '2rem',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontStyle: 'italic',
                    fontSize: '0.875rem',
                    color: alpha(palette.cream, 0.75),
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
                href="#section-rsvp"
                style={{
                  display: 'inline-block',
                  padding: '0.875rem 2.25rem',
                  backgroundColor: palette.goldChampagne,
                  color: palette.bgDeepest,
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
                href="#section-the_day"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 1.75rem',
                  minHeight: '44px',
                  border: `1px solid ${alpha(palette.goldChampagne, 0.45)}`,
                  color: palette.goldChampagne,
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
              {/* Forest shadow behind */}
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '-14px',
                  right: '14px',
                  bottom: '-14px',
                  backgroundColor: palette.forestAccent,
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
              background: `linear-gradient(to bottom, ${alpha(palette.goldChampagne, 0.6)}, transparent)`,
            }}
          />
          <p
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              color: palette.goldChampagne,
              opacity: 0.5,
              writingMode: 'vertical-rl',
              margin: 0,
            }}
          >
            Scroll
          </p>
        </div>
      </section>

      {/* ── THE DAY — date, time, venue (always shown) ── */}
      <section id="section-the_day" style={{ backgroundColor: palette.bgPrimary, padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <SectionNumber n="01" label="The Day" />

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
                    color: palette.goldChampagne,
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
                    color: palette.cream,
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
              color: alpha(palette.cream, 0.6),
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {settings.tagline}
          </p>
        </div>
      </section>

      {/* ── CONFIGURABLE SECTIONS — driven by section_order setting ── */}
      {configurableSections.map((section, i) => sectionRenderers[section.id]?.(pad2(i + 2)))}

      {/* ── THE REPLY — RSVP, always last ── */}
      <section id="section-rsvp" style={{ backgroundColor: palette.bgPrimary, padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <SectionNumber n={rsvpSectionNumber} label="The Reply" />

          <h2
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontStyle: 'italic',
              fontSize: 'clamp(2rem, 6vw, 3.5rem)',
              color: palette.cream,
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
              color: alpha(palette.cream, 0.65),
              marginBottom: '2rem',
            }}
          >
            Please reply by{' '}
            <em style={{ color: palette.goldChampagne, fontStyle: 'italic' }}>
              {formatCutoffDate(settings.rsvp_cutoff_date)}
            </em>
          </p>

          {/* RSVP card with forest border + two structural parallelograms top-right */}
          <div
            className="rsvp-card"
            style={{
              borderLeft: `3px solid ${palette.forestAccent}`,
              background: alpha(palette.forestAccent, 0.08),
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
              <Parallelogram width={18} height={9} color={palette.forestAccent} skew={5} fillOpacity={0.7} />
              <Parallelogram width={12} height={9} color={palette.goldChampagne} skew={5} fillOpacity={0.5} />
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
      <footer style={{ backgroundColor: palette.bgDeepest, padding: '2.5rem 2rem' }}>
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
              color: palette.cream,
              margin: 0,
            }}
          >
            Matt &amp; Raff
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Parallelogram width={20} height={10} color={palette.forestAccent} skew={5} />
            <Parallelogram width={20} height={10} color={palette.goldChampagne} skew={5} />
            <Parallelogram width={20} height={10} color={palette.goldDeep} skew={5} />
          </div>
        </div>
      </footer>

      <style>{`
        .dress-code-content { padding-left: 0; }
        @media (min-width: 768px) {
          .dress-code-content { padding-left: min(20%, 200px); }
        }
        .rsvp-card { padding: 1.5rem 1.25rem; }
        @media (min-width: 768px) {
          .rsvp-card { padding: 2rem 1.75rem; }
        }
        #section-faqs button { min-height: 44px; }
      `}</style>
    </div>
  );
}
