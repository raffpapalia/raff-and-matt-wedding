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
        <p className="text-sm text-admin-ink/70">
          🎵{' '}
          {hasArtist && <span className="font-medium text-admin-ink">{artist}</span>}
          {hasArtist && hasSong && <span className="text-admin-ink/50"> — </span>}
          {hasSong && <span>{song}</span>}
          {!hasArtist && !hasSong && <span className="italic text-admin-ink/50">No answer</span>}
        </p>
      );
    } catch {
      return <p className="text-sm text-admin-ink/70">{text}</p>;
    }
  }

  if (type === 'textarea') {
    return (
      <blockquote className="border-l-2 border-admin-sand/60 pl-4 text-sm text-admin-ink/70 italic leading-relaxed">
        {text}
      </blockquote>
    );
  }

  return <p className="text-sm text-admin-ink/70">{text}</p>;
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
      <div className="rounded-3xl border border-admin-sand/20 bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Responses</p>
            <h1 className="mt-2 text-3xl font-semibold text-admin-ink">Custom question responses</h1>
            <p className="mt-2 text-sm text-admin-ink/60">
              Answers grouped by question, newest first.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/api/responses/export"
              className="rounded-full bg-admin-green px-4 py-2 text-sm font-semibold text-admin-bone transition hover:bg-admin-green/90"
            >
              Export CSV
            </a>
            <a
              href="/admin"
              className="rounded-full border border-admin-sand/40 bg-white px-4 py-2 text-sm text-admin-ink/80 transition hover:border-admin-green/40 hover:text-admin-green"
            >
              ← Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Total answers</p>
          <p className="mt-4 text-4xl font-semibold text-admin-ink">{totalAnswers}</p>
        </div>
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-admin-green">Households responded</p>
          <p className="mt-4 text-4xl font-semibold text-admin-ink">{respondedHouseholdIds.size}</p>
        </div>
      </div>

      {/* Questions with their answers */}
      {questions.length === 0 ? (
        <div className="rounded-3xl border border-admin-sand/20 bg-white p-8 text-center text-admin-ink/60">
          No active questions found. Add questions at{' '}
          <a href="/admin/questions" className="underline hover:text-admin-ink transition">
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
                className="overflow-hidden rounded-3xl border border-admin-sand/20 bg-white"
              >
                {/* Question header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-sand/10 px-8 py-5">
                  <h2 className="text-base font-semibold text-admin-ink">{q.question_text}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      qAnswers.length > 0
                        ? 'bg-admin-green/10 text-admin-green'
                        : 'bg-admin-ink/5 text-admin-ink/40'
                    }`}
                  >
                    {qAnswers.length} {qAnswers.length === 1 ? 'response' : 'responses'}
                  </span>
                </div>

                {/* Answers list */}
                {qAnswers.length === 0 ? (
                  <p className="px-8 py-6 text-sm text-admin-ink/50 italic">No responses yet.</p>
                ) : (
                  <ul className="divide-y divide-admin-sand/10">
                    {qAnswers.map(answer => {
                      const guest = guestMap.get(answer.guest_id);
                      const household = guest ? householdMap.get(guest.household_id) : undefined;
                      return (
                        <li key={answer.id} className="px-8 py-5">
                          <p className="mb-2 text-sm">
                            <span className="font-medium text-admin-ink">
                              {household?.name ?? '—'}
                            </span>
                            <span className="mx-1.5 text-admin-ink/40">·</span>
                            <span className="text-admin-ink/60">
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
