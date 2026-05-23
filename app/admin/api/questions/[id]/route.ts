import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

function logErr(op: string, err: any) {
  console.error(`[admin:questions] ${op} failed`, {
    message: err?.message ?? String(err),
    code: err?.code ?? null,
    details: err?.details ?? null,
  });
}

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
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

  // Build update object from only the fields present in the body
  const update: Record<string, unknown> = {};
  if ('question_text' in body) update.question_text = String(body.question_text).trim();
  if ('question_type' in body) update.question_type = body.question_type;
  if ('options' in body) update.options = body.options;
  if ('target_tags' in body) update.target_tags = body.target_tags;
  if ('is_active' in body) update.is_active = body.is_active;
  if ('display_order' in body) update.display_order = body.display_order;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('custom_questions')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logErr(`update question ${id}`, error);
    return NextResponse.json({ message: 'Failed to update question', details: error.message }, { status: 500 });
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
    .from('custom_questions')
    .delete()
    .eq('id', id);

  if (error) {
    logErr(`delete question ${id}`, error);
    return NextResponse.json({ message: 'Failed to delete question', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
