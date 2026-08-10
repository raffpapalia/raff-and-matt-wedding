import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { matchHouseholdName, normHousehold, significantTokens } from '@/lib/nameMatch';

// Typeahead for "who's this gift from?" — lets a guest attribute a gift to
// another household on the list (e.g. paying on behalf of their parents).
//
// This is an UNAUTHENTICATED endpoint on a public page, so it is deliberately
// narrow: it returns only { id, name }, never slugs, contact details, RSVP
// status or anything else on the household row, and only when the caller
// already typed a plausible name. Reusing matchHouseholdName from lib/nameMatch
// keeps the fuzziness identical to the admin duplicate check.

// Below this, a query is too broad to be a real name lookup and would just
// enumerate the guest list two letters at a time.
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ matches: [] });
  }

  const { data, error } = await supabaseServer.from('households').select('id, name');
  if (error) {
    console.error('[registry:household-search] query failed', error);
    return NextResponse.json({ message: 'Search failed' }, { status: 500 });
  }

  const target = normHousehold(q);
  if (!target) return NextResponse.json({ matches: [] });
  const targetTokens = new Set(significantTokens(target));

  const matches: { id: string; name: string; exact: boolean }[] = [];
  for (const row of data ?? []) {
    const match = matchHouseholdName(row.name, target, targetTokens);
    if (match) matches.push({ id: row.id, name: row.name, exact: match.exact });
  }

  matches.sort((a, b) => Number(b.exact) - Number(a.exact) || a.name.localeCompare(b.name));

  return NextResponse.json({
    matches: matches.slice(0, MAX_RESULTS).map(({ id, name }) => ({ id, name })),
  });
}
