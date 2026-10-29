import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { validateHotel } from './validate';

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

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('nearby_hotels')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    logErr('fetch hotels', error);
    return NextResponse.json({ message: 'Failed to fetch hotels', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = validateHotel(body ?? {}, { partial: false });
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  const payload = {
    display_order: 0,
    is_active: true,
    ...result.fields,
  };

  const { data, error } = await supabaseServer
    .from('nearby_hotels')
    .insert(payload)
    .select()
    .single();

  if (error) {
    logErr('insert hotel', error);
    return NextResponse.json({ message: 'Failed to create hotel', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
