import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { slugify, uniqueFundSlug } from '@/lib/registry/catalog';

function logErr(op: string, err: unknown) {
  const e = err as { message?: string; code?: string; details?: string } | null;
  console.error(`[admin:registry:funds] ${op} failed`, {
    message: e?.message ?? String(err),
    code: e?.code ?? null,
    details: e?.details ?? null,
  });
}

async function requireAuth() {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(authCookie);
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('registry_funds')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    logErr('fetch funds', error);
    return NextResponse.json({ message: 'Failed to fetch funds', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, category, image_url, is_active, sort_order } = body;

  if (!name?.trim() || !category?.trim()) {
    return NextResponse.json({ message: 'name and category are required' }, { status: 400 });
  }

  const payload = {
    name: name.trim(),
    slug: await uniqueFundSlug(slugify(name)),
    description: description?.trim() || null,
    category: category.trim(),
    image_url: image_url?.trim() || null,
    is_active: is_active ?? true,
    sort_order: typeof sort_order === 'number' ? sort_order : 0,
  };

  const { data, error } = await supabaseServer.from('registry_funds').insert(payload).select().single();

  if (error) {
    logErr('insert fund', error);
    return NextResponse.json({ message: 'Failed to create fund', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
