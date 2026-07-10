import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';
import { parseMoney } from '../validate';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const totalBudget = parseMoney(body.total_budget);
  if (totalBudget === undefined || totalBudget === null) {
    return NextResponse.json({ message: 'total_budget must be a non-negative number' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('budget_settings')
    .upsert({ id: 1, total_budget: totalBudget, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error('[admin:budget] update settings failed', { message: error.message, code: error.code });
    return NextResponse.json({ message: 'Failed to save budget', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
