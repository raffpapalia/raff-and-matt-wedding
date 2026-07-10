import type { RunsheetItem, RunsheetSection } from './supabase';

// Pure run-sheet helpers shared by the admin canvas, the public share view,
// and the export routes. No server dependencies — safe in client components.

// Sections order: dated days first (chronological), then undated; manual
// display_order breaks ties within a day.
export function sortSections(sections: RunsheetSection[]): RunsheetSection[] {
  return [...sections].sort((a, b) => {
    if (a.day_date !== b.day_date) {
      if (a.day_date === null) return 1;
      if (b.day_date === null) return -1;
      return a.day_date < b.day_date ? -1 : 1;
    }
    return a.display_order - b.display_order || (a.created_at < b.created_at ? -1 : 1);
  });
}

// Items auto-sort by start time (untimed items sink), then manual order.
export function sortItems(items: RunsheetItem[]): RunsheetItem[] {
  return [...items].sort((a, b) => {
    if (a.start_time !== b.start_time) {
      if (a.start_time === null) return 1;
      if (b.start_time === null) return -1;
      return a.start_time < b.start_time ? -1 : 1;
    }
    return a.display_order - b.display_order || (a.created_at < b.created_at ? -1 : 1);
  });
}

// Group sorted sections into days: [{ day: '2027-07-10' | null, sections }]
export function groupByDay(sections: RunsheetSection[]): { day: string | null; sections: RunsheetSection[] }[] {
  const days: { day: string | null; sections: RunsheetSection[] }[] = [];
  for (const s of sortSections(sections)) {
    const last = days[days.length - 1];
    if (last && last.day === s.day_date) last.sections.push(s);
    else days.push({ day: s.day_date, sections: [s] });
  }
  return days;
}

// '15:00:00' → '3:00 pm'
export function fmtTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function fmtTimeRange(start: string | null, end: string | null): string {
  if (!start) return '';
  return end ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start);
}

export function fmtDay(iso: string | null): string {
  if (!iso) return 'Unscheduled';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Gap in minutes between the previous item and the next one, for buffer /
// overlap indicators. Positive = idle gap, negative = overlap, null = not
// comparable (missing times). Uses prev end when set, else prev start.
export function gapMinutes(prev: RunsheetItem, next: RunsheetItem): number | null {
  const prevRef = prev.end_time ?? prev.start_time;
  if (!prevRef || !next.start_time) return null;
  return timeToMinutes(next.start_time) - timeToMinutes(prevRef);
}

export function fmtDuration(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
