import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';

// Scoped to direction = 'inbound' so this can only ever remove inbox replies,
// never outbound send history (that stays governed by the resend/reply flows).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(authCookie)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('communications')
    .delete()
    .eq('id', id)
    .eq('direction', 'inbound')
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
