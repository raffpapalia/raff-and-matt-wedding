import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

// PATCH body: { share_enabled?: boolean, regenerate_token?: true }
// Enabling the share for the first time mints a token automatically.
export async function PATCH(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ('share_enabled' in body) {
    updates.share_enabled = Boolean(body.share_enabled);
  }

  if (body.regenerate_token === true) {
    updates.share_token = randomBytes(24).toString('hex');
  } else if (updates.share_enabled === true) {
    // Mint a token on first enable so the link works immediately.
    const { data: current } = await supabaseServer
      .from('runsheet_settings')
      .select('share_token')
      .eq('id', 1)
      .maybeSingle();
    if (!current?.share_token) {
      updates.share_token = randomBytes(24).toString('hex');
    }
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('runsheet_settings')
    .upsert({ id: 1, ...updates })
    .select()
    .single();

  if (error) {
    console.error('[admin:runsheet] update settings failed', { message: error.message, code: error.code });
    return NextResponse.json({ message: 'Failed to update share settings', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
