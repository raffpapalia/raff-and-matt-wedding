import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabase';
import { isValidTwilioSignature } from '@/lib/sms/twilioClient';
import { normalizeAuMobile } from '@/lib/sms/normalizeMobile';
import { FROM_EMAIL } from '@/lib/email/sendEmail';
import { sendPushToAdmins } from '@/lib/push/sendPush';

const EMAIL_LINK_BASE = process.env.EMAIL_LINK_BASE ?? 'https://www.mattandraff.com';
const NOTIFY_EMAIL = process.env.UNSUBSCRIBE_NOTIFY_EMAIL ?? 'raffpapalia@gmail.com';
const WEBHOOK_URL = `${EMAIL_LINK_BASE}/api/webhooks/twilio`;

function twimlResponse(): NextResponse {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

// Best-effort heads-up so a reply never sits unseen — must never affect the
// TwiML response Twilio gets back, so callers swallow failures here.
async function notifyNewReply(label: string, body: string, inboxUrl: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: NOTIFY_EMAIL,
    subject: `New SMS reply from ${label}`,
    html: `<p><strong>${label}</strong> replied:</p><p>${body}</p><p><a href="${inboxUrl}">View in Inbox</a></p>`,
    text: `${label} replied:\n\n${body}\n\n${inboxUrl}`,
  });
}

// Twilio POSTs application/x-www-form-urlencoded on every inbound SMS. Signature
// verification (rather than admin auth) is what protects this endpoint, since
// Twilio can't send our admin session cookie.
export async function POST(request: Request) {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  const signature = request.headers.get('x-twilio-signature');
  if (!isValidTwilioSignature(WEBHOOK_URL, params, signature)) {
    return new NextResponse('Invalid signature', { status: 403 });
  }

  const from = params.From ?? '';
  const body = params.Body ?? '';
  const messageSid = params.MessageSid || null;

  // Idempotent against Twilio's webhook retries.
  if (messageSid) {
    const { data: existing } = await supabaseServer
      .from('communications')
      .select('id')
      .eq('provider_message_id', messageSid)
      .maybeSingle();
    if (existing) return twimlResponse();
  }

  const normalized = normalizeAuMobile(from);
  const recipientNumber = normalized.ok ? normalized.e164 : from;

  // Guest list is small (a wedding, not a mailing list) — normalizing every
  // stored mobile to compare is simpler and more robust than assuming a
  // canonical stored format.
  let matchedGuest: { id: string; household_id: string; first_name: string; last_name: string } | null = null;
  if (normalized.ok) {
    const { data: guests } = await supabaseServer
      .from('guests')
      .select('id, household_id, first_name, last_name, mobile')
      .not('mobile', 'is', null)
      .neq('mobile', '');
    matchedGuest =
      (guests ?? []).find((g) => {
        const n = normalizeAuMobile(g.mobile as string);
        return n.ok && n.e164 === normalized.e164;
      }) ?? null;
  }

  await supabaseServer.from('communications').insert({
    household_id: matchedGuest?.household_id ?? null,
    guest_id: matchedGuest?.id ?? null,
    type: 'sms',
    direction: 'inbound',
    status: 'received',
    message: body,
    recipient_number: recipientNumber,
    provider_message_id: messageSid,
    sent_at: new Date().toISOString(),
  });

  const label = matchedGuest ? `${matchedGuest.first_name} ${matchedGuest.last_name}` : `an unknown number (${recipientNumber})`;
  const inboxUrl = `${EMAIL_LINK_BASE}/admin/comms/inbox`;

  await notifyNewReply(label, body, inboxUrl).catch((err) => {
    console.error('[Twilio webhook] Notification email failed:', err);
  });

  await sendPushToAdmins({
    title: 'New SMS reply',
    body: `${label}: ${body}`,
    url: '/admin/comms/inbox',
  }).catch((err) => {
    console.error('[Twilio webhook] Push notification failed:', err);
  });

  return twimlResponse();
}
