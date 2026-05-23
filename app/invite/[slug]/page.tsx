import { supabase, supabaseServer, getSettings, type Household, type Guest, type Phase, type CustomQuestion, type CustomAnswer } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import SaveTheDatePhase from './SaveTheDatePhase';
import RSVPPhase from './RSVPPhase';
import InvitationPhase from './InvitationPhase';

export const revalidate = 0; // ISR with on-demand revalidation

async function getInviteData(slug: string) {
  try {
    console.log('[DEBUG] getInviteData called with slug:', slug);

    // Fetch household by slug
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('*')
      .eq('slug', slug)
      .single();

    console.log('[DEBUG] Household query result:', { household, error: householdError });

    if (householdError || !household) {
      console.error('[DEBUG] Household not found or error occurred');
      return null;
    }

    // Track invite link open
    await supabaseServer
      .from('households')
      .update({
        link_open_count: (household.link_open_count || 0) + 1,
        link_first_opened_at: household.link_first_opened_at || new Date().toISOString(),
      })
      .eq('id', household.id);

    // Fetch guests for this household
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('*')
      .eq('household_id', household.id)
      .order('display_order', { ascending: true });

    console.log('[DEBUG] Guests query result:', { guestsCount: guests?.length, error: guestsError });

    if (guestsError) {
      console.error('Error fetching guests:', guestsError);
      return null;
    }

    // Fetch current phase
    const { data: phase, error: phaseError } = await supabase
      .from('phases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('[DEBUG] Phase query result:', { phase, error: phaseError });

    if (phaseError) {
      console.error('Error fetching phase:', phaseError);
      return null;
    }

    // Fetch household tags for question filtering
    const { data: tagRows } = await supabase
      .from('guest_tags')
      .select('tag')
      .eq('household_id', household.id);
    const householdTags = (tagRows ?? []).map((r: { tag: string }) => r.tag);

    // Fetch active custom questions and filter to those targeting this household
    const { data: allQuestions } = await supabase
      .from('custom_questions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    const questions = ((allQuestions ?? []) as CustomQuestion[]).filter(q =>
      !q.target_tags || q.target_tags.length === 0 ||
      q.target_tags.some(tag => householdTags.includes(tag))
    );

    // Fetch existing answers for all guests in this household (for returning visitors)
    const guestIds = (guests ?? []).map(g => g.id);
    let existingAnswers: CustomAnswer[] = [];
    if (guestIds.length > 0) {
      const { data: answersData } = await supabase
        .from('custom_answers')
        .select('*')
        .in('guest_id', guestIds);
      existingAnswers = (answersData ?? []) as CustomAnswer[];
    }

    // Fetch settings
    const settings = await getSettings();

    console.log('[DEBUG] All data fetched successfully');

    return {
      household: household as Household,
      guests: (guests || []) as Guest[],
      phase: phase as Phase,
      questions,
      existingAnswers,
      settings,
    };
  } catch (error) {
    console.error('[DEBUG] Exception in getInviteData:', error);
    return null;
  }
}

function formatGuestName(guests: Guest[]): string {
  if (guests.length === 0) return '';
  if (guests.length === 1) {
    return `${guests[0].first_name}`;
  }
  // For couples/multiple guests, show first names
  const names = guests.map((g) => g.first_name);
  return names.join(' & ');
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  console.log('[DEBUG] InvitePage rendering for slug:', slug);
  
  const data = await getInviteData(slug);
  console.log('[DEBUG] InvitePage received data:', !!data);

  if (!data) {
    console.log('[DEBUG] No data returned, showing 404');
    notFound();
  }

  const { household, guests, phase, questions, existingAnswers, settings } = data;
  console.log('[DEBUG] Rendering with guest count:', guests.length, 'phase:', phase.current_phase);

  const guestName = formatGuestName(guests) || household.name;

  if (phase.current_phase === 'save_the_date') {
    console.log('[DEBUG] Rendering SaveTheDatePhase');
    return (
      <SaveTheDatePhase
        guestName={guestName}
        personalMessage={household.personal_message}
        personalPhotoUrl={household.personal_photo_url}
        coupleNames={settings.couple_names}
        tagline={settings.tagline}
        invitationFooter={settings.invitation_footer}
        weddingDate={settings.wedding_date}
        weddingLocation={settings.location}
      />
    );
  }

  if (phase.current_phase === 'invitation') {
    console.log('[DEBUG] Rendering InvitationPhase');
    return (
      <InvitationPhase
        household={household}
        guests={guests}
        settings={settings}
        questions={questions}
        existingAnswers={existingAnswers}
        guestName={guestName}
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
