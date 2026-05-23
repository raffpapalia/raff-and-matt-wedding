'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface SaveTheDatePhaseProps {
  guestName: string;
  personalMessage?: string | null;
  personalPhotoUrl?: string | null;
  coupleNames?: string;
  tagline?: string;
  invitationFooter?: string;
  weddingDate?: string;
  weddingLocation?: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatWeddingDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  return `${parseInt(day)} ${MONTHS[parseInt(month) - 1]} ${year}`;
}

type AnimationStage =
  | 'init'
  | 'fadeToGreen'
  | 'guestName'
  | 'divider'
  | 'saveTheDateLabel'
  | 'coupleNames'
  | 'date'
  | 'location'
  | 'tagline'
  | 'personalMessage'
  | 'footer';

export default function SaveTheDatePhase({
  guestName,
  personalMessage,
  personalPhotoUrl,
  coupleNames = 'Matt & Raff',
  tagline = "Cancel your plans. We've made better ones.",
  invitationFooter = 'Full invitation coming soon',
  weddingDate = '2027-07-12',
  weddingLocation = 'Melbourne, Victoria',
}: SaveTheDatePhaseProps) {
  const [mounted, setMounted] = useState(false);
  const [visibleStages, setVisibleStages] = useState<Set<AnimationStage>>(
    new Set(['init'])
  );

  useEffect(() => {
    setMounted(true);

    // Slower, cinematic animation timeline
    const timeline = [
      { stage: 'fadeToGreen' as const, delay: 0 },
      { stage: 'guestName' as const, delay: 700 },
      { stage: 'divider' as const, delay: 1600 },
      { stage: 'saveTheDateLabel' as const, delay: 2200 },
      { stage: 'coupleNames' as const, delay: 2800 },
      { stage: 'date' as const, delay: 3400 },
      { stage: 'location' as const, delay: 3800 },
      { stage: 'tagline' as const, delay: 4300 },
      { stage: 'personalMessage' as const, delay: 4900 },
      { stage: 'footer' as const, delay: 5400 },
    ];

    timeline.forEach(({ stage, delay }) => {
      setTimeout(() => {
        setVisibleStages((prev) => new Set([...prev, stage]));
      }, delay);
    });
  }, []);

  if (!mounted) {
    return null;
  }

  const isGreenVisible = visibleStages.has('fadeToGreen');
  const isGuestNameVisible = visibleStages.has('guestName');
  const isPersonalMessageVisible = visibleStages.has('personalMessage');
  const isDividerVisible = visibleStages.has('divider');
  const isSaveTheDateLabelVisible = visibleStages.has('saveTheDateLabel');
  const isCoupleNamesVisible = visibleStages.has('coupleNames');
  const isDateVisible = visibleStages.has('date');
  const isLocationVisible = visibleStages.has('location');
  const isTaglineVisible = visibleStages.has('tagline');
  const isFooterVisible = visibleStages.has('footer');

  return (
    <div
      className={`relative w-full h-screen flex items-center justify-center overflow-hidden ${
        isGreenVisible ? 'bg-[#0A1F14]' : 'bg-black'
      } transition-colors duration-1000 ease-out`}
    >
      {/* Animated background fade */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/5 to-transparent transition-opacity duration-1000 ${
          isGreenVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Subtle grain texture overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><filter id=\"noise\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" seed=\"1\"/></filter><rect width=\"100\" height=\"100\" fill=\"%23fff\" filter=\"url(%23noise)\"/></svg>')"
      }} />

      {/* Main content container */}
      <div className="relative z-10 w-full max-w-5xl h-full flex flex-col items-center justify-center px-4 sm:px-6">
        {/* Guest Name - First to appear */}
        <div
          className={`mb-6 sm:mb-12 text-center transition-all duration-1000 ${
            isGuestNameVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-6'
          }`}
        >
          <h1
            className="text-[2.5rem] sm:text-[3.5rem] md:text-[4rem] lg:text-[5.5rem] font-light text-[#F2E8D0] tracking-tight leading-tight"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            {guestName}
          </h1>
        </div>

        {/* Divider - Thin gold line */}
        <div
          className={`mb-12 sm:mb-16 mx-auto transition-all duration-700 ${
            isDividerVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
          }`}
          style={{ transformOrigin: 'center' }}
        >
          <div className="h-px w-24 sm:w-32 bg-[#D4A83A]" />
        </div>

        {/* Save the Date Content */}
        <div className="text-center">
          {/* Save the Date Label */}
          <div
            className={`mb-6 sm:mb-8 transition-all duration-700 ${
              isSaveTheDateLabelVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }`}
          >
            <p
              className="text-xs sm:text-sm uppercase tracking-widest text-[#D4A83A] font-medium"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Save the date for
            </p>
          </div>

          {/* Couple Names - Bebas Neue */}
          <div
            className={`mb-8 sm:mb-12 transition-all duration-700 ${
              isCoupleNamesVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            <h2
              className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-normal text-white tracking-wider leading-none"
              style={{ fontFamily: 'var(--font-bebas-neue)' }}
            >
              {coupleNames}
            </h2>
          </div>

          {/* Date - DM Sans light */}
          <div
            className={`mb-6 sm:mb-8 transition-all duration-700 ${
              isDateVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }`}
          >
            <p
              className="text-2xl sm:text-3xl md:text-4xl text-white font-light tracking-wide"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {formatWeddingDate(weddingDate)}
            </p>
          </div>

          {/* Location */}
          <div
            className={`mb-6 sm:mb-8 transition-all duration-700 ${
              isLocationVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }`}
          >
            <p
              className="text-xl sm:text-2xl text-[#F2E8D0] font-light tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-dm-sans)', color: '#F2E8D0' }}
            >
              {weddingLocation}
            </p>
          </div>

          {/* Tagline */}
          <div
            className={`mb-6 sm:mb-8 transition-all duration-700 ${
              isTaglineVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }`}
          >
            <p
              className="text-base sm:text-lg text-[#F2E8D0] font-light italic tracking-wide"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {tagline}
            </p>
          </div>

          {/* Personal Message */}
          {personalMessage && (
            <>
              <div
                className={`mb-6 sm:mb-6 text-center max-w-2xl transition-all duration-700 ${
                  isPersonalMessageVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2'
                }`}
              >
                <p
                  className="text-base sm:text-lg text-white/70 font-light italic"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {personalMessage}
                </p>
              </div>
              <div
                className={`mt-6 mb-8 transition-all duration-700 ${
                  isFooterVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2'
                }`}
              >
                <p
                  className="text-xs sm:text-sm text-[#D4A83A]/60 font-light tracking-widest uppercase"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  {invitationFooter}
                </p>
              </div>
            </>
          )}

          {!personalMessage && (
            <div
              className={`mb-8 transition-all duration-700 ${
                isFooterVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-2'
              }`}
            >
              <p
                className="text-xs sm:text-sm text-[#D4A83A]/60 font-light tracking-widest uppercase"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Full invitation coming soon
              </p>
            </div>
          )}

          {/* Personal Photo Section */}
          {personalPhotoUrl && (
            <div
              className={`mb-8 sm:mb-12 w-full max-w-sm transition-all duration-700 ${
                isPersonalMessageVisible
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-95'
              }`}
            >
              <div className="relative aspect-square rounded-sm overflow-hidden border border-accent-gold/30">
                <Image
                  src={personalPhotoUrl}
                  alt="Personal photo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Mobile responsiveness helper */}
      <style jsx>{`
        @media (max-width: 640px) {
          h1 {
            line-height: 1.05;
          }
        }
      `}</style>
    </div>
  );
}
