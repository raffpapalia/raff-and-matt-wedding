import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';

const TEMPLATE_KEYS = [
  'tmpl_sms_save_the_date',
  'tmpl_email_save_the_date_subject',
  'tmpl_email_save_the_date_body',
  'tmpl_sms_rsvp_reminder',
  'tmpl_sms_rsvp_confirmation',
  'tmpl_email_rsvp_confirmation_subject',
  'tmpl_email_rsvp_confirmation_body',
];

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('settings')
    .select('key, value')
    .in('key', TEMPLATE_KEYS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map = Object.fromEntries((data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]));
  return NextResponse.json(map);
}

export async function PATCH(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured for writes' }, { status: 500 });
  }

  const body = await request.json();
  const upserts = Object.entries(body)
    .filter(([key]) => TEMPLATE_KEYS.includes(key))
    .map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));

  if (upserts.length === 0) {
    return NextResponse.json({ success: true });
  }

  const { error } = await supabaseServer
    .from('settings')
    .upsert(upserts, { onConflict: 'key' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
