import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Answer = {
  id: string;
  question_id: string;
  guest_id: string;
  answer_text: string;
  created_at: string;
};

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  display_order: number;
  is_active: boolean;
};

type Guest = {
  id: string;
  first_name: string;
  last_name: string;
  household_id: string;
};

type Household = {
  id: string;
  name: string;
};

// ─── Answer display ───────────────────────────────────────────────────────────

function AnswerDisplay({ type, text }: { type: string; text: string }) {
  if (type === 'song') {
    try {
      const { artist, song } = JSON.parse(text);
      const hasArtist = artist?.trim();
      const hasSong = song?.trim();
      return (
        <p className="text-sm text-slate-300">
          🎵{' '}
          {hasArtist && <span className="font-medium text-white">{artist}</span>}
          {hasArtist && hasSong && <span className="text-slate-500"> — </span>}
          {hasSong && <span>{song}</span>}
          {!hasArtist && !hasSong && <span className="italic text-slate-500">No answer</span>}
        </p>
      );
    } catch {
      return <p className="text-sm text-slate-300">{text}</p>;
    }
  }

  if (type === 'textarea') {
    return (
      <blockquote className="border-l-2 border-[#D4A83A]/40 pl-4 text-sm text-slate-300 italic leading-relaxed">
        {text}
      </blockquote>
    );
  }

  return <p className="text-sm text-slate-300">{text}</p>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminResponsesPage() {
  await requireAdminAuth();

  const [answersRes, questionsRes, guestsRes, householdsRes] = await Promise.all([
    supabaseServer
      .from('custom_answers')
      .select('*')
      .order('created_at', { ascending: false }),
    supabaseServer
      .from('custom_questions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabaseServer.from('guests').select('id,first_name,last_name,household_id'),
    supabaseServer.from('households').select('id,name'),
  ]);

  const answers = (answersRes.data ?? []) as Answer[];
  const questions = (questionsRes.data ?? []) as Question[];
  const guests = (guestsRes.data ?? []) as Guest[];
  const households = (householdsRes.data ?? []) as Household[];

  // Lookup maps
  const guestMap = new Map(guests.map(g => [g.id, g]));
  const householdMap = new Map(households.map(h => [h.id, h]));

  // Group answers by question_id, preserving newest-first order
  const answersByQuestion = new Map<string, Answer[]>();
  for (const answer of answers) {
    const bucket = answersByQuestion.get(answer.question_id) ?? [];
    bucket.push(answer);
    answersByQuestion.set(answer.question_id, bucket);
  }

  // Stats
  const totalAnswers = answers.length;
  const respondedHouseholdIds = new Set(
    answers
      .map(a => guestMap.get(a.guest_id)?.household_id)
      .filter((id): id is string => !!id)
  );

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Responses</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Custom question responses</h1>
            <p className="mt-2 text-sm text-slate-400">
              Answers grouped by question, newest first.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/api/responses/export"
              className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              Export CSV
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

      {/* Stats bar */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Total answers</p>
          <p className="mt-4 text-4xl font-semibold text-white">{totalAnswers}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Households responded</p>
          <p className="mt-4 text-4xl font-semibold text-white">{respondedHouseholdIds.size}</p>
        </div>
      </div>

      {/* Questions with their answers */}
      {questions.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
          No active questions found. Add questions at{' '}
          <a href="/admin/questions" className="underline hover:text-white transition">
            /admin/questions
          </a>
          .
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map(q => {
            const qAnswers = answersByQuestion.get(q.id) ?? [];
            return (
              <div
                key={q.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-slate-950/20 backdrop-blur-xl"
              >
                {/* Question header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-8 py-5">
                  <h2 className="text-base font-semibold text-white">{q.question_text}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      qAnswers.length > 0
                        ? 'bg-emerald-400/10 text-emerald-300'
                        : 'bg-white/5 text-slate-500'
                    }`}
                  >
                    {qAnswers.length} {qAnswers.length === 1 ? 'response' : 'responses'}
                  </span>
                </div>

                {/* Answers list */}
                {qAnswers.length === 0 ? (
                  <p className="px-8 py-6 text-sm text-slate-500 italic">No responses yet.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {qAnswers.map(answer => {
                      const guest = guestMap.get(answer.guest_id);
                      const household = guest ? householdMap.get(guest.household_id) : undefined;
                      return (
                        <li key={answer.id} className="px-8 py-5">
                          <p className="mb-2 text-sm">
                            <span className="font-medium text-white">
                              {household?.name ?? '—'}
                            </span>
                            <span className="mx-1.5 text-slate-600">·</span>
                            <span className="text-slate-400">
                              {guest ? `${guest.first_name} ${guest.last_name}` : '—'}
                            </span>
                          </p>
                          <AnswerDisplay type={q.question_type} text={answer.answer_text} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
