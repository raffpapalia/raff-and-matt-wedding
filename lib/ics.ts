import type { Settings } from './supabase';

// Melbourne is AEST (UTC+10) year-round in July — no DST to account for.
const AEST_OFFSET_HOURS = 10;

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

function parseWeddingTime(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw new Error(`Invalid wedding_time format: ${timeStr}`);
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

// Converts a Melbourne wall-clock date + time (e.g. "2027-07-10", "3:00 PM") into the
// equivalent UTC instant, using the fixed AEST (+10) offset.
export function melbourneTimeToUtc(weddingDate: string, weddingTime: string): Date {
  const [y, m, d] = weddingDate.split('-').map(Number);
  const { hours, minutes } = parseWeddingTime(weddingTime);
  return new Date(Date.UTC(y, m - 1, d, hours - AEST_OFFSET_HOURS, minutes, 0));
}

// Formats a UTC instant back into its Melbourne wall-clock compact form (yyyyMMddTHHmmss).
export function formatMelbourneWallClock(utcDate: Date): string {
  const melbourne = new Date(utcDate.getTime() + AEST_OFFSET_HOURS * 3600 * 1000);
  const y = melbourne.getUTCFullYear();
  const m = String(melbourne.getUTCMonth() + 1).padStart(2, '0');
  const d = String(melbourne.getUTCDate()).padStart(2, '0');
  const hh = String(melbourne.getUTCHours()).padStart(2, '0');
  const mm = String(melbourne.getUTCMinutes()).padStart(2, '0');
  const ss = String(melbourne.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildIcsContent(mode: 'save_the_date' | 'invitation', settings: Settings): string {
  const dc = compactDate(settings.wedding_date);
  const startUtc = melbourneTimeToUtc(settings.wedding_date, settings.wedding_time);
  const endUtc = new Date(startUtc.getTime() + 8 * 3600 * 1000);
  const dtStart = formatMelbourneWallClock(startUtc);
  const dtEnd = formatMelbourneWallClock(endUtc);

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
          'BEGIN:VTIMEZONE',
          'TZID:Australia/Melbourne',
          'BEGIN:STANDARD',
          'TZOFFSETFROM:+1000',
          'TZOFFSETTO:+1000',
          'TZNAME:AEST',
          'DTSTART:19700101T000000',
          'END:STANDARD',
          'END:VTIMEZONE',
          'BEGIN:VEVENT',
          `DTSTART;TZID=Australia/Melbourne:${dtStart}`,
          `DTEND;TZID=Australia/Melbourne:${dtEnd}`,
          "SUMMARY:Matt & Raff's Wedding",
          `LOCATION:${escapeIcs(`${settings.venue_name}, ${settings.location}`)}`,
          'DESCRIPTION:Ceremony 3:30pm. Cocktails & canapés 4:00pm. Reception 5:00pm. Dress code: Elevated Cocktail.',
          'END:VEVENT',
          'END:VCALENDAR',
        ];

  return lines.join('\r\n');
}
