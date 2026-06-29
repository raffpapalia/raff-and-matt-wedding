'use client';

import { useState } from 'react';
import RSVPPhase from './RSVPPhase';
import type { Household, Guest, Settings, CustomQuestion, CustomAnswer, Faq, Phase, ScheduleItem, SectionOrderItem } from '@/lib/supabase';
import { DEFAULT_SECTION_ORDER } from '@/lib/supabase';
import { parseIsoDate, formatLongDate, formatShortWeekday, formatDayMonthYear, formatDisplayTime, deriveSerial } from '@/lib/date';
import Section from './v4/components/Section';
import Reveal from './v4/components/Reveal';
import StickyBar from './v4/components/StickyBar';
import Ticket from './v4/components/Ticket';
import RunningOrder from './v4/components/RunningOrder';
import CalendarControl from './v4/components/CalendarControl';
import BandQuote from './v4/components/BandQuote';
import TreatedPhoto from './v4/components/TreatedPhoto';
import { tokens } from './v4/tokens';

interface InvitationPhaseV4Props {
  household: Household;
  guests: Guest[];
  settings: Settings;
  questions: CustomQuestion[];
  existingAnswers: CustomAnswer[];
  faqs: Faq[];
  coupleNames: string;
  couplePhotoUrl?: string;
  weddingSchedule: ScheduleItem[];
  sectionOrder: SectionOrderItem[];
  currentPhase: Phase['current_phase'];
  guestName?: string;
}

const ADMIT_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

// Normalises a schedule time — legacy "H:MM AM/PM" (e.g. "3:00 PM") or already-24h
// "HH:MM" — to the 24h "HH:MM" string formatDisplayTime expects, so RunningOrder
// can render it as "3 PM" / "3.30 PM" regardless of which format was typed into
// the admin schedule field.
function scheduleTimeTo24h(time: string): string {
  const trimmed = time.trim();
  const legacy = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!legacy) return trimmed;
  let hours = parseInt(legacy[1], 10);
  const minutes = legacy[2];
  const meridiem = legacy[3].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function formatGuestNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

// Unified section-headline system (item 2): Fraunces 700, ~38px, lh 1.02, colour
// adapts to the section background — bone on green sections, ink on sand sections.
const headlineBase: React.CSSProperties = {
  fontFamily: tokens.display,
  fontWeight: 700,
  fontSize: 'clamp(1.9rem, 4.8vw, 2.4rem)',
  lineHeight: 1.02,
  letterSpacing: '-0.005em',
  margin: '14px 0 0',
};
const headlineOnGreen: React.CSSProperties = { ...headlineBase, color: tokens.bone };
const headlineOnSand: React.CSSProperties = { ...headlineBase, color: tokens.ink };

// Shared section heading — the persimmon pill used on every content section.
// `num` (the zero-padded section number) renders at lower opacity ahead of the
// label; omit it for unnumbered sections (e.g. the personal note).
function SectionPill({ num, label }: { num?: string; label: string }) {
  return (
    <Reveal>
      <span
        style={{
          display: 'inline-block',
          fontFamily: tokens.mono,
          fontSize: 10,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: tokens.bone,
          background: tokens.persimmon,
          borderRadius: 20,
          padding: '5px 11px',
        }}
      >
        {num && <span style={{ opacity: 0.6 }}>{num}&nbsp;&nbsp;</span>}
        {label}
      </span>
    </Reveal>
  );
}

function ConciergeCard({
  num,
  category,
  title,
  body,
  ctaLabel,
  href,
}: {
  num: string;
  category: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <div style={{ background: tokens.greenDeep, color: tokens.bone, padding: '30px 26px' }}>
      <div style={{ fontFamily: tokens.grotesque, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.18em', color: tokens.sand }}>
        <span style={{ color: tokens.violet }}>{num} /</span> {category}
      </div>
      <h3 style={{ fontFamily: tokens.grotesque, fontWeight: 700, fontSize: '1.5rem', margin: '12px 0 8px', color: tokens.sand }}>{title}</h3>
      <p style={{ fontFamily: tokens.grotesque, fontWeight: 400, color: tokens.sand, opacity: 0.78, fontSize: '0.95rem', margin: 0 }}>{body}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginTop: 14,
          fontFamily: tokens.grotesque,
          fontWeight: 600,
          fontSize: '0.62rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: tokens.sand,
          textDecoration: 'none',
          borderBottom: `1.5px solid ${tokens.persimmon}`,
          paddingBottom: 3,
        }}
      >
        {ctaLabel}
      </a>
    </div>
  );
}

