import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { createOrderCheckoutSession } from '@/lib/stripe/checkout';
import {
  createOrder,
  getHouseholdBySlug,
  validateSelections,
  type IncomingBeneficiary,
  type IncomingSelection,
} from '@/lib/registry/orders';

// Creates the registry order, then the Stripe Checkout Session for it.
//
// Order-of-operations matters: the order (and its line items and beneficiaries)
// is written BEFORE the session is created, so that a webhook arriving the
// instant payment completes always finds a row to confirm. The session id is
// then written back onto the order — that column is the webhook's only lookup
// key, so the update failing is treated as fatal rather than ignored.

type CheckoutBody = {
  slug?: string;
  selections?: IncomingSelection[];
  beneficiaries?: IncomingBeneficiary[];
  message?: string;
};

export async function POST(request: NextRequest) {
  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const { slug, selections, beneficiaries, message } = body;

  if (!slug) {
    return NextResponse.json({ message: 'Missing slug' }, { status: 400 });
  }

  const household = await getHouseholdBySlug(slug);
  if (!household) {
    return NextResponse.json({ message: 'We could not find your invitation.' }, { status: 404 });
  }

  // 409 rather than 400: the request was well-formed, it just lost a race with
  // the catalogue changing. The body carries the specific offenders so the page
  // can drop them and let the guest confirm an adjusted tray.
  const validation = await validateSelections(selections ?? []);
  if (!validation.ok) {
    if (validation.invalid.length === 0) {
      return NextResponse.json({ message: 'Please choose at least one gift.' }, { status: 400 });
    }
    return NextResponse.json(
      {
        message: 'Some of your selections are no longer available.',
        invalid: validation.invalid,
      },
      { status: 409 }
    );
  }

  const created = await createOrder({
    submittingHouseholdId: household.id,
    paymentMethod: 'stripe',
    status: 'pending',
    selections: validation.selections,
    total: validation.total,
    beneficiaries,
    message,
  });

  if ('error' in created) {
    return NextResponse.json({ message: 'Failed to create your gift order.' }, { status: 500 });
  }

  let session;
  try {
    session = await createOrderCheckoutSession(created.orderId, validation.selections, slug);
  } catch (err) {
    console.error('[registry:checkout] Stripe session creation failed', err);
    // No session means no way to ever pay this order, so don't leave it sitting
    // 'pending' in the admin log forever.
    await supabaseServer.from('registry_orders').delete().eq('id', created.orderId);
    return NextResponse.json({ message: 'Could not start the payment. Please try again.' }, { status: 502 });
  }

  const { error: updateError } = await supabaseServer
    .from('registry_orders')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', created.orderId);

  if (updateError) {
    console.error('[registry:checkout] failed to store session id', updateError);
    // Without this column the webhook can never match the payment to the order,
    // so fail before the guest is sent to a page where they'd be charged.
    await supabaseServer.from('registry_orders').delete().eq('id', created.orderId);
    return NextResponse.json({ message: 'Could not start the payment. Please try again.' }, { status: 500 });
  }

  if (!session.url) {
    console.error('[registry:checkout] Stripe returned a session with no url', session.id);
    return NextResponse.json({ message: 'Could not start the payment. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
