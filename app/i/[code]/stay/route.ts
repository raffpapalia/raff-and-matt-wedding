import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// /i/<code>/stay: the {{stay_link}} SMS short link. Same lookup as ../route.ts,
// but lands on the household's room interest page instead of the invite.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const baseUrl = new URL(request.url).origin;
  const normalized = code?.trim().toUpperCase();

  if (!normalized) {
    return NextResponse.redirect(baseUrl, 302);
  }

  const { data: household } = await supabaseServer
    .from('households')
    .select('slug')
    .eq('short_code', normalized)
    .single();

  if (!household) {
    return NextResponse.redirect(baseUrl, 302);
  }

  return NextResponse.redirect(`${baseUrl}/invite/${household.slug}/stay`, 302);
}
