import { supabaseServer } from '@/lib/supabase';
import type { RegistryPaymentMethod, RegistryOrderStatus } from '@/lib/supabase';
import type { CheckoutSelection } from '@/lib/stripe/checkout';
import { resolveHouseholdRefs } from './beneficiaryRef';

// Shared by app/api/registry/checkout and app/api/registry/contribute-manual —
// both accept the same request body and build the same three rows sets, and
// differ only in what happens after the order exists (Stripe session vs PayID
// reference code).

export type IncomingSelection = { type: 'fund' | 'item'; id: string; amount?: number };
// householdRef is the opaque HMAC handed out by /api/registry/household-search,
// never a raw households.id — see lib/registry/beneficiaryRef.ts.
export type IncomingBeneficiary = { householdRef?: string; freetextName?: string };

export type InvalidReason = 'not_found' | 'inactive' | 'sold_out' | 'invalid_amount' | 'duplicate';
export type InvalidSelection = { type: 'fund' | 'item'; id: string; name: string | null; reason: InvalidReason };

export type ValidationResult =
  | { ok: true; selections: CheckoutSelection[]; total: number }
  | { ok: false; invalid: InvalidSelection[] };

// Stripe rejects AUD charges under $0.50; $1 is a friendlier floor to state to a
// guest. The ceiling is a typo guard (a stray keystroke turning $50 into $50000),
// not a policy — raise it if anyone ever legitimately hits it.
const MIN_FUND_AMOUNT = 1;
const MAX_FUND_AMOUNT = 100000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Re-checks every selection against the live catalogue.
 *
 * This runs at checkout time, not just at page load, because the guest may have
 * had the registry open for a while: an item can sell out or be deactivated in
 * between. Returning the specific offending selections (rather than a bare
 * failure) is what lets the page drop them and ask the guest to review, instead
 * of dying opaquely part-way to Stripe.
 */
export async function validateSelections(raw: IncomingSelection[]): Promise<ValidationResult> {
  const invalid: InvalidSelection[] = [];
  const valid: CheckoutSelection[] = [];

  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, invalid: [] };
  }

  const fundIds = raw.filter(s => s.type === 'fund').map(s => s.id);
  const itemIds = raw.filter(s => s.type === 'item').map(s => s.id);

  const [fundsRes, itemsRes] = await Promise.all([
    fundIds.length
      ? supabaseServer.from('registry_funds').select('id, name, is_active').in('id', fundIds)
      : Promise.resolve({ data: [] as { id: string; name: string; is_active: boolean }[] }),
    itemIds.length
      ? supabaseServer
          .from('registry_items')
          .select('id, name, price, is_active, quantity_available, quantity_claimed')
          .in('id', itemIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            name: string;
            price: number;
            is_active: boolean;
            quantity_available: number | null;
            quantity_claimed: number;
          }[],
        }),
  ]);

  const fundMap = new Map((fundsRes.data ?? []).map(f => [f.id, f]));
  const itemMap = new Map((itemsRes.data ?? []).map(i => [i.id, i]));

  // An item is a one-tap "gift this", so the same item twice in one order is a
  // client bug rather than a legitimate double gift — reject it rather than
  // silently charging twice for something that may only have one left.
  const seenItemIds = new Set<string>();

  for (const selection of raw) {
    if (selection.type === 'fund') {
      const fund = fundMap.get(selection.id);
      if (!fund) {
        invalid.push({ type: 'fund', id: selection.id, name: null, reason: 'not_found' });
        continue;
      }
      if (!fund.is_active) {
        invalid.push({ type: 'fund', id: selection.id, name: fund.name, reason: 'inactive' });
        continue;
      }
      const amount = round2(Number(selection.amount));
      if (!Number.isFinite(amount) || amount < MIN_FUND_AMOUNT || amount > MAX_FUND_AMOUNT) {
        invalid.push({ type: 'fund', id: selection.id, name: fund.name, reason: 'invalid_amount' });
        continue;
      }
      valid.push({ type: 'fund', id: fund.id, name: fund.name, amount });
      continue;
    }

    const item = itemMap.get(selection.id);
    if (!item) {
      invalid.push({ type: 'item', id: selection.id, name: null, reason: 'not_found' });
      continue;
    }
    if (!item.is_active) {
      invalid.push({ type: 'item', id: selection.id, name: item.name, reason: 'inactive' });
      continue;
    }
    if (seenItemIds.has(item.id)) {
      invalid.push({ type: 'item', id: selection.id, name: item.name, reason: 'duplicate' });
      continue;
    }
    // quantity_available NULL means unlimited — never sold out.
    if (item.quantity_available !== null && item.quantity_claimed >= item.quantity_available) {
      invalid.push({ type: 'item', id: selection.id, name: item.name, reason: 'sold_out' });
      continue;
    }
    seenItemIds.add(item.id);
    // Item price always comes from the database, never from the request body.
    valid.push({ type: 'item', id: item.id, name: item.name, amount: round2(Number(item.price)) });
  }

  if (invalid.length > 0) return { ok: false, invalid };
  return { ok: true, selections: valid, total: round2(valid.reduce((sum, s) => sum + s.amount, 0)) };
}

