import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
}

// Only body/is_active are editable from the UI — key/phase/channel/trigger_type are
// structural and must stay code-owned, same rule as the email-templates PATCH route.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ message: 'Server misconfiguration: service role key missing' }, { status: 500 });
  }

  const { id } = await params;
  const body = await request.json();
  const { body: templateBody, is_active } = body as { body?: string; is_active?: boolean };

  const updates: Record<string, unknown> = {};
  if (typeof templateBody === 'string') updates.body = templateBody;
  if (typeof is_active === 'boolean') updates.is_active = is_active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: 'No editable fields provided' }, { status: 400 });
  }

  if (updates.body !== undefined && !String(updates.body).trim()) {
    return NextResponse.json({ message: 'Body cannot be empty' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .eq('channel', 'sms')
    .select('id, key, phase, body, trigger_type, is_active, updated_at')
    .single();

  if (error) {
    return NextResponse.json(
      { message: 'Failed to update SMS template', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
