import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

// Only subject/body/is_active are editable from the UI — key/phase/trigger_type
// are structural and must stay code-owned.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ message: 'Server misconfiguration: service role key missing' }, { status: 500 });
  }

  const { id } = await params;
  const body = await request.json();
  const { subject, body: templateBody, is_active } = body as {
    subject?: string;
    body?: string;
    is_active?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (typeof subject === 'string') updates.subject = subject;
  if (typeof templateBody === 'string') updates.body = templateBody;
  if (typeof is_active === 'boolean') updates.is_active = is_active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: 'No editable fields provided' }, { status: 400 });
  }

  if ((updates.subject !== undefined && !String(updates.subject).trim()) ||
      (updates.body !== undefined && !String(updates.body).trim())) {
    return NextResponse.json({ message: 'Subject and body cannot be empty' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .eq('channel', 'email')
    .select('id, key, phase, subject, body, trigger_type, is_active, updated_at')
    .single();

  if (error) {
    return NextResponse.json(
      { message: 'Failed to update email template', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
