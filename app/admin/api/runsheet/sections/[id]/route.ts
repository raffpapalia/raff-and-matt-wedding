import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { parseSectionFields } from '../../validate';

function logErr(op: string, err: unknown) {
  const e = err as { message?: string; code?: string; details?: string } | null;
  console.error(`[admin:runsheet] ${op} failed`, {
    message: e?.message ?? String(err),
    code: e?.code ?? null,
    details: e?.details ?? null,
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

  const parsed = parseSectionFields(body, { requireCore: false });
  if ('error' in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  if (Object.keys(parsed.fields).length === 0) {
    return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('runsheet_sections')
    .update(parsed.fields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logErr(`update section ${id}`, error);
    return NextResponse.json({ message: 'Failed to update section', details: error.message }, { status: 500 });
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

  // runsheet_items has ON DELETE CASCADE, so the section's items go with it.
  const { error } = await supabaseServer
    .from('runsheet_sections')
    .delete()
    .eq('id', id);

  if (error) {
    logErr(`delete section ${id}`, error);
    return NextResponse.json({ message: 'Failed to delete section', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
