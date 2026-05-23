import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

const VALID_PHASES = ['save_the_date', 'invitation', 'pre_wedding', 'thank_you'];

export async function POST(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (authCookie !== 'true') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ message: 'Server not configured for writes: SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
  }

  const formData = await request.formData();
  const phase = formData.get('phase');
  if (typeof phase !== 'string' || !VALID_PHASES.includes(phase)) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  await supabaseServer.from('phases').insert({ current_phase: phase });
  return NextResponse.redirect(new URL('/admin', request.url));
}
