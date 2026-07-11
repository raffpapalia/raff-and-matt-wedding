import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
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
    .from('email_templates')
    .select('id, key, phase, subject, body, trigger_type, is_active, updated_at')
    .eq('channel', 'email')
    .order('key', { ascending: true });

  if (error) {
    return NextResponse.json(
      { message: 'Failed to fetch email templates', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
