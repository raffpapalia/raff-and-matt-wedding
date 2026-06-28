import { tokens } from '../tokens';

interface BandQuoteProps {
  src: string;
  alt: string;
  children: React.ReactNode;
  className?: string;
}

// Full-bleed natural-colour photo with a centred italic quote — the mockup's ".band" moment.
export default function BandQuote({ src, alt, children, className }: BandQuoteProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        minHeight: '64svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Natural-colour photo: no overlays, no fades, no glow, no duotone. The only
          treatment is a minimal scrim behind the quote text itself for legibility. */}
      <q
        style={{
          position: 'relative',
          zIndex: 1,
          fontFamily: tokens.display,
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 'clamp(1.8rem, 6vw, 4rem)',
          lineHeight: 1.1,
          maxWidth: '16ch',
          color: tokens.bone,
          quotes: 'none',
          // rgba(11,46,34,.55) — minimal scrim behind the text only (not the photo).
          background: 'rgba(11,46,34,.55)',
          padding: '0.6em 1.5rem',
          borderRadius: 6,
        }}
      >
        {children}
      </q>
    </div>
  );
}
