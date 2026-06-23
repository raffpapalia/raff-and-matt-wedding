'use client';

import RSVPPhase from './RSVPPhase';
import type { Household, Guest, Settings, CustomQuestion, CustomAnswer, Faq, Phase, ScheduleItem, SectionOrderItem } from '@/lib/supabase';
import { DEFAULT_SECTION_ORDER } from '@/lib/supabase';
import { parseIsoDate, formatShortWeekday, formatDayMonthYear, deriveSerial } from '@/lib/date';
import Section from './v4/components/Section';
import Reveal from './v4/components/Reveal';
import Kicker from './v4/components/Kicker';
import Button from './v4/components/Button';
import StickyBar from './v4/components/StickyBar';
import Ticket from './v4/components/Ticket';
import RunningOrder from './v4/components/RunningOrder';
import CalendarControl from './v4/components/CalendarControl';
import Sunburst from './v4/components/Sunburst';
import BandQuote from './v4/components/BandQuote';
import TreatedPhoto from './v4/components/TreatedPhoto';
import { tokens } from './v4/tokens';

interface InvitationPhaseV4Props {
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

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const ADMIT_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

// "Sat 10 July 2027" — hero-top eyebrow only; full month name, unlike the ticket's
// formatShortWeekday (short month). No other phase needs this exact combination,
// so it stays local rather than living in lib/date.ts.
function formatHeroEyebrowDate(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  const { y, m, d } = parsed;
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS_SHORT[dow]} ${d} ${MONTHS_FULL[m - 1]} ${y}`;
}

// Splits a schedule time like "3:00 PM" into its value and period parts for RunningOrder.
function splitScheduleTime(time: string): { value: string; period: string } {
  const match = time.trim().match(/^(.*?)\s*(am|pm)$/i);
  if (match) {
    return { value: match[1].trim(), period: match[2].toUpperCase() };
  }
  return { value: time.trim(), period: '' };
}

function formatGuestNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

const DRESS_SWATCHES = [
  { label: 'Forest', color: tokens.greenDeep },
  { label: 'Emerald', color: tokens.greenBright },
  { label: 'Pine', color: tokens.pine },
  { label: 'Gold', color: tokens.gold },
  { label: 'Persimmon', color: tokens.persimmon },
];

const headingStyle: React.CSSProperties = {
  fontFamily: tokens.display,
  fontWeight: 900,
  fontSize: 'clamp(2.2rem, 8vw, 4.6rem)',
  lineHeight: 1.02,
  letterSpacing: '-0.01em',
  margin: '16px 0 0',
};

function BigDate({ iso }: { iso: string }) {
  const parsed = parseIsoDate(iso);
  if (!parsed) return null;
  const { y, m, d } = parsed;
  const weekday = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const dotStyle: React.CSSProperties = { color: tokens.persimmon, fontWeight: 900 };
  return (
    <div
      style={{
        fontFamily: tokens.display,
        fontWeight: 900,
        fontSize: 'clamp(2.6rem, 11vw, 6rem)',
        lineHeight: 0.92,
        letterSpacing: '-0.015em',
        marginTop: 20,
      }}
    >
      {weekday} {String(d).padStart(2, '0')}
      <b style={dotStyle}>·</b>
      {String(m).padStart(2, '0')}
      <b style={dotStyle}>·</b>
      {String(y).slice(-2)}
    </div>
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
    <div style={{ background: tokens.greenDeep, padding: '30px 26px' }}>
      <div style={{ fontFamily: tokens.mono, fontSize: '0.6rem', letterSpacing: '0.18em', color: tokens.gold }}>
        {num} / {category}
      </div>
      <h3 style={{ fontFamily: tokens.display, fontWeight: 600, fontSize: '1.5rem', margin: '12px 0 8px' }}>{title}</h3>
      <p style={{ opacity: 0.78, fontSize: '0.95rem', margin: 0 }}>{body}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginTop: 14,
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
  coupleNames,
  couplePhotoUrl,
  weddingSchedule,
  sectionOrder,
  currentPhase,
}: InvitationPhaseV4Props) {
  const [name1, name2] = coupleNames.includes(' & ') ? coupleNames.split(' & ') : [coupleNames, ''];

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

  const headingLastSpace = settings.dress_code_heading.lastIndexOf(' ');
  const dressHeadingFirst =
    headingLastSpace === -1 ? '' : settings.dress_code_heading.slice(0, headingLastSpace);
  const dressHeadingLast =
    headingLastSpace === -1 ? settings.dress_code_heading : settings.dress_code_heading.slice(headingLastSpace + 1);

  const runningOrderItems = weddingSchedule.map((item, i) => {
    const { value, period } = splitScheduleTime(item.time);
    return { num: String(i + 1).padStart(2, '0'), name: item.label, note: item.description, time: value, period };
  });

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
      <StickyBar coupleNames={coupleNames} rightHref="#pass" rightLabel="RSVP" rightVariant="solid" />

      {/* ── HERO ── */}
      <Section variant="deep" backgroundImage={couplePhotoUrl || undefined} minHeight="100svh">
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '64px clamp(20px, 5.5vw, 90px) 0',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: tokens.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            {settings.venue_name} &nbsp;·&nbsp; {formatHeroEyebrowDate(settings.wedding_date)} &nbsp;·&nbsp; One night only
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: tokens.grotesque,
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              fontSize: '0.7rem',
              color: tokens.gold,
              marginBottom: 8,
            }}
          >
            The wedding of
          </div>
          <h1 style={{ fontFamily: tokens.display, fontWeight: 900, lineHeight: 0.82, letterSpacing: '-0.01em', margin: 0 }}>
            <span style={{ display: 'block', fontSize: 'clamp(4.2rem, 19vw, 12rem)' }}>{name1}</span>
            <span style={{ display: 'block', fontSize: 'clamp(4.2rem, 19vw, 12rem)', paddingLeft: '0.6em' }}>
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
              color: tokens.bone,
            }}
          >
            {settings.tagline}
          </p>
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
            <span style={{ fontFamily: tokens.mono, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: tokens.gold }}>
              Admits
            </span>
            <span style={{ fontFamily: tokens.display, fontWeight: 600, fontSize: '1rem' }}>{household.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <Button href="#pass" variant="solid">
              Claim your seats
            </Button>
            {showRunningOrder && (
              <Button href="#order" variant="ghost">
                The running order ↓
              </Button>
            )}
          </div>
        </div>
      </Section>

      {/* ── A NOTE FOR YOU — household-driven, optional ── */}
      {(household.personal_message || household.personal_photo_url) && (
        <Section variant="bone" id="note">
          <Kicker label="A note for you" color={tokens.green} />
          {household.personal_message && household.personal_photo_url && (
            <Reveal className="mr-note-grid">
              <TreatedPhoto src={household.personal_photo_url} alt="" ratio={3 / 4} shape="rect" />
              <div className="mr-note-message">
                <p style={{ whiteSpace: 'pre-line' }}>{household.personal_message}</p>
              </div>
            </Reveal>
          )}
          {household.personal_message && !household.personal_photo_url && (
            <Reveal className="mr-note-solo">
              <p style={{ whiteSpace: 'pre-line' }}>{household.personal_message}</p>
              <p className="mr-note-sign">— {coupleNames}</p>
            </Reveal>
          )}
          {!household.personal_message && household.personal_photo_url && (
            <Reveal className="mr-note-photo-solo">
              <TreatedPhoto src={household.personal_photo_url} alt="" ratio={3 / 4} shape="rect" />
            </Reveal>
          )}
        </Section>
      )}

      {/* ── HOW WE GOT HERE ── */}
      <Section variant="deep">
        <Kicker label="How we got here" />
        <div className={`mr-story-grid${settings.story_photo_url ? '' : ' mr-story-grid--solo'}`}>
          <div>
            <h2 style={headingStyle}>{settings.story_heading}</h2>
            <p style={{ marginTop: 22, maxWidth: '46ch', opacity: 0.85, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
              {settings.story_body}
            </p>
          </div>
          {settings.story_photo_url && (
            <TreatedPhoto
              src={settings.story_photo_url}
              alt=""
              ratio={4 / 5}
              shape="arch"
              caption="— a favourite photo of the two of you —"
            />
          )}
        </div>
      </Section>

      {/* ── THE DETAILS ── */}
      <Section variant="bone" id="details">
        <Kicker label="The details" color={tokens.green} />
        <BigDate iso={settings.wedding_date} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(26px, 5vw, 64px)', marginTop: 'clamp(30px, 4vw, 46px)' }}>
          {[
            { label: 'From', value: settings.wedding_time },
            { label: 'Venue', value: settings.venue_name },
            { label: 'Where', value: settings.location },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontFamily: tokens.mono, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: tokens.persimmon }}>
                {label}
              </div>
              <div style={{ fontFamily: tokens.display, fontWeight: 600, fontSize: '1.4rem', marginTop: 6 }}>{value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── RUNNING ORDER ── */}
      {showRunningOrder && (
        <Section variant="green" id="order">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Kicker label="The running order" color={tokens.bone} labelColor="#0a2e20" />
              <h2
                style={{
                  fontFamily: tokens.display,
                  fontWeight: 900,
                  fontSize: 'clamp(2rem, 7vw, 3.8rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  marginTop: 14,
                }}
              >
                How the night unfolds
              </h2>
            </div>
            <div style={{ fontFamily: tokens.mono, fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.8 }}>
              Doors {settings.wedding_time}
            </div>
          </div>
          <div style={{ marginTop: 'clamp(36px, 5vw, 60px)' }}>
            <RunningOrder items={runningOrderItems} />
          </div>
          <div style={{ marginTop: 38, textAlign: 'center' }}>
            <CalendarControl mode="invitation" settings={settings} />
          </div>
        </Section>
      )}

      {/* ── DRESS CODE ── */}
      {showDressCode && (
        <Section variant="bone" id="dress">
          <Kicker label="Dress code" color={tokens.green} />
          <div style={{ marginTop: 'clamp(20px, 3vw, 34px)' }}>
            <h2
              style={{
                fontFamily: tokens.display,
                fontWeight: 900,
                fontSize: 'clamp(2.6rem, 11vw, 5.8rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.01em',
                color: tokens.green,
                margin: 0,
              }}
            >
              {dressHeadingFirst && (
                <>
                  {dressHeadingFirst}
                  <br />
                </>
              )}
              {dressHeadingLast}
            </h2>
            <div style={{ display: 'flex', gap: 14, margin: '30px 0 24px', flexWrap: 'wrap' }} aria-hidden="true">
              {DRESS_SWATCHES.map(sw => (
                <div key={sw.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <i style={{ width: 54, height: 54, borderRadius: '50%', display: 'block', boxShadow: '0 6px 16px rgba(11,33,24,.18)', background: sw.color }} />
                  <span style={{ fontFamily: tokens.mono, fontSize: '0.54rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6 }}>
                    {sw.label}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ maxWidth: '44ch', opacity: 0.8, fontSize: '1.04rem', margin: 0, whiteSpace: 'pre-wrap' }}>
              {settings.dress_code_description}
            </p>
          </div>
        </Section>
      )}

      {/* ── BAND ── */}
      {settings.band_photo_url && <BandQuote src={settings.band_photo_url} alt="">{settings.band_quote}</BandQuote>}

      {/* ── GOOD TO KNOW ── */}
      {showGoodToKnow && (
        <Section variant="deep">
          <Kicker label="Good to know" />
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

      {/* ── THE PASS ── */}
      <Section variant="bright" id="pass">
        <div style={{ textAlign: 'center', marginBottom: 'clamp(34px, 5vw, 52px)' }}>
          <Kicker label="The reply" labelColor="#0a2e20" />
          <h2
            style={{
              fontFamily: tokens.display,
              fontWeight: 900,
              fontSize: 'clamp(2.4rem, 8vw, 4.6rem)',
              lineHeight: 1,
              marginTop: 12,
              color: tokens.bone,
            }}
          >
            Will you join us?
          </h2>
        </div>
        <Ticket
          serial={deriveSerial(household.id, weddingYear)}
          admits={admitsWord}
          household={ticketHousehold}
          date={formatShortWeekday(settings.wedding_date)}
          doors={settings.wedding_time}
          venue={settings.venue_name}
          replyBy={formatDayMonthYear(settings.rsvp_cutoff_date)}
          ctaLabel="Confirm your seats"
          ctaHref="#rsvp-form"
        />
        <div id="rsvp-form" style={{ marginTop: 'clamp(40px, 6vw, 64px)' }}>
          <RSVPPhase
            household={household}
            guests={guests}
            questions={questions}
            existingAnswers={existingAnswers}
            dietaryOptions={settings.dietary_options}
            rsvpCutoffDate={settings.rsvp_cutoff_date}
            weddingDate={settings.wedding_date}
            embedded
          />
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <Section variant="deep">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <Sunburst />
          <div style={{ fontFamily: tokens.display, fontWeight: 900, fontSize: 'clamp(2rem, 9vw, 4rem)' }}>
            {name1} <em style={{ fontStyle: 'italic', color: tokens.persimmon }}>&amp;</em> {name2}
          </div>
        </div>
      </Section>
    </div>
  );
}
