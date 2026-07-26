import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabase';
import { FROM_EMAIL } from '@/lib/email/sendEmail';

const EMAIL_LINK_BASE = process.env.EMAIL_LINK_BASE ?? 'https://www.mattandraff.com';
const NOTIFY_EMAIL = process.env.UNSUBSCRIBE_NOTIFY_EMAIL ?? 'raffpapalia@gmail.com';

// Best-effort heads-up to the couple — must never affect the guest-facing
// unsubscribe outcome, so failures are swallowed by the caller's catch.
async function notifyUnsubscribe(guestName: string, householdName: string, householdId: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const editUrl = `${EMAIL_LINK_BASE}/admin/guests/${householdId}/edit`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: NOTIFY_EMAIL,
    subject: `${guestName} unsubscribed from email updates`,
    html: `<p>${guestName} (${householdName}) just unsubscribed from email updates.</p><p><a href="${editUrl}">View household</a></p>`,
    text: `${guestName} (${householdName}) just unsubscribed from email updates.\n\n${editUrl}`,
  });
}

// Shared by both the visible footer link (GET, human click) and the RFC 8058
// one-click unsubscribe header (POST, mail client acts with no page load) —
// same effect either way: stop future emails to this guest only, leaving SMS
// and their invite/RSVP untouched. Never throws: an unknown/malformed guestId
// (crawler, stale link, retried request) should just no-op rather than surface
// an error to something that isn't expecting one.
async function unsubscribeGuest(guestId: string): Promise<void> {
  const { data: guest } = await supabaseServer
    .from('guests')
    .select('id, first_name, last_name, household_id, households(name)')
    .eq('id', guestId)
    .maybeSingle();

  if (!guest) return;

  await supabaseServer.from('guests').update({ comms_email: false }).eq('id', guestId);

  await supabaseServer.from('communications').insert({
    household_id: guest.household_id,
    guest_id: guest.id,
    type: 'email',
    message: 'Unsubscribed from email updates',
    status: 'unsubscribed',
  });

  const householdName = (guest.households as unknown as { name?: string } | null)?.name ?? 'Unknown household';
  const guestName = `${guest.first_name} ${guest.last_name ?? ''}`.trim();
  await notifyUnsubscribe(guestName, householdName, guest.household_id).catch((err) => {
    console.error('[Unsubscribe] Notification email failed:', err);
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params;
  await unsubscribeGuest(guestId).catch(() => {});
  return NextResponse.redirect(`${EMAIL_LINK_BASE}/unsubscribed`);
}

// Mail clients doing one-click unsubscribe POST here directly and expect a
// bare 200 — no redirect, no body, no confirmation page.
export async function POST(_request: Request, { params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params;
  await unsubscribeGuest(guestId).catch(() => {});
  return new NextResponse(null, { status: 200 });
}
