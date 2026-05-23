import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseJsonField(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function logSupabaseError(op: string, err: any) {
  console.error(`[admin:guests] ${op} failed`, {
    message: err?.message ?? String(err),
    code: err?.code ?? null,
    details: err?.details ?? err?.hint ?? null,
    error: err,
  });
}

export async function POST(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (authCookie !== 'true') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ message: 'Server not configured for writes: SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
  }

  const formData = await request.formData();
  const name = formData.get('name');
  const slugValue = formData.get('slug');
  const primary_email = formData.get('primary_email');
  const secondary_email = formData.get('secondary_email');
  const mobile_numbers = parseJsonField(formData.get('mobile_numbers')) ?? [];
  const tags = parseJsonField(formData.get('tags')) ?? [];
  const personal_message = formData.get('personal_message');
  const plus_one_allowance = Number(formData.get('plus_one_allowance') ?? 0);
  const guests = parseJsonField(formData.get('guests')) ?? [];
  const photo = formData.get('photo');

  if (typeof name !== 'string' || !name.trim() || typeof primary_email !== 'string' || !primary_email.trim()) {
    return NextResponse.json({ message: 'Household name and primary email are required.' }, { status: 400 });
  }

  const baseSlug = slugify(typeof slugValue === 'string' && slugValue.trim() ? slugValue : name);
  let finalSlug = baseSlug || `household-${Date.now()}`;

  try {
    const existingSlugsRes = await supabaseServer.from('households').select('slug').ilike('slug', `${baseSlug}%`);
    if (existingSlugsRes.error) {
      logSupabaseError('select existing slugs', existingSlugsRes.error);
      return NextResponse.json({ message: 'Failed to check existing slugs', error: { message: existingSlugsRes.error.message, code: existingSlugsRes.error.code, details: existingSlugsRes.error.details } }, { status: 500 });
    }
    const existingSlugs = existingSlugsRes.data ?? [];
    if (existingSlugs.some((row) => row.slug === finalSlug)) {
      const suffix = existingSlugs.length + 1;
      finalSlug = `${baseSlug}-${suffix}`;
    }
  } catch (err: any) {
    console.error('[admin:guests] unexpected error checking existing slugs', err);
    return NextResponse.json({ message: 'Unexpected error checking slugs', error: { message: err?.message ?? String(err) } }, { status: 500 });
  }

  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Uploaded file must be an image.' }, { status: 400 });
    }
    const buffer = Buffer.from(await photo.arrayBuffer());
    photoUrl = `data:${photo.type};base64,${buffer.toString('base64')}`;
  }

  try {
    const householdInsert = await supabaseServer.from('households').insert({
      name,
      slug: finalSlug,
      primary_email,
      secondary_email: typeof secondary_email === 'string' && secondary_email.trim() ? secondary_email : null,
      mobile_numbers: Array.isArray(mobile_numbers) ? mobile_numbers : [],
      personal_message: typeof personal_message === 'string' && personal_message.trim() ? personal_message : null,
      plus_one_allowance,
      personal_photo_url: photoUrl,
    }).select('id').single();

    if (householdInsert.error || !householdInsert.data) {
      logSupabaseError('insert household', householdInsert.error ?? { message: 'No data returned' });
      return NextResponse.json({ message: 'Failed to create household', error: { message: householdInsert.error?.message ?? 'No data returned', code: householdInsert.error?.code ?? null, details: householdInsert.error?.details ?? null } }, { status: 500 });
    }

    const householdId = householdInsert.data.id;

    if (Array.isArray(tags) && tags.length > 0) {
      const tagsToInsert = tags.map((tag: string) => ({ household_id: householdId, tag: String(tag).trim() })).filter((item) => item.tag);
      if (tagsToInsert.length > 0) {
        const tagsRes = await supabaseServer.from('guest_tags').insert(tagsToInsert);
        if (tagsRes.error) {
          logSupabaseError('insert guest_tags', tagsRes.error);
          return NextResponse.json({ message: 'Failed to insert tags', error: { message: tagsRes.error.message, code: tagsRes.error.code, details: tagsRes.error.details } }, { status: 500 });
        }
      }
    }

    if (Array.isArray(guests) && guests.length > 0) {
      const guestsToInsert = guests.map((guest: any) => ({
        household_id: householdId,
        first_name: guest.first_name,
        last_name: guest.last_name,
        is_child: Boolean(guest.is_child),
        dietary_requirement: guest.dietary_requirement || 'none',
        dietary_other: guest.dietary_other || null,
        rsvp_status: guest.rsvp_status || 'pending',
        display_order: typeof guest.display_order === 'number' ? guest.display_order : 0,
      }));
      const guestsRes = await supabaseServer.from('guests').insert(guestsToInsert);
      if (guestsRes.error) {
        logSupabaseError('insert guests', guestsRes.error);
        return NextResponse.json({ message: 'Failed to insert guests', error: { message: guestsRes.error.message, code: guestsRes.error.code, details: guestsRes.error.details } }, { status: 500 });
      }
    }
  } catch (err: any) {
    console.error('[admin:guests] unexpected error during DB operations', err);
    return NextResponse.json({ message: 'Unexpected server error', error: { message: err?.message ?? String(err) } }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
