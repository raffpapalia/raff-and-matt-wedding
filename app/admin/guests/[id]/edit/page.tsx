import { supabaseServer } from '@/lib/supabase';
import EditHouseholdForm from './EditHouseholdForm';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: household } = await supabaseServer.from('households').select('*').eq('id', id).single();
  const { data: tags } = await supabaseServer.from('guest_tags').select('tag').eq('household_id', id);
  const { data: guests } = await supabaseServer.from('guests').select('*').eq('household_id', id).order('display_order', { ascending: true });
  const { data: householdList } = await supabaseServer.from('households').select('id,name').order('name', { ascending: true });

  const initial = {
    ...household,
    tags: Array.isArray(tags) ? tags.map((t: any) => t.tag) : [],
    guests: Array.isArray(guests) ? guests : [],
  };

  const list = householdList ?? [];
  const currentIndex = list.findIndex((h) => h.id === id);
  const prevHousehold = currentIndex > 0 ? list[currentIndex - 1] : null;
  const nextHousehold = currentIndex >= 0 && currentIndex < list.length - 1 ? list[currentIndex + 1] : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Household</h1>
      <EditHouseholdForm initial={initial} prevHousehold={prevHousehold} nextHousehold={nextHousehold} />
    </div>
  );
}
