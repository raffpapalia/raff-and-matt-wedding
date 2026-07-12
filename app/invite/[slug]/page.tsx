import { supabase, supabaseServer, getSettings, type Household, type Guest, type Phase, type PhaseName, type CustomQuestion, type CustomAnswer, type Faq } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import PreviewBanner from './PreviewBanner';

const SaveTheDatePhase = dynamic(() => import('./SaveTheDatePhase'));
const InvitationPhaseV4 = dynamic(() => import('./InvitationPhaseV4'));
const PreWeddingPhase = dynamic(() => import('./PreWeddingPhase'));
const ThankYouPhase = dynamic(() => import('./ThankYouPhase'));

export const revalidate = 0; // ISR with on-demand revalidation

const PREVIEWABLE_PHASES: readonly PhaseName[] = ['save_the_date', 'invitation', 'pre_wedding', 'thank_you'];

// Admin-only, read-only override: lets an admin force ?preview=<phase> on a real
// household's invite URL to see how any phase renders for that household, without
// touching the phases table or affecting what the guest themselves sees. Returns
// null (real phase wins) unless the request is admin-authenticated AND the param
// is one of the four known phase values — guests passing this param are always
// ignored, since isAdminAuthenticated() reads the same httpOnly admin cookie the
// /admin routes already gate on.
async function resolvePreviewPhase(rawPreview: string | undefined): Promise<PhaseName | null> {
  if (!rawPreview || !PREVIEWABLE_PHASES.includes(rawPreview as PhaseName)) {
    return null;
  }
  if (!(await isAdminAuthenticated())) {
    return null;
  }
  return rawPreview as PhaseName;
}

async function getInviteData(slug: string, isPreview = false) {
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

    // Track invite link open — skipped for admin preview requests so they don't
    // inflate the household's view count.
    if (!isPreview) {
      const now = new Date().toISOString();
      supabaseServer
        .from('households')
        .update({
          link_open_count: (household.link_open_count || 0) + 1,
          link_first_opened_at: household.link_first_opened_at || now,
          link_last_opened_at: now,
        })
        .eq('id', household.id)
        .then(({ error }) => {
          if (error) console.error('Error updating link_open_count:', error);
        });
    }

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview: rawPreview } = (await searchParams) ?? {};

  // Resolve preview before fetching data so we can skip tracking for admin previews.
  const previewPhase = await resolvePreviewPhase(rawPreview);
  const data = await getInviteData(slug, previewPhase !== null);

  if (!data) {
    notFound();
  }

  const { household, guests, phase, questions, existingAnswers, settings, faqs } = data;

  const guestName = formatGuestName(guests) || household.name;
  const effectivePhase: PhaseName = previewPhase ?? phase.current_phase;

  let phaseContent: React.ReactNode;

  if (effectivePhase === 'save_the_date') {
    phaseContent = (
      <SaveTheDatePhase
        coupleNames={settings.couple_names}
        tagline={settings.tagline}
        weddingDate={settings.wedding_date}
        weddingLocation={settings.location}
        couplePhotoUrl={settings.couple_photo_url || ''}
        guestName={guestName}
        settings={settings}
      />
    );
  } else if (effectivePhase === 'invitation') {
    phaseContent = (
      <InvitationPhaseV4
        household={household}
        guests={guests}
        settings={settings}
        questions={questions}
        existingAnswers={existingAnswers}
        faqs={faqs}
        coupleNames={settings.couple_names}
        couplePhotoUrl={settings.couple_photo_url || ''}
        weddingSchedule={settings.wedding_schedule}
        sectionOrder={settings.section_order}
        currentPhase={effectivePhase}
        guestName={guestName}
      />
    );
  } else if (effectivePhase === 'pre_wedding') {
    phaseContent = (
      <PreWeddingPhase
        household={household}
        guests={guests}
        settings={settings}
        coupleNames={settings.couple_names}
        couplePhotoUrl={settings.couple_photo_url || ''}
        faqs={faqs}
        weddingSchedule={settings.wedding_schedule}
        sectionOrder={settings.section_order}
        currentPhase={effectivePhase}
      />
    );
  } else if (effectivePhase === 'thank_you') {
    phaseContent = (
      <ThankYouPhase
        household={household}
        guests={guests}
        settings={settings}
      />
    );
  } else {
    // Placeholder for other phases
    phaseContent = (
      <div className="flex items-center justify-center h-screen bg-black">
        <p className="text-white">Phase: {effectivePhase}</p>
      </div>
    );
  }

  return (
    <>
      {previewPhase && <PreviewBanner phase={previewPhase} />}
      {phaseContent}
    </>
  );
}
