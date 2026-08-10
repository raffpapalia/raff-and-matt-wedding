import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// Public catalogue for the guest registry page. The registry tables are
// RLS-enabled with no policies, so this reads through supabaseServer and
// deliberately returns only the presentational columns — quantity_claimed is
// exposed solely so capped items can render "2 of 3 claimed"; funds expose no
// totals at all, since contributions stay private.

export const revalidate = 0;

export async function GET() {
  const [fundsRes, itemsRes] = await Promise.all([
    supabaseServer
      .from('registry_funds')
      .select('id, name, slug, description, suggested_amounts, category, image_url')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabaseServer
      .from('registry_items')
      .select('id, name, description, price, category, image_url, quantity_available, quantity_claimed')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (fundsRes.error || itemsRes.error) {
    console.error('[registry:catalog] fetch failed', fundsRes.error ?? itemsRes.error);
    return NextResponse.json({ message: 'Failed to load the registry' }, { status: 500 });
  }

  return NextResponse.json({
    funds: fundsRes.data ?? [],
    items: itemsRes.data ?? [],
  });
}
