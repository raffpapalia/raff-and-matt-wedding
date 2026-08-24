import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';

function logErr(op: string, err: unknown) {
  const e = err as { message?: string; code?: string; details?: string } | null;
  console.error(`[admin:registry:funds] ${op} failed`, {
    message: e?.message ?? String(err),
    code: e?.code ?? null,
    details: e?.details ?? null,
  });
}

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // slug is deliberately not editable: it's a stable internal handle, and
  // rewriting it on rename would break any link already shared.
  const update: Record<string, unknown> = {};
  if ('name' in body) update.name = String(body.name).trim();
  if ('description' in body) update.description = String(body.description ?? '').trim() || null;
  if ('category' in body) update.category = String(body.category).trim();
  if ('image_url' in body) update.image_url = String(body.image_url ?? '').trim() || null;
  if ('is_active' in body) update.is_active = body.is_active;
  if ('sort_order' in body) update.sort_order = body.sort_order;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('registry_funds')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logErr(`update fund ${id}`, error);
    return NextResponse.json({ message: 'Failed to update fund', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // registry_order_items.fund_id is ON DELETE SET NULL, so past orders keep
  // their amounts and totals — they just lose the link to the deleted fund.
  const { error } = await supabaseServer.from('registry_funds').delete().eq('id', id);

  if (error) {
    logErr(`delete fund ${id}`, error);
    return NextResponse.json({ message: 'Failed to delete fund', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
