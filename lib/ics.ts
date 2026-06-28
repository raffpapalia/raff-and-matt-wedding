import type { Settings } from './supabase';

// Melbourne is AEST (UTC+10) year-round in July — no DST to account for.
const AEST_OFFSET_HOURS = 10;
// Default ceremony+reception duration. No settings.wedding_end_time exists yet —
// if one is added later, swap this constant for that.
const DEFAULT_EVENT_HOURS = 6;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function compactDate(iso: string): string {
  return iso.replace(/-/g, '');
}

function nextDayCompact(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return [
    next.getUTCFullYear(),
    pad2(next.getUTCMonth() + 1),
    pad2(next.getUTCDate()),
  ].join('');
}

// Primary format is "HH:MM" 24h, produced natively by the admin's <input type="time">
// (e.g. "15:00"). "H:MM AM/PM" (e.g. "3:00 PM") is kept as a fallback for any
// wedding_time value stored before the time-picker migration.
function parseWeddingTime(timeStr: string): { hours: number; minutes: number } {
  const trimmed = timeStr.trim();

  const time24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (time24) {
    const hours = parseInt(time24[1], 10);
    const minutes = parseInt(time24[2], 10);
    if (hours >= 0 && hours <= 23 && minutes <= 59) {
      return { hours, minutes };
    }
  }

  const legacy = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (legacy) {
    let hours = parseInt(legacy[1], 10);
    const minutes = parseInt(legacy[2], 10);
    const meridiem = legacy[3].toUpperCase();
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  }

  throw new Error(`Invalid wedding_time format: ${timeStr}`);
}

// Converts a Melbourne wall-clock date + time (e.g. "2027-07-10", "3:00 PM") into the
// equivalent UTC instant, using the fixed AEST (+10) offset. This is the single source
// of truth for "when the wedding actually starts" — every calendar output below derives
// from this instant rather than re-deriving its own local/UTC math.
export function melbourneTimeToUtc(weddingDate: string, weddingTime: string): Date {
  const [y, m, d] = weddingDate.split('-').map(Number);
  const { hours, minutes } = parseWeddingTime(weddingTime);
  return new Date(Date.UTC(y, m - 1, d, hours - AEST_OFFSET_HOURS, minutes, 0));
}

// "20270710T050000Z" — absolute UTC compact form. Used for ICS DTSTART/DTEND/DTSTAMP
// and Google's dates= param — unambiguous regardless of the viewer's local timezone,
// so it doesn't depend on a ctz hint being honoured.
export function formatUtcCompact(date: Date): string {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
}

