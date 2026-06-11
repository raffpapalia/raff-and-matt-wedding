import { requireAdminAuth } from '@/lib/adminAuth';
import { supabase, supabaseServer } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CommsDetailClient from './CommsDetailClient';
import { TEMPLATE_KEYS, DEFAULT_TEMPLATES, type TemplateKey } from '../templates/page';

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
};

export default async function CommsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAuth();
  const { id } = await params;

  const settingsKeys = [...(TEMPLATE_KEYS as readonly string[]), 'wedding_date', 'venue_name'];

  const [householdRes, guestsRes, commsRes, tagsRes, settingsRes] = await Promise.all([
    supabase.from('households').select('id,name,slug').eq('id', id).single(),
    supabase
      .from('guests')
      .select('id,first_name,last_name,email,mobile,comms_email,comms_sms,rsvp_status')
      .eq('household_id', id)
      .order('is_child', { ascending: true })
      .order('first_name', { ascending: true }),
    supabaseServer
      .from('communications')
      .select('id,type,message,status,sent_at')
      .eq('household_id', id)
      .order('sent_at', { ascending: false }),
    supabase.from('guest_tags').select('tag').eq('household_id', id),
    supabaseServer.from('settings').select('key,value').in('key', settingsKeys),
  ]);

  if (!householdRes.data) notFound();

  const household = householdRes.data;
  const guests: DetailGuest[] = (guestsRes.data ?? []) as DetailGuest[];
  const comms: DetailComm[] = (commsRes.data ?? []) as DetailComm[];
  const tags = (tagsRes.data ?? []).map((t: { tag: string }) => t.tag);

  const settingsMap = Object.fromEntries(
    (settingsRes.data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value])
  );

  const templates = Object.fromEntries(
    TEMPLATE_KEYS.map((key) => [key, (settingsMap[key] as string) ?? DEFAULT_TEMPLATES[key]])
  ) as Record<TemplateKey, string>;

  const weddingDate = (settingsMap['wedding_date'] as string) ?? '';
  const venueName = (settingsMap['venue_name'] as string) ?? '';

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

      <CommsDetailClient
        householdId={household.id}
        householdName={household.name}
        householdSlug={household.slug}
        guests={guests}
        comms={comms}
        templates={templates}
        weddingDate={weddingDate}
        venueName={venueName}
      />
    </div>
  );
}
