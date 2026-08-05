import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';

export async function POST(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(authCookie)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint, keys } = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Missing subscription fields' }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
