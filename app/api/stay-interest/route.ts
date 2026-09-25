import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, getSettings } from '@/lib/supabase';
import { isStayOpen, normaliseStayAnswer } from '@/lib/stay/interest';

// Guest-facing save for the QT room block expression of interest. Keyed by the
// household slug from the URL, written with the service-role client (the table
// has RLS on and no policies). Deliberately never touches link_open_count /
// link_first_opened_at — only the invite page itself counts as an open.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const [settings, householdRes] = await Promise.all([
      getSettings(),
      supabaseServer.from('households').select('id').eq('slug', slug).maybeSingle(),
    ]);

    if (!householdRes.data) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    if (!isStayOpen(settings.stay_eoi_open)) {
      return NextResponse.json({ error: 'Room interest is closed' }, { status: 403 });
    }

    const normalised = normaliseStayAnswer(body);
    if (!normalised.ok) {
      return NextResponse.json({ error: normalised.error }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('stay_interest')
      .upsert({ household_id: householdRes.data.id, ...normalised.answer }, { onConflict: 'household_id' })
      .select('*')
      .single();

    if (error) {
      console.error('[stay-interest] upsert failed', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ interest: data });
  } catch (error) {
    console.error('[stay-interest] unexpected error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
