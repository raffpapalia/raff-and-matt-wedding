import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';

// Backs the home-screen app badge — same "unread replies" count already shown
// on the comms dashboard. Read by the service worker's push handler (same-origin
// fetch, so the admin cookie rides along automatically) and by the client on load.
export async function GET() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(authCookie)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { count } = await supabaseServer
    .from('communications')
    .select('id', { count: 'exact', head: true })
    .eq('direction', 'inbound')
    .is('read_at', null);

  return NextResponse.json({ count: count ?? 0 });
}
