import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(authCookie)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug')?.trim() ?? '';
  const exclude = searchParams.get('exclude');

  if (!slug) {
    return NextResponse.json({ available: false }, { status: 400 });
  }

  let query = supabaseServer.from('households').select('id').eq('slug', slug);
  if (exclude) {
    query = query.neq('id', exclude);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin:guests:check-slug] query failed', error);
    return NextResponse.json({ message: 'Failed to check invite code' }, { status: 500 });
  }

  return NextResponse.json({ available: !data || data.length === 0 });
}
