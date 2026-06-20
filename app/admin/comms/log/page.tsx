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
    .select('id, household_id, type, message, sent_at, status, households(name)', {
      count: 'exact',
    })
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
  }));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Communications</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Comms log</h1>
            <p className="mt-2 text-slate-400">{count ?? 0} total records</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/admin/api/comms/log/export"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Export CSV
            </a>
            <a
              href="/admin/comms"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
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
      />
    </div>
  );
}
