import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (authCookie !== 'true') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ message: 'Server not configured for writes: SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const name = String(formData.get('name') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const primary_email = String(formData.get('primary_email') ?? '');
  const secondary_email = String(formData.get('secondary_email') ?? '');
  const mobile_numbers = JSON.parse(String(formData.get('mobile_numbers') ?? '[]'));
  const tags = JSON.parse(String(formData.get('tags') ?? '[]'));
  const personal_message = String(formData.get('personal_message') ?? '');
  const plus_one_allowance = Number(formData.get('plus_one_allowance') ?? 0);

  try {
    const upd = await supabaseServer.from('households').update({
      name,
      slug,
      primary_email,
      secondary_email: secondary_email || null,
      mobile_numbers: Array.isArray(mobile_numbers) ? mobile_numbers : [],
      personal_message: personal_message || null,
      plus_one_allowance,
    }).eq('id', id).select('id').single();

    if (upd.error) {
      console.error('[admin:guests:patch] update household error', {
        operation: 'update household',
        error: upd.error,
        payload: {
          id,
          name,
          slug,
          primary_email,
          secondary_email,
          mobile_numbers,
          personal_message,
          plus_one_allowance,
        },
      });
      return NextResponse.json({ message: 'Failed to update household', error: { message: upd.error.message, code: upd.error.code, details: upd.error.details } }, { status: 500 });
    }

    // replace tags
    await supabaseServer.from('guest_tags').delete().eq('household_id', id);
    if (Array.isArray(tags) && tags.length > 0) {
      const tagsToInsert = tags.map((t: string) => ({ household_id: id, tag: String(t).trim() }));
      const tRes = await supabaseServer.from('guest_tags').insert(tagsToInsert);
      if (tRes.error) {
        console.error('[admin:guests:patch] insert tags error', {
          operation: 'insert tags',
          error: tRes.error,
          payload: {
            household_id: id,
            tags: tagsToInsert,
          },
        });
        return NextResponse.json({ message: 'Failed to update tags', error: { message: tRes.error.message, code: tRes.error.code, details: tRes.error.details } }, { status: 500 });
      }
    }

    // replace guests: delete + insert
    await supabaseServer.from('guests').delete().eq('household_id', id);
    const guests = JSON.parse(String(formData.get('guests') ?? '[]'));
    if (Array.isArray(guests) && guests.length > 0) {
      const guestsToInsert = guests.map((g: any) => ({
        household_id: id,
        first_name: g.first_name,
        last_name: g.last_name,
        is_child: Boolean(g.is_child),
        dietary_requirement: g.dietary_requirement || 'none',
        dietary_other: g.dietary_other || null,
        rsvp_status: g.rsvp_status || 'pending',
        display_order: typeof g.display_order === 'number' ? g.display_order : 0,
      }));
      const gRes = await supabaseServer.from('guests').insert(guestsToInsert);
      if (gRes.error) {
        console.error('[admin:guests:patch] insert guests error', {
          operation: 'insert guests',
          error: gRes.error,
          payload: {
            household_id: id,
            guests: guestsToInsert,
          },
        });
        return NextResponse.json({ message: 'Failed to update guests', error: { message: gRes.error.message, code: gRes.error.code, details: gRes.error.details } }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin:guests:patch] unexpected error', err);
    return NextResponse.json({ message: 'Unexpected error' }, { status: 500 });
  }
}
