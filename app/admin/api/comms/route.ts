import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

function resolveMergeTags(
  template: string,
  firstName: string,
  slug: string,
  weddingDate: string,
  venueName: string
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  return template
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{invite_link\}\}/g, `${siteUrl}/invite/${slug}`)
    .replace(/\{\{wedding_date\}\}/g, weddingDate)
    .replace(/\{\{venue\}\}/g, venueName);
}

export async function POST(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (authCookie !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured for writes' }, { status: 500 });
  }

  const body = await request.json();
  const { household_ids, type, message, guest_ids } = body as {
    household_ids: string[];
    type: 'sms' | 'email' | 'both';
    message: string;
    guest_ids?: string[];
  };

  if (!household_ids?.length || !type || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const [householdsRes, guestsRes, settingsRes] = await Promise.all([
    supabaseServer.from('households').select('id,slug').in('id', household_ids),
    supabaseServer
      .from('guests')
      .select('id,first_name,household_id,comms_sms,comms_email')
      .in('household_id', household_ids),
    supabaseServer
      .from('settings')
      .select('key,value')
      .in('key', ['wedding_date', 'venue_name']),
  ]);

  const households = householdsRes.data ?? [];
  const allGuests = guestsRes.data ?? [];
  const settingsData = settingsRes.data ?? [];
  const settingsMap: Record<string, string> = Object.fromEntries(
    settingsData.map((r: { key: string; value: unknown }) => [r.key, r.value as string])
  );
  const weddingDate = settingsMap['wedding_date'] ?? '';
  const venueName = settingsMap['venue_name'] ?? '';

  const types: Array<'sms' | 'email'> = type === 'both' ? ['sms', 'email'] : [type];
  const records: Array<{ household_id: string; type: string; message: string; status: string }> = [];

  for (const household of households) {
    let guests = allGuests.filter((g) => g.household_id === household.id);
    if (guest_ids?.length) {
      guests = guests.filter((g) => guest_ids.includes(g.id));
    }

    for (const t of types) {
      const eligible = guests.filter((g) =>
        t === 'sms' ? g.comms_sms !== false : g.comms_email !== false
      );

      if (eligible.length === 0) {
        records.push({
          household_id: household.id,
          type: t,
          message: resolveMergeTags(message, '', household.slug, weddingDate, venueName),
          status: 'sent',
        });
        continue;
      }

      for (const guest of eligible) {
        records.push({
          household_id: household.id,
          type: t,
          message: resolveMergeTags(
            message,
            guest.first_name,
            household.slug,
            weddingDate,
            venueName
          ),
          status: 'sent',
        });
      }
    }
  }

  if (records.length === 0) {
    return NextResponse.json({ inserted: 0 });
  }

  const { data, error } = await supabaseServer.from('communications').insert(records).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: data?.length ?? 0 });
}
