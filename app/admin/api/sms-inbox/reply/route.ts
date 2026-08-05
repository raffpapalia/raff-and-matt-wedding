import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabase';
import { sendGuestSmsReply } from '@/lib/sms/sendSms';

export async function POST(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(authCookie)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guest_id, body, source_comm_id } = (await request.json()) as {
    guest_id?: string;
    body?: string;
    source_comm_id?: string;
  };

  if (!guest_id || !body?.trim()) {
    return NextResponse.json({ error: 'Missing guest_id or body' }, { status: 400 });
  }

  const result = await sendGuestSmsReply(guest_id, body.trim());
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (source_comm_id) {
    await supabaseServer.from('communications').update({ read_at: new Date().toISOString() }).eq('id', source_comm_id);
  }

  return NextResponse.json({ success: true, messageId: result.messageId });
}
