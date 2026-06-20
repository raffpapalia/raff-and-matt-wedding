import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { getQualifyingGuestsForSms, getGuestsTextedForPhase } from '@/lib/sms/sendSms';
import { getCurrentPhase, type PhaseName } from '@/lib/supabase';

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

  const { data: phaseRow } = await getCurrentPhase();
  const phase = (phaseRow?.current_phase as PhaseName | undefined) ?? 'save_the_date';

  let total = 0;
  let alreadyTexted = 0;

  for (const id of ids) {
    const { data: qualifyingGuests, error: guestsError } = await getQualifyingGuestsForSms(id);
    if (guestsError) continue;

    const qualifying = qualifyingGuests ?? [];
    const alreadyTextedIds = new Set(await getGuestsTextedForPhase(id, phase));
    total += qualifying.length;
    alreadyTexted += qualifying.filter((g) => alreadyTextedIds.has(g.id)).length;
  }

  return NextResponse.json({
    phase,
    total,
    alreadyTexted,
    notYetTexted: total - alreadyTexted,
  });
}
