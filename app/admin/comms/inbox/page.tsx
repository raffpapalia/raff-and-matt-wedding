import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';
import InboxClient from './InboxClient';

export type InboxRow = {
  id: string;
  message: string;
  sentAt: string;
  readAt: string | null;
  guestId: string | null;
  guestName: string | null;
  householdId: string | null;
  householdName: string | null;
  recipientNumber: string | null;
};

export default async function CommsInboxPage() {
  await requireAdminAuth();

  const { data } = await supabaseServer
    .from('communications')
    .select(
      'id, message, sent_at, read_at, guest_id, household_id, recipient_number, guests(first_name,last_name), households(name)'
    )
    .eq('direction', 'inbound')
    .order('sent_at', { ascending: false });

  const rows: InboxRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    message: r.message,
    sentAt: r.sent_at,
    readAt: r.read_at,
    guestId: r.guest_id,
    guestName: r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : null,
    householdId: r.household_id,
    householdName: r.households?.name ?? null,
    recipientNumber: r.recipient_number,
  }));

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Communications</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Inbox</h1>
            <p className="mt-2 text-admin-ink/60">
              {rows.length} {rows.length === 1 ? 'reply' : 'replies'} total
            </p>
          </div>
          <a
            href="/admin/comms"
            className="rounded-full border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
          >
            ← Comms
          </a>
        </div>
      </div>

      <InboxClient rows={rows} />
    </div>
  );
}
