import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { sendHouseholdEmail, type EmailTemplate } from '@/lib/email/sendEmail';
import { sendHouseholdSms, type SmsTemplate } from '@/lib/sms/sendSms';
import { getCurrentPhase, type PhaseName } from '@/lib/supabase';

// "Both" always sends to every guest eligible per their own per-guest preferences —
// each engine already only targets guests where (contact value exists AND that
// channel's toggle is on), so running both unconditionally ('all' mode, no resend
// filtering) naturally gives independent per-guest behaviour: a guest may get email
// only, SMS only, both, or neither, with no extra logic needed here.
export async function POST(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(authCookie)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { household_id, household_ids, email_template, sms_template, phase } = body as {
    household_id?: string;
    household_ids?: string[];
    email_template?: EmailTemplate;
    sms_template?: SmsTemplate;
    phase?: PhaseName;
  };

  const ids = household_ids?.length ? household_ids : household_id ? [household_id] : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Missing household_id or household_ids' }, { status: 400 });
  }

  let activePhase = phase;
  if (!activePhase) {
    const { data: phaseRow } = await getCurrentPhase();
    activePhase = (phaseRow?.current_phase as PhaseName | undefined) ?? 'save_the_date';
  }

  let emailTotal = 0;
  let emailSent = 0;
  let emailFailed = 0;
  let smsTotal = 0;
  let smsSent = 0;
  let smsFailed = 0;
  let smsSkipped = 0;
  const errors: string[] = [];

  for (const id of ids) {
    const [emailResult, smsResult] = await Promise.all([
      sendHouseholdEmail(id, email_template, activePhase, 'all'),
      sendHouseholdSms(id, sms_template, activePhase, 'all'),
    ]);

    if (emailResult.success) {
      emailTotal += emailResult.total;
      emailSent += emailResult.sent;
      emailFailed += emailResult.failed;
    } else {
      errors.push(`Email: ${emailResult.error}`);
    }

    if (smsResult.success) {
      smsTotal += smsResult.total;
      smsSent += smsResult.sent;
      smsFailed += smsResult.failed;
      smsSkipped += smsResult.skipped;
    } else {
      errors.push(`SMS: ${smsResult.error}`);
    }
  }

  if (errors.length === ids.length * 2) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    email: { total: emailTotal, sent: emailSent, failed: emailFailed },
    sms: { total: smsTotal, sent: smsSent, failed: smsFailed, skipped: smsSkipped },
    ...(errors.length ? { errors } : {}),
  });
}
