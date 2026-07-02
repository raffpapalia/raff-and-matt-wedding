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
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">FAQs</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Frequently Asked Questions</h1>
            <p className="mt-2 text-sm text-admin-ink/60">
              Drag to reorder. Active FAQs appear on the invitation page.
            </p>
          </div>
          <a
            href="/admin/setup"
            className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
          >
            ← Setup
          </a>
        </div>
      </div>
      <FaqsClient faqs={faqs} />
    </div>
  );
}
