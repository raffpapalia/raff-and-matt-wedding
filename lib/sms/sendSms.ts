import { supabaseServer, type PhaseName } from '@/lib/supabase';
import { resolveMergeTags } from '@/lib/email/mergeTags';
import { PHASE_TEMPLATE_MAP } from '@/lib/email/templateInfo';
import { getShortLink } from '@/lib/shortLink';
import { twilioClient, TWILIO_FROM_NUMBER } from './twilioClient';
import { normalizeAuMobile } from './normalizeMobile';
import { loadSmsTemplate, type SmsTemplateKey } from './smsTemplates';

export type SmsTemplate = SmsTemplateKey;

export type SmsSendMode = 'all' | 'not_yet_texted';

export type GuestForSms = {
  id: string;
  first_name: string;
  mobile: string;
};

export type HouseholdForSms = {
  id: string;
  short_code: string;
};

export type SmsSendOutcome = {
  guestId: string;
  status: 'sent' | 'failed' | 'skipped';
  messageId?: string;
  reason?: string;
};

export type SmsSendSummary = {
  success: true;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: SmsSendOutcome[];
};

export type SmsSendResult = SmsSendSummary | { success: false; error: string };

export type SmsTestSendResult = { success: true; messageId: string; to: string } | { success: false; error: string };

export async function getQualifyingGuestsForSms(householdId: string) {
  return supabaseServer
    .from('guests')
    .select('id, first_name, mobile')
    .eq('household_id', householdId)
    .eq('comms_sms', true)
    .not('mobile', 'is', null)
    .neq('mobile', '');
}

export type CustomSmsContent = { body: string };

export async function sendGuestSms(
  guest: GuestForSms,
  household: HouseholdForSms,
  template: SmsTemplate | undefined,
  phase: PhaseName,
  custom?: CustomSmsContent
): Promise<SmsSendOutcome> {
  const templateKey = template ?? PHASE_TEMPLATE_MAP[phase];
  const normalized = normalizeAuMobile(guest.mobile);

  if (!normalized.ok) {
    await supabaseServer.from('communications').insert({
      household_id: household.id,
      guest_id: guest.id,
      type: 'sms',
      message: `[skipped: invalid mobile]`,
      recipient_number: guest.mobile,
      status: 'skipped',
      provider_message_id: null,
      error_message: normalized.reason,
      sent_at: new Date().toISOString(),
      phase,
    });
    return { guestId: guest.id, status: 'skipped', reason: normalized.reason };
  }

  let body: string;
  try {
    const template = custom ? custom.body : await loadSmsTemplate(templateKey);
    const shortLink = getShortLink({ short_code: household.short_code });
    body = `${resolveMergeTags(template, { first_name: guest.first_name })} ${shortLink}`;
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Failed to resolve SMS template';
    await supabaseServer.from('communications').insert({
      household_id: household.id,
      guest_id: guest.id,
      type: 'sms',
      message: `[template render failed: ${templateKey}]`,
      recipient_number: normalized.e164,
      status: 'failed',
      provider_message_id: null,
      error_message: reason,
      sent_at: new Date().toISOString(),
      phase,
      is_custom: !!custom,
    });
    return { guestId: guest.id, status: 'failed', reason };
  }

  try {
    const message = await twilioClient.messages.create({
      from: TWILIO_FROM_NUMBER,
      to: normalized.e164,
      body,
    });

    await supabaseServer.from('communications').insert({
      household_id: household.id,
      guest_id: guest.id,
      type: 'sms',
      message: body,
      recipient_number: normalized.e164,
      status: 'sent',
      provider_message_id: message.sid,
      error_message: null,
      sent_at: new Date().toISOString(),
      phase,
      is_custom: !!custom,
    });

    return { guestId: guest.id, status: 'sent', messageId: message.sid };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Twilio send failed';

    await supabaseServer.from('communications').insert({
      household_id: household.id,
      guest_id: guest.id,
      type: 'sms',
      message: body,
      recipient_number: normalized.e164,
      status: 'failed',
      provider_message_id: null,
      error_message: reason,
      sent_at: new Date().toISOString(),
      phase,
      is_custom: !!custom,
    });

    return { guestId: guest.id, status: 'failed', reason };
  }
}

