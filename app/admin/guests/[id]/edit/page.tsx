import { supabaseServer } from '@/lib/supabase';
import EditHouseholdForm from './EditHouseholdForm';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: household, error: householdError } = await supabaseServer.from('households').select('*').eq('id', id).single();
  const { data: tags, error: tagsError } = await supabaseServer.from('guest_tags').select('tag').eq('household_id', id);
  const { data: guests, error: guestsError } = await supabaseServer.from('guests').select('*').eq('household_id', id).order('first_name', { ascending: true });

  const initial = {
    ...household,
    tags: Array.isArray(tags) ? tags.map((t: any) => t.tag) : [],
    guests: Array.isArray(guests) ? guests : [],
  };

  console.log('[admin/guests/[id]/edit] fetched initial household data', {
    id,
    household,
    householdError,
    tags,
    tagsError,
    guests,
    guestsError,
    initial,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Household</h1>
      <EditHouseholdForm initial={initial} />
    </div>
  );
}
