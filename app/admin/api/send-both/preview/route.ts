import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { getQualifyingGuestsForEmail } from '@/lib/email/sendEmail';
import { getQualifyingGuestsForSms } from '@/lib/sms/sendSms';

// "Both" has no resend tracking (no three-way modal) — this just reports live counts
// of who's eligible for each channel right now, re-derived from the DB at click time
// rather than trusting whatever the page happened to render on load.
export async function GET(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (authCookie !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const householdId = searchParams.get('household_id');
  const householdIdsParam = searchParams.get('household_ids');
  const ids = householdIdsParam ? householdIdsParam.split(',').filter(Boolean) : householdId ? [householdId] : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Missing household_id or household_ids' }, { status: 400 });
  }

  const emailGuestIds = new Set<string>();
  const smsGuestIds = new Set<string>();

  for (const id of ids) {
    const [{ data: emailGuests, error: emailError }, { data: smsGuests, error: smsError }] = await Promise.all([
      getQualifyingGuestsForEmail(id),
      getQualifyingGuestsForSms(id),
    ]);

    if (!emailError) (emailGuests ?? []).forEach((g) => emailGuestIds.add(g.id));
    if (!smsError) (smsGuests ?? []).forEach((g) => smsGuestIds.add(g.id));
  }

  const totalGuests = new Set([...emailGuestIds, ...smsGuestIds]).size;

  return NextResponse.json({
    emailCount: emailGuestIds.size,
    smsCount: smsGuestIds.size,
    totalGuests,
  });
}
