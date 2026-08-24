import { supabaseServer } from '@/lib/supabase';

// Shared by the admin funds/items CRUD routes. Lives here rather than in one of
// the route files because route modules are build entry points — importing
// across them works but couples two endpoints together for no reason.

// registry_funds.slug is UNIQUE and mostly an internal handle, so it's derived
// from the name rather than asked for.
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'fund'
  );
}

/** Appends a numeric suffix if the base slug is taken, so two funds with the
 *  same name don't fail the unique constraint. */
export async function uniqueFundSlug(base: string): Promise<string> {
  const { data } = await supabaseServer.from('registry_funds').select('slug').like('slug', `${base}%`);
  const taken = new Set((data ?? []).map(r => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 500; i++) {
    if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Normalises the item quantity field. The admin form models this as an
 * "Unlimited" checkbox, which stores NULL — the value the rest of the system
 * reads as "no cap enforced". Anything else must be a non-negative integer.
 */
export function parseQuantityAvailable(input: unknown): number | null {
  if (input === null || input === undefined || input === '') return null;
  const n = Math.round(Number(input));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
