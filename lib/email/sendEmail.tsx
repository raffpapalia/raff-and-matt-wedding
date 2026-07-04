import { Resend } from 'resend';
import { supabaseServer, type PhaseName } from '@/lib/supabase';
import { renderEmailTemplate, renderCustomEmail, type EmailTemplateKey } from './renderTemplate';
import { PHASE_TEMPLATE_MAP } from './templateInfo';

export type CustomEmailContent = { subject: string; body: string; baseKey?: EmailTemplateKey };

export const FROM_EMAIL = 'ten7twenty7@mattandraff.com';
export const REPLY_TO = 'ten7twenty7@gmail.com';

export type EmailTemplate = EmailTemplateKey;

export type SendSummary = {
  success: true;
  total: number;
  sent: number;
  failed: number;
  messageIds: string[];
  message?: string;
};

export type SendResult = SendSummary | { success: false; error: string };

export type SendMode = 'all' | 'not_yet_emailed';

type GuestForEmail = {
  id: string;
  first_name: string;
  email: string;
};

type HouseholdForEmail = {
  id: string;
  slug: string;
};

export async function getQualifyingGuestsForEmail(householdId: string) {
  return supabaseServer
    .from('guests')
    .select('id, first_name, email')
    .eq('household_id', householdId)
    .eq('comms_email', true)
    .not('email', 'is', null)
    .neq('email', '');
}

export async function sendGuestEmail(
  guest: GuestForEmail,
  household: HouseholdForEmail,
  template: EmailTemplate | undefined,
  phase: PhaseName,
  custom?: CustomEmailContent
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const templateKey = template ?? PHASE_TEMPLATE_MAP[phase];

  let rendered: { subject: string; html: string };
  try {
    rendered = custom
      ? await renderCustomEmail(custom.subject, custom.body, guest, household, custom.baseKey)
      : await renderEmailTemplate(templateKey, guest, household);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Failed to render email template';
    await supabaseServer.from('communications').insert({
      household_id: household.id,
      guest_id: guest.id,
      type: 'email',
      message: `[template render failed: ${templateKey}]`,
      recipient_email: guest.email,
      status: 'failed',
      provider_message_id: null,
      error_message: error,
      sent_at: new Date().toISOString(),
      phase,
      is_custom: !!custom,
    });
    return { success: false, error };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: sendData, error: sendError } = await resend.emails.send({
    from: FROM_EMAIL,
    replyTo: REPLY_TO,
    to: guest.email,
    subject: rendered.subject,
    html: rendered.html,
  });

  await supabaseServer.from('communications').insert({
    household_id: household.id,
    guest_id: guest.id,
    type: 'email',
    message: rendered.subject,
    recipient_email: guest.email,
    status: sendError ? 'failed' : 'sent',
    provider_message_id: sendData?.id ?? null,
    error_message: sendError?.message ?? null,
    sent_at: new Date().toISOString(),
    phase,
    is_custom: !!custom,
  });

  if (sendError) {
    return { success: false, error: sendError.message };
  }

  return { success: true, messageId: sendData?.id };
}

export async function sendHouseholdEmail(
  householdId: string,
  template: EmailTemplate | undefined,
  phase: PhaseName,
  mode: SendMode = 'all',
  custom?: CustomEmailContent
): Promise<SendResult> {
  const { data: household, error: householdError } = await supabaseServer
    .from('households')
    .select('id, name, slug')
    .eq('id', householdId)
    .single();

  if (householdError || !household) {
    return { success: false, error: `Household not found: ${householdError?.message ?? 'no data'}` };
  }

  const { data: qualifyingGuests, error: guestsError } = await getQualifyingGuestsForEmail(householdId);

  if (guestsError) {
    return { success: false, error: `Failed to fetch guests: ${guestsError.message}` };
  }

  let guests = qualifyingGuests ?? [];

  if (mode === 'not_yet_emailed') {
    const alreadyEmailedList = await getGuestsEmailedForPhase(householdId, phase);
    const alreadyEmailed = new Set(alreadyEmailedList);
    guests = guests.filter((g) => !alreadyEmailed.has(g.id));
  }

  if (guests.length === 0) {
    return {
      success: true,
      total: 0,
      sent: 0,
      failed: 0,
      messageIds: [],
      message: 'No guests with email + comms_email enabled',
    };
  }

  let sent = 0;
  let failed = 0;
  const messageIds: string[] = [];

  for (const guest of guests) {
    const result = await sendGuestEmail(
      {
        id: guest.id,
        first_name: guest.first_name as string,
        email: guest.email as string,
      },
      household,
      template,
      phase,
      custom
    );

    if (result.success) {
      sent++;
      if (result.messageId) messageIds.push(result.messageId);
    } else {
      failed++;
    }
  }

  return { success: true, total: guests.length, sent, failed, messageIds };
}

export async function sendSingleGuestEmail(
  guestId: string,
  template: EmailTemplate | undefined,
  phase: PhaseName,
  custom?: CustomEmailContent
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { data: guest, error: guestError } = await supabaseServer
    .from('guests')
    .select('id, first_name, email, household_id, comms_email')
    .eq('id', guestId)
    .single();

  if (guestError || !guest) {
    return { success: false, error: 'Guest not found' };
  }

  if (!guest.comms_email || !guest.email) {
    return { success: false, error: 'Guest is not eligible for email (comms_email off or no email on file)' };
  }

  const { data: household, error: householdError } = await supabaseServer
    .from('households')
    .select('id, slug')
    .eq('id', guest.household_id)
    .single();

  if (householdError || !household) {
    return { success: false, error: 'Household not found' };
  }

  return sendGuestEmail(
    { id: guest.id, first_name: guest.first_name as string, email: guest.email as string },
    household,
    template,
    phase,
    custom
  );
}

export async function getGuestsEmailedForPhase(
  householdId: string,
  phase: PhaseName
): Promise<string[]> {
  const { data, error } = await supabaseServer
    .from('communications')
    .select('guest_id')
    .eq('household_id', householdId)
    .eq('type', 'email')
    .eq('status', 'sent')
    .eq('phase', phase)
    .not('guest_id', 'is', null);

  if (error || !data) {
    return [];
  }

  return Array.from(new Set(data.map((row) => row.guest_id as string)));
}
