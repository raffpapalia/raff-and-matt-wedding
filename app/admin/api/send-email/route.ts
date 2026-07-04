import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import {
  sendHouseholdEmail,
  sendSingleGuestEmail,
  type EmailTemplate,
  type SendMode,
  type CustomEmailContent,
} from '@/lib/email/sendEmail';
import { getCurrentPhase, type PhaseName } from '@/lib/supabase';

export async function POST(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (authCookie !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    household_id,
    household_ids,
    guest_id,
    template,
    phase,
    mode = 'all',
    custom_subject,
    custom_body,
    custom_base_key,
  } = body as {
    household_id?: string;
    household_ids?: string[];
    guest_id?: string;
    template?: EmailTemplate;
    phase?: PhaseName;
    mode?: SendMode;
    custom_subject?: string;
    custom_body?: string;
    custom_base_key?: EmailTemplate;
  };

  if ((custom_subject && !custom_body) || (!custom_subject && custom_body)) {
    return NextResponse.json({ error: 'custom_subject and custom_body must be provided together' }, { status: 400 });
  }
  const custom: CustomEmailContent | undefined =
    custom_subject && custom_body ? { subject: custom_subject, body: custom_body, baseKey: custom_base_key } : undefined;

  let activePhase = phase;
  if (!activePhase) {
    const { data: phaseRow } = await getCurrentPhase();
    activePhase = (phaseRow?.current_phase as PhaseName | undefined) ?? 'save_the_date';
  }

  if (guest_id) {
    const result = await sendSingleGuestEmail(guest_id, template, activePhase, custom);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      total: 1,
      sent: 1,
      failed: 0,
      messageIds: result.messageId ? [result.messageId] : [],
    });
  }

  const ids = household_ids?.length ? household_ids : household_id ? [household_id] : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Missing household_id, household_ids, or guest_id' }, { status: 400 });
  }

  let total = 0;
  let sent = 0;
  let failed = 0;
  const messageIds: string[] = [];
  const errors: string[] = [];

  for (const id of ids) {
    const result = await sendHouseholdEmail(id, template, activePhase, mode, custom);
    if (!result.success) {
      errors.push(result.error);
      continue;
    }
    total += result.total;
    sent += result.sent;
    failed += result.failed;
    messageIds.push(...result.messageIds);
  }

  if (errors.length === ids.length) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    total,
    sent,
    failed,
    messageIds,
    ...(errors.length ? { errors } : {}),
  });
}
