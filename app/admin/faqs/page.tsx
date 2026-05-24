import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';
import type { Faq } from '@/lib/supabase';
import FaqsClient from './FaqsClient';

export default async function AdminFaqsPage() {
  await requireAdminAuth();

  const { data } = await supabaseServer
    .from('faqs')
    .select('*')
    .order('display_order', { ascending: true });

  const faqs = (data ?? []) as Faq[];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">FAQs</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Frequently Asked Questions</h1>
            <p className="mt-2 text-sm text-slate-400">
              Drag to reorder. Active FAQs appear on the invitation page.
            </p>
          </div>
          <a
            href="/admin/setup"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            ← Setup
          </a>
        </div>
      </div>
      <FaqsClient faqs={faqs} />
    </div>
  );
}
