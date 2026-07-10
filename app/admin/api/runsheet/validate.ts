// Shared field parsing for run sheet sections and items. Everything arrives from
// user-typed inputs, so values are coerced and range-checked here rather than
// trusting the client. Both parsers return only the fields present in `body`,
// so PATCH callers can send partial updates.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSectionFields(
  body: Record<string, unknown>,
  { requireCore }: { requireCore: boolean }
): { fields: Record<string, unknown> } | { error: string } {
  const fields: Record<string, unknown> = {};

  if ('title' in body || requireCore) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return { error: 'title is required' };
    if (title.length > 200) return { error: 'title is too long' };
    fields.title = title;
  }

  if ('day_date' in body) {
    const parsed = parseDateOnly(body.day_date);
    if (parsed === undefined) return { error: 'day_date must be YYYY-MM-DD' };
    fields.day_date = parsed;
  }

  if ('display_order' in body) {
    const n = Number(body.display_order);
    fields.display_order = Number.isInteger(n) && n >= 0 && n <= 100000 ? n : 0;
  }

  return { fields };
}

export function parseItemFields(
  body: Record<string, unknown>,
  { requireCore }: { requireCore: boolean }
): { fields: Record<string, unknown> } | { error: string } {
  const fields: Record<string, unknown> = {};

  if ('title' in body || requireCore) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return { error: 'title is required' };
    if (title.length > 300) return { error: 'title is too long' };
    fields.title = title;
  }

  for (const key of ['description', 'location', 'owner'] as const) {
    if (key in body) {
      const value = body[key];
      if (value === null || value === '') fields[key] = null;
      else if (typeof value === 'string') fields[key] = value.trim().slice(0, 2000);
      else return { error: `${key} must be a string` };
    }
  }

  for (const key of ['start_time', 'end_time'] as const) {
    if (key in body) {
      const parsed = parseTime(body[key]);
      if (parsed === undefined) return { error: `${key} must be HH:MM` };
      fields[key] = parsed;
    }
  }

  if ('vendor_ids' in body) {
    const value = body.vendor_ids;
    if (value === null) {
      fields.vendor_ids = [];
    } else if (Array.isArray(value)) {
      if (value.length > 100) return { error: 'too many vendors' };
      if (!value.every(v => typeof v === 'string' && UUID_RE.test(v))) {
        return { error: 'vendor_ids must be a list of ids' };
      }
      fields.vendor_ids = value;
    } else {
      return { error: 'vendor_ids must be a list of ids' };
    }
  }

  if ('display_order' in body) {
    const n = Number(body.display_order);
    fields.display_order = Number.isInteger(n) && n >= 0 && n <= 100000 ? n : 0;
  }

  return { fields };
}

// Returns: 'HH:MM:SS' (valid), null (absent/cleared), or undefined (invalid).
export function parseTime(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return `${m[1]}:${m[2]}:${m[3] ?? '00'}`;
}

// Returns: 'YYYY-MM-DD' (valid), null (absent/cleared), or undefined (invalid).
export function parseDateOnly(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return Number.isNaN(new Date(value).getTime()) ? undefined : value;
}
