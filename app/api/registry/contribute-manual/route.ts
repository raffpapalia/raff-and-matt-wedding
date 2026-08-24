import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '@/lib/supabase';
import {
  createOrder,
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
  // Without a PayID or BSB/account there is nothing to show the guest, and an
  // order created here would be un-payable. Better to fail now and fall back
  // to the card path. PayID and BSB/account are independent — either is enough.
  if (!settings.registry_payid && !settings.registry_bank_bsb) {
    console.error('[registry:contribute-manual] no PayID or bank details configured');
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

  // The household's own slug, so the reference reads as their name rather than
  // an opaque code — easier to type into a banking app and to recognise in the
  // bank feed. Every gift from this household carries the same reference,
  // since it identifies the giver rather than one specific order.
  const referenceCode = household.slug.toUpperCase();

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
    bankBsb: settings.registry_bank_bsb,
    bankAccountNumber: settings.registry_bank_account_number,
    bankAccountName: settings.registry_bank_account_name,
    referenceCode,
    total: validation.total,
  });
}
