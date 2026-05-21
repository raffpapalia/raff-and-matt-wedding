'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface SaveTheDatePhaseProps {
  guestName: string;
  personalMessage?: string | null;
  personalPhotoUrl?: string | null;
}

export default function SaveTheDatePhase({
  guestName,
  personalMessage,
  personalPhotoUrl,
}: SaveTheDatePhaseProps) {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<
    'init' | 'fadeToGreen' | 'revealName' | 'revealContent' | 'revealFooter'
  >('init');

  useEffect(() => {
    setMounted(true);

    const timeline = [
      { stage: 'fadeToGreen', delay: 300 },
      { stage: 'revealName', delay: 1200 },
      { stage: 'revealContent', delay: 2500 },
      { stage: 'revealFooter', delay: 3800 },
    ];

    timeline.forEach(({ stage: targetStage, delay }) => {
      setTimeout(() => {
        setStage(targetStage as any);
      }, delay);
    });
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden transition-colors duration-1000 ease-out ${
        stage === 'init' ? 'bg-black' : 'bg-[#0A1F14]'
      }`}
    >
      {/* Animated background gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-transparent via-green-900/10 to-transparent opacity-0 transition-opacity duration-1000 ${
          stage !== 'init' ? 'opacity-100' : ''
        }`}
      />

      {/* Main content container */}
      <div className="relative z-10 w-full h-screen flex flex-col items-center justify-center px-4 sm:px-6">
        {/* Guest Name Section */}
        <div
          className={`mb-6 sm:mb-8 text-center transition-all duration-1000 ${
            stage === 'init' || stage === 'fadeToGreen'
              ? 'opacity-0 scale-95'
              : 'opacity-100 scale-100'
          }`}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white tracking-tight">
            {guestName}
          </h1>

          {/* Personal Message */}
          {personalMessage && (
            <p
              className={`mt-4 sm:mt-6 text-base sm:text-lg text-green-100 font-light italic max-w-2xl transition-all duration-700 ${
                stage === 'revealName' || stage === 'init'
                  ? 'opacity-0'
                  : 'opacity-100'
              }`}
            >
              {personalMessage}
            </p>
          )}
        </div>

        {/* Personal Photo Section */}
        {personalPhotoUrl && (
          <div
            className={`mb-8 sm:mb-12 w-full max-w-md transition-all duration-1000 ${
              stage === 'init' ||
              stage === 'fadeToGreen' ||
              stage === 'revealName'
                ? 'opacity-0 scale-90'
                : 'opacity-100 scale-100'
            }`}
          >
            <div className="relative aspect-square rounded-lg overflow-hidden border border-green-700/30">
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

        {/* Save the Date Content */}
        <div
          className={`mt-8 sm:mt-12 text-center transition-all duration-1000 ${
            stage === 'init' ||
            stage === 'fadeToGreen' ||
            stage === 'revealName'
              ? 'opacity-0 translate-y-8'
              : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Couple Names */}
          <div className="mb-6 sm:mb-8">
            <p className="text-green-300/60 text-xs sm:text-sm uppercase tracking-widest mb-3">
              Save the date for
            </p>
            <h2
              className="font-bebas-neue text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-wider"
              style={{ fontFamily: 'var(--font-bebas-neue)' }}
            >
              Raff & Matt
            </h2>
          </div>

          {/* Date */}
          <div className="mb-6 sm:mb-8">
            <p className="text-2xl sm:text-3xl md:text-4xl text-white font-light">
              12 July 2027
            </p>
          </div>

          {/* Location */}
          <div className="mb-12 sm:mb-16">
            <p className="text-xl sm:text-2xl text-green-200 font-light tracking-wider">
              Melbourne
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center gap-4 mb-8 sm:mb-12">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-green-700/40" />
            <div className="h-1 w-1 rounded-full bg-green-700/60" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-green-700/40" />
          </div>
        </div>

        {/* Footer */}
        <div
          className={`absolute bottom-6 sm:bottom-8 text-center transition-all duration-1000 ${
            stage === 'revealFooter'
              ? 'opacity-100'
              : 'opacity-0'
          }`}
        >
          <p className="text-xs sm:text-sm text-green-300/50 font-light tracking-widest uppercase">
            Full invitation coming soon
          </p>
        </div>
      </div>

      {/* Responsive adjustments for smaller screens */}
      <style jsx>{`
        @media (max-width: 640px) {
          h1 {
            line-height: 1.1;
          }
        }
      `}</style>
    </div>
  );
}
