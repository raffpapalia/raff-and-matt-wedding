import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer, getSettings } from '@/lib/supabase';
import LogClient from './LogClient';

function formatWeddingDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export type LogRow = {
  id: string;
  householdId: string;
  householdName: string;
  channel: 'sms' | 'email';
  status: string;
  message: string;
  sentAt: string;
  recipientEmail: string | null;
  recipientNumber: string | null;
};

const PAGE_SIZE = 50;

export default async function CommsLogPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; channel?: string; status?: string; from?: string; to?: string }>;
}) {
  await requireAdminAuth();

  const resolvedSearchParams = await searchParams;
  const page = Math.max(0, parseInt(resolvedSearchParams?.page ?? '0', 10));
  const channel = resolvedSearchParams?.channel ?? '';
  const status = resolvedSearchParams?.status ?? '';
  const from = resolvedSearchParams?.from ?? '';
  const to = resolvedSearchParams?.to ?? '';

  let query = supabaseServer
    .from('communications')
    .select(
      'id, household_id, type, message, sent_at, status, recipient_email, recipient_number, households(name)',
      { count: 'exact' },
    )
    .order('sent_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (channel) query = query.eq('type', channel);
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('sent_at', from);
  if (to) query = query.lte('sent_at', to + 'T23:59:59Z');

  const [{ data, count }, settings] = await Promise.all([query, getSettings()]);

  const rows: LogRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    householdId: r.household_id,
    householdName: r.households?.name ?? 'Unknown',
    channel: r.type as 'sms' | 'email',
    status: r.status,
    message: r.message,
    sentAt: r.sent_at,
    recipientEmail: r.recipient_email ?? null,
    recipientNumber: r.recipient_number ?? null,
  }));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Communications</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Comms log</h1>
            <p className="mt-2 text-admin-ink/60">{count ?? 0} total records</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/admin/api/comms/log/export"
              className="rounded-full border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
            >
              Export CSV
            </a>
            <a
              href="/admin/comms"
              className="rounded-full border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
            >
              ← Comms
            </a>
          </div>
        </div>
      </div>

      <LogClient
        rows={rows}
        page={page}
        totalPages={totalPages}
        total={count ?? 0}
        filters={{ channel, status, from, to }}
        weddingDate={formatWeddingDate(settings.wedding_date)}
        venueName={settings.venue_name}
      />
    </div>
  );
}
