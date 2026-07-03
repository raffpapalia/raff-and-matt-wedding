import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

const PHOTO_BUCKET = 'household-photos';

function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

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
  const tags = JSON.parse(String(formData.get('tags') ?? '[]'));
  const personal_message = String(formData.get('personal_message') ?? '');
  const thank_you_message = String(formData.get('thank_you_message') ?? '');
  const plus_one_allowance = Number(formData.get('plus_one_allowance') ?? 0);

  const personal_photo_url = String(formData.get('personal_photo_url') ?? '');
  const thank_you_photo_url = String(formData.get('thank_you_photo_url') ?? '');

  try {
    const upd = await supabaseServer.from('households').update({
      name,
      slug,
      personal_message: personal_message || null,
      thank_you_message: thank_you_message || null,
      plus_one_allowance,
      personal_photo_url: personal_photo_url || null,
      thank_you_photo_url: thank_you_photo_url || null,
    }).eq('id', id).select('id').single();

    if (upd.error) {
      console.error('[admin:guests:patch] update household error', {
        operation: 'update household',
        error: upd.error,
        payload: {
          id,
          name,
          slug,
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

    // sync guests: update existing rows in place (by id), insert new ones,
    // and only delete rows that were actually removed from the form. A
    // previous version of this handler deleted every guest for the
    // household and re-inserted them from scratch; if that delete failed
    // (e.g. a guest had communications logged against them and the FK
    // constraint rejected the delete) the error was never checked, so the
    // insert ran anyway and produced duplicate guests.
    const guests = JSON.parse(String(formData.get('guests') ?? '[]'));
    const guestList = Array.isArray(guests) ? guests : [];

    const existingGuestsRes = await supabaseServer.from('guests').select('id').eq('household_id', id);
    if (existingGuestsRes.error) {
      console.error('[admin:guests:patch] load existing guests error', existingGuestsRes.error);
      return NextResponse.json({ message: 'Failed to load existing guests', error: { message: existingGuestsRes.error.message, code: existingGuestsRes.error.code, details: existingGuestsRes.error.details } }, { status: 500 });
    }
    const existingIds = new Set((existingGuestsRes.data ?? []).map((g: { id: string }) => g.id));

    const incomingIds = new Set(
      guestList.filter((g: any) => g.id && existingIds.has(g.id)).map((g: any) => g.id as string)
    );
    const idsToDelete = [...existingIds].filter((gid) => !incomingIds.has(gid));

    if (idsToDelete.length > 0) {
      const delRes = await supabaseServer.from('guests').delete().in('id', idsToDelete);
      if (delRes.error) {
        console.error('[admin:guests:patch] delete removed guests error', {
          operation: 'delete removed guests',
          error: delRes.error,
          payload: { household_id: id, idsToDelete },
        });
        return NextResponse.json({ message: 'Failed to remove guests', error: { message: delRes.error.message, code: delRes.error.code, details: delRes.error.details } }, { status: 500 });
      }
    }

    const toUpdate: any[] = [];
    const toInsert: any[] = [];
    for (const g of guestList) {
      const row = {
        household_id: id,
        first_name: g.first_name,
        last_name: g.last_name,
        is_child: Boolean(g.is_child),
        dietary_requirement: g.dietary_requirement || 'none',
        dietary_other: g.dietary_other || null,
        rsvp_status: g.rsvp_status || 'pending',
        display_order: typeof g.display_order === 'number' ? g.display_order : 0,
        email: g.email || null,
        mobile: g.mobile || null,
        comms_email: g.comms_email !== false,
        comms_sms: g.comms_sms !== false,
      };
      if (g.id && existingIds.has(g.id)) {
        toUpdate.push({ id: g.id, ...row });
      } else {
        toInsert.push(row);
      }
    }

    if (toUpdate.length > 0) {
      const upRes = await supabaseServer.from('guests').upsert(toUpdate, { onConflict: 'id' });
      if (upRes.error) {
        console.error('[admin:guests:patch] update guests error', {
          operation: 'update guests',
          error: upRes.error,
          payload: { household_id: id, guests: toUpdate },
        });
        return NextResponse.json({ message: 'Failed to update guests', error: { message: upRes.error.message, code: upRes.error.code, details: upRes.error.details } }, { status: 500 });
      }
    }

    if (toInsert.length > 0) {
      const insRes = await supabaseServer.from('guests').insert(toInsert);
      if (insRes.error) {
        console.error('[admin:guests:patch] insert guests error', {
          operation: 'insert guests',
          error: insRes.error,
          payload: { household_id: id, guests: toInsert },
        });
        return NextResponse.json({ message: 'Failed to update guests', error: { message: insRes.error.message, code: insRes.error.code, details: insRes.error.details } }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin:guests:patch] unexpected error', err);
    return NextResponse.json({ message: 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (authCookie !== 'true') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured for writes: SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
  }

  const { id } = await params;

  try {
    const householdRes = await supabaseServer
      .from('households')
      .select('id,personal_photo_url,thank_you_photo_url')
      .eq('id', id)
      .single();

    if (householdRes.error || !householdRes.data) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    const guestsRes = await supabaseServer.from('guests').select('id').eq('household_id', id);
    if (guestsRes.error) {
      console.error('[admin:guests:delete] load guests error', guestsRes.error);
      return NextResponse.json({ error: 'Failed to load guests' }, { status: 500 });
    }

    const guestIds = (guestsRes.data ?? []).map((guest) => guest.id);

    if (guestIds.length > 0) {
      const answersRes = await supabaseServer.from('custom_answers').delete().in('guest_id', guestIds);
      if (answersRes.error) {
        console.error('[admin:guests:delete] delete custom_answers error', answersRes.error);
        return NextResponse.json({ error: 'Failed to delete custom answers' }, { status: 500 });
      }
    }

    const commsRes = await supabaseServer.from('communications').delete().eq('household_id', id);
    if (commsRes.error) {
      console.error('[admin:guests:delete] delete communications error', commsRes.error);
      return NextResponse.json({ error: 'Failed to delete communications' }, { status: 500 });
    }

    const tagsRes = await supabaseServer.from('guest_tags').delete().eq('household_id', id);
    if (tagsRes.error) {
      console.error('[admin:guests:delete] delete guest_tags error', tagsRes.error);
      return NextResponse.json({ error: 'Failed to delete tags' }, { status: 500 });
    }

    const guestsDeleteRes = await supabaseServer.from('guests').delete().eq('household_id', id);
    if (guestsDeleteRes.error) {
      console.error('[admin:guests:delete] delete guests error', guestsDeleteRes.error);
      return NextResponse.json({ error: 'Failed to delete guests' }, { status: 500 });
    }

    const photoUrls = [householdRes.data.personal_photo_url, householdRes.data.thank_you_photo_url];
    for (const url of photoUrls) {
      if (typeof url === 'string' && url.includes('supabase.co/storage')) {
        const path = storagePathFromUrl(url);
        if (path) {
          const removeRes = await supabaseServer.storage.from(PHOTO_BUCKET).remove([path]);
          if (removeRes.error) {
            console.error('[admin:guests:delete] failed to delete photo', removeRes.error);
          }
        }
      }
    }

    const householdDeleteRes = await supabaseServer.from('households').delete().eq('id', id);
    if (householdDeleteRes.error) {
      console.error('[admin:guests:delete] delete household error', householdDeleteRes.error);
      return NextResponse.json({ error: 'Failed to delete household' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin:guests:delete] unexpected error', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
