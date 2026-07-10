import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { parseDate, parseMoney } from '../../validate';

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

  if ('label' in body) {
    update.label = typeof body.label === 'string' ? body.label.trim().slice(0, 200) : '';
  }
  if ('amount' in body) {
    const amount = parseMoney(body.amount);
    if (amount === undefined || amount === null) {
      return NextResponse.json({ message: 'amount must be a non-negative number' }, { status: 400 });
    }
    update.amount = amount;
  }
  if ('due_date' in body) {
    const dueDate = parseDate(body.due_date);
    if (dueDate === undefined) {
      return NextResponse.json({ message: 'due_date must be YYYY-MM-DD' }, { status: 400 });
    }
    update.due_date = dueDate;
  }
  if ('paid_date' in body) {
    const paidDate = parseDate(body.paid_date);
    if (paidDate === undefined) {
      return NextResponse.json({ message: 'paid_date must be YYYY-MM-DD' }, { status: 400 });
    }
    update.paid_date = paidDate;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('budget_payments')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logErr(`update payment ${id}`, error);
    return NextResponse.json({ message: 'Failed to update payment', details: error.message }, { status: 500 });
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
    .from('budget_payments')
    .delete()
    .eq('id', id);

  if (error) {
    logErr(`delete payment ${id}`, error);
    return NextResponse.json({ message: 'Failed to delete payment', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
