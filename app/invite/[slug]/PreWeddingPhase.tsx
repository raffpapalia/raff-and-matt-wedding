'use client';

import type { Household, Guest, Settings, CustomQuestion, CustomAnswer, Faq, Phase, ScheduleItem, SectionOrderItem } from '@/lib/supabase';
import { DEFAULT_SECTION_ORDER } from '@/lib/supabase';
import { parseIsoDate, formatShortWeekday, formatDotted, deriveSerial } from '@/lib/date';
import StickyBar from './v4/components/StickyBar';
import Section from './v4/components/Section';
import Reveal from './v4/components/Reveal';
import Kicker from './v4/components/Kicker';
import Button from './v4/components/Button';
import BoardingPass from './v4/components/BoardingPass';
import RefTabs from './v4/components/RefTabs';
import { tokens } from './v4/tokens';

interface PreWeddingPhaseProps {
  household: Household;
  guests: Guest[];
  settings: Settings;
  questions: CustomQuestion[];
  existingAnswers: CustomAnswer[];
  guestName: string;
  coupleNames: string;
  couplePhotoUrl?: string;
  faqs: Faq[];
  weddingSchedule: ScheduleItem[];
  sectionOrder: SectionOrderItem[];
  currentPhase: Phase['current_phase'];
}

const DRESS_SWATCH_COLORS = [tokens.greenDeep, tokens.greenBright, tokens.pine, tokens.gold, tokens.persimmon];

// "10th" / "21st" / "3rd" — for the footer's "see you on the {day}" line.
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

// Confirmed first names: "A" / "A & B" / "A, B & C" — ampersand before the last name.
function formatGuestNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

// Splits a schedule time like "3:00 PM" down to just its value, matching the
// canonical pass page's simpler running-order rows (no AM/PM shown there).
function scheduleTimeValue(time: string): string {
  return time.trim().replace(/\s*(am|pm)$/i, '');
}

function buildMailto(email: string, householdName: string): string {
  if (!email) return '#contact';
  return `mailto:${email}?subject=${encodeURIComponent(`${householdName} — Wedding question`)}`;
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
  couplePhotoUrl,
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

  // Same admin section-order gating InvitationPhaseV4 uses, so a tab hidden for
  // pre_wedding (e.g. Dress code) doesn't render here either.
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
                    color: tokens.green,
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

      {/* ── HERO ── */}
      <Section variant="deep" backgroundImage={couplePhotoUrl || undefined}>
        <Reveal style={{ textAlign: 'center' }}>
          <Kicker variant="bare" label="Before the night" />
          <h1
            style={{
              fontFamily: tokens.display,
              fontWeight: 900,
              fontSize: 'clamp(2rem, 7vw, 3.6rem)',
              lineHeight: 1.04,
              margin: '14px auto 0',
              maxWidth: '16ch',
            }}
          >
            The wait&apos;s nearly over.
          </h1>
          <p
            style={{
              fontFamily: tokens.display,
              fontStyle: 'italic',
              fontSize: 'clamp(1.05rem, 3vw, 1.4rem)',
              opacity: 0.85,
              marginTop: 14,
            }}
          >
            Here&apos;s your pass.
          </p>

          {confirmedGuests.length > 0 ? (
            <BoardingPass
              serial={deriveSerial(household.id, weddingYear)}
              coupleNames={coupleNames}
              admitting={admitting}
              date={formatShortWeekday(settings.wedding_date)}
              doors={settings.wedding_time}
              venue={settings.venue_name}
              hashtag={settings.hashtag}
              stampLine={settings.pass_stamp_line}
              stampSub={settings.pass_stamp_sub}
              stubDate={formatDotted(settings.wedding_date, { year: '2', spaced: false })}
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
              }}
            >
              <p style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', margin: '0 0 10px' }}>
                We&apos;ll miss you
              </p>
              <p style={{ opacity: 0.8, margin: 0 }}>if plans change, the door&apos;s open — just message us</p>
            </div>
          )}
        </Reveal>
      </Section>

      {/* ── REFERENCE ── */}
      <Section variant="bone">
        <Reveal>
          <div style={{ marginBottom: 'clamp(26px, 4vw, 40px)' }}>
            <Kicker label="For reference" color={tokens.green} />
          </div>
          <RefTabs tabs={tabs} />
        </Reveal>
      </Section>

      {/* ── CONTACT ── */}
      <Section variant="green" id="contact">
        <Reveal style={{ textAlign: 'center' }}>
          <h3 style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(1.6rem, 5vw, 2.6rem)', margin: 0 }}>
            Plans changed?
          </h3>
          <p style={{ opacity: 0.85, marginTop: 10 }}>
            If you need to update your RSVP, just message us directly — we&apos;ll sort it.
          </p>
          <div style={{ marginTop: 24 }}>
            <Button href={mailto} variant="solid">
              Get in touch
            </Button>
          </div>
        </Reveal>
      </Section>

      {/* ── FOOTER ── */}
      <Section variant="deep">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(1.8rem, 8vw, 3.2rem)' }}>
            {name1} <em style={{ fontStyle: 'italic', color: tokens.persimmon }}>&amp;</em> {name2}
          </div>
          <p
            style={{
              fontFamily: tokens.mono,
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              opacity: 0.55,
              marginTop: 14,
            }}
          >
            {settings.hashtag}
            {weddingDay !== undefined && <> · See you on the {ordinal(weddingDay)}</>}
          </p>
        </div>
      </Section>
    </div>
  );
}
