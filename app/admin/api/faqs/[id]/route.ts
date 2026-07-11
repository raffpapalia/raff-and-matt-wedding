import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';

function logErr(op: string, err: any) {
  console.error(`[admin:faqs] ${op} failed`, {
    message: err?.message ?? String(err),
    code: err?.code ?? null,
    details: err?.details ?? null,
  });
}

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if ('question' in body) update.question = String(body.question).trim();
  if ('answer' in body) update.answer = String(body.answer).trim();
  if ('is_active' in body) update.is_active = body.is_active;
  if ('display_order' in body) update.display_order = body.display_order;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('faqs')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logErr(`update faq ${id}`, error);
    return NextResponse.json({ message: 'Failed to update FAQ', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabaseServer
    .from('faqs')
    .delete()
    .eq('id', id);

  if (error) {
    logErr(`delete faq ${id}`, error);
    return NextResponse.json({ message: 'Failed to delete FAQ', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
