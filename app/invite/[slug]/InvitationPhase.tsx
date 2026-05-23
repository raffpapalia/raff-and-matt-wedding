import type { ReactNode } from 'react';
import Image from 'next/image';
import RSVPPhase from './RSVPPhase';
import type { Household, Guest, Settings, CustomQuestion, CustomAnswer } from '@/lib/supabase';

interface InvitationPhaseProps {
  household: Household;
  guests: Guest[];
  settings: Settings;
  questions: CustomQuestion[];
  existingAnswers: CustomAnswer[];
  guestName: string;
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

function GoldDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-[#D4A83A]/25" />
      <div className="w-1 h-1 rounded-full bg-[#D4A83A]/40" />
      <div className="flex-1 h-px bg-[#D4A83A]/25" />
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-xs uppercase tracking-[0.25em] text-[#D4A83A] font-medium mb-8 text-center"
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      {children}
    </p>
  );
}

const schedule = [
  { time: '3:00 pm', event: 'Arrive' },
  { time: '3:30 pm', event: 'Ceremony' },
  { time: '4:00 pm', event: 'Cocktails & canapés' },
  { time: '5:00 pm', event: 'Reception' },
];

export default function InvitationPhase({
  household,
  guests,
  settings,
  questions,
  existingAnswers,
  guestName,
}: InvitationPhaseProps) {
  return (
    <div className="min-h-screen w-full relative" style={{ backgroundColor: '#0A1F14', color: '#F2E8D0' }}>
      {/* Grain texture */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><filter id=\"noise\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" seed=\"1\"/></filter><rect width=\"100\" height=\"100\" fill=\"%23fff\" filter=\"url(%23noise)\"/></svg>')",
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-6">

        {/* ── 1. HERO ── */}
        <section className="pt-20 pb-16 text-center">
          <p
            className="text-xs uppercase tracking-[0.3em] text-[#D4A83A]/70 mb-8 font-light"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            You&apos;re invited
          </p>

          <h1
            className="text-4xl sm:text-5xl font-light text-[#F2E8D0] tracking-tight leading-tight mb-10"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            {guestName}
          </h1>

          {household.personal_photo_url && (
            <div className="relative w-56 h-56 sm:w-72 sm:h-72 mx-auto mb-10 overflow-hidden border border-[#D4A83A]/30">
              <Image
                src={household.personal_photo_url}
                alt="Personal photo"
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {household.personal_message && (
            <p
              className="text-sm sm:text-base text-[#F2E8D0]/70 font-light italic leading-relaxed max-w-sm mx-auto"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {household.personal_message}
            </p>
          )}
        </section>

        <GoldDivider />

        {/* ── 2. THE DETAILS ── */}
        <section className="py-16 text-center">
          <SectionLabel>The Details</SectionLabel>

          <h2
            className="text-3xl sm:text-4xl font-light text-[#F2E8D0] tracking-wide mb-2"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            {formatWeddingDate(settings.wedding_date)}
          </h2>
          <p
            className="text-xl text-[#D4A83A] font-light tracking-widest mb-10"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {settings.wedding_time}
          </p>

          <div className="h-px w-10 bg-[#D4A83A]/40 mx-auto mb-10" />

          <h3
            className="text-xl sm:text-2xl font-light text-[#F2E8D0] mb-2"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            {settings.venue_name}
          </h3>
          <p
            className="text-sm text-[#F2E8D0]/50 uppercase tracking-widest font-light"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {settings.location}
          </p>
        </section>

        <GoldDivider />

        {/* ── 3. SCHEDULE ── */}
        <section className="py-16">
          <SectionLabel>Schedule</SectionLabel>
          <div>
            {schedule.map(({ time, event }, i) => (
              <div
                key={i}
                className="flex items-baseline gap-6 py-4 border-b border-[#D4A83A]/10 last:border-0"
              >
                <span
                  className="text-sm text-[#D4A83A]/80 font-light tracking-wide w-20 shrink-0 tabular-nums"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {time}
                </span>
                <span
                  className="text-base text-[#F2E8D0] font-light"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {event}
                </span>
              </div>
            ))}
          </div>
        </section>

        <GoldDivider />

        {/* ── 4. DRESS CODE ── */}
        <section className="py-16 text-center">
          <SectionLabel>Dress Code</SectionLabel>
          <h2
            className="text-2xl sm:text-3xl font-light text-[#F2E8D0] tracking-wide mb-5"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            Elevated Cocktail
          </h2>
          <p
            className="text-sm sm:text-base text-[#F2E8D0]/65 font-light leading-relaxed max-w-xs mx-auto"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            We&apos;ll be dressed up and we&apos;d love you to be too. Think glamorous cocktail — dresses
            and suits. Black tie welcome if that&apos;s your vibe.
          </p>
        </section>

        <GoldDivider />

        {/* ── 5. RSVP ── */}
        <section className="py-16">
          <SectionLabel>RSVP</SectionLabel>
          <RSVPPhase
            household={household}
            guests={guests}
            questions={questions}
            existingAnswers={existingAnswers}
            dietaryOptions={settings.dietary_options}
            rsvpCutoffDate={settings.rsvp_cutoff_date}
            embedded
          />
        </section>

        <GoldDivider />

        {/* ── 6. ACCOMMODATION ── */}
        <section className="py-16 text-center">
          <SectionLabel>Accommodation</SectionLabel>
          <p
            className="text-sm sm:text-base text-[#F2E8D0]/70 font-light leading-relaxed max-w-xs mx-auto"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            We&apos;ve arranged a special rate at{' '}
            <span className="text-[#F2E8D0]">QT Hotel Melbourne</span>
            {' '}— booking link coming soon. Plenty of other CBD hotels are nearby if you prefer.
          </p>
        </section>

        <GoldDivider />

        {/* ── 7. HASHTAG & PHOTOS ── */}
        <section className="py-16 text-center">
          <SectionLabel>Photos</SectionLabel>
          <p
            className="text-3xl sm:text-4xl font-light text-[#D4A83A] tracking-wider mb-2"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            #mattraff2027
          </p>
          <p
            className="text-xs text-[#F2E8D0]/40 font-light tracking-[0.2em] uppercase mb-10"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Tag your moments on the day
          </p>

          <div className="h-px w-10 bg-[#D4A83A]/25 mx-auto mb-10" />

          <p
            className="text-sm text-[#F2E8D0]/60 font-light mb-5"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Share your photos with us
          </p>
          <a
            href="#"
            className="inline-block px-7 py-3 border border-[#D4A83A]/50 text-[#D4A83A] text-xs font-light tracking-[0.2em] uppercase hover:bg-[#D4A83A]/10 transition-colors"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Upload your photos
          </a>
        </section>

        <GoldDivider />

        {/* ── 8. FAQ ── */}
        <section className="py-16 text-center">
          <SectionLabel>FAQ</SectionLabel>
          <h2
            className="text-2xl sm:text-3xl font-light text-[#F2E8D0] mb-5"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            Questions?
          </h2>
          <p
            className="text-sm text-[#F2E8D0]/45 font-light italic"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Frequently asked questions coming soon.
          </p>
        </section>

        <GoldDivider />

        {/* ── 9. REGISTRY ── */}
        <section className="py-16 text-center">
          <SectionLabel>Registry</SectionLabel>
          <p
            className="text-sm text-[#F2E8D0]/45 font-light italic"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Registry details coming soon.
          </p>
        </section>

        {/* Footer */}
        <div className="py-12 text-center border-t border-[#D4A83A]/20">
          <p
            className="text-xs text-[#D4A83A]/35 tracking-[0.2em] uppercase font-light"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {settings.couple_names} · {formatWeddingDate(settings.wedding_date)}
          </p>
        </div>

      </div>
    </div>
  );
}
