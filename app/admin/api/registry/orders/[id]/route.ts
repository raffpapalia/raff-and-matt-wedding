import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { sendGiftConfirmedEmail } from '@/lib/registry/giftEmail';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

/**
 * Marks a manual PayID order as received.
 *
 * This is the only status transition the admin can drive by hand: every other
 * status is owned by Stripe's webhook. It is intentionally narrow — no generic
 * status field is accepted — so a UI bug can't move a Stripe order to a state
 * its payment never reached.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (body.action !== 'mark_received') {
    return NextResponse.json({ message: 'Unsupported action' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('registry_orders')
    .update({ status: 'manual_received', confirmed_at: new Date().toISOString() })
    .eq('id', id)
    // Guards both ways: only a manual order, and only one still awaiting the
    // transfer, so a double click doesn't rewrite confirmed_at.
    .eq('payment_method', 'payid_manual')
    .eq('status', 'manual_pending')
    .select()
    .maybeSingle();

  if (error) {
    console.error(`[admin:registry:orders] mark received ${id} failed`, error);
    return NextResponse.json({ message: 'Failed to update order', details: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { message: 'That order is not awaiting a bank transfer — reload to see its current status.' },
      { status: 409 }
    );
  }

  await sendGiftConfirmedEmail(id);

  return NextResponse.json(data);
}
