import { requireAdminAuth } from '@/lib/adminAuth';
import { supabase, supabaseServer } from '@/lib/supabase';
import CommsClient from './CommsClient';
import { TEMPLATE_KEYS, DEFAULT_TEMPLATES, type TemplateKey } from './templates/page';

export type CommsStatus = 'not_sent' | 'sent' | 'failed' | 'partial';

export type CommsSummaryGuest = {
  id: string;
  first_name: string;
  last_name: string;
  mobile: string | null;
  email: string | null;
  comms_sms: boolean;
  comms_email: boolean;
};

export type CommsSummaryRow = {
  id: string;
  name: string;
  slug: string;
  tags: string[];
  guestCount: number;
  smsReadyCount: number;
  emailReadyCount: number;
  smsStatus: CommsStatus;
  emailStatus: CommsStatus;
  lastContacted: string | null;
  guests: CommsSummaryGuest[];
};

function deriveStatus(comms: Array<{ status: string }>): CommsStatus {
  if (comms.length === 0) return 'not_sent';
  const statuses = new Set(comms.map((c) => c.status));
  if (statuses.has('failed') && statuses.has('sent')) return 'partial';
  if (statuses.has('failed')) return 'failed';
  return 'sent';
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">{label}</p>
      <p className="mt-4 text-4xl font-semibold text-white">{value}</p>
      {sub ? <p className="mt-2 text-sm text-rose-300">{sub}</p> : null}
    </div>
  );
}

export default async function CommsPage() {
  await requireAdminAuth();

  const settingsKeys = [...(TEMPLATE_KEYS as readonly string[]), 'wedding_date', 'venue_name'];

  const [householdsRes, tagsRes, guestsRes, commsRes, settingsRes] = await Promise.all([
    supabase.from('households').select('id,name,slug').order('created_at', { ascending: false }),
    supabase.from('guest_tags').select('household_id,tag'),
    supabase
      .from('guests')
      .select('id,household_id,first_name,last_name,mobile,email,comms_email,comms_sms'),
    supabaseServer
      .from('communications')
      .select('household_id,type,status,sent_at')
      .order('sent_at', { ascending: false }),
    supabaseServer.from('settings').select('key,value').in('key', settingsKeys),
  ]);

  const households = householdsRes.data ?? [];
  const tags = tagsRes.data ?? [];
  const guests = guestsRes.data ?? [];
  const comms = commsRes.data ?? [];
  const settingsData = settingsRes.data ?? [];

  const settingsMap = Object.fromEntries(
    settingsData.map((r: { key: string; value: unknown }) => [r.key, r.value])
  );

  const templates = Object.fromEntries(
    TEMPLATE_KEYS.map((key) => [key, (settingsMap[key] as string) ?? DEFAULT_TEMPLATES[key]])
  ) as Record<TemplateKey, string>;

  const weddingDate = (settingsMap['wedding_date'] as string) ?? '';
  const venueName = (settingsMap['venue_name'] as string) ?? '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sentToday = comms.filter((c) => new Date(c.sent_at) >= today && c.status === 'sent').length;
  const totalFailed = comms.filter((c) => c.status === 'failed').length;
  const smsReadyTotal = guests.filter((g: any) => g.comms_sms !== false).length;
  const emailReadyTotal = guests.filter((g: any) => g.comms_email !== false).length;

  const rows: CommsSummaryRow[] = households.map((household) => {
    const householdTags = tags.filter((t) => t.household_id === household.id).map((t) => t.tag);
    const householdGuests = guests.filter((g) => g.household_id === household.id);
    const householdComms = comms.filter((c) => c.household_id === household.id);
    const smsComms = householdComms.filter((c) => c.type === 'sms');
    const emailComms = householdComms.filter((c) => c.type === 'email');

    let lastContacted: string | null = null;
    if (householdComms.length > 0) {
      const sorted = [...householdComms].sort(
        (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
      );
      lastContacted = sorted[0].sent_at;
    }

    return {
      id: household.id,
      name: household.name,
      slug: household.slug,
      tags: [...new Set(householdTags)],
      guestCount: householdGuests.length,
      smsReadyCount: householdGuests.filter((g: any) => g.comms_sms !== false).length,
      emailReadyCount: householdGuests.filter((g: any) => g.comms_email !== false).length,
      smsStatus: deriveStatus(smsComms),
      emailStatus: deriveStatus(emailComms),
      lastContacted,
      guests: householdGuests.map((g: any) => ({
        id: g.id,
        first_name: g.first_name,
        last_name: g.last_name,
        mobile: g.mobile ?? null,
        email: g.email ?? null,
        comms_sms: g.comms_sms !== false,
        comms_email: g.comms_email !== false,
      })),
    };
  });

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Communications</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Comms dashboard</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/admin/comms/templates"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Templates
            </a>
            <a
              href="/admin/comms/log"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Log
            </a>
            <a
              href="/admin"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              ← Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <SummaryCard label="Total households" value={`${households.length}`} />
        <SummaryCard label="SMS-ready guests" value={`${smsReadyTotal}`} />
        <SummaryCard label="Email-ready guests" value={`${emailReadyTotal}`} />
        <SummaryCard
          label="Sent today"
          value={`${sentToday}`}
          sub={totalFailed > 0 ? `${totalFailed} failed overall` : undefined}
        />
      </div>

      <CommsClient
        rows={rows}
        templates={templates}
        weddingDate={weddingDate}
        venueName={venueName}
      />
    </div>
  );
}
