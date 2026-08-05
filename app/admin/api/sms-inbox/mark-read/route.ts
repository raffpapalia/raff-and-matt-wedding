import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';

export async function POST(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(authCookie)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { comm_id } = (await request.json()) as { comm_id?: string };
  if (!comm_id) {
    return NextResponse.json({ error: 'Missing comm_id' }, { status: 400 });
  }

  await supabaseServer.from('communications').update({ read_at: new Date().toISOString() }).eq('id', comm_id);

  return NextResponse.json({ success: true });
}
