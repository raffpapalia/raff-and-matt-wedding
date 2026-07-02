import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer, getSettings, getCurrentPhase, type PhaseName } from '@/lib/supabase';
import TemplatesClient from './TemplatesClient';
import type { EmailTemplateKey } from '@/lib/email/renderTemplate';

export type EmailTemplateRow = {
  id: string;
  key: EmailTemplateKey;
  phase: string | null;
  subject: string;
  body: string;
  trigger_type: 'phase' | 'manual' | 'event';
  is_active: boolean;
  updated_at: string;
};

export type SmsTemplateRow = {
  id: string;
  key: EmailTemplateKey;
  phase: string | null;
  body: string;
  trigger_type: 'phase' | 'manual' | 'event';
  is_active: boolean;
  updated_at: string;
};

export default async function TemplatesPage() {
  await requireAdminAuth();

  const [settings, phaseRes, emailTemplatesRes, smsTemplatesRes] = await Promise.all([
    getSettings(),
    getCurrentPhase(),
    supabaseServer
      .from('email_templates')
      .select('id, key, phase, subject, body, trigger_type, is_active, updated_at')
      .eq('channel', 'email')
      .order('key', { ascending: true }),
    supabaseServer
      .from('email_templates')
      .select('id, key, phase, body, trigger_type, is_active, updated_at')
      .eq('channel', 'sms')
      .order('key', { ascending: true }),
  ]);

  const emailTemplates = (emailTemplatesRes.data ?? []) as EmailTemplateRow[];
  const smsTemplates = (smsTemplatesRes.data ?? []) as SmsTemplateRow[];
  const currentPhase: PhaseName = (phaseRes.data?.current_phase as PhaseName) ?? 'save_the_date';

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-dm-sans text-sm uppercase tracking-[0.3em] text-admin-green">Communications</p>
            <h1 className="mt-2 font-bebas-neue text-4xl tracking-wide text-admin-ink sm:text-5xl">Templates</h1>
            <p className="mt-2 max-w-xl font-dm-sans text-sm text-admin-ink/60">
              Edit what actually sends — email and SMS together. These are the live templates guests receive —
              changes here take effect immediately.
            </p>
          </div>
          <a
            href="/admin/comms"
            className="rounded-full border border-admin-sand/40 px-4 py-2 font-dm-sans text-sm text-admin-ink/80 transition hover:border-admin-green/50 hover:text-admin-green"
          >
            ← Comms
          </a>
        </div>
      </div>

      <TemplatesClient
        emailTemplates={emailTemplates}
        smsTemplates={smsTemplates}
        weddingDate={settings.wedding_date}
        venueName={settings.venue_name}
        currentPhase={currentPhase}
      />
    </div>
  );
}