// "2027-07-10T15:00:00+10:00" — explicit-offset ISO 8601. Used for Outlook's deep link,
// which expects a wall-clock time; the explicit +10:00 keeps it correct no matter what
// timezone the browser opening the link is in.
export function formatMelbourneOffsetIso(utcInstant: Date): string {
  const melbourne = new Date(utcInstant.getTime() + AEST_OFFSET_HOURS * 3600 * 1000);
  const y = melbourne.getUTCFullYear();
  const m = pad2(melbourne.getUTCMonth() + 1);
  const d = pad2(melbourne.getUTCDate());
  const hh = pad2(melbourne.getUTCHours());
  const mm = pad2(melbourne.getUTCMinutes());
  const ss = pad2(melbourne.getUTCSeconds());
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}+10:00`;
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function eventTitle(settings: Settings): string {
  return `${settings.couple_names} — Wedding`;
}

export function buildIcsContent(mode: 'save_the_date' | 'invitation', settings: Settings): string {
  const dc = compactDate(settings.wedding_date);

  if (mode === 'save_the_date') {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Matt & Raff Wedding//EN',
      'BEGIN:VEVENT',
      `UID:save-the-date-${dc}@mattandraff`,
      `DTSTAMP:${formatUtcCompact(new Date())}`,
      `DTSTART;VALUE=DATE:${dc}`,
      `DTEND;VALUE=DATE:${nextDayCompact(settings.wedding_date)}`,
      `SUMMARY:${escapeIcs(eventTitle(settings))}`,
      `LOCATION:${escapeIcs('Melbourne, Victoria')}`,
      'DESCRIPTION:Save the date — full details coming soon',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return lines.join('\r\n');
  }

  const startUtc = melbourneTimeToUtc(settings.wedding_date, settings.wedding_time);
  const endUtc = new Date(startUtc.getTime() + DEFAULT_EVENT_HOURS * 3600 * 1000);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Matt & Raff Wedding//EN',
    'BEGIN:VEVENT',
    `UID:wedding-${dc}@mattandraff`,
    `DTSTAMP:${formatUtcCompact(new Date())}`,
    `DTSTART:${formatUtcCompact(startUtc)}`,
    `DTEND:${formatUtcCompact(endUtc)}`,
    `SUMMARY:${escapeIcs(eventTitle(settings))}`,
    `LOCATION:${escapeIcs(`${settings.venue_name}, ${settings.location}`)}`,
    'DESCRIPTION:Ceremony 3:30pm. Cocktails & canapés 4:00pm. Reception 5:00pm. Dress code: Elevated Cocktail.',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

// Google's "render" quick-add endpoint. Always passes absolute UTC (Z-suffixed) times —
// previously this passed Melbourne wall-clock time with a &ctz= hint, which some clients
// silently reinterpret in the viewer's own local timezone instead of Melbourne's.
export function buildGoogleCalendarUrl(mode: 'save_the_date' | 'invitation', settings: Settings): string {
  const title = encodeURIComponent(eventTitle(settings));

  if (mode === 'save_the_date') {
    const dc = compactDate(settings.wedding_date);
    const dates = `${dc}/${nextDayCompact(settings.wedding_date)}`;
    const details = encodeURIComponent('Save the date — full details coming soon');
    const location = encodeURIComponent('Melbourne, Victoria');
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  }

  const startUtc = melbourneTimeToUtc(settings.wedding_date, settings.wedding_time);
  const endUtc = new Date(startUtc.getTime() + DEFAULT_EVENT_HOURS * 3600 * 1000);
  const dates = `${formatUtcCompact(startUtc)}/${formatUtcCompact(endUtc)}`;
  const details = encodeURIComponent(
    'Ceremony 3:30pm. Cocktails & canapés 4:00pm. Reception 5:00pm. Dress code: Elevated Cocktail.',
  );
  const location = encodeURIComponent(`${settings.venue_name}, ${settings.location}`);
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

// Outlook's web compose deep link expects wall-clock ISO 8601. Previously this sent
// UTC (Z) for the "invitation" event with no explicit offset elsewhere, which is
// correct but inconsistent — using the explicit +10:00 offset form throughout removes
// any reliance on Outlook re-deriving the right timezone.
export function buildOutlookCalendarUrl(mode: 'save_the_date' | 'invitation', settings: Settings): string {
  const title = encodeURIComponent(eventTitle(settings));
  const base = 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent';

  if (mode === 'save_the_date') {
    const body = encodeURIComponent('Save the date — full details coming soon');
    const location = encodeURIComponent('Melbourne, Victoria');
    return `${base}&subject=${title}&startdt=${settings.wedding_date}&enddt=${settings.wedding_date}&body=${body}&location=${location}&allday=true`;
  }

  const startUtc = melbourneTimeToUtc(settings.wedding_date, settings.wedding_time);
  const endUtc = new Date(startUtc.getTime() + DEFAULT_EVENT_HOURS * 3600 * 1000);
  const startdt = encodeURIComponent(formatMelbourneOffsetIso(startUtc));
  const enddt = encodeURIComponent(formatMelbourneOffsetIso(endUtc));
  const body = encodeURIComponent(
    'Ceremony 3:30pm. Cocktails & canapés 4:00pm. Reception 5:00pm. Dress code: Elevated Cocktail.',
  );
  const location = encodeURIComponent(`${settings.venue_name}, ${settings.location}`);
  return `${base}&subject=${title}&startdt=${startdt}&enddt=${enddt}&body=${body}&location=${location}`;
}
