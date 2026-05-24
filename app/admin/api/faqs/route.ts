import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

function logErr(op: string, err: any) {
  console.error(`[admin:faqs] ${op} failed`, {
    message: err?.message ?? String(err),
    code: err?.code ?? null,
    details: err?.details ?? null,
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
    .from('faqs')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    logErr('fetch faqs', error);
    return NextResponse.json({ message: 'Failed to fetch FAQs', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { question, answer, is_active, display_order } = body;

  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ message: 'question and answer are required' }, { status: 400 });
  }

  const payload = {
    question: question.trim(),
    answer: answer.trim(),
    is_active: is_active ?? true,
    display_order: typeof display_order === 'number' ? display_order : 0,
  };

  const { data, error } = await supabaseServer
    .from('faqs')
    .insert(payload)
    .select()
    .single();

  if (error) {
    logErr('insert faq', error);
    return NextResponse.json({ message: 'Failed to create FAQ', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
