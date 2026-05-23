import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

function logErr(op: string, err: any, extra?: Record<string, unknown>) {
  console.error(`[admin:questions] ${op} failed`, {
    message: err?.message ?? String(err),
    code: err?.code ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
    status: err?.status ?? null,
    // Full raw error for anything the fields above miss
    raw: err,
    ...extra,
  });
}

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return authCookie === 'true';
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('custom_questions')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    logErr('fetch questions', error);
    return NextResponse.json({ message: 'Failed to fetch questions', details: error.message, hint: error.hint }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[admin:questions] SUPABASE_SERVICE_ROLE_KEY is not set — writes will be rejected');
    return NextResponse.json({ message: 'Server misconfiguration: service role key missing' }, { status: 500 });
  }

  const body = await request.json();
  const { question_text, question_type, options, target_tags, is_active, display_order } = body;

  if (!question_text?.trim() || !question_type) {
    return NextResponse.json({ message: 'question_text and question_type are required' }, { status: 400 });
  }

  const payload = {
    question_text: question_text.trim(),
    question_type,
    options: question_type === 'dropdown' && Array.isArray(options) && options.length > 0 ? options : null,
    target_tags: Array.isArray(target_tags) ? target_tags : [],
    is_active: is_active ?? true,
    display_order: typeof display_order === 'number' ? display_order : 0,
  };

  console.log('[admin:questions] inserting', payload);

  const { data, error } = await supabaseServer
    .from('custom_questions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    logErr('insert question', error, { payload });
    return NextResponse.json(
      { message: 'Failed to create question', details: error.message, hint: error.hint, code: error.code },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