/** Resolves the submitting household from the invite slug, same lookup the invite page uses. */
export async function getHouseholdBySlug(slug: string) {
  const { data } = await supabaseServer
    .from('households')
    .select('id, name, slug, short_code')
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

/**
 * Beneficiaries are who the gift is *from*. An empty array means the guest
 * didn't tag anyone, in which case the gift is from the household that
 * submitted it — never leave an order with no attribution, or the thank-you
 * list has a hole in it.
 */
type BeneficiaryRow = { household_id: string | null; guest_name_freetext: string | null };

async function normaliseBeneficiaries(
  raw: IncomingBeneficiary[] | undefined,
  submittingHouseholdId: string
): Promise<BeneficiaryRow[]> {
  const incoming = Array.isArray(raw) ? raw : [];

  // Refs resolve in one batch rather than per beneficiary, so tagging five
  // households is still a single households read.
  const refs = incoming.map(b => b.householdRef).filter((r): r is string => Boolean(r));
  const resolved = await resolveHouseholdRefs(refs);

  const rows = incoming
    .map((b): BeneficiaryRow | null => {
      if (b.householdRef) {
        const householdId = resolved.get(b.householdRef);
        // An unresolvable ref is a forged or stale value — drop it rather than
        // recording a beneficiary that doesn't exist.
        return householdId ? { household_id: householdId, guest_name_freetext: null } : null;
      }
      const name = b.freetextName?.trim();
      if (name) return { household_id: null, guest_name_freetext: name };
      return null;
    })
    .filter((b): b is BeneficiaryRow => b !== null);

  // Never leave an order unattributed — a gift with no beneficiary is a hole in
  // the thank-you list.
  if (rows.length === 0) {
    return [{ household_id: submittingHouseholdId, guest_name_freetext: null }];
  }
  return rows;
}


/**
 * Writes the order plus its line items and beneficiaries. The order row is
 * created first so the two child tables have something to reference; if either
 * child insert fails the order is deleted again, so a half-written order never
 * reaches the admin log or a Stripe session.
 */
export async function createOrder(params: {
  submittingHouseholdId: string;
  paymentMethod: RegistryPaymentMethod;
  status: RegistryOrderStatus;
  selections: CheckoutSelection[];
  total: number;
  beneficiaries: IncomingBeneficiary[] | undefined;
  message?: string;
  referenceCode?: string;
}): Promise<{ orderId: string } | { error: string }> {
  const { data: order, error: orderError } = await supabaseServer
    .from('registry_orders')
    .insert({
      submitting_household_id: params.submittingHouseholdId,
      payment_method: params.paymentMethod,
      status: params.status,
      total_amount: params.total,
      message: params.message?.trim() || null,
      reference_code: params.referenceCode ?? null,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('[registry] order insert failed', orderError);
    return { error: orderError?.message ?? 'Failed to create order' };
  }

  const itemRows = params.selections.map(s => ({
    order_id: order.id,
    fund_id: s.type === 'fund' ? s.id : null,
    item_id: s.type === 'item' ? s.id : null,
    amount: s.amount,
  }));

  const beneficiaryRows = (await normaliseBeneficiaries(params.beneficiaries, params.submittingHouseholdId)).map(b => ({
    order_id: order.id,
    ...b,
  }));

  const [itemsResult, beneficiariesResult] = await Promise.all([
    supabaseServer.from('registry_order_items').insert(itemRows),
    supabaseServer.from('registry_order_beneficiaries').insert(beneficiaryRows),
  ]);

  if (itemsResult.error || beneficiariesResult.error) {
    console.error('[registry] order children insert failed', itemsResult.error ?? beneficiariesResult.error);
    // Cascades to whichever child rows did land.
    await supabaseServer.from('registry_orders').delete().eq('id', order.id);
    return { error: (itemsResult.error ?? beneficiariesResult.error)!.message };
  }

  return { orderId: order.id };
}
