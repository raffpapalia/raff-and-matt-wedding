// Map geometry for the stay page's stylised CBD map. Hotel pins are placed from
// nearby_hotels.map_x / map_y in these same units (see migration 032).
//
// The map is grid-aligned rather than north-up: Melbourne's CBD grid is rotated
// about 20 degrees from north, and the map straightens it. Positions come from
// real OpenStreetMap coordinates rotated into that grid, so each pin sits on the
// right street and block. One map unit is 2.5 m (a block is about 230 m).
export const MAP_VIEWBOX = { x: 380, y: -40, w: 560, h: 480 } as const;

// The venue pin (QT Melbourne, 133 Russell St), which is the origin the pins are measured from.
export const QT_MAP_POINT = { x: 600, y: 258 } as const;

export const METRES_PER_MAP_UNIT = 2.5;

// Walk-time estimates assume 80 m a minute, routed along real footpaths from QT.
export const WALK_METRES_PER_MINUTE = 80;

// The dashed ring around QT is 190 map units, so 475 m as the crow flies. Routed on
// foot from QT to 12 points around it, that edge is 475 to 745 m of walking (about
// 625 m on average) because the street grid adds distance. That is roughly 8 minutes,
// so the map says 8 and not the 5 it used to.
export const WALK_RING_RADIUS = 190;
export const WALK_RING_MINUTES = 8;

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

// Admin-entered links only render when they're plain http(s), so a bad value can
// never become a javascript: URL.
export function safeHttpUrl(url: string | null | undefined): string | null {
  const u = (url ?? '').trim();
  return /^https?:\/\//i.test(u) ? u : null;
}
