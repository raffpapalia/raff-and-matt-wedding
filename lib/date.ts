// Shared date/location/serial helpers for the v4 guest phases (Invitation,
// Save the Date, Pre-wedding, Thank You, RSVP). Each formatter below matches
// the exact output one or more of those phases already produced locally —
// consolidated here so the format doesn't silently drift between phases.

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  return { y, m, d };
}

function dayOfWeek(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// "Saturday 10 July 2027" — full weekday, full month. The Save the Date date-panel
// style; canonical long form.
export function formatLongDate(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  const { y, m, d } = parsed;
  return `${WEEKDAYS_FULL[dayOfWeek(y, m, d)]} ${d} ${MONTHS_FULL[m - 1]} ${y}`;
}

// "Sat 10 Jul 2027" — short weekday, short month. The ticket / boarding pass /
// RSVP success-card style.
export function formatShortWeekday(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  const { y, m, d } = parsed;
  return `${WEEKDAYS_SHORT[dayOfWeek(y, m, d)]} ${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

// "1 May 2027" — day + full month, no weekday. Only the Invitation's RSVP-cutoff
// ("reply by") line uses this; kept here (rather than duplicated inline) since
// it's a small, generic formatter like its siblings above.
export function formatDayMonthYear(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  const { y, m, d } = parsed;
  return `${d} ${MONTHS_FULL[m - 1]} ${y}`;
}

// "10·07·27" / "10 . 07 . 2027" — numeric dd/mm/yy(yy), dot-separated. Covers the
// Pre-wedding pass stub ({year:'2', spaced:false}) and the Thank You footer
// ({year:'4', spaced:true}).
export function formatDotted(iso: string, opts: { year?: '2' | '4'; spaced?: boolean } = {}): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  const { y, m, d } = parsed;
  const { year = '4', spaced = false } = opts;
  const yStr = year === '2' ? String(y).slice(-2) : String(y);
  const sep = spaced ? ' . ' : '·';
  return `${String(d).padStart(2, '0')}${sep}${String(m).padStart(2, '0')}${sep}${yStr}`;
}

// settings.location is a full street address ("133 Russell St, Melbourne, Victoria,
// 3000"); callers that only want the city drop a trailing postcode if present, then
// take the segment before the state.
export function cityFromLocation(location: string): string {
  let parts = location.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
    parts = parts.slice(0, -1);
  }
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || location;
}

// Deterministic 3-digit "ticket number" derived from the household id, so every
// household gets a stable-looking serial without needing a dedicated DB column.
export function deriveSerial(householdId: string, year: number): string {
  let hash = 0;
  for (const ch of householdId) hash = (hash * 31 + ch.charCodeAt(0)) % 1000;
  return `No. ${String(hash).padStart(3, '0')} — ${year}`;
}
