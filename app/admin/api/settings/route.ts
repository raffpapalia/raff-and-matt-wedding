import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('settings')
    .select('key, value');

  if (error) {
    return NextResponse.json({ message: 'Failed to fetch settings', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const rows = Object.entries(body).map(([key, value]) => ({
    key,
    value,
  }));

  const { error } = await supabaseServer
    .from('settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) {
    return NextResponse.json({ message: 'Failed to save settings', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
