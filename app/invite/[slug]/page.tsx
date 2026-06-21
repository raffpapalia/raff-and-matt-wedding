import { supabase, supabaseServer, getSettings, type Household, type Guest, type Phase, type CustomQuestion, type CustomAnswer, type Faq } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import SaveTheDatePhase from './SaveTheDatePhase';
import RSVPPhase from './RSVPPhase';
import InvitationPhase from './InvitationPhase';
import ThankYouPhase from './ThankYouPhase';

export const revalidate = 0; // ISR with on-demand revalidation

async function getInviteData(slug: string) {
  try {
    // TIER 1 — no dependencies, fire immediately
    // supabaseServer bypasses RLS for faqs — needed because that table has no anon-read policy
    const [settings, faqsRes, phaseRes, questionsRes, householdRes] = await Promise.all([
      getSettings(),
      supabaseServer
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('phases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('custom_questions')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('households')
        .select('*')
        .eq('slug', slug)
        .single(),
    ]);

    const { data: household, error: householdError } = householdRes;
    if (householdError || !household) {
      return null;
    }

    const { data: phase, error: phaseError } = phaseRes;
    if (phaseError) {
      console.error('Error fetching phase:', phaseError);
      return null;
    }

    const faqs = (faqsRes.data ?? []) as Faq[];
    const allQuestions = questionsRes.data;

    // TIER 2 — depends only on household.id
    const [guestsRes, tagsRes] = await Promise.all([
      supabase
        .from('guests')
        .select('*')
        .eq('household_id', household.id)
        .order('display_order', { ascending: true }),
      supabase
        .from('guest_tags')
        .select('tag')
        .eq('household_id', household.id),
    ]);

    // Track invite link open — fire and forget, result is never used downstream.
    // Supabase query builders are lazy thenables: the request only fires once `.then()`
    // is called, so this still needs a `.then()` even though we don't await it.
    supabaseServer
      .from('households')
      .update({
        link_open_count: (household.link_open_count || 0) + 1,
        link_first_opened_at: household.link_first_opened_at || new Date().toISOString(),
      })
      .eq('id', household.id)
      .then(({ error }) => {
        if (error) console.error('Error updating link_open_count:', error);
      });

    const { data: guests, error: guestsError } = guestsRes;
    if (guestsError) {
      console.error('Error fetching guests:', guestsError);
      return null;
    }

    const tagRows = tagsRes.data;
    const householdTags = (tagRows ?? []).map((r: { tag: string }) => r.tag);

    // Filter custom questions to those targeting this household
    const questions = ((allQuestions ?? []) as CustomQuestion[]).filter(q =>
      !q.target_tags || q.target_tags.length === 0 ||
      q.target_tags.some(tag => householdTags.includes(tag))
    );

    // TIER 3 — depends on guests result
    const guestIds = (guests ?? []).map(g => g.id);
    let existingAnswers: CustomAnswer[] = [];
    if (guestIds.length > 0) {
      const { data: answersData } = await supabase
        .from('custom_answers')
        .select('*')
        .in('guest_id', guestIds);
      existingAnswers = (answersData ?? []) as CustomAnswer[];
    }

    return {
      household: household as Household,
      guests: (guests || []) as Guest[],
      phase: phase as Phase,
      questions,
      existingAnswers,
      settings,
      faqs,
    };
  } catch (error) {
    console.error('Error in getInviteData:', error);
    return null;
  }
}

function formatGuestNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function formatGuestName(guests: Guest[]): string {
  if (guests.length === 0) return '';
  return formatGuestNames(guests.map((g) => g.first_name));
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getInviteData(slug);

  if (!data) {
    notFound();
  }

  const { household, guests, phase, questions, existingAnswers, settings, faqs } = data;

  const guestName = formatGuestName(guests) || household.name;

  if (phase.current_phase === 'save_the_date') {
    return (
      <SaveTheDatePhase
        guestName={guestName}
        coupleNames={settings.couple_names}
        tagline={settings.tagline}
        invitationFooter={settings.save_the_date_footer}
        weddingDate={settings.wedding_date}
        weddingLocation={settings.location}
        settings={settings}
      />
    );
  }

  if (phase.current_phase === 'invitation') {
    return (
      <InvitationPhase
        household={household}
        guests={guests}
        settings={settings}
        questions={questions}
        existingAnswers={existingAnswers}
        guestName={guestName}
        faqs={faqs}
        weddingSchedule={settings.wedding_schedule}
        sectionOrder={settings.section_order}
        currentPhase={phase.current_phase}
      />
    );
  }

  if (phase.current_phase === 'thank_you') {
    return (
      <ThankYouPhase
        household={household}
        guests={guests}
        settings={settings}
      />
    );
  }

  // Placeholder for other phases
  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <p className="text-white">Phase: {phase.current_phase}</p>
    </div>
  );
}
