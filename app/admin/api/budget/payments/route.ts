import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { parseDate, parseMoney } from '../validate';

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

  const amount = parseMoney(body.amount);
  if (amount === undefined || amount === null) {
    return NextResponse.json({ message: 'amount must be a non-negative number' }, { status: 400 });
  }

  const dueDate = parseDate(body.due_date);
  if (dueDate === undefined) {
    return NextResponse.json({ message: 'due_date must be YYYY-MM-DD' }, { status: 400 });
  }
  const paidDate = parseDate(body.paid_date);
  if (paidDate === undefined) {
    return NextResponse.json({ message: 'paid_date must be YYYY-MM-DD' }, { status: 400 });
  }

  if (typeof body.item_id !== 'string' || !body.item_id) {
    return NextResponse.json({ message: 'item_id is required' }, { status: 400 });
  }

  const payload = {
    item_id: body.item_id,
    label: typeof body.label === 'string' ? body.label.trim().slice(0, 200) : '',
    amount,
    due_date: dueDate,
    paid_date: paidDate,
  };

  const { data, error } = await supabaseServer
    .from('budget_payments')
    .insert(payload)
    .select()
    .single();

  if (error) {
    logErr('insert payment', error);
    return NextResponse.json({ message: 'Failed to create payment', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
