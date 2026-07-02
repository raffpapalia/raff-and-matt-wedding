import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer, supabase } from '@/lib/supabase';
import type { CustomQuestion } from '@/lib/supabase';
import QuestionsClient from './QuestionsClient';

export default async function AdminQuestionsPage() {
  await requireAdminAuth();

  const [questionsRes, tagsRes] = await Promise.all([
    supabaseServer
      .from('custom_questions')
      .select('*')
      .order('display_order', { ascending: true }),
    supabase.from('guest_tags').select('tag'),
  ]);

  const questions = (questionsRes.data ?? []) as CustomQuestion[];
  const availableTags = Array.from(
    new Set((tagsRes.data ?? []).map((r: { tag: string }) => r.tag).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Questions</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Custom RSVP questions</h1>
            <p className="mt-2 text-sm text-admin-ink/60">
              Drag to reorder. Active questions appear on the RSVP form for matching households.
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
      <QuestionsClient questions={questions} availableTags={availableTags} />
    </div>
  );
}
