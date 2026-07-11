import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { sendHouseholdSms, type SmsTemplate } from '@/lib/sms/sendSms';
import { getCurrentPhase, type PhaseName } from '@/lib/supabase';

const VALID_KEYS: SmsTemplate[] = [
  'save_the_date',
  'invitation',
  'rsvp_reminder',
  'rsvp_confirmation',
  'pre_wedding',
  'thank_you',
  'link_recovery',
];

// Triggers a real SMS send (via sendHouseholdSms, the same engine the send buttons
// will use once wired up) for one household, so the engine can be exercised end to
// end before any UI calls into it. Accepts an explicit template key, or falls back to
// the current phase's template — same resolution order as /admin/api/send-email.
export async function POST(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(authCookie)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { household_id, template, phase } = body as {
    household_id?: string;
    template?: SmsTemplate;
    phase?: PhaseName;
  };

  if (!household_id) {
    return NextResponse.json({ error: 'Missing household_id' }, { status: 400 });
  }
  if (template && !VALID_KEYS.includes(template)) {
    return NextResponse.json({ error: `Invalid template. Must be one of: ${VALID_KEYS.join(', ')}` }, { status: 400 });
  }

  let activePhase = phase;
  if (!activePhase) {
    const { data: phaseRow } = await getCurrentPhase();
    activePhase = (phaseRow?.current_phase as PhaseName | undefined) ?? 'save_the_date';
  }

  const result = await sendHouseholdSms(household_id, template, activePhase);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
