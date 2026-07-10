import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { parseItemFields } from '../validate';

function logErr(op: string, err: unknown) {
  const e = err as { message?: string; code?: string; details?: string } | null;
  console.error(`[admin:budget] ${op} failed`, {
    message: e?.message ?? String(err),
    code: e?.code ?? null,
    details: e?.details ?? null,
  });
}

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = parseItemFields(body, { requireCore: true });
  if ('error' in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('budget_items')
    .insert(parsed.fields)
    .select()
    .single();

  if (error) {
    logErr('insert item', error);
    return NextResponse.json({ message: 'Failed to create budget item', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
