// QT room block expression of interest (/invite/[slug]/stay, migration 027).
// Shared by the guest page, its API route and the admin view so the "what does a
// valid answer look like" rules live in exactly one place, mirroring the table's
// stay_interest_shape check constraint.

export type StayStatus = 'yes' | 'maybe' | 'no';

export type StayAnswer = {
  status: StayStatus;
  night_before: boolean;
  wedding_night: boolean;
  staying_longer: boolean;
  rooms: number | null;
};

export type StayInterestRow = StayAnswer & {
  id: string;
  household_id: string;
  created_at: string;
  updated_at: string;
};

export const MIN_ROOMS = 1;
export const MAX_ROOMS = 4;

const STATUSES: readonly StayStatus[] = ['yes', 'maybe', 'no'];

// settings.value is jsonb, so the seeded value is a JSON boolean — but accept the
// string form too in case it's ever edited by hand as '"true"'.
export function isStayOpen(value: unknown): boolean {
  return value === true || value === 'true';
}

export type NormaliseResult = { ok: true; answer: StayAnswer } | { ok: false; error: string };

// 'no' clears nights and rooms; "staying longer" wins over the two named nights;
// rooms are clamped to 1–4; a yes/maybe with no nights at all is rejected.
export function normaliseStayAnswer(input: {
  status?: unknown;
  night_before?: unknown;
  wedding_night?: unknown;
  staying_longer?: unknown;
  rooms?: unknown;
}): NormaliseResult {
  const status = input.status as StayStatus;
  if (!STATUSES.includes(status)) {
    return { ok: false, error: 'Invalid status' };
  }

  if (status === 'no') {
    return {
      ok: true,
      answer: { status, night_before: false, wedding_night: false, staying_longer: false, rooms: null },
    };
  }

  const stayingLonger = input.staying_longer === true;
  const nightBefore = !stayingLonger && input.night_before === true;
  const weddingNight = !stayingLonger && input.wedding_night === true;

  if (!stayingLonger && !nightBefore && !weddingNight) {
    return { ok: false, error: 'Pick at least one night' };
  }

  const rawRooms = Math.round(Number(input.rooms));
  const rooms = Number.isFinite(rawRooms) ? Math.min(MAX_ROOMS, Math.max(MIN_ROOMS, rawRooms)) : MIN_ROOMS;

  return {
    ok: true,
    answer: { status, night_before: nightBefore, wedding_night: weddingNight, staying_longer: stayingLonger, rooms },
  };
}

// ── Dates ─────────────────────────────────────────────────────────────────────
// wedding_date is a plain 'YYYY-MM-DD'. Everything is done in UTC so the day
// never shifts with the server's or the guest's timezone.

export function shiftIsoDate(isoDate: string, days: number): Date {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "Fri 9 July"
export function formatLongDay(d: Date): string {
  return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// "FRI"
export function formatDowCaps(d: Date): string {
  return DOW[d.getUTCDay()].toUpperCase();
}

// "JUL"
export function formatMonthCaps(d: Date): string {
  return MONTHS[d.getUTCMonth()].slice(0, 3).toUpperCase();
}

// "09"
export function formatDayPad(d: Date): string {
  return String(d.getUTCDate()).padStart(2, '0');
}

// "09 JUL"
export function formatCardDate(d: Date): string {
  return `${formatDayPad(d)} ${formatMonthCaps(d)}`;
}

// "10.07.27"
export function formatDotDate(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${formatDayPad(d)}.${mm}.${yy}`;
}

// "Night before, wedding night" — admin table / CSV.
export function describeNights(a: Pick<StayAnswer, 'night_before' | 'wedding_night' | 'staying_longer'>): string {
  if (a.staying_longer) return 'Staying longer';
  const parts: string[] = [];
  if (a.night_before) parts.push('Night before');
  if (a.wedding_night) parts.push(parts.length ? 'wedding night' : 'Wedding night');
  return parts.join(', ');
}
