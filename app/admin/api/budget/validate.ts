import type { BudgetPricingMode } from '@/lib/supabase';

// Shared field parsing for budget item create/update. Money and head counts come
// from user-typed inputs, so everything is coerced and range-checked here rather
// than trusting the client. Returns only the fields present in `body`, so PATCH
// callers can send partial updates.
export function parseItemFields(
  body: Record<string, unknown>,
  { requireCore }: { requireCore: boolean }
): { fields: Record<string, unknown> } | { error: string } {
  const fields: Record<string, unknown> = {};

  if ('supplier_name' in body || requireCore) {
    const name = typeof body.supplier_name === 'string' ? body.supplier_name.trim() : '';
    if (!name) return { error: 'supplier_name is required' };
    if (name.length > 200) return { error: 'supplier_name is too long' };
    fields.supplier_name = name;
  }

  if ('category' in body || requireCore) {
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    if (!category) return { error: 'category is required' };
    if (category.length > 100) return { error: 'category is too long' };
    fields.category = category;
  }

  if ('pricing_mode' in body || requireCore) {
    const mode = body.pricing_mode ?? 'fixed';
    if (mode !== 'fixed' && mode !== 'per_head') {
      return { error: "pricing_mode must be 'fixed' or 'per_head'" };
    }
    fields.pricing_mode = mode as BudgetPricingMode;
  }

  for (const key of ['description', 'notes', 'contact_name', 'contact_phone'] as const) {
    if (key in body) {
      const value = body[key];
      if (value === null || value === '') fields[key] = null;
      else if (typeof value === 'string') fields[key] = value.trim().slice(0, 2000);
      else return { error: `${key} must be a string` };
    }
  }

  for (const key of ['estimated_cost', 'agreed_cost', 'per_head_price', 'minimum_spend'] as const) {
    if (key in body) {
      const parsed = parseMoney(body[key]);
      if (parsed === undefined) return { error: `${key} must be a non-negative amount` };
      fields[key] = parsed;
    }
  }

  if ('expected_heads' in body) {
    const value = body.expected_heads;
    if (value === null || value === '') {
      fields.expected_heads = null;
    } else {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 10000) {
        return { error: 'expected_heads must be a non-negative whole number' };
      }
      fields.expected_heads = n;
    }
  }

  if ('is_booked' in body) {
    fields.is_booked = Boolean(body.is_booked);
  }

  return { fields };
}

// Shared field parsing for budget line-item create/update. Like parseItemFields,
// returns only the keys present in `body` so PATCH callers can send partials.
export function parseLineFields(
  body: Record<string, unknown>,
  { requireCore }: { requireCore: boolean }
): { fields: Record<string, unknown> } | { error: string } {
  const fields: Record<string, unknown> = {};

  if ('label' in body || requireCore) {
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label) return { error: 'label is required' };
    if (label.length > 300) return { error: 'label is too long' };
    fields.label = label;
  }

  if ('quantity_mode' in body || requireCore) {
    const mode = body.quantity_mode ?? 'fixed';
    if (mode !== 'fixed' && mode !== 'per_head') {
      return { error: "quantity_mode must be 'fixed' or 'per_head'" };
    }
    fields.quantity_mode = mode;
  }

  if ('unit_price' in body || requireCore) {
    const parsed = parseMoney(body.unit_price);
    if (parsed === undefined) return { error: 'unit_price must be a non-negative amount' };
    fields.unit_price = parsed ?? 0;
  }

  if ('quantity' in body || requireCore) {
    const value = body.quantity;
    if (value === null || value === '' || value === undefined) {
      fields.quantity = null;
    } else {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 1000000) {
        return { error: 'quantity must be a non-negative number' };
      }
      fields.quantity = Math.round(n * 100) / 100;
    }
  }

  if ('sort_order' in body) {
    const n = Number(body.sort_order);
    fields.sort_order = Number.isInteger(n) && n >= 0 && n <= 100000 ? n : 0;
  }

  return { fields };
}

// Returns: number (valid), null (absent/cleared), or undefined (invalid).
export function parseMoney(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 99999999) return undefined;
  return Math.round(n * 100) / 100;
}

// Returns: 'YYYY-MM-DD' (valid), null (absent/cleared), or undefined (invalid).
export function parseDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return Number.isNaN(new Date(value).getTime()) ? undefined : value;
}
