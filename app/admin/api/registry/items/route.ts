import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { parseQuantityAvailable } from '@/lib/registry/catalog';

function logErr(op: string, err: unknown) {
  const e = err as { message?: string; code?: string; details?: string } | null;
  console.error(`[admin:registry:items] ${op} failed`, {
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
    .from('registry_items')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    logErr('fetch items', error);
    return NextResponse.json({ message: 'Failed to fetch items', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, price, category, image_url, quantity_available, is_active, sort_order } = body;

  if (!name?.trim() || !category?.trim()) {
    return NextResponse.json({ message: 'name and category are required' }, { status: 400 });
  }

  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return NextResponse.json({ message: 'price must be a positive amount' }, { status: 400 });
  }

  const payload = {
    name: name.trim(),
    description: description?.trim() || null,
    price: Math.round(parsedPrice * 100) / 100,
    category: category.trim(),
    image_url: image_url?.trim() || null,
    // null = unlimited, which is the form's default.
    quantity_available: parseQuantityAvailable(quantity_available),
    is_active: is_active ?? true,
    sort_order: typeof sort_order === 'number' ? sort_order : 0,
  };

  const { data, error } = await supabaseServer.from('registry_items').insert(payload).select().single();

  if (error) {
    logErr('insert item', error);
    return NextResponse.json({ message: 'Failed to create item', details: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
