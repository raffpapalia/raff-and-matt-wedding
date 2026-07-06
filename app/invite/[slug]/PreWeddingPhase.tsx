'use client';

import { useState, useEffect } from 'react';
import type { Household, Guest, Settings, Faq, Phase, ScheduleItem, SectionOrderItem } from '@/lib/supabase';
import { DEFAULT_SECTION_ORDER } from '@/lib/supabase';
import { parseIsoDate, formatShortWeekday, formatDotted, formatDisplayTime, deriveSerial } from '@/lib/date';
import StickyBar from './v4/components/StickyBar';
import Section from './v4/components/Section';
import Reveal from './v4/components/Reveal';
import Button from './v4/components/Button';
import BoardingPass from './v4/components/BoardingPass';
import RefTabs from './v4/components/RefTabs';
import { tokens } from './v4/tokens';

interface PreWeddingPhaseProps {
  household: Household;
  guests: Guest[];
  settings: Settings;
  coupleNames: string;
  couplePhotoUrl?: string;
  faqs: Faq[];
  weddingSchedule: ScheduleItem[];
  sectionOrder: SectionOrderItem[];
  currentPhase: Phase['current_phase'];
}

const DRESS_SWATCH_COLORS = [tokens.greenDeep, tokens.greenBright, tokens.pine, tokens.gold, tokens.persimmon];

const HERO_GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='heroGrain'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(%23heroGrain)' opacity='0.5'/></svg>\")";

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function formatGuestNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function scheduleTimeValue(time: string): string {
  return time.trim().replace(/\s*(am|pm)$/i, '');
}

function buildMailto(email: string, householdName: string): string {
  if (!email) return '#contact';
  return `mailto:${email}?subject=${encodeURIComponent(`${householdName} — Wedding question`)}`;
}

// Resolves wedding date + time string into a local Date — handles both "HH:MM"
// (24h) and "H:MM AM/PM" (12h) formats stored in settings.wedding_time.
function buildTargetDate(dateStr: string, timeStr?: string): Date {
  const target = new Date(dateStr + 'T00:00:00');
  if (!timeStr) return target;
  const m24 = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  const m12 = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m24) {
    target.setHours(parseInt(m24[1], 10), parseInt(m24[2], 10), 0, 0);
  } else if (m12) {
    let h = parseInt(m12[1], 10);
    const m = parseInt(m12[2], 10);
    if (m12[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m12[3].toUpperCase() === 'AM' && h === 12) h = 0;
    target.setHours(h, m, 0, 0);
  }
  return target;
}

function CountdownTimer({ weddingDate, weddingTime }: { weddingDate: string; weddingTime?: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const target = buildTargetDate(weddingDate, weddingTime).getTime();
    function compute() {
      const diff = target - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
      const totalMins = Math.floor(diff / 60000);
      return {
        days: Math.floor(totalMins / 1440),
        hours: Math.floor((totalMins % 1440) / 60),
        minutes: totalMins % 60,
      };
    }
    setTimeLeft(compute());
    const id = setInterval(() => setTimeLeft(compute()), 60000);
    return () => clearInterval(id);
  }, [weddingDate, weddingTime]);

  if (!timeLeft) return null;

  const units = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hrs' },
    { value: timeLeft.minutes, label: 'Min' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(12px, 3vw, 32px)',
        marginTop: 'clamp(36px, 6vw, 56px)',
      }}
    >
      {units.map(({ value, label }, i) => (
        <div key={label} style={{ display: 'contents' }}>
          {i > 0 && (
            <span
              aria-hidden="true"
              style={{
                fontFamily: tokens.display,
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: 'clamp(1.4rem, 4vw, 2.4rem)',
                color: tokens.persimmon,
                opacity: 0.55,
                lineHeight: 1,
                alignSelf: 'flex-start',
                paddingTop: '0.15em',
              }}
            >
              :
            </span>
          )}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: tokens.display,
                fontWeight: 900,
                fontSize: 'clamp(3rem, 10vw, 5.6rem)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: tokens.violet,
              }}
            >
              {String(value).padStart(2, '0')}
            </div>
            <div
              style={{
                fontFamily: tokens.mono,
                fontSize: '0.58rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: tokens.sand,
                opacity: 0.75,
                marginTop: 8,
              }}
            >
              {label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Persimmon pill heading — same pattern as InvitationPhaseV4.
function SectionPill({ num, label }: { num?: string; label: string }) {
  return (
    <Reveal>
      <span
        style={{
          display: 'inline-block',
          fontFamily: tokens.mono,
          fontSize: 13,
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          color: tokens.bone,
          background: tokens.persimmon,
          borderRadius: 24,
          padding: '8px 16px',
        }}
      >
        {num && <span style={{ opacity: 0.6 }}>{num}&nbsp;&nbsp;</span>}
        {label}
      </span>
    </Reveal>
  );
}

function GtBlock({
  label,
  heading,
  body,
  href,
  linkLabel,
}: {
  label: string;
  heading?: string;
  body?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div>
      <div className="mr-ref-gt-label">{label}</div>
      {heading && <h4>{heading}</h4>}
      {body && <p>{body}</p>}
      {href && linkLabel && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 10,
            fontFamily: tokens.grotesque,
            fontWeight: 700,
            fontSize: '0.62rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: tokens.persimmon,
            textDecoration: 'none',
            borderBottom: `1.5px solid ${tokens.persimmon}`,
            paddingBottom: 3,
          }}
        >
          {linkLabel}
        </a>
      )}
    </div>
  );
}

