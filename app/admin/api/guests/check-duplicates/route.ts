import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import {
  isCloseMatch,
  matchHouseholdName,
  normHousehold,
  normMobile,
  normText,
  significantTokens,
} from '@/lib/nameMatch';

// Duplicate detection for the new/edit household forms. The guest list is
// small (dozens of households), so both checks fetch all rows and match in
// process — that buys normalisation and fuzziness that SQL ilike can't do:
// punctuation/"&"-vs-"and"/accent-insensitive comparisons, "The X Family"
// stripping, typo tolerance via edit distance, swapped first/last names, and
// digit-normalised AU mobile comparison (+61 vs 0, ignoring spacing).
//
// The normalisation and matching primitives now live in lib/nameMatch.ts so the
// guest-facing registry beneficiary picker matches household names identically.

type HouseholdMatch = { id: string; name: string; slug: string; exact: boolean };

type GuestMatch = {
  guestId: string;
  guestName: string;
  householdId: string;
  householdName: string;
  slug: string;
  matchType: 'name' | 'similar_name' | 'email' | 'mobile';
};

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authCookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(authCookie)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const exclude = searchParams.get('exclude');

  if (type === 'household') {
    const name = searchParams.get('name')?.trim();
    if (!name) return NextResponse.json({ matches: [] });

    const { data, error } = await supabaseServer.from('households').select('id,name,slug');
    if (error) {
      console.error('[admin:guests:check-duplicates] household query failed', error);
      return NextResponse.json({ message: 'Failed to check for duplicate households' }, { status: 500 });
    }

    const target = normHousehold(name);
    const targetTokens = new Set(significantTokens(target));

    const matches: HouseholdMatch[] = [];
    for (const row of data ?? []) {
      if (exclude && row.id === exclude) continue;
      const match = matchHouseholdName(row.name, target, targetTokens);
      if (match) matches.push({ id: row.id, name: row.name, slug: row.slug, exact: match.exact });
    }

    matches.sort((a, b) => Number(b.exact) - Number(a.exact));
    return NextResponse.json({ matches: matches.slice(0, 5) });
  }

  if (type === 'guest') {
    const firstName = normText(searchParams.get('firstName') ?? '');
    const lastName = normText(searchParams.get('lastName') ?? '');
    const email = (searchParams.get('email') ?? '').trim().toLowerCase();
    const mobile = normMobile(searchParams.get('mobile') ?? '');

    if (!firstName && !email && !mobile) return NextResponse.json({ matches: [] });

    const { data, error } = await supabaseServer
      .from('guests')
      .select('id,first_name,last_name,email,mobile,household_id,households(name,slug)');
    if (error) {
      console.error('[admin:guests:check-duplicates] guest query failed', error);
      return NextResponse.json({ message: 'Failed to check for duplicate guests' }, { status: 500 });
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    const matches: GuestMatch[] = [];
    for (const row of data ?? []) {
      if (exclude && row.household_id === exclude) continue;

      const rowFirst = normText(row.first_name ?? '');
      const rowLast = normText(row.last_name ?? '');
      const rowFull = [rowFirst, rowLast].filter(Boolean).join(' ');

      let matchType: GuestMatch['matchType'] | null = null;
      if (email && (row.email ?? '').trim().toLowerCase() === email) {
        matchType = 'email';
      } else if (mobile && normMobile(row.mobile ?? '') === mobile) {
        matchType = 'mobile';
      } else if (firstName && lastName) {
        if (rowFull === fullName) matchType = 'name';
        else if (
          isCloseMatch(rowFull, fullName) ||
          // Swapped first/last names still count as the same person.
          (rowFirst === lastName && rowLast === firstName)
        ) {
          matchType = 'similar_name';
        }
      }

      if (!matchType) continue;
      const household = Array.isArray(row.households) ? (row.households[0] ?? null) : row.households;
      matches.push({
        guestId: row.id,
        guestName: [row.first_name, row.last_name].filter(Boolean).join(' '),
        householdId: row.household_id,
        householdName: household?.name ?? '',
        slug: household?.slug ?? '',
        matchType,
      });
    }

    // Hard identifiers first, then exact names, then fuzzy.
    const rank: Record<GuestMatch['matchType'], number> = { email: 0, mobile: 1, name: 2, similar_name: 3 };
    matches.sort((a, b) => rank[a.matchType] - rank[b.matchType]);
    return NextResponse.json({ matches: matches.slice(0, 8) });
  }

  return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
}
