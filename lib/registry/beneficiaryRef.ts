import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseServer } from '@/lib/supabase';

// The registry's beneficiary picker is a PUBLIC, unauthenticated typeahead: any
// visitor to a registry page can search household names in order to attribute a
// gift to someone else on the guest list. Returning raw households.id values
// there would publish the full set of household UUIDs, and app/api/rsvp/route.ts
// accepts household_id from an unauthenticated request body — so an enumerable
// id list would turn "hard to guess" into "listed on request".
//
// Instead the search returns an opaque ref: an HMAC of the household id. Refs
// are stable (so the client can dedupe tags) but carry no information, and can't
// be forged without the secret. Resolving one means computing the ref for each
// household and comparing — the guest list is under a hundred rows, so a full
// scan is cheaper than any index would be, and it avoids storing a second key.

function refSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    // Same posture as lib/stripe/client.ts: refuse to run rather than fall back
    // to emitting raw ids, which is exactly the thing this module exists to avoid.
    throw new Error('Missing ADMIN_SESSION_SECRET or ADMIN_PASSWORD — cannot sign registry beneficiary refs');
  }
  return `${secret}::registry-beneficiary-v1`;
}

export function householdRef(householdId: string): string {
  return createHmac('sha256', refSecret()).update(householdId).digest('hex').slice(0, 32);
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * Maps beneficiary refs back to household ids, dropping anything that doesn't
 * correspond to a real household. Returns a Map so callers can preserve the
 * order the guest tagged them in.
 */
export async function resolveHouseholdRefs(refs: string[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const wanted = refs.filter(r => /^[0-9a-f]{32}$/.test(r));
  if (wanted.length === 0) return resolved;

  const { data, error } = await supabaseServer.from('households').select('id');
  if (error) {
    console.error('[registry] household ref resolution failed', error);
    return resolved;
  }

  for (const row of data ?? []) {
    const ref = householdRef(row.id);
    const match = wanted.find(w => safeEqualHex(w, ref));
    if (match) resolved.set(match, row.id);
  }
  return resolved;
}
