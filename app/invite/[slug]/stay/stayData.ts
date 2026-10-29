// Map geometry for the stay page's stylised CBD map. Hotel pins are placed from
// nearby_hotels.map_x / map_y in these same units (see migration 031).
export const MAP_VIEWBOX = { x: 380, y: -40, w: 560, h: 480 } as const;

// The venue pin. Matches the "QT sits at 600, 258" hint on the admin hotels form.
export const QT_MAP_POINT = { x: 600, y: 258 } as const;

// Price tiers 1 to 4. `range` is the guest-facing band for one night, roughly.
const TIER_RANGES = ['under $250', '$250 to $350', '$350 to $500', 'over $500'] as const;

export function clampTier(tier: number): 1 | 2 | 3 | 4 {
  const t = Math.round(Number(tier));
  return (t < 1 ? 1 : t > 4 ? 4 : t) as 1 | 2 | 3 | 4;
}

// e.g. "$250 to $350 a night": the accessible label for the price meter.
export function tierLabel(tier: number): string {
  return `${TIER_RANGES[clampTier(tier) - 1]} a night`;
}

// e.g. "$ under $250 · $$ $250 to $350 · $$$ $350 to $500 · $$$$ over $500 a night, roughly"
export const PRICE_LEGEND =
  TIER_RANGES.map((range, i) => `${'$'.repeat(i + 1)} ${range}`).join(' · ') + ' a night, roughly';

// Admin-entered links only render when they're plain http(s), so a bad value can
// never become a javascript: URL.
export function safeHttpUrl(url: string | null | undefined): string | null {
  const u = (url ?? '').trim();
  return /^https?:\/\//i.test(u) ? u : null;
}