export async function sendHouseholdSms(
  householdId: string,
  template: SmsTemplate | undefined,
  phase: PhaseName,
  mode: SmsSendMode = 'all',
  custom?: CustomSmsContent
): Promise<SmsSendResult> {
  const { data: household, error: householdError } = await supabaseServer
    .from('households')
    .select('id, short_code')
    .eq('id', householdId)
    .single();

  if (householdError || !household) {
    return { success: false, error: `Household not found: ${householdError?.message ?? 'no data'}` };
  }

  const { data: qualifyingGuests, error: guestsError } = await getQualifyingGuestsForSms(householdId);

  if (guestsError) {
    return { success: false, error: `Failed to fetch guests: ${guestsError.message}` };
  }

  let guests = qualifyingGuests ?? [];

  if (mode === 'not_yet_texted') {
    const alreadyTextedList = await getGuestsTextedForPhase(householdId, phase);
    const alreadyTexted = new Set(alreadyTextedList);
    guests = guests.filter((g) => !alreadyTexted.has(g.id));
  }

  if (guests.length === 0) {
    return { success: true, total: 0, sent: 0, failed: 0, skipped: 0, results: [] };
  }

  const results: SmsSendOutcome[] = [];

  for (const guest of guests) {
    const outcome = await sendGuestSms(
      {
        id: guest.id,
        first_name: guest.first_name as string,
        mobile: guest.mobile as string,
      },
      household,
      template,
      phase,
      custom
    );
    results.push(outcome);
  }

  return {
    success: true,
    total: guests.length,
    sent: results.filter((r) => r.status === 'sent').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results,
  };
}

export async function sendSingleGuestSms(
  guestId: string,
  template: SmsTemplate | undefined,
  phase: PhaseName,
  custom?: CustomSmsContent
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { data: guest, error: guestError } = await supabaseServer
    .from('guests')
    .select('id, first_name, mobile, household_id, comms_sms')
    .eq('id', guestId)
    .single();

  if (guestError || !guest) {
    return { success: false, error: 'Guest not found' };
  }

  if (!guest.comms_sms || !guest.mobile) {
    return { success: false, error: 'Guest is not eligible for SMS (comms_sms off or no mobile on file)' };
  }

  const { data: household, error: householdError } = await supabaseServer
    .from('households')
    .select('id, short_code')
    .eq('id', guest.household_id)
    .single();

  if (householdError || !household) {
    return { success: false, error: 'Household not found' };
  }

  const outcome = await sendGuestSms(
    { id: guest.id, first_name: guest.first_name as string, mobile: guest.mobile as string },
    household,
    template,
    phase,
    custom
  );

  if (outcome.status === 'sent') {
    return { success: true, messageId: outcome.messageId };
  }
  return { success: false, error: outcome.reason ?? 'Failed to send SMS' };
}

export async function getGuestsTextedForPhase(householdId: string, phase: PhaseName): Promise<string[]> {
  const { data, error } = await supabaseServer
    .from('communications')
    .select('guest_id')
    .eq('household_id', householdId)
    .eq('type', 'sms')
    .eq('status', 'sent')
    .eq('phase', phase)
    .not('guest_id', 'is', null);

  if (error || !data) {
    return [];
  }

  return Array.from(new Set(data.map((row) => row.guest_id as string)));
}

// Test sends use the real engine (loadSmsTemplate -> Twilio) against the CURRENTLY
// SAVED template content, but are never written to `communications` — there's no real
// guest to attach the row to, same reasoning as the email test-send route. The short
// link is real (taken from an actual household) so the test message looks and behaves
// like a real one; the first_name is a fixed sample, like the email preview's "Jane".
export async function sendTestSms(key: SmsTemplate, toRaw: string): Promise<SmsTestSendResult> {
  const normalized = normalizeAuMobile(toRaw);
  if (!normalized.ok) {
    return { success: false, error: normalized.reason };
  }

  let body: string;
  try {
    const template = await loadSmsTemplate(key);
    const { data: household, error: householdError } = await supabaseServer
      .from('households')
      .select('short_code')
      .limit(1)
      .single();

    if (householdError || !household) {
      throw new Error('No household available to build a sample short link');
    }

    const shortLink = getShortLink({ short_code: household.short_code as string });
    body = `${resolveMergeTags(template, { first_name: 'Jane' })} ${shortLink}`;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to render SMS template' };
  }

  try {
    const message = await twilioClient.messages.create({
      from: TWILIO_FROM_NUMBER,
      to: normalized.e164,
      body,
    });
    return { success: true, messageId: message.sid, to: normalized.e164 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Twilio send failed' };
  }
}
