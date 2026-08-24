import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, getWebhookSecret } from '@/lib/stripe/client';
import { supabaseServer } from '@/lib/supabase';
import { sendGiftConfirmedEmail } from '@/lib/registry/giftEmail';

const HANDLED_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
] as const;

/**
 * Claims one unit of a capped item.
 *
 * PostgREST can't express `WHERE quantity_claimed < quantity_available` (it has
 * no column-to-column comparison), so this reads the row and writes back with a
 * compare-and-swap on the value it read. If a concurrent webhook incremented in
 * between, the `.eq('quantity_claimed', current)` predicate matches zero rows
 * and we re-read — which is what stops a capped item overselling. Unlimited
 * items (quantity_available NULL) always succeed.
 */
async function claimItem(itemId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: item, error } = await supabaseServer
      .from('registry_items')
      .select('quantity_available, quantity_claimed')
      .eq('id', itemId)
      .maybeSingle();

    if (error || !item) {
      console.error('[registry:webhook] could not read item for claim', itemId, error);
      return;
    }

    if (item.quantity_available !== null && item.quantity_claimed >= item.quantity_available) {
      // Already at its cap. The checkout route should have caught this with a
      // 409, so reaching here means a genuine race — log it, because the money
      // has been taken and the couple needs to know the item was overbooked.
      console.error('[registry:webhook] item already at capacity, not incrementing', itemId);
      return;
    }

    const { data: updated, error: updateError } = await supabaseServer
      .from('registry_items')
      .update({ quantity_claimed: item.quantity_claimed + 1 })
      .eq('id', itemId)
      .eq('quantity_claimed', item.quantity_claimed)
      .select('id');

    if (updateError) {
      console.error('[registry:webhook] item claim update failed', itemId, updateError);
      return;
    }
    if (updated && updated.length > 0) return; // Claimed.
    // Zero rows updated — someone else moved quantity_claimed; retry.
  }
  console.error('[registry:webhook] gave up claiming item after contention', itemId);
}

async function confirmOrder(session: Stripe.Checkout.Session): Promise<void> {
  const { data: order, error } = await supabaseServer
    .from('registry_orders')
    .select('id, status')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle();

  if (error) {
    console.error('[registry:webhook] order lookup failed', session.id, error);
    return;
  }
  if (!order) {
    console.error('[registry:webhook] no order for session', session.id);
    return;
  }
  // Stripe retries deliveries, and checkout.session.completed can be followed by
  // async_payment_succeeded for the same session — so confirming twice must not
  // double-increment quantity_claimed.
  if (order.status === 'confirmed') return;

  const { error: updateError } = await supabaseServer
    .from('registry_orders')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', order.id)
    .neq('status', 'confirmed');

  if (updateError) {
    console.error('[registry:webhook] order confirm failed', order.id, updateError);
    return;
  }

  const { data: lines } = await supabaseServer
    .from('registry_order_items')
    .select('item_id')
    .eq('order_id', order.id);

  // Funds have no stock to track — only rows with an item_id claim a unit.
  for (const line of lines ?? []) {
    if (line.item_id) await claimItem(line.item_id);
  }

  await sendGiftConfirmedEmail(order.id);
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new NextResponse('Missing signature', { status: 400 });
  }

  // A missing secret throws out of getWebhookSecret and 500s, which is the
  // honest answer — it's our misconfiguration, not a bad request from Stripe,
  // and a 500 is what makes Stripe retry once it's fixed. Only a genuine
  // verification failure returns 400.
  const webhookSecret = getWebhookSecret();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[registry:webhook] signature verification failed', err);
    return new NextResponse('Invalid signature', { status: 400 });
  }

  if (!(HANDLED_EVENTS as readonly string[]).includes(event.type)) {
    return new NextResponse('OK', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === 'checkout.session.async_payment_failed') {
    const { error } = await supabaseServer
      .from('registry_orders')
      .update({ status: 'expired' })
      .eq('stripe_checkout_session_id', session.id)
      // A payment that already succeeded must never be walked back by a late
      // failure event for an earlier attempt on the same session.
      .neq('status', 'confirmed');
    if (error) console.error('[registry:webhook] expiring order failed', session.id, error);
    return new NextResponse('OK', { status: 200 });
  }

  // checkout.session.completed also fires for delayed-notification methods like
  // PayTo, where the mandate is authorised but the money hasn't moved yet — in
  // that case payment_status is 'unpaid' and the real outcome arrives later as
  // async_payment_succeeded/failed. Only 'paid' means confirmed.
  if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid') {
    return new NextResponse('OK', { status: 200 });
  }

  await confirmOrder(session);
  return new NextResponse('OK', { status: 200 });
}
