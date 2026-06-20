import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer, getSettings } from '@/lib/supabase';
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

export default async function TemplatesPage() {
  await requireAdminAuth();

  const [settings, emailTemplatesRes] = await Promise.all([
    getSettings(),
    supabaseServer
      .from('email_templates')
      .select('id, key, phase, subject, body, trigger_type, is_active, updated_at')
      .order('key', { ascending: true }),
  ]);

  const emailTemplates = (emailTemplatesRes.data ?? []) as EmailTemplateRow[];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-cream/10 bg-dark-green p-8 shadow-lg shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-dm-sans text-sm uppercase tracking-[0.3em] text-accent-gold/80">Communications</p>
            <h1 className="mt-2 font-bebas-neue text-4xl tracking-wide text-cream sm:text-5xl">Email Templates</h1>
            <p className="mt-2 max-w-xl font-dm-sans text-sm text-cream/60">
              Edit what actually sends. These are the live templates guests receive — changes here take effect
              immediately.
            </p>
          </div>
          <a
            href="/admin/comms"
            className="rounded-full border border-cream/15 px-4 py-2 font-dm-sans text-sm text-cream/80 transition hover:border-accent-gold/50 hover:text-accent-gold"
          >
            ← Comms
          </a>
        </div>
      </div>

      <TemplatesClient
        templates={emailTemplates}
        weddingDate={settings.wedding_date}
        venueName={settings.venue_name}
      />
    </div>
  );
}
