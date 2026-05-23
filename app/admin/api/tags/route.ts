import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase.from('guest_tags').select('tag');
    if (error) {
      console.error('[admin:tags] fetch tags error', error);
      return NextResponse.json([], { status: 200 });
    }
    const tags = Array.isArray(data) ? Array.from(new Set(data.map((r: any) => r.tag).filter(Boolean))) : [];
    return NextResponse.json(tags);
  } catch (err) {
    console.error('[admin:tags] unexpected error', err);
    return NextResponse.json([], { status: 200 });
  }
}
