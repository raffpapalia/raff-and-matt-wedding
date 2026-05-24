import type { Settings } from './supabase';

function compactDate(iso: string): string {
  return iso.replace(/-/g, '');
}

function nextDayCompact(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('');
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildIcsContent(mode: 'save_the_date' | 'invitation', settings: Settings): string {
  const dc = compactDate(settings.wedding_date);

  const lines =
    mode === 'save_the_date'
      ? [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Matt & Raff Wedding//EN',
          'BEGIN:VEVENT',
          `DTSTART;VALUE=DATE:${dc}`,
          `DTEND;VALUE=DATE:${nextDayCompact(settings.wedding_date)}`,
          "SUMMARY:Matt & Raff's Wedding",
          `LOCATION:${escapeIcs('Melbourne, Victoria')}`,
          'DESCRIPTION:Save the date — full details coming soon',
          'END:VEVENT',
          'END:VCALENDAR',
        ]
      : [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Matt & Raff Wedding//EN',
          'BEGIN:VEVENT',
          `DTSTART:${dc}T150000`,
          `DTEND:${dc}T230000`,
          "SUMMARY:Matt & Raff's Wedding",
          `LOCATION:${escapeIcs(`${settings.venue_name}, ${settings.location}`)}`,
          'DESCRIPTION:Ceremony 3:30pm. Cocktails & canapés 4:00pm. Reception 5:00pm. Dress code: Elevated Cocktail.',
          'END:VEVENT',
          'END:VCALENDAR',
        ];

  return lines.join('\r\n');
}
