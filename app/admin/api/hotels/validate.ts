// Shared by the hotels POST and PATCH routes. Returns the cleaned fields that were
// present in `body` (all of them are required on create), or an error message.

type Result = { ok: true; fields: Record<string, unknown> } | { ok: false; message: string };

function intIn(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : null;
}

function finite(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

export function validateHotel(body: Record<string, unknown>, { partial }: { partial: boolean }): Result {
  const fields: Record<string, unknown> = {};
  const has = (k: string) => k in body;

  for (const key of ['name', 'street', 'blurb'] as const) {
    if (!partial || has(key)) {
      const v = typeof body[key] === 'string' ? (body[key] as string).trim() : '';
      if (!v) return { ok: false, message: `${key} is required` };
      fields[key] = v;
    }
  }

  if (!partial || has('walk_minutes')) {
    const n = intIn(body.walk_minutes, 0, 240);
    if (n === null) return { ok: false, message: 'walk_minutes must be a whole number of minutes' };
    fields.walk_minutes = n;
  }

  if (!partial || has('price_tier')) {
    const n = intIn(body.price_tier, 1, 4);
    if (n === null) return { ok: false, message: 'price_tier must be 1, 2, 3 or 4' };
    fields.price_tier = n;
  }

  for (const key of ['map_x', 'map_y'] as const) {
    if (!partial || has(key)) {
      const n = finite(body[key]);
      if (n === null) return { ok: false, message: `${key} must be a number` };
      fields[key] = n;
    }
  }

  if (has('website_url')) {
    const v = typeof body.website_url === 'string' ? body.website_url.trim() : '';
    if (v && !/^https?:\/\//i.test(v)) {
      return { ok: false, message: 'website_url must start with http:// or https://' };
    }
    fields.website_url = v || null;
  }

  if (has('display_order')) {
    const n = intIn(body.display_order, -100000, 100000);
    if (n === null) return { ok: false, message: 'display_order must be a whole number' };
    fields.display_order = n;
  }

  if (has('is_active')) fields.is_active = Boolean(body.is_active);

  return { ok: true, fields };
}
