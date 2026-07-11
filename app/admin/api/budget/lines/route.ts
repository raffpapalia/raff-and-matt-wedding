import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { parseLineFields } from '../validate';

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
  return verifyAdminSession(authCookie);
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (typeof body.item_id !== 'string' || !body.item_id) {
    return NextResponse.json({ message: 'item_id is required' }, { status: 400 });
  }

  const parsed = parseLineFields(body, { requireCore: true });
  if ('error' in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('budget_line_items')
    .insert({ ...parsed.fields, item_id: body.item_id })
    .select()
    .single();

  if (error) {
    logErr('insert line', error);
    return NextResponse.json({ message: 'Failed to create line item', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
