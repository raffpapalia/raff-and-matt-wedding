import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '@/lib/supabase';
import {
  createOrder,
  generateReferenceCode,
  getHouseholdBySlug,
  validateSelections,
  type IncomingBeneficiary,
  type IncomingSelection,
} from '@/lib/registry/orders';

// The no-fees path: the guest transfers the money themselves via PayID and
// quotes a reference code, and an admin ticks "Mark as received" once it lands.
//
// Same body shape and same validation as the Stripe route — a guest switching
// between the two payment buttons must get identical availability behaviour,
// including the 409.

type ManualBody = {
  slug?: string;
  selections?: IncomingSelection[];
  beneficiaries?: IncomingBeneficiary[];
  message?: string;
};

export async function POST(request: NextRequest) {
  let body: ManualBody;
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

  const settings = await getSettings();
  // Without a PayID there is nothing to show the guest, and an order created
  // here would be un-payable. Better to fail now and fall back to the card path.
  if (!settings.registry_payid) {
    console.error('[registry:contribute-manual] registry_payid setting is empty');
    return NextResponse.json(
      { message: 'Bank transfer is not set up yet — please use the card option.' },
      { status: 503 }
    );
  }

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

  // One code for the whole order, not per line — the guest makes a single
  // transfer, so a single reference is what shows up in the bank feed.
  const referenceCode = generateReferenceCode(household.short_code);

  const created = await createOrder({
    submittingHouseholdId: household.id,
    paymentMethod: 'payid_manual',
    status: 'manual_pending',
    selections: validation.selections,
    total: validation.total,
    beneficiaries,
    message,
    referenceCode,
  });

  if ('error' in created) {
    return NextResponse.json({ message: 'Failed to create your gift order.' }, { status: 500 });
  }

  return NextResponse.json({
    payid: settings.registry_payid,
    payidName: settings.registry_payid_name,
    instructions: settings.registry_payid_instructions,
    referenceCode,
    total: validation.total,
  });
}
