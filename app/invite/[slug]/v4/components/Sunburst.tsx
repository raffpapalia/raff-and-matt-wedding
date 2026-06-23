import { tokens } from '../tokens';

interface SunburstProps {
  size?: number;
  color?: string;
}

// The footer sun mark.
export default function Sunburst({ size = 60, color = tokens.gold }: SunburstProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="30" r="11" fill={color} />
      <g stroke={color} strokeWidth={2.4} strokeLinecap="round">
        <line x1="30" y1="3" x2="30" y2="13" />
        <line x1="30" y1="47" x2="30" y2="57" />
        <line x1="3" y1="30" x2="13" y2="30" />
        <line x1="47" y1="30" x2="57" y2="30" />
        <line x1="11" y1="11" x2="18" y2="18" />
        <line x1="42" y1="42" x2="49" y2="49" />
        <line x1="49" y1="11" x2="42" y2="18" />
        <line x1="18" y1="42" x2="11" y2="49" />
      </g>
    </svg>
  );
}
