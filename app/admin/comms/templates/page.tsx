import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer, getSettings } from '@/lib/supabase';
import TemplatesClient from './TemplatesClient';

export const TEMPLATE_KEYS = [
  'tmpl_sms_save_the_date',
  'tmpl_email_save_the_date_subject',
  'tmpl_email_save_the_date_body',
  'tmpl_sms_rsvp_reminder',
  'tmpl_sms_rsvp_confirmation',
  'tmpl_email_rsvp_confirmation_subject',
  'tmpl_email_rsvp_confirmation_body',
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  tmpl_sms_save_the_date:
    "Hi {{first_name}}! Save the date — Matt & Raff are getting married on {{wedding_date}} at {{venue}}. We'd love you to join us. Full invitation coming soon.",
  tmpl_email_save_the_date_subject: "Save the Date — Matt & Raff are getting married!",
  tmpl_email_save_the_date_body:
    "Hi {{first_name}},\n\nWe're so excited to share our big news — we're getting married!\n\n📅 Date: {{wedding_date}}\n📍 Venue: {{venue}}\n\nSave the date and stay tuned for your official invitation.\n\nWith love,\nMatt & Raff",
  tmpl_sms_rsvp_reminder:
    "Hi {{first_name}}, just a gentle reminder to RSVP for Matt & Raff's wedding. Click here: {{invite_link}}",
  tmpl_sms_rsvp_confirmation:
    "Hi {{first_name}}, thanks for RSVPing to Matt & Raff's wedding! We can't wait to celebrate with you on {{wedding_date}} 🥂",
  tmpl_email_rsvp_confirmation_subject: "You're confirmed for Matt & Raff's wedding!",
  tmpl_email_rsvp_confirmation_body:
    "Hi {{first_name}},\n\nThank you for RSVPing — we're so happy you'll be joining us!\n\n📅 Date: {{wedding_date}}\n📍 Venue: {{venue}}\n\nWe'll be in touch with more details as the big day approaches.\n\nWith love,\nMatt & Raff",
};

export default async function TemplatesPage() {
  await requireAdminAuth();

  const [settings, templateData] = await Promise.all([
    getSettings(),
    supabaseServer
      .from('settings')
      .select('key, value')
      .in('key', TEMPLATE_KEYS as unknown as string[]),
  ]);

  const saved = Object.fromEntries(
    (templateData.data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value])
  );

  const templates = Object.fromEntries(
    TEMPLATE_KEYS.map((key) => [key, (saved[key] as string) ?? DEFAULT_TEMPLATES[key]])
  ) as Record<TemplateKey, string>;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Communications</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Message templates</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Templates pre-fill messages when sending from the comms dashboard. Use merge tags for
              personalisation.
            </p>
          </div>
          <a
            href="/admin/comms"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            ← Comms
          </a>
        </div>
      </div>

      <TemplatesClient
        templates={templates}
        weddingDate={settings.wedding_date}
        venueName={settings.venue_name}
      />
    </div>
  );
}
