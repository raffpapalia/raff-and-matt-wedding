import Reveal from './Reveal';
import { tokens } from '../tokens';

interface KickerProps {
  label: string;
  color?: string;
  // Override for the label text colour. Defaults to persimmon; the mockup darkens it
  // on the bright-green "Pass" section where persimmon-on-green reads as muddy.
  labelColor?: string;
  // 'rule' (default): gold rule + persimmon diamond + label, e.g. above a section
  // heading. 'bare': just the grotesque label on its own — for standalone hero/intro
  // eyebrows (no rule line) that still want the same typography.
  variant?: 'rule' | 'bare';
  // Extra style merged onto the outer Reveal wrapper — mainly for callers that need
  // to control spacing around a 'bare' eyebrow sitting directly in a flex column.
  style?: React.CSSProperties;
}

const labelStyle: React.CSSProperties = {
  fontFamily: tokens.grotesque,
  fontWeight: 700,
  fontSize: '0.72rem',
  letterSpacing: '0.26em',
  textTransform: 'uppercase',
};

// Gold rule + persimmon diamond + grotesque label, e.g. "The reply" above a section
// heading — or, in 'bare' mode, just the label on its own.
export default function Kicker({ label, color, labelColor, variant = 'rule', style }: KickerProps) {
  if (variant === 'bare') {
    return (
      <Reveal style={{ ...labelStyle, color: labelColor || tokens.persimmon, ...style }}>
        {label}
      </Reveal>
    );
  }

  return (
    <Reveal className="mr-rule" style={{ color: color || tokens.violet, ...style }}>
      <span
        className="mr-dot"
        style={{ width: 7, height: 7, background: tokens.persimmon, transform: 'rotate(45deg)', flex: '0 0 auto' }}
      />
      <span style={{ ...labelStyle, color: labelColor || tokens.persimmon }}>
        {label}
      </span>
    </Reveal>
  );
}
