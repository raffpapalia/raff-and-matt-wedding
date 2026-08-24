import { supabaseServer } from '@/lib/supabase';
import { getShortLink } from '@/lib/shortLink';
import EditHouseholdForm from './EditHouseholdForm';

export type GiftReceived = {
  orderId: string;
  date: string;
  lines: { label: string; amount: number }[];
  total: number;
  beneficiaries: string[];
  message: string | null;
};

// A household can show up on a registry order two ways — as the submitter, or
// tagged as a beneficiary (someone paid on their behalf, or a joint gift) — so
// both are unioned. Only 'confirmed'/'manual_received' count: the couple is
// writing thank-yous off money that has actually landed, not a pending intent.
async function getGiftsReceived(householdId: string): Promise<GiftReceived[]> {
  const [submittedRes, beneficiaryRes] = await Promise.all([
    supabaseServer.from('registry_orders').select('id').eq('submitting_household_id', householdId),
    supabaseServer.from('registry_order_beneficiaries').select('order_id').eq('household_id', householdId),
  ]);

  const orderIds = Array.from(
    new Set([...(submittedRes.data ?? []).map(o => o.id), ...(beneficiaryRes.data ?? []).map(b => b.order_id)])
  );
  if (orderIds.length === 0) return [];

  const ordersRes = await supabaseServer
    .from('registry_orders')
    .select('id, created_at, confirmed_at, total_amount, message, status')
    .in('id', orderIds)
    .in('status', ['confirmed', 'manual_received']);

  const receivedOrders = ordersRes.data ?? [];
  if (receivedOrders.length === 0) return [];
  const receivedIds = receivedOrders.map(o => o.id);

  const [lineRes, allBeneficiariesRes] = await Promise.all([
    supabaseServer.from('registry_order_items').select('order_id, fund_id, item_id, amount').in('order_id', receivedIds),
    supabaseServer.from('registry_order_beneficiaries').select('order_id, household_id, guest_name_freetext').in('order_id', receivedIds),
  ]);

  const fundIds = (lineRes.data ?? []).map(l => l.fund_id).filter((v): v is string => Boolean(v));
  const itemIds = (lineRes.data ?? []).map(l => l.item_id).filter((v): v is string => Boolean(v));
  const beneficiaryHouseholdIds = (allBeneficiariesRes.data ?? [])
    .map(b => b.household_id)
    .filter((v): v is string => Boolean(v));

  const [fundsRes, itemsRes, householdsRes] = await Promise.all([
    fundIds.length ? supabaseServer.from('registry_funds').select('id, name').in('id', fundIds) : Promise.resolve({ data: [] }),
    itemIds.length ? supabaseServer.from('registry_items').select('id, name').in('id', itemIds) : Promise.resolve({ data: [] }),
    beneficiaryHouseholdIds.length
      ? supabaseServer.from('households').select('id, name').in('id', beneficiaryHouseholdIds)
      : Promise.resolve({ data: [] }),
  ]);

  const fundMap = new Map((fundsRes.data ?? []).map((f: { id: string; name: string }) => [f.id, f.name]));
  const itemMap = new Map((itemsRes.data ?? []).map((i: { id: string; name: string }) => [i.id, i.name]));
  const householdMap = new Map(
    (householdsRes.data ?? []).map((h: { id: string; name: string }) => [h.id, h.name])
  );

  const linesByOrder = new Map<string, { label: string; amount: number }[]>();
  for (const line of lineRes.data ?? []) {
    const label = line.fund_id
      ? fundMap.get(line.fund_id) ?? 'Deleted fund'
      : line.item_id
      ? itemMap.get(line.item_id) ?? 'Deleted item'
      : 'Unknown';
    const list = linesByOrder.get(line.order_id) ?? [];
    list.push({ label, amount: Number(line.amount) });
    linesByOrder.set(line.order_id, list);
  }

  const beneficiariesByOrder = new Map<string, string[]>();
  for (const b of allBeneficiariesRes.data ?? []) {
    const name = b.household_id ? householdMap.get(b.household_id) ?? 'Deleted household' : b.guest_name_freetext ?? '';
    if (!name) continue;
    const list = beneficiariesByOrder.get(b.order_id) ?? [];
    list.push(name);
    beneficiariesByOrder.set(b.order_id, list);
  }

  return receivedOrders
    .map(order => ({
      orderId: order.id,
      date: order.confirmed_at ?? order.created_at,
      lines: linesByOrder.get(order.id) ?? [],
      total: Number(order.total_amount),
      beneficiaries: beneficiariesByOrder.get(order.id) ?? [],
      message: order.message,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: household } = await supabaseServer.from('households').select('*').eq('id', id).single();
  const { data: tags } = await supabaseServer.from('guest_tags').select('tag').eq('household_id', id);
  const { data: guests } = await supabaseServer.from('guests').select('*').eq('household_id', id).order('display_order', { ascending: true });
  const { data: householdList } = await supabaseServer.from('households').select('id,name').order('name', { ascending: true });
  const giftsReceived = await getGiftsReceived(id);

  const shortLink = household?.short_code ? getShortLink(household) : null;

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
      <EditHouseholdForm
        initial={initial}
        prevHousehold={prevHousehold}
        nextHousehold={nextHousehold}
        shortLink={shortLink}
        giftsReceived={giftsReceived}
      />
    </div>
  );
}
