import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabase';
import { FROM_EMAIL } from '@/lib/email/sendEmail';
import { sendPushToAdmins } from '@/lib/push/sendPush';

const EMAIL_LINK_BASE = process.env.EMAIL_LINK_BASE ?? 'https://www.mattandraff.com';
const NOTIFY_EMAIL = process.env.UNSUBSCRIBE_NOTIFY_EMAIL ?? 'raffpapalia@gmail.com';

const TRACKED_EVENT_TYPES = ['email.delivered', 'email.opened', 'email.bounced', 'email.complained'] as const;

// Best-effort heads-up, same reasoning as notifyUnsubscribe in
// app/api/unsubscribe/[guestId]/route.ts — must never affect the webhook's
// 200 response back to Resend.
async function notifySuppressed(
  reason: 'bounced' | 'complained',
  guestName: string,
  householdName: string,
  householdId: string
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const label = reason === 'bounced' ? 'bounced' : 'was marked as spam';
  const editUrl = `${EMAIL_LINK_BASE}/admin/comms/${householdId}`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: NOTIFY_EMAIL,
    subject: `${guestName}'s email ${label} — email disabled`,
    html: `<p>${guestName} (${householdName})'s email ${label}. Their email comms have been automatically turned off.</p><p><a href="${editUrl}">View household</a></p>`,
    text: `${guestName} (${householdName})'s email ${label}. Their email comms have been automatically turned off.\n\n${editUrl}`,
  });
}

export async function POST(request: Request) {
  const payload = await request.text();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!svixId || !svixTimestamp || !svixSignature || !webhookSecret) {
    return new NextResponse('Invalid signature', { status: 400 });
  }

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret,
    });
  } catch (err) {
    console.error('[Resend webhook] Signature verification failed:', err);
    return new NextResponse('Invalid signature', { status: 400 });
  }

  if (!(TRACKED_EVENT_TYPES as readonly string[]).includes(event.type)) {
    return new NextResponse('OK', { status: 200 });
  }

  const emailId = (event.data as { email_id?: string }).email_id;
  if (!emailId) return new NextResponse('OK', { status: 200 });

  // No match (e.g. a test send, which is never logged to `communications`) —
  // nothing to update.
  const { data: comm } = await supabaseServer
    .from('communications')
    .select('id, guest_id, household_id, opened_at, open_count')
    .eq('provider_message_id', emailId)
    .maybeSingle();

  if (!comm) return new NextResponse('OK', { status: 200 });

  const now = new Date().toISOString();

  if (event.type === 'email.delivered') {
    await supabaseServer.from('communications').update({ delivered_at: now }).eq('id', comm.id);
  } else if (event.type === 'email.opened') {
    await supabaseServer
      .from('communications')
      .update({
        opened_at: comm.opened_at ?? now,
        last_opened_at: now,
        open_count: (comm.open_count ?? 0) + 1,
      })
      .eq('id', comm.id);
  } else if (event.type === 'email.bounced' || event.type === 'email.complained') {
    const reason = event.type === 'email.bounced' ? 'bounced' : 'complained';
    await supabaseServer
      .from('communications')
      .update({ [`${reason}_at`]: now, status: reason })
      .eq('id', comm.id);

    if (comm.guest_id) {
      const { data: guest } = await supabaseServer
        .from('guests')
        .select('id, first_name, last_name, household_id, households(name)')
        .eq('id', comm.guest_id)
        .maybeSingle();

      if (guest) {
        await supabaseServer.from('guests').update({ comms_email: false }).eq('id', guest.id);

        const guestName = `${guest.first_name} ${guest.last_name ?? ''}`.trim();
        const householdName = (guest.households as unknown as { name?: string } | null)?.name ?? 'Unknown household';

        await notifySuppressed(reason, guestName, householdName, guest.household_id).catch((err) => {
          console.error('[Resend webhook] Notification email failed:', err);
        });

        await sendPushToAdmins({
          title: reason === 'bounced' ? 'Email bounced' : 'Marked as spam',
          body: `${guestName}'s email ${reason === 'bounced' ? 'bounced' : 'was marked as spam'} — disabled.`,
          url: `/admin/comms/${guest.household_id}`,
        }).catch((err) => {
          console.error('[Resend webhook] Push notification failed:', err);
        });
      }
    }
  }

  return new NextResponse('OK', { status: 200 });
}
