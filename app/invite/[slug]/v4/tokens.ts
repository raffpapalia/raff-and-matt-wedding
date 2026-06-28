// v4 guest design language tokens — mirrors the `.mr-v4` block in app/globals.css
// and design/matt-raff-admit-two-final.html exactly. For inline-style use in v4 components.
// Does not touch app/invite/[slug]/v3/tokens.ts (the live invitation's palette).

// Five-colour system (finalised on Save the Date): greenDeep is now the single
// green role (was #0B2E22, the deeper old shade). green/greenBright/pine are
// the old palette's remaining shades — still referenced by the not-yet-reskinned
// phases (InvitationPhaseV4, PreWeddingPhase, ThankYouPhase) and left as-is until
// each gets its own reskin pass.
const SAND = '#A88C60';

export const tokens = {
  greenDeep: '#0F4331',
  green: '#0F7A52',
  greenBright: '#12A06B',
  bone: '#F6EEDD',
  // gold is RETIRED from the five-colour system — aliased to sand so existing
  // `tokens.gold` references (other phases, shared components) keep rendering
  // instead of breaking, until each is migrated to sand/violet in its reskin.
  gold: SAND,
  persimmon: '#F2603C',
  ink: '#0B2118',
  pine: '#1B5E3A',
  muted: '#9a8a5f',
  mutedDeep: '#6e6347',
  onPersimmon: '#1a0d07',
  onGoldBadge: '#6e4f0e',
  violet: '#8E7CC3',
  sand: SAND,

  display: 'var(--font-fraunces), serif',
  grotesque: 'var(--font-bricolage), sans-serif',
  mono: 'var(--font-dm-mono), monospace',
  body: 'var(--font-dm-sans), system-ui, sans-serif',
} as const;

export type SectionVariant = 'deep' | 'bone' | 'green' | 'bright';

export const sectionVariantStyles: Record<SectionVariant, { background: string; color: string }> = {
  deep: { background: tokens.greenDeep, color: tokens.bone },
  bone: { background: tokens.bone, color: tokens.ink },
  green: { background: tokens.green, color: tokens.bone },
  bright: { background: tokens.greenBright, color: tokens.ink },
};
