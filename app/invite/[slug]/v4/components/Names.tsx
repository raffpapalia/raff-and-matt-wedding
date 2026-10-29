import { tokens } from '../tokens';

interface NamesProps {
  // Any CSS font-size, e.g. '26px' or 'clamp(34px, 1vw + 30px, 44px)'.
  fontSize: string;
}

// Horizontal Matt & Raff wordmark on Deep Green (BRAND §1): Fraunces 900, opsz 144,
// -0.01em, Violet; the ampersand is italic 600 (that weight is what produces the
// swash glyph) in Persimmon. The couple's names are fixed brand, not a setting.
export default function Names({ fontSize }: NamesProps) {
  return (
    <span
      style={{
        fontFamily: tokens.display,
        fontWeight: 900,
        fontVariationSettings: '"opsz" 144',
        fontSize,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        color: tokens.violet,
        whiteSpace: 'nowrap',
      }}
    >
      Matt <em style={{ fontStyle: 'italic', fontWeight: 600, color: tokens.persimmon }}>&amp;</em> Raff
    </span>
  );
}