export default function InvitationPhaseV4({
  household,
  guests,
  settings,
  questions,
  existingAnswers,
  faqs,
  coupleNames,
  couplePhotoUrl,
  weddingSchedule,
  sectionOrder,
  currentPhase,
  guestName,
}: InvitationPhaseV4Props) {
  const [name1, name2] = coupleNames.includes(' & ') ? coupleNames.split(' & ') : [coupleNames, ''];
  const hasPhoto = Boolean(couplePhotoUrl);

  const orderList = sectionOrder.length > 0 ? sectionOrder : DEFAULT_SECTION_ORDER;
  const isVisible = (id: string) => {
    const item = orderList.find(s => s.id === id);
    return item ? item.visible_phases?.includes(currentPhase) ?? true : true;
  };
  // Gated on data too, not just the admin toggle — an empty schedule would otherwise
  // render the heading + "Doors {time}" with zero rows underneath.
  const showRunningOrder = isVisible('on_the_day') && weddingSchedule.length > 0;
  const showDressCode = isVisible('dress_code');
  // Same idea — don't render an empty .mr-conc grid when every link is unset.
  const hasGoodToKnowContent = Boolean(settings.accommodation_url || settings.photos_upload_url || settings.registry_url);
  const showGoodToKnow = isVisible('practicalities') && hasGoodToKnowContent;
  // Gated on data too — an empty faqs table renders nothing on the guest-facing invite
  // (no "coming soon" placeholder, unlike PreWeddingPhase).
  const showFaqs = isVisible('faqs') && faqs.length > 0;

  // Sequential pill numbers, computed in render order so optional/hidden sections
  // leave no gaps. The personal "note" gets a pill but no number (per request), so
  // numbering starts at "How we got here". Each `next()` is only called when the
  // section actually renders, keeping the sequence contiguous for this household.
  let sectionCounter = 0;
  const next = () => String(++sectionCounter).padStart(2, '0');
  const storyNum = next();
  const detailsNum = next();
  const orderNum = showRunningOrder ? next() : '';
  const dressNum = showDressCode ? next() : '';
  const goodToKnowNum = showGoodToKnow ? next() : '';
  const faqsNum = showFaqs ? next() : '';
  const replyNum = next();

  // RSVP form is revealed by the ticket-stub CTA, not shown by default. The stub
  // label and the status summary below the ticket both key off whether anyone in
  // the household has already responded.
  const hasResponded = guests.some(g => g.rsvp_status === 'attending' || g.rsvp_status === 'declined');
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const openRsvp = () => {
    setRsvpOpen(true);
    // Defer the scroll until the form has mounted into #rsvp-form.
    requestAnimationFrame(() =>
      document.getElementById('rsvp-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const headingLastSpace = settings.dress_code_heading.lastIndexOf(' ');
  const dressHeadingFirst =
    headingLastSpace === -1 ? '' : settings.dress_code_heading.slice(0, headingLastSpace);
  const dressHeadingLast =
    headingLastSpace === -1 ? settings.dress_code_heading : settings.dress_code_heading.slice(headingLastSpace + 1);

  const runningOrderItems = weddingSchedule.map((item, i) => ({
    num: String(i + 1).padStart(2, '0'),
    name: item.label,
    note: item.description,
    time: scheduleTimeTo24h(item.time),
  }));

  const weddingYear = parseIsoDate(settings.wedding_date)?.y ?? new Date().getFullYear();
  // ADMIT_WORDS[0] ('Zero') is intentionally unused — a 0-guest household renders the
  // ticket as "ADMIT" alone (Ticket.tsx) rather than the nonsensical "ADMIT ZERO".
  const admitsWord =
    guests.length === 0
      ? ''
      : guests.length < ADMIT_WORDS.length
        ? ADMIT_WORDS[guests.length]
        : String(guests.length);
  const ticketHousehold = formatGuestNames(guests.map(g => g.first_name)) || household.name;

  return (
    <div style={{ fontFamily: tokens.body, fontWeight: 300, lineHeight: 1.6 }}>
      <StickyBar coupleNames={coupleNames} rightHref="#pass" rightLabel="RSVP" rightVariant="solid" hideUntilScroll />

      {/* ── HERO — Option B bleed: green text panel (left) + couple photo bleed (right);
          stacks photo-on-top on mobile. Mirrors SaveTheDatePhase's glow/grain recipe. ── */}
      <style>{`
        .mr-inv-hero-inner { display: flex; flex-direction: column; }
        .mr-inv-hero-photo { order: 1; position: relative; overflow: hidden; aspect-ratio: 4 / 3; flex: 0 0 auto; }
        .mr-inv-hero-panel { order: 2; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; padding: clamp(56px, 11vw, 90px) clamp(24px, 6vw, 64px); flex: 1 1 auto; }
        .mr-inv-hero-fade { display: none; }
        .mr-inv-names { padding-left: clamp(26px, 8vw, 46px); }
        @media (min-width: 760px) {
          .mr-inv-hero-inner { display: grid; grid-template-columns: 1fr; min-height: 100svh; }
          .mr-inv-hero-inner--photo { grid-template-columns: 52% 48%; }
          .mr-inv-hero-panel { order: 1; }
          .mr-inv-hero-photo { order: 2; aspect-ratio: auto; }
          .mr-inv-hero-fade { display: block; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgba(15,67,49,1) 0%, rgba(15,67,49,0) 26%); }
          .mr-inv-names { padding-left: 0; }
        }

        /* ── Section-transition glow — subtle persimmon+violet bloom at the seam between
           a green section and the sand section below it. CSS-only; remove these two
           rules and their classNames to revert with zero structural changes. ── */
        .mr-inv-green-glow { position: relative; overflow: hidden; }
        .mr-inv-green-glow::after {
          content: ""; position: absolute; bottom: 0; left: 0; right: 0;
          height: 180px; pointer-events: none;
          background:
            radial-gradient(80% 120% at 15% 120%, rgba(242,96,60,.38), rgba(242,96,60,0) 60%),
            radial-gradient(70% 100% at 85% 130%, rgba(142,124,195,.32), rgba(142,124,195,0) 55%);
        }
        .mr-inv-sand-glow { position: relative; overflow: hidden; }
        .mr-inv-sand-glow::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0;
          height: 120px; pointer-events: none;
          background:
            radial-gradient(90% 100% at 20% -20%, rgba(242,96,60,.22), rgba(242,96,60,0) 65%),
            radial-gradient(70% 90% at 80% -10%, rgba(142,124,195,.18), rgba(142,124,195,0) 60%);
        }
      `}</style>
      <header className={`mr-inv-hero-inner${hasPhoto ? ' mr-inv-hero-inner--photo' : ''}`}>
        <div
          className="mr-inv-hero-panel mr-inv-green-glow"
          style={{
            color: tokens.bone,
            background: tokens.greenDeep,
          }}
        >
          <Reveal style={{ position: 'relative', zIndex: 2 }}>
            <div>
              {guestName && (
                <p
                  style={{
                    fontFamily: tokens.grotesque,
                    fontWeight: 500,
                    fontSize: 'clamp(1.6rem, 4.5vw, 2.3rem)',
                    color: tokens.persimmon,
                    margin: 0,
                  }}
                >
                  {guestName}
                </p>
              )}
              <p
                style={{
                  fontFamily: tokens.grotesque,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  fontSize: 'clamp(0.95rem, 3vw, 1.4rem)',
                  color: tokens.sand,
                  margin: `${guestName ? 4 : 0}px 0 clamp(34px, 8vw, 52px)`,
                }}
              >
                You&apos;re invited to the wedding of
              </p>
              <h1 className="mr-inv-names" style={{ fontFamily: tokens.display, fontWeight: 900, lineHeight: 0.82, letterSpacing: '-0.01em', margin: 0 }}>
                <span style={{ display: 'block', fontSize: 'clamp(3.8rem, 17vw, 8rem)', color: tokens.violet }}>{name1}</span>
                <span style={{ display: 'block', fontSize: 'clamp(3.8rem, 17vw, 8rem)', color: tokens.violet }}>
                  <em style={{ fontStyle: 'italic', fontWeight: 600, color: tokens.persimmon }}>&amp;</em> {name2}
                </span>
              </h1>
              <p
                style={{
                  fontFamily: tokens.grotesque,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  fontSize: 'clamp(0.95rem, 3vw, 1.4rem)',
                  marginTop: 22,
                  color: tokens.sand,
                }}
              >
                {settings.tagline}
              </p>
            </div>
          </Reveal>
        </div>

        {hasPhoto && (
          <div className="mr-inv-hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={couplePhotoUrl}
              alt=""
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
            />
            <div className="mr-inv-hero-fade" aria-hidden="true" />
          </div>
        )}
      </header>

      {/* ── A NOTE FOR YOU — household-driven, optional ── */}
      {(household.personal_message || household.personal_photo_url) && (
        <>
          <style>{`#note { background: ${tokens.sand} !important; }`}</style>
          <Section variant="bone" id="note" className="mr-inv-sand-glow">
            <SectionPill label="A note for you" />
            {household.personal_message && household.personal_photo_url && (
              <Reveal className="mr-note-grid">
                <TreatedPhoto src={household.personal_photo_url} alt="" ratio={3 / 4} shape="rect" frameColor={tokens.greenDeep} />
                <div className="mr-note-message">
                  <p style={{ whiteSpace: 'pre-line', color: tokens.ink, opacity: 0.85 }}>{household.personal_message}</p>
                </div>
              </Reveal>
            )}
            {household.personal_message && !household.personal_photo_url && (
              <Reveal className="mr-note-solo">
                <p style={{ whiteSpace: 'pre-line', color: tokens.ink, opacity: 0.85 }}>{household.personal_message}</p>
                <p className="mr-note-sign">— {coupleNames}</p>
              </Reveal>
            )}
            {!household.personal_message && household.personal_photo_url && (
              <Reveal className="mr-note-photo-solo">
                <TreatedPhoto src={household.personal_photo_url} alt="" ratio={3 / 4} shape="rect" frameColor={tokens.greenDeep} />
              </Reveal>
            )}
          </Section>
        </>
      )}

      {/* ── HOW WE GOT HERE ── */}
      <Section variant="deep" className="mr-inv-green-glow">
        <SectionPill num={storyNum} label="How we got here" />
        <div className={`mr-story-grid${settings.story_photo_url ? '' : ' mr-story-grid--solo'}`}>
          <div>
            <h2 style={headlineOnGreen}>{settings.story_heading}</h2>
            <p style={{ fontFamily: tokens.grotesque, marginTop: 22, maxWidth: '46ch', color: tokens.sand, opacity: 0.85, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
              {settings.story_body}
            </p>
          </div>
          {settings.story_photo_url && (
            <TreatedPhoto src={settings.story_photo_url} alt="" ratio={4 / 5} shape="arch" />
          )}
        </div>
      </Section>

      {/* ── THE DETAILS — Kicker header + persimmon spine, matching Save the Date ── */}
      <style>{`
        #inv-details { background: ${tokens.sand} !important; }
      `}</style>
      <Section variant="bone" id="inv-details" className="mr-inv-sand-glow">
        <SectionPill num={detailsNum} label="The Details" />
        <div
          style={{
            borderLeft: `5px solid ${tokens.persimmon}`,
            paddingLeft: 'clamp(18px, 5vw, 30px)',
            maxWidth: 760,
            marginTop: 'clamp(20px, 4vw, 30px)',
          }}
        >
          <div
            style={{
              fontFamily: tokens.display,
              fontWeight: 850,
              fontSize: 'clamp(2.2rem, 10vw, 5.2rem)',
              lineHeight: 0.9,
              color: tokens.ink,
            }}
          >
            ten 7 twenty 7
          </div>
          <p style={{ fontFamily: tokens.grotesque, fontWeight: 700, fontSize: 'clamp(1rem, 3vw, 1.35rem)', color: tokens.greenDeep, margin: 0 }}>
            {formatDisplayTime(settings.wedding_time)} · {formatLongDate(settings.wedding_date)}
          </p>
          <p
            style={{
              fontFamily: tokens.grotesque,
              fontWeight: 600,
              textTransform: 'uppercase',
              fontSize: 'clamp(.9rem, 2.6vw, 1.15rem)',
              color: tokens.greenDeep,
              marginTop: 'clamp(14px, 3vw, 20px)',
            }}
          >
            {settings.venue_name}
          </p>
        </div>
        <div style={{ paddingLeft: 'clamp(18px, 5vw, 30px)', marginTop: 'clamp(30px, 6vw, 44px)' }}>
          <div style={{ display: 'inline-block' }}>
            <CalendarControl mode="invitation" settings={settings} />
          </div>
        </div>
      </Section>

      {/* ── RUNNING ORDER ── */}
      {showRunningOrder && (
        <Section variant="deep" id="order" className="mr-inv-green-glow">
          <div>
            <SectionPill num={orderNum} label="The running order" />
            <h2 style={headlineOnGreen}>How the day unfolds</h2>
          </div>
          <div style={{ marginTop: 'clamp(36px, 5vw, 60px)' }}>
            <RunningOrder items={runningOrderItems} />
          </div>
        </Section>
      )}

      {/* ── DRESS CODE ── */}
      {showDressCode && (
        <>
          <style>{`#dress { background: ${tokens.sand} !important; }`}</style>
          <Section variant="bone" id="dress" className="mr-inv-sand-glow">
            <SectionPill num={dressNum} label="Dress code" />
            <div style={{ marginTop: 'clamp(20px, 3vw, 34px)' }}>
              <h2 style={{ ...headlineOnSand, margin: 0 }}>
                {dressHeadingFirst && (
                  <>
                    {dressHeadingFirst}
                    <br />
                  </>
                )}
                {dressHeadingLast}
              </h2>
              <p style={{ maxWidth: '44ch', color: tokens.greenDeep, opacity: 0.85, fontSize: '1.04rem', margin: '30px 0 0', whiteSpace: 'pre-wrap' }}>
                {settings.dress_code_description}
              </p>
            </div>
          </Section>
        </>
      )}

      {/* ── BAND ── */}
      {settings.band_photo_url && (
        <BandQuote src={settings.band_photo_url} alt="">
          {settings.band_quote}
        </BandQuote>
      )}

      {/* ── GOOD TO KNOW ── */}
      {showGoodToKnow && (
        <Section variant="deep" id="good-to-know" className="mr-inv-green-glow">
          <SectionPill num={goodToKnowNum} label="Good to know" />
          <div className="mr-conc">
              {settings.accommodation_url && (
                <ConciergeCard
                  num="01"
                  category="Stay"
                  title="Where to sleep"
                  body="A special rate nearby, plus plenty of CBD options a short walk away."
                  ctaLabel="Book a room"
                  href={settings.accommodation_url}
                />
              )}
              {settings.photos_upload_url && (
                <ConciergeCard
                  num="02"
                  category="Photos"
                  title="Share the night"
                  body={`Snap away and tag us. Everything lands in one place with ${settings.hashtag}.`}
                  ctaLabel="Upload yours"
                  href={settings.photos_upload_url}
                />
              )}
              {settings.registry_url && (
                <ConciergeCard
                  num="03"
                  category="Gifts"
                  title="The registry"
                  body="Your presence is the gift. If you'd like to give more, we've made a small list."
                  ctaLabel="View registry"
                  href={settings.registry_url}
                />
              )}
          </div>
        </Section>
      )}

      {/* ── FAQs — sand section, pill-only heading, plain stacked Q&A (no accordion) ── */}
      {showFaqs && (
        <>
          <style>{`#faqs { background: ${tokens.sand} !important; }`}</style>
          <Section variant="bone" id="faqs" className="mr-inv-sand-glow">
            <SectionPill num={faqsNum} label="FAQs" />
            <dl style={{ margin: 'clamp(28px, 4vw, 44px) 0 0' }}>
              {faqs.map((f, i) => (
                <div
                  key={f.id}
                  style={{
                    padding: 'clamp(18px, 2.6vw, 26px) 0',
                    borderTop: i === 0 ? undefined : '1px solid rgba(15,67,49,0.22)',
                  }}
                >
                  <dt
                    style={{
                      fontFamily: tokens.display,
                      fontSize: 18,
                      fontWeight: 600,
                      color: tokens.greenDeep,
                    }}
                  >
                    {f.question}
                  </dt>
                  <dd
                    style={{
                      margin: '8px 0 0',
                      fontFamily: tokens.body,
                      fontSize: 14,
                      color: tokens.ink,
                    }}
                  >
                    {f.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        </>
      )}

      {/* ── THE PASS ── */}
      <Section variant="deep" id="pass" className="mr-inv-green-glow">
        <div style={{ marginBottom: 'clamp(34px, 5vw, 52px)' }}>
          <SectionPill num={replyNum} label="The reply" />
          <h2 style={{ ...headlineOnGreen, marginTop: 14 }}>Will you join us?</h2>
          <div
            style={{
              fontFamily: tokens.mono,
              fontSize: '0.7rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: tokens.sand,
              marginTop: 14,
            }}
          >
            Please reply by {formatDayMonthYear(settings.rsvp_cutoff_date)}
          </div>
        </div>
        <Ticket
          serial={deriveSerial(household.id, weddingYear)}
          admits={admitsWord}
          household={ticketHousehold}
          date={formatShortWeekday(settings.wedding_date)}
          time={formatDisplayTime(settings.wedding_time)}
          venue={settings.venue_name}
          ctaLabel={hasResponded ? 'Update RSVP' : 'Confirm your seats'}
          onCta={openRsvp}
        />
        {/* Compact response summary — only for households who've already replied,
            shown until they open the form to edit. Sits directly on the green
            section (bone text); attending = green dot (bone ring for contrast on
            the green ground), declined = muted sand. */}
        {hasResponded && !rsvpOpen && (
          <div style={{ maxWidth: 560, margin: 'clamp(28px, 4vw, 40px) auto 0' }}>
            {guests.map(g => {
              const attending = g.rsvp_status === 'attending';
              return (
                <div
                  key={g.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderTop: `1px solid rgba(246,238,221,0.14)`,
                    color: tokens.bone,
                    fontFamily: tokens.body,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      flex: '0 0 auto',
                      background: attending ? tokens.greenDeep : tokens.sand,
                      border: attending ? `1.5px solid ${tokens.bone}` : 'none',
                    }}
                  />
                  <span style={{ fontWeight: 400 }}>{g.first_name}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: tokens.mono,
                      fontSize: '0.66rem',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: attending ? tokens.bone : tokens.sand,
                    }}
                  >
                    {attending ? 'Attending' : "Can't make it"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div id="rsvp-form">
          {rsvpOpen && (
            <div style={{ marginTop: 'clamp(40px, 6vw, 64px)' }}>
              <RSVPPhase
                household={household}
                guests={guests}
                questions={questions}
                existingAnswers={existingAnswers}
                dietaryOptions={settings.dietary_options}
                rsvpCutoffDate={settings.rsvp_cutoff_date}
                weddingDate={settings.wedding_date}
              />
            </div>
          )}
        </div>
      </Section>

      {/* ── FOOTER — couple names only, no sunburst, asymmetric corner glow ── */}
      <style>{`
        #inv-footer {
          background:
            radial-gradient(70% 80% at 8% 118%, rgba(242,96,60,.42), rgba(242,96,60,0) 60%),
            radial-gradient(60% 70% at 88% 135%, rgba(142,124,195,.4), rgba(142,124,195,0) 62%),
            ${tokens.greenDeep} !important;
        }
      `}</style>
      <Section variant="deep" id="inv-footer">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(2rem, 9vw, 4rem)' }}>
            <span style={{ color: tokens.violet }}>{name1}</span>{' '}
            <em style={{ fontStyle: 'italic', color: tokens.persimmon }}>&amp;</em>{' '}
            <span style={{ color: tokens.violet }}>{name2}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
