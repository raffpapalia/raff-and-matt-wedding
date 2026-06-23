'use client';

import type { Settings } from '@/lib/supabase';
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl } from '@/lib/ics';

interface AddToCalendarProps {
  mode: 'save_the_date' | 'invitation';
  settings: Settings;
}

const pillClass =
  'px-4 py-1.5 border border-[#D4A83A]/50 text-[#D4A83A] text-xs font-light tracking-widest rounded-full hover:bg-[#D4A83A]/10 transition-colors';

export default function AddToCalendar({ mode, settings }: AddToCalendarProps) {
  const googleUrl = buildGoogleCalendarUrl(mode, settings);
  const outlookUrl = buildOutlookCalendarUrl(mode, settings);

  return (
    <div className="text-center">
      <p
        className="text-xs text-[#D4A83A]/50 font-light tracking-[0.2em] uppercase mb-3"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        Add to calendar
      </p>
      <div className="flex flex-wrap gap-2 justify-center" style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={pillClass}>
          Google
        </a>
        <a href={outlookUrl} target="_blank" rel="noopener noreferrer" className={pillClass}>
          Outlook
        </a>
        <a href={`/api/calendar?mode=${mode}`} download="matt-raff-wedding.ics" className={pillClass}>
          Apple
        </a>
      </div>
    </div>
  );
}
