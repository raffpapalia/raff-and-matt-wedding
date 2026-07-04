import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

type HouseholdMatch = { id: string; name: string; slug: string };

type GuestMatch = {
  guestId: string;
  guestName: string;
  householdId: string;
  householdName: string;
  slug: string;
  matchType: 'name' | 'email' | 'mobile';
};

const GUEST_MATCH_SELECT = 'id,first_name,last_name,household_id,households(name,slug)';

type HouseholdRef = { name: string; slug: string };
type GuestMatchRow = {
  id: string;
  first_name: string;
  last_name: string;
  household_id: string;
  households: HouseholdRef | HouseholdRef[] | null;
};

function resolveHouseholdRef(households: GuestMatchRow['households']): HouseholdRef | null {
  if (!households) return null;
  return Array.isArray(households) ? (households[0] ?? null) : households;
}

export async function GET(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (authCookie !== 'true') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const exclude = searchParams.get('exclude');

  if (type === 'household') {
    const name = searchParams.get('name')?.trim();
    if (!name) {
      return NextResponse.json({ matches: [] });
    }

    let query = supabaseServer.from('households').select('id,name,slug').ilike('name', name);
    if (exclude) query = query.neq('id', exclude);

    const { data, error } = await query;
    if (error) {
      console.error('[admin:guests:check-duplicates] household query failed', error);
      return NextResponse.json({ message: 'Failed to check for duplicate households' }, { status: 500 });
    }

    return NextResponse.json({ matches: (data ?? []) as HouseholdMatch[] });
  }

  if (type === 'guest') {
    const firstName = searchParams.get('firstName')?.trim();
    const lastName = searchParams.get('lastName')?.trim();
    const email = searchParams.get('email')?.trim();
    const mobile = searchParams.get('mobile')?.trim().replace(/[\s-]/g, '');

    const matches = new Map<string, GuestMatch>();
    const addRows = (rows: GuestMatchRow[] | null, matchType: GuestMatch['matchType']) => {
      for (const row of rows ?? []) {
        if (exclude && row.household_id === exclude) continue;
        const key = `${row.id}:${matchType}`;
        if (matches.has(key)) continue;
        const household = resolveHouseholdRef(row.households);
        matches.set(key, {
          guestId: row.id,
          guestName: [row.first_name, row.last_name].filter(Boolean).join(' '),
          householdId: row.household_id,
          householdName: household?.name ?? '',
          slug: household?.slug ?? '',
          matchType,
        });
      }
    };

    try {
      if (firstName && lastName) {
        const { data, error } = await supabaseServer
          .from('guests')
          .select(GUEST_MATCH_SELECT)
          .ilike('first_name', firstName)
          .ilike('last_name', lastName);
        if (error) throw error;
        addRows(data, 'name');
      }

      if (email) {
        const { data, error } = await supabaseServer
          .from('guests')
          .select(GUEST_MATCH_SELECT)
          .ilike('email', email);
        if (error) throw error;
        addRows(data, 'email');
      }

      if (mobile) {
        const { data, error } = await supabaseServer
          .from('guests')
          .select(GUEST_MATCH_SELECT)
          .eq('mobile', mobile);
        if (error) throw error;
        addRows(data, 'mobile');
      }
    } catch (err: any) {
      console.error('[admin:guests:check-duplicates] guest query failed', err);
      return NextResponse.json({ message: 'Failed to check for duplicate guests' }, { status: 500 });
    }

    return NextResponse.json({ matches: Array.from(matches.values()) });
  }

  return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
}
