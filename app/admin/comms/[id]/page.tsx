import { requireAdminAuth } from '@/lib/adminAuth';
import { supabase, supabaseServer, getCurrentPhase, type PhaseName } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CommsDetailClient from './CommsDetailClient';
import type { EmailTemplateRow, SmsTemplateRow } from '../templates/page';
import { EMAIL_TEMPLATE_TITLES, PHASE_LABELS, PHASE_TEMPLATE_MAP } from '@/lib/email/templateInfo';

export type DetailGuest = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile: string | null;
  comms_email: boolean;
  comms_sms: boolean;
  rsvp_status: string;
};

export type DetailComm = {
  id: string;
  type: 'sms' | 'email';
  message: string;
  status: string;
  sent_at: string;
  guest_id: string | null;
};

export default async function CommsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAuth();
  const { id } = await params;

  const [householdRes, guestsRes, commsRes, tagsRes, phaseRes, templatesRes, smsTemplatesRes] = await Promise.all([
    supabase.from('households').select('id,name,slug').eq('id', id).single(),
    supabase
      .from('guests')
      .select('id,first_name,last_name,email,mobile,comms_email,comms_sms,rsvp_status')
      .eq('household_id', id)
      .order('is_child', { ascending: true })
      .order('first_name', { ascending: true }),
    supabaseServer
      .from('communications')
      .select('id,type,message,status,sent_at,guest_id')
      .eq('household_id', id)
      .order('sent_at', { ascending: false }),
    supabase.from('guest_tags').select('tag').eq('household_id', id),
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

  if (!householdRes.data) notFound();

  const household = householdRes.data;
  const guests: DetailGuest[] = (guestsRes.data ?? []) as DetailGuest[];
  const comms: DetailComm[] = (commsRes.data ?? []) as DetailComm[];
  const tags = (tagsRes.data ?? []).map((t: { tag: string }) => t.tag);
  const emailTemplates = (templatesRes.data ?? []) as EmailTemplateRow[];
  const smsTemplates = (smsTemplatesRes.data ?? []) as SmsTemplateRow[];

  const currentPhase: PhaseName = (phaseRes.data?.current_phase as PhaseName) ?? 'save_the_date';
  const primaryKey = PHASE_TEMPLATE_MAP[currentPhase];
  const primaryTemplate = emailTemplates.find((t) => t.key === primaryKey);
  const primaryTemplateActive = !!primaryTemplate?.is_active;
  const smsPrimaryTemplate = smsTemplates.find((t) => t.key === primaryKey);
  const smsPrimaryTemplateActive = !!smsPrimaryTemplate?.is_active;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Communications</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{household.name}</h1>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/admin/guests/${household.id}/edit`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Edit household
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

      <CommsDetailClient
        householdId={household.id}
        householdName={household.name}
        householdSlug={household.slug}
        guests={guests}
        comms={comms}
        templates={emailTemplates}
        smsTemplates={smsTemplates}
        currentPhase={currentPhase}
        defaultTemplateKey={primaryTemplateActive ? primaryKey : null}
        defaultSmsTemplateKey={smsPrimaryTemplateActive ? primaryKey : null}
      />
    </div>
  );
}
