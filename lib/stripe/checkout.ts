import type Stripe from 'stripe';
import { getStripe } from './client';

// One line on the guest's checkout page. `name` is carried through from the
// caller rather than re-queried here: app/api/registry/checkout/route.ts has
// already loaded and revalidated every fund/item row to build the order, so a
// second round trip would only risk the two disagreeing.
//
// `amount` is in dollars (matching the NUMERIC(10,2) columns); Stripe wants
// integer cents, so it's converted at the boundary below.
export type CheckoutSelection = {
  type: 'fund' | 'item';
  id: string;
  name: string;
  amount: number;
};

// Cards can't set a full statement_descriptor — only a suffix, which Stripe
// concatenates onto the account's Dashboard prefix as "PREFIX* SUFFIX". The
// complete result must be 5–22 characters, so this 12-character suffix requires
// the Dashboard prefix to be 8 characters or fewer ("MATTRAFF* WEDDING GIFT" is
// exactly 22). If Stripe rejects a session with an invalid-descriptor error,
// shorten the Dashboard prefix rather than this constant.
const STATEMENT_DESCRIPTOR_SUFFIX = 'WEDDING GIFT';

function siteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.EMAIL_LINK_BASE || 'https://www.mattandraff.com';
}

/**
 * Builds the hosted Checkout Session for an already-created registry order.
 *
 * The caller is responsible for storing the returned session's id on the order
 * row (registry_orders.stripe_checkout_session_id) and redirecting the guest to
 * session.url — the webhook looks the order up by that id, so an order whose id
 * never gets stored can never be confirmed.
 *
 * payment_method_types is deliberately NOT set. Current Stripe guidance is to
 * enable payment methods in the Dashboard and let dynamic payment methods decide
 * what to show; PayTo in particular is documented that way. As a result, turning
 * PayTo on later is a Dashboard toggle with no code change — the webhook already
 * handles its asynchronous confirmation events.
 */
export async function createOrderCheckoutSession(
  orderId: string,
  selections: CheckoutSelection[],
  slug: string
): Promise<Stripe.Checkout.Session> {
  if (selections.length === 0) {
    throw new Error(`Cannot create a checkout session for order ${orderId} with no selections`);
  }

  const registryUrl = `${siteBaseUrl()}/invite/${encodeURIComponent(slug)}/registry`;

  // One line item per selection, named for the fund or item itself. Never
  // "donation" or "contribution" — the guest should recognise their own choices
  // on the Stripe page and on their statement.
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = selections.map((selection) => ({
    quantity: 1,
    price_data: {
      currency: 'aud',
      unit_amount: Math.round(selection.amount * 100),
      product_data: { name: selection.name },
    },
  }));

  return getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items,
    // Read back by app/api/registry/webhook/route.ts as a cross-check against
    // the session-id lookup.
    metadata: { orderId },
    payment_intent_data: {
      statement_descriptor_suffix: STATEMENT_DESCRIPTOR_SUFFIX,
      metadata: { orderId },
    },
    success_url: `${registryUrl}?gift=thanks`,
    cancel_url: `${registryUrl}?gift=cancelled`,
  });
}
