import { tokens } from '../tokens';

interface StampProps {
  line: string;
  sub?: string;
  // Border/text colour — defaults to persimmon (the boarding pass's stamp).
  color?: string;
  // When true, renders in normal flow (rotated, with a bottom margin) instead
  // of absolutely positioned — for callers like the thank-you hero that don't
  // have a fixed meta-row to sit over.
  inline?: boolean;
}

// Inline SVG fractal-noise filter, used as a CSS mask so the stamp's border/text
// look worn rather than perfectly printed.
const NOISE_MASK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.4 1.2'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Distressed rubber-stamp mark. By default positioned absolutely (bottom-right
// of its relatively-positioned parent), e.g. over the boarding pass's meta row.
export default function Stamp({ line, sub, color = tokens.persimmon, inline = false }: StampProps) {
  if (!line) return null;
  return (
    <div
      style={{
        position: inline ? 'static' : 'absolute',
        bottom: inline ? undefined : 'clamp(56px, 9vw, 70px)',
        right: inline ? undefined : 'clamp(18px, 4vw, 34px)',
        marginBottom: inline ? 26 : undefined,
        transform: inline ? 'rotate(-5deg)' : 'rotate(8deg)',
        border: `2.5px solid ${color}`,
        color,
        borderRadius: 9,
        padding: '6px 13px',
        fontFamily: tokens.grotesque,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontSize: 'clamp(0.85rem, 2.6vw, 1.15rem)',
        opacity: 0.92,
        textAlign: 'center',
        WebkitMaskImage: NOISE_MASK,
        maskImage: NOISE_MASK,
        WebkitMaskSize: '200px',
        maskSize: '200px',
      }}
    >
      {line}
      {sub && (
        <small
          style={{
            display: 'block',
            fontFamily: tokens.mono,
            fontWeight: 400,
            fontSize: '0.46em',
            letterSpacing: '0.1em',
            textAlign: 'center',
            marginTop: 2,
            opacity: 0.9,
          }}
        >
          {sub}
        </small>
      )}
    </div>
  );
}
