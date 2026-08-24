import { supabaseServer } from '@/lib/supabase';
import { sendHouseholdEmail } from '@/lib/email/sendEmail';

// Called once an order is genuinely confirmed — by Stripe's webhook (card) or
// an admin marking a bank transfer received (app/admin/api/registry/orders/[id]).
// Never thrown from: a failed/skipped email must not fail the caller, since by
// the time this runs the money has already moved and that's the real event.
export async function sendGiftConfirmedEmail(orderId: string): Promise<void> {
  try {
    const { data: order } = await supabaseServer
      .from('registry_orders')
      .select('submitting_household_id, total_amount')
      .eq('id', orderId)
      .maybeSingle();

    // No submitting household (deleted since, or never set) means nowhere to send.
    if (!order?.submitting_household_id) return;

    const { data: lines } = await supabaseServer
      .from('registry_order_items')
      .select('fund_id, item_id, amount')
      .eq('order_id', orderId);

    const fundIds = (lines ?? []).map(l => l.fund_id).filter((v): v is string => Boolean(v));
    const itemIds = (lines ?? []).map(l => l.item_id).filter((v): v is string => Boolean(v));

    const [fundsRes, itemsRes] = await Promise.all([
      fundIds.length ? supabaseServer.from('registry_funds').select('id, name').in('id', fundIds) : Promise.resolve({ data: [] }),
      itemIds.length ? supabaseServer.from('registry_items').select('id, name').in('id', itemIds) : Promise.resolve({ data: [] }),
    ]);

    const fundMap = new Map((fundsRes.data ?? []).map((f: { id: string; name: string }) => [f.id, f.name]));
    const itemMap = new Map((itemsRes.data ?? []).map((i: { id: string; name: string }) => [i.id, i.name]));

    const names = (lines ?? []).map(line =>
      line.fund_id ? fundMap.get(line.fund_id) ?? 'a fund' : line.item_id ? itemMap.get(line.item_id) ?? 'a gift' : 'a gift'
    );
    // De-duped so a fund appearing on two lines (shouldn't happen, but the schema
    // allows it) doesn't read as "Honeymoon, Honeymoon" in the email.
    const giftSummary = Array.from(new Set(names)).join(', ') || 'your gift';

    const giftTotal = Number(order.total_amount).toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    await sendHouseholdEmail(order.submitting_household_id, 'registry_gift_confirmed', 'thank_you', 'all', undefined, {
      gift_summary: giftSummary,
      gift_total: giftTotal,
    });
  } catch (err) {
    console.error('[registry:giftEmail] failed to send gift-confirmed email', orderId, err);
  }
}
