// v3 design tokens — single source of truth for the guest-facing invite pages

export const palette = {
  goldChampagne: '#E8C766',
  goldBase: '#D4A83A',
  goldDeep: '#B8862B',
  emeraldJewel: '#2FCB95',
  emeraldHighlight: '#7FE9C2',
  forestAccent: '#1B7A57',
  bgPrimary: '#0A1F14',
  bgDeep: '#06140C',
  bgDeepest: '#040B07',
  cream: '#F2E8D0',
} as const;

// House parallelogram angle ~18°
export const HOUSE_SKEW_RATIO = 0.32;
export const houseSkew = (height: number) => Math.round(height * HOUSE_SKEW_RATIO);

// Translucent variant of a token hex — keeps every colour sourced from the palette
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
