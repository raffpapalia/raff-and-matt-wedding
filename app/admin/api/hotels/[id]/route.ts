import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { validateHotel } from '../validate';

function logErr(op: string, err: any) {
  console.error(`[admin:hotels] ${op} failed`, {
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
  const result = validateHotel(body ?? {}, { partial: true });
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }
  if (Object.keys(result.fields).length === 0) {
    return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('nearby_hotels')
    .update(result.fields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logErr(`update hotel ${id}`, error);
    return NextResponse.json({ message: 'Failed to update hotel', details: error.message }, { status: 500 });
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
    .from('nearby_hotels')
    .delete()
    .eq('id', id);

  if (error) {
    logErr(`delete hotel ${id}`, error);
    return NextResponse.json({ message: 'Failed to delete hotel', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
