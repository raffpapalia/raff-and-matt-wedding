import { tokens } from './tokens';

// Canonical bloom field (BRAND §3): heroes and footers only. Copied from the
// recipe in SaveTheDatePhase.tsx; don't retune it per page. The rgba() values
// are alpha tints of Persimmon, Violet, Sand and Ink.

export const BLOOM_HERO = [
  'linear-gradient(180deg, rgba(11,33,24,.32), rgba(11,33,24,0) 45%)',
  'radial-gradient(60% 55% at 88% 10%, rgba(242,96,60,.5), rgba(242,96,60,0) 72%)',
  'radial-gradient(68% 62% at 8% 8%, rgba(142,124,195,.4), rgba(142,124,195,0) 75%)',
  'radial-gradient(55% 50% at 92% 90%, rgba(168,140,96,.25), rgba(168,140,96,0) 72%)',
  tokens.greenDeep,
].join(', ');

// Footer variant: Persimmon .42 bottom-left, Violet .40 bottom-right.
export const BLOOM_FOOTER = [
  'radial-gradient(70% 80% at 8% 118%, rgba(242,96,60,.42), rgba(242,96,60,0) 60%)',
  'radial-gradient(60% 70% at 88% 135%, rgba(142,124,195,.4), rgba(142,124,195,0) 62%)',
  tokens.greenDeep,
].join(', ');

// Fractal noise, baseFrequency .8; laid over the bloom with overlay blending at opacity .08.
export const BLOOM_GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='bloomGrain'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(%23bloomGrain)' opacity='0.5'/></svg>\")";
