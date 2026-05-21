import { supabase, type Household, type Guest, type Phase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import SaveTheDatePhase from './SaveTheDatePhase';

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

    // Fetch guests for this household
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('*')
      .eq('household_id', household.id);

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

    console.log('[DEBUG] All data fetched successfully');

    return {
      household: household as Household,
      guests: (guests || []) as Guest[],
      phase: phase as Phase,
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

  const { household, guests, phase } = data;
  console.log('[DEBUG] Rendering with guest count:', guests.length, 'phase:', phase.current_phase);
  
  const guestName = formatGuestName(guests);

  // For now, only render Save the Date phase
  if (phase.current_phase === 'save_the_date') {
    console.log('[DEBUG] Rendering SaveTheDatePhase');
    return (
      <SaveTheDatePhase
        guestName={guestName}
        personalMessage={household.personal_message}
        personalPhotoUrl={household.personal_photo_url}
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
