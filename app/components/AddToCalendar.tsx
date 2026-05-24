'use client';

import type { Settings } from '@/lib/supabase';

interface AddToCalendarProps {
  mode: 'save_the_date' | 'invitation';
  settings: Settings;
}

function buildGoogleUrl(mode: 'save_the_date' | 'invitation', settings: Settings): string {
  const dc = settings.wedding_date.replace(/-/g, '');
  const title = encodeURIComponent("Matt & Raff's Wedding");

  if (mode === 'save_the_date') {
    const [y, m, d] = settings.wedding_date.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const nextDc = [
      next.getUTCFullYear(),
      String(next.getUTCMonth() + 1).padStart(2, '0'),
      String(next.getUTCDate()).padStart(2, '0'),
    ].join('');
    const dates = `${dc}/${nextDc}`;
    const details = encodeURIComponent('Save the date — full details coming soon');
    const location = encodeURIComponent('Melbourne, Victoria');
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  }

  const dates = `${dc}T150000/${dc}T230000`;
  const details = encodeURIComponent(
    'Ceremony 3:30pm. Cocktails & canapés 4:00pm. Reception 5:00pm. Dress code: Elevated Cocktail.',
  );
  const location = encodeURIComponent(`${settings.venue_name}, ${settings.location}`);
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

function buildOutlookUrl(mode: 'save_the_date' | 'invitation', settings: Settings): string {
  const title = encodeURIComponent("Matt & Raff's Wedding");
  const base =
    'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent';

  if (mode === 'save_the_date') {
    const body = encodeURIComponent('Save the date — full details coming soon');
    const location = encodeURIComponent('Melbourne, Victoria');
    return `${base}&subject=${title}&startdt=${settings.wedding_date}&enddt=${settings.wedding_date}&body=${body}&location=${location}&allday=true`;
  }

  const startdt = `${settings.wedding_date}T15:00:00`;
  const enddt = `${settings.wedding_date}T23:00:00`;
  const body = encodeURIComponent(
    'Ceremony 3:30pm. Cocktails & canapés 4:00pm. Reception 5:00pm. Dress code: Elevated Cocktail.',
  );
  const location = encodeURIComponent(`${settings.venue_name}, ${settings.location}`);
  return `${base}&subject=${title}&startdt=${startdt}&enddt=${enddt}&body=${body}&location=${location}`;
}

const pillClass =
  'px-4 py-1.5 border border-[#D4A83A]/50 text-[#D4A83A] text-xs font-light tracking-widest rounded-full hover:bg-[#D4A83A]/10 transition-colors';

export default function AddToCalendar({ mode, settings }: AddToCalendarProps) {
  const googleUrl = buildGoogleUrl(mode, settings);
  const outlookUrl = buildOutlookUrl(mode, settings);

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
