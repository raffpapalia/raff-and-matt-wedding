import { tokens } from '../tokens';

interface KickerPillProps {
  label: string;
  // Persimmon pill on Deep Green/Bone; on Sand it flips to Deep Green with Bone
  // text (BRAND §2 surface roles: --action / --on-action).
  surface?: 'deep' | 'sand';
}

// The single kicker style (BRAND §4): DM Mono 400, .66rem, .2em, uppercase pill.
export default function KickerPill({ label, surface = 'deep' }: KickerPillProps) {
  const onSand = surface === 'sand';
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: tokens.mono,
        fontWeight: 400,
        fontSize: '0.66rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        lineHeight: 1.4,
        color: onSand ? tokens.bone : tokens.onPersimmon,
        background: onSand ? tokens.greenDeep : tokens.persimmon,
        borderRadius: 999,
        padding: '8px 18px',
      }}
    >
      {label}
    </span>
  );
}
