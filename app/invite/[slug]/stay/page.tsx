import { notFound } from 'next/navigation';
import { supabaseServer, getSettings, type Household } from '@/lib/supabase';
import {
  isStayOpen,
  shiftIsoDate,
  formatLongDay,
  formatDowCaps,
  formatMonthCaps,
  formatDayPad,
  formatCardDate,
  formatDotDate,
  type StayAnswer,
} from '@/lib/stay/interest';
import '../v4/stay.css';
import StayClient, { type StayNight } from './StayClient';

// QT room block expression of interest. Lives under app/invite/[slug]/ (like the
// registry) so it inherits that layout's fonts, the .mr-v4 wrapper and
// design.css. Unlike the invite page it never bumps link_open_count, so a visit
// here doesn't count as the household opening their invitation.

export const revalidate = 0;

// Hardcoded for now: there's no short-venue-name setting. venue_name from
// settings is still used wherever the full name appears.
const VENUE_SHORT = 'QT';

// Same greeting the phases use (see formatGuestName in ../page.tsx): guest first
// names joined with "&", falling back to the household name.
function formatGuestNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

async function getStayData(slug: string) {
  const [settings, householdRes] = await Promise.all([
    getSettings(),
    supabaseServer.from('households').select('*').eq('slug', slug).maybeSingle(),
  ]);

  if (!householdRes.data) return null;
  const household = householdRes.data as Household;

  const [guestsRes, interestRes] = await Promise.all([
    supabaseServer
      .from('guests')
      .select('first_name')
      .eq('household_id', household.id)
      .order('display_order', { ascending: true }),
    supabaseServer
      .from('stay_interest')
      .select('status, night_before, wedding_night, staying_longer, rooms')
      .eq('household_id', household.id)
      .maybeSingle(),
  ]);

  if (interestRes.error) {
    console.error('[stay:page] interest fetch failed', interestRes.error);
  }

  return {
    settings,
    household,
    firstNames: (guestsRes.data ?? []).map((g: { first_name: string }) => g.first_name),
    existing: (interestRes.data ?? null) as StayAnswer | null,
  };
}

export default async function StayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getStayData(slug);

  if (!data) notFound();

  const { settings, household, firstNames, existing } = data;
  const greeting = formatGuestNames(firstNames) || household.name;

  const weddingDay = shiftIsoDate(settings.wedding_date, 0);
  const nightBefore = shiftIsoDate(settings.wedding_date, -1);
  const dayAfter = shiftIsoDate(settings.wedding_date, 1);

  const nights: StayNight[] = [
    {
      id: 'night_before',
      kicker: `${formatDowCaps(nightBefore)} · ${formatMonthCaps(nightBefore)}`,
      dow: formatDowCaps(nightBefore),
      date: formatDayPad(nightBefore),
      title: 'The night before',
      note: 'Arrive early, settle in',
    },
    {
      id: 'wedding_night',
      kicker: `${formatDowCaps(weddingDay)} · ${formatMonthCaps(weddingDay)}`,
      dow: formatDowCaps(weddingDay),
      date: formatDayPad(weddingDay),
      title: 'Wedding night',
      note: 'Your bed is a lift ride away',
    },
    {
      id: 'staying_longer',
      kicker: 'EXTRA NIGHTS',
      dow: 'MORE',
      date: '+',
      title: 'We’re staying longer',
      note: 'Confirm dates at RSVP',
    },
  ];

  return (
    <StayClient
      slug={slug}
      greeting={greeting}
      coupleNames={settings.couple_names}
      venueName={settings.venue_name}
      venueShort={VENUE_SHORT}
      dotDate={formatDotDate(weddingDay)}
      nights={nights}
      dates={{
        nightBeforeLong: formatLongDay(nightBefore),
        weddingDayLong: formatLongDay(weddingDay),
        dayAfterLong: formatLongDay(dayAfter),
        nightBeforeCard: formatCardDate(nightBefore),
        weddingDayCard: formatCardDate(weddingDay),
        dayAfterCard: formatCardDate(dayAfter),
      }}
      isOpen={isStayOpen(settings.stay_eoi_open)}
      existing={existing}
    />
  );
}