export default function PreWeddingPhase({
  household,
  guests,
  settings,
  faqs,
  coupleNames,
  weddingSchedule,
  sectionOrder,
  currentPhase,
}: PreWeddingPhaseProps) {
  const [name1, name2] = coupleNames.includes(' & ') ? coupleNames.split(' & ') : [coupleNames, ''];
  const confirmedGuests = guests.filter(g => g.rsvp_status === 'attending');
  const admitting = formatGuestNames(confirmedGuests.map(g => g.first_name));
  const weddingYear = parseIsoDate(settings.wedding_date)?.y ?? new Date().getFullYear();
  const weddingDay = parseIsoDate(settings.wedding_date)?.d;
  const mailto = buildMailto(settings.contact_email, household.name);

  const orderList = sectionOrder.length > 0 ? sectionOrder : DEFAULT_SECTION_ORDER;
  const isVisible = (id: string) => {
    const item = orderList.find(s => s.id === id);
    return item ? item.visible_phases?.includes(currentPhase) ?? true : true;
  };

  const gtBlocks: { label: string; heading?: string; body?: string; href?: string; linkLabel?: string }[] = [
    { label: 'The venue', heading: settings.venue_name, body: settings.location },
  ];
  if (settings.getting_there) {
    gtBlocks.push({ label: 'Getting there', body: settings.getting_there });
  }
  if (settings.accommodation_url) {
    gtBlocks.push({ label: 'Staying over', href: settings.accommodation_url, linkLabel: 'Book a room' });
  }

  const tabs: { id: string; label: string; content: React.ReactNode }[] = [
    ...(isVisible('on_the_day')
      ? [
          {
            id: 'order',
            label: 'Running order',
            content:
              weddingSchedule.length > 0 ? (
                <div>
                  {weddingSchedule.map((item, i) => (
                    <div key={i} className="mr-ref-order-row">
                      <div className="mr-ref-order-time">{scheduleTimeValue(item.time)}</div>
                      <div className="mr-ref-order-name">{item.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ opacity: 0.6, fontStyle: 'italic' }}>Running order coming soon.</p>
              ),
          },
        ]
      : []),
    {
      id: 'gt',
      label: 'Getting there',
      content: (
        <div className="mr-ref-gt">
          {gtBlocks.map((block, i) => (
            <GtBlock key={i} {...block} />
          ))}
        </div>
      ),
    },
    ...(isVisible('dress_code')
      ? [
          {
            id: 'dress',
            label: 'Dress code',
            content: (
              <div>
                <h3
                  style={{
                    fontFamily: tokens.display,
                    fontWeight: 900,
                    fontSize: 'clamp(2rem, 7vw, 3.4rem)',
                    color: tokens.bone,
                    lineHeight: 0.95,
                    margin: 0,
                  }}
                >
                  {settings.dress_code_heading}
                </h3>
                <div style={{ display: 'flex', gap: 12, margin: '22px 0', flexWrap: 'wrap' }} aria-hidden="true">
                  {DRESS_SWATCH_COLORS.map((c, i) => (
                    <span key={i} style={{ width: 46, height: 46, borderRadius: '50%', boxShadow: '0 5px 14px rgba(11,33,24,.18)', background: c, display: 'block' }} />
                  ))}
                </div>
                <p style={{ maxWidth: '44ch', opacity: 0.82, margin: 0, whiteSpace: 'pre-wrap' }}>{settings.dress_code_description}</p>
              </div>
            ),
          },
        ]
      : []),
    ...(isVisible('faqs')
      ? [
          {
            id: 'faq',
            label: 'Questions',
            content:
              faqs.length > 0 ? (
                <dl className="mr-ref-faq">
                  {faqs.map(f => (
                    <div key={f.id}>
                      <dt>{f.question}</dt>
                      <dd>{f.answer}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p style={{ opacity: 0.6, fontStyle: 'italic' }}>Frequently asked questions coming soon.</p>
              ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ fontFamily: tokens.body, fontWeight: 300, lineHeight: 1.6 }}>
      <StickyBar coupleNames={coupleNames} rightHref={mailto} rightLabel="Get in touch" rightVariant="ghost" />

      {/* Scoped styles: section-transition glows, hero gradient override, ref-section on green */}
      <style>{`
        #pre-hero {
          background:
            linear-gradient(180deg, rgba(11,33,24,.26), rgba(11,33,24,0) 40%),
            radial-gradient(60% 55% at 88% 10%, rgba(242,96,60,.46), rgba(242,96,60,0) 72%),
            radial-gradient(68% 62% at 8% 8%, rgba(142,124,195,.38), rgba(142,124,195,0) 75%),
            radial-gradient(55% 50% at 92% 90%, rgba(168,140,96,.22), rgba(168,140,96,0) 72%),
            ${tokens.greenDeep} !important;
        }
        #pre-footer {
          background:
            radial-gradient(70% 80% at 8% 118%, rgba(242,96,60,.42), rgba(242,96,60,0) 60%),
            radial-gradient(60% 70% at 88% 135%, rgba(142,124,195,.4), rgba(142,124,195,0) 62%),
            ${tokens.greenDeep} !important;
        }
        .mr-pre-green-glow { position: relative; overflow: hidden; }
        .mr-pre-green-glow::after {
          content: ""; position: absolute; bottom: 0; left: 0; right: 0;
          height: 180px; pointer-events: none;
          background:
            radial-gradient(80% 120% at 15% 120%, rgba(242,96,60,.38), rgba(242,96,60,0) 60%),
            radial-gradient(70% 100% at 85% 130%, rgba(142,124,195,.32), rgba(142,124,195,0) 55%);
        }
        /* Tab colours on the deep-green reference section */
        #pre-ref .mr-tabs { border-bottom-color: rgba(246,238,221,0.18); }
        #pre-ref .mr-tab { border-color: rgba(246,238,221,0.28); color: rgba(246,238,221,0.72); }
        #pre-ref .mr-tab:hover { border-color: rgba(246,238,221,0.65); color: #F6EEDD; }
        #pre-ref .mr-tab.is-active { background: ${tokens.persimmon}; border-color: ${tokens.persimmon}; color: #F6EEDD; }
        /* Panel content colours on green */
        #pre-ref .mr-ref-order-row { border-top-color: rgba(246,238,221,0.14); }
        #pre-ref .mr-ref-order-row:last-child { border-bottom-color: rgba(246,238,221,0.14); }
        #pre-ref .mr-ref-order-name { color: #F6EEDD; }
        #pre-ref .mr-ref-gt h4 { color: #F6EEDD; }
        #pre-ref .mr-ref-gt p { color: rgba(246,238,221,0.78); }
        #pre-ref .mr-ref-faq dt { color: #F6EEDD; border-top-color: rgba(246,238,221,0.14); }
        #pre-ref .mr-ref-faq dd { color: rgba(246,238,221,0.75); }
      `}</style>

      {/* ── HERO ── */}
      <Section variant="deep" id="pre-hero" className="mr-pre-green-glow">
        {/* Film grain */}
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
        <Reveal style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h1
            style={{
              fontFamily: tokens.display,
              fontWeight: 900,
              fontSize: 'clamp(2.4rem, 8vw, 4rem)',
              lineHeight: 1.0,
              letterSpacing: '-0.01em',
              color: tokens.bone,
              margin: 0,
            }}
          >
            The wait is nearly over.
          </h1>

          <CountdownTimer weddingDate={settings.wedding_date} weddingTime={settings.wedding_time} />

          {confirmedGuests.length > 0 ? (
            <BoardingPass
              serial={deriveSerial(household.id, weddingYear)}
              coupleNames={coupleNames}
              admitting={admitting}
              date={formatShortWeekday(settings.wedding_date)}
              doors={formatDisplayTime(settings.wedding_time)}
              venue={settings.venue_name}
              stubDate={formatDotted(settings.wedding_date, { year: '2', spaced: false })}
              guestCount={confirmedGuests.length}
            />
          ) : (
            <div
              style={{
                maxWidth: 480,
                margin: 'clamp(34px, 5vw, 52px) auto 0',
                background: tokens.bone,
                color: tokens.ink,
                borderRadius: 14,
                padding: 'clamp(28px, 5vw, 40px)',
                boxShadow: '0 30px 64px -26px rgba(0,0,0,.6)',
              }}
            >
              <p style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', margin: '0 0 10px' }}>
                We&apos;ll miss you
              </p>
              <p style={{ fontFamily: tokens.grotesque, opacity: 0.75, margin: 0 }}>if plans change, the door&apos;s open — just message us</p>
            </div>
          )}

          <p
            style={{
              fontFamily: tokens.display,
              fontStyle: 'italic',
              fontSize: 'clamp(1.05rem, 3vw, 1.4rem)',
              color: tokens.sand,
              marginTop: 'clamp(28px, 4vw, 44px)',
              marginBottom: 0,
            }}
          >
            Here&apos;s everything you need to know.
          </p>
        </Reveal>
      </Section>

      {/* ── REFERENCE ── */}
      <Section variant="deep" id="pre-ref">
        <Reveal>
          <SectionPill label="For reference" />
          <div style={{ marginTop: 'clamp(26px, 4vw, 40px)' }}>
            <RefTabs tabs={tabs} />
          </div>
        </Reveal>
      </Section>

      {/* ── CONTACT ── */}
      <Section variant="deep" id="contact" className="mr-pre-green-glow">
        <Reveal style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: tokens.display,
              fontWeight: 700,
              fontVariationSettings: '"opsz" 144',
              fontSize: 'clamp(2.2rem, 5.5vw, 2.875rem)',
              lineHeight: 1.0,
              letterSpacing: '-0.005em',
              color: tokens.bone,
              margin: '14px 0 0',
            }}
          >
            Plans changed?
          </h2>
          <p
            style={{
              fontFamily: tokens.grotesque,
              opacity: 0.8,
              marginTop: 14,
              maxWidth: '40ch',
              margin: '14px auto 0',
            }}
          >
            If you need to update your RSVP, just message us directly — we&apos;ll sort it.
          </p>
          <div style={{ marginTop: 28 }}>
            <Button href={mailto} variant="solid">
              Get in touch
            </Button>
          </div>
        </Reveal>
      </Section>

      {/* ── FOOTER ── */}
      <Section variant="deep" id="pre-footer">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(1.8rem, 8vw, 3.2rem)' }}>
            <span style={{ color: tokens.violet }}>{name1}</span>{' '}
            <em style={{ fontStyle: 'italic', color: tokens.persimmon }}>&amp;</em>{' '}
            <span style={{ color: tokens.violet }}>{name2}</span>
          </div>
          {weddingDay !== undefined && (
            <p
              style={{
                fontFamily: tokens.mono,
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: tokens.sand,
                opacity: 0.7,
                marginTop: 14,
              }}
            >
              See you on the {ordinal(weddingDay)}
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
