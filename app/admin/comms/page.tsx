import { requireAdminAuth } from '@/lib/adminAuth';
import { supabase, supabaseServer, getCurrentPhase, type PhaseName } from '@/lib/supabase';
import CommsClient from './CommsClient';
import type { EmailTemplateRow, SmsTemplateRow } from './templates/page';
import { EMAIL_TEMPLATE_TITLES, PHASE_LABELS, PHASE_TEMPLATE_MAP } from '@/lib/email/templateInfo';

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

  const [householdsRes, tagsRes, guestsRes, commsRes, phaseRes, templatesRes, smsTemplatesRes] = await Promise.all([
    supabase.from('households').select('id,name,slug').order('created_at', { ascending: false }),
    supabase.from('guest_tags').select('household_id,tag'),
    supabase
      .from('guests')
      .select('id,household_id,first_name,last_name,mobile,email,comms_email,comms_sms'),
    supabaseServer
      .from('communications')
      .select('household_id,type,status,sent_at')
      .order('sent_at', { ascending: false }),
    getCurrentPhase(),
    supabaseServer
      .from('email_templates')
      .select('id, key, phase, subject, body, trigger_type, is_active, updated_at')
      .eq('channel', 'email'),
    supabaseServer
      .from('email_templates')
      .select('id, key, phase, body, trigger_type, is_active, updated_at')
      .eq('channel', 'sms'),
  ]);

  const households = householdsRes.data ?? [];
  const tags = tagsRes.data ?? [];
  const guests = guestsRes.data ?? [];
  const comms = commsRes.data ?? [];
  const emailTemplates = (templatesRes.data ?? []) as EmailTemplateRow[];
  const smsTemplates = (smsTemplatesRes.data ?? []) as SmsTemplateRow[];

  const currentPhase: PhaseName = (phaseRes.data?.current_phase as PhaseName) ?? 'save_the_date';
  const primaryKey = PHASE_TEMPLATE_MAP[currentPhase];
  const primaryTemplate = emailTemplates.find((t) => t.key === primaryKey);
  const primaryTemplateActive = !!primaryTemplate?.is_active;
  const smsPrimaryTemplate = smsTemplates.find((t) => t.key === primaryKey);
  const smsPrimaryTemplateActive = !!smsPrimaryTemplate?.is_active;

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

      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-300">
        Current phase: <span className="font-semibold text-white">{PHASE_LABELS[currentPhase]}</span>
        {primaryTemplateActive ? (
          <> — the Email button sends the &ldquo;{EMAIL_TEMPLATE_TITLES[primaryKey]}&rdquo; email.</>
        ) : (
          <>
            {' '}
            — no active email template is set for this phase; the Email button won&apos;t send anything until one is
            activated on the{' '}
            <a href="/admin/comms/templates" className="underline transition hover:text-white">
              Templates page
            </a>
            .
          </>
        )}
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
        templates={emailTemplates}
        smsTemplates={smsTemplates}
        currentPhase={currentPhase}
        defaultTemplateKey={primaryTemplateActive ? primaryKey : null}
        defaultSmsTemplateKey={smsPrimaryTemplateActive ? primaryKey : null}
      />
    </div>
  );
}
